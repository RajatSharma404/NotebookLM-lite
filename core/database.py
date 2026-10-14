import inspect
from collections.abc import AsyncGenerator, Generator
from typing import Any

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from core.config import settings

# 1. Synchronous Engine & Session (for Alembic migrations and sync scripts)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

# 2. Asynchronous Engine & Session (for FastAPI async request handlers and workers)
async_engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.ASYNC_DATABASE_URL else {}
)

# Enable foreign keys, WAL mode, synchronous NORMAL, and busy_timeout (5000ms) for high concurrency
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sync_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    @event.listens_for(async_engine.sync_engine, "connect")
    def set_async_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def db_execute(db: Any, statement: Any) -> Any:
    """Executes a SQL statement on either an AsyncSession or a sync Session."""
    res = db.execute(statement)
    if inspect.isawaitable(res):
        return await res
    return res

async def db_commit(db: Any) -> None:
    """Commits either an AsyncSession or a sync Session."""
    res = db.commit()
    if inspect.isawaitable(res):
        await res

async def db_flush(db: Any) -> None:
    """Flushes either an AsyncSession or a sync Session."""
    res = db.flush()
    if inspect.isawaitable(res):
        await res

async def db_refresh(db: Any, instance: Any) -> None:
    """Refreshes an instance on either an AsyncSession or a sync Session."""
    res = db.refresh(instance)
    if inspect.isawaitable(res):
        await res

# Async Dependency for FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Synchronous Dependency fallback for background threads/scripts
def get_sync_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def init_async_db() -> None:
    """Initializes schema asynchronously."""
    import core.models  # noqa: F401
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def init_db() -> None:
    """Initializes schema synchronously."""
    import core.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
