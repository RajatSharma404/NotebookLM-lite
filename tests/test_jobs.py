import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app
from core.database import AsyncSessionLocal
from core.jobs.manager import job_manager
from core.models import Notebook


@pytest.mark.asyncio
async def test_job_lifecycle_and_cancellation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create notebook in real DB
        async with AsyncSessionLocal() as db:
            nb = Notebook(title="Jobs Test Real DB")
            db.add(nb)
            await db.commit()
            await db.refresh(nb)
            nb_id = nb.id

        async def slow_dummy_task(job_id: str, db):
            await asyncio.sleep(0.5)

        async with AsyncSessionLocal() as db:
            job = await job_manager.submit_job(
                kind="test_ingest",
                notebook_id=nb_id,
                task_coro_fn=slow_dummy_task,
                db=db
            )
            assert job.id.startswith("job_")
            assert job.status in ["queued", "running"]

        status_res = await client.get(f"/api/jobs/{job.id}")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["id"] == job.id
        assert data["kind"] == "test_ingest"

        nb_jobs_res = await client.get(f"/api/notebooks/{nb_id}/jobs")
        assert nb_jobs_res.status_code == 200
        assert len(nb_jobs_res.json()) >= 1

        cancel_res = await client.post(f"/api/jobs/{job.id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

@pytest.mark.asyncio
async def test_job_successful_completion():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async def fast_task(job_id: str, db):
            return "done_data"

        async with AsyncSessionLocal() as db:
            job = await job_manager.submit_job(
                kind="fast_test",
                notebook_id=None,
                task_coro_fn=fast_task,
                db=db
            )

        task = job_manager._active_tasks.get(job.id)
        if task:
            await task

        status_res = await client.get(f"/api/jobs/{job.id}")
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "succeeded"
