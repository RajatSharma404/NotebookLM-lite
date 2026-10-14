import asyncio
import uuid
from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.models import Job, utcnow
from core.telemetry import logger


class JobManager:
    """
    In-process asynchronous job manager:
    - Bounded concurrency with asyncio.Semaphore
    - Strong task references to prevent garbage collection
    - Cooperative cancellation
    - Persisted job state in SQLite
    - Startup recovery of interrupted tasks
    - 24-hour retention cleanup
    """
    def __init__(self, max_concurrency: int = 2):
        self._max_concurrency = max_concurrency
        self._semaphore: asyncio.Semaphore | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._active_tasks: dict[str, asyncio.Task] = {}
        self._running_tasks_ref: set[asyncio.Task] = set()

    @property
    def semaphore(self) -> asyncio.Semaphore:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None
        if self._semaphore is None or (current_loop and self._loop != current_loop):
            self._loop = current_loop
            self._semaphore = asyncio.Semaphore(self._max_concurrency)
        return self._semaphore

    async def submit_job(
        self,
        kind: str,
        notebook_id: str | None,
        task_coro_fn: Callable[[str, AsyncSession], Coroutine[Any, Any, Any]],
        idempotency_key: str | None = None,
        db: AsyncSession | None = None
    ) -> Job:
        """
        Creates a persisted Job record and spawns a background asyncio worker.
        """
        local_session = False
        if db is None:
            db = AsyncSessionLocal()
            local_session = True

        try:
            # Check idempotency
            if idempotency_key:
                stmt = select(Job).where(
                    Job.idempotency_key == idempotency_key,
                    Job.status.in_(["queued", "running"])
                )
                existing = (await db.execute(stmt)).scalars().first()
                if existing:
                    logger.info(f"Returning existing idempotent job {existing.id} ({idempotency_key})")
                    return existing

            job_id = f"job_{uuid.uuid4().hex[:12]}"
            job = Job(
                id=job_id,
                kind=kind,
                notebook_id=notebook_id,
                status="queued",
                stage="queued",
                progress=0.0,
                idempotency_key=idempotency_key,
                created_at=utcnow(),
                updated_at=utcnow()
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)

            # Spawn background execution with strong reference
            bg_task = asyncio.create_task(
                self._run_job_wrapper(job_id, task_coro_fn),
                name=f"job_task_{job_id}"
            )
            self._active_tasks[job_id] = bg_task
            self._running_tasks_ref.add(bg_task)
            bg_task.add_done_callback(self._running_tasks_ref.discard)

            return job
        finally:
            if local_session:
                await db.close()

    async def _run_job_wrapper(
        self,
        job_id: str,
        task_coro_fn: Callable[[str, AsyncSession], Coroutine[Any, Any, Any]]
    ):
        async with self.semaphore:
            async with AsyncSessionLocal() as session:
                try:
                    # Update to running
                    await session.execute(
                        update(Job)
                        .where(Job.id == job_id)
                        .values(status="running", stage="processing", progress=0.05, updated_at=utcnow())
                    )
                    await session.commit()

                    # Execute user task
                    result = await task_coro_fn(job_id, session)

                    # Update to succeeded
                    result_str = str(result) if result is not None else None
                    await session.execute(
                        update(Job)
                        .where(Job.id == job_id)
                        .values(
                            status="succeeded",
                            stage="completed",
                            progress=1.0,
                            result_ref=result_str,
                            completed_at=utcnow(),
                            updated_at=utcnow()
                        )
                    )
                    await session.commit()
                    logger.info(f"Job {job_id} succeeded.")
                except asyncio.CancelledError:
                    logger.warning(f"Job {job_id} was cancelled.")
                    await session.execute(
                        update(Job)
                        .where(Job.id == job_id)
                        .values(
                            status="cancelled",
                            stage="cancelled",
                            error="Job was cancelled by user",
                            completed_at=utcnow(),
                            updated_at=utcnow()
                        )
                    )
                    await session.commit()
                    raise
                except Exception as e:
                    logger.error(f"Job {job_id} failed: {e}", exc_info=True)
                    await session.execute(
                        update(Job)
                        .where(Job.id == job_id)
                        .values(
                            status="failed",
                            stage="error",
                            error=str(e)[:500],
                            completed_at=utcnow(),
                            updated_at=utcnow()
                        )
                    )
                    await session.commit()
                finally:
                    self._active_tasks.pop(job_id, None)

    async def cancel_job(self, job_id: str, db: Any) -> Job | None:
        """
        Cooperatively cancels an active or queued job.
        """
        from core.database import db_commit, db_execute
        task = self._active_tasks.get(job_id)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

        await db_execute(
            db,
            update(Job)
            .where(Job.id == job_id)
            .values(status="cancelled", stage="cancelled", error="Cancelled by user request", completed_at=utcnow(), updated_at=utcnow())
        )
        await db_commit(db)

        stmt = select(Job).where(Job.id == job_id)
        res = await db_execute(db, stmt)
        return res.scalars().first()

    async def update_progress(
        self,
        job_id: str,
        stage: str,
        progress: float,
        session: AsyncSession
    ):
        """Updates job stage and progress percentage in database."""
        await session.execute(
            update(Job)
            .where(Job.id == job_id)
            .values(stage=stage, progress=min(1.0, max(0.0, progress)), updated_at=utcnow())
        )
        await session.commit()

    async def startup_recovery(self):
        """
        Recovery sweep on application startup:
        Marks any orphaned jobs that were left running by a crashed process as failed.
        """
        async with AsyncSessionLocal() as session:
            stmt = select(Job).where(Job.status.in_(["queued", "running"]))
            orphans = (await session.execute(stmt)).scalars().all()
            if orphans:
                logger.warning(f"Recovering {len(orphans)} interrupted job(s) from previous server run.")
                for j in orphans:
                    j.status = "failed"
                    j.stage = "interrupted"
                    j.error = "interrupted: process terminated during execution"
                    j.completed_at = utcnow()
                    j.updated_at = utcnow()
                await session.commit()

            # Retention cleanup: delete completed jobs older than 24 hours
            cutoff = datetime.now(UTC) - timedelta(hours=24)
            await session.execute(
                delete(Job).where(
                    Job.status.in_(["succeeded", "failed", "cancelled"]),
                    Job.completed_at < cutoff
                )
            )
            await session.commit()

job_manager = JobManager(max_concurrency=2)
