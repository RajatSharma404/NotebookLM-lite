import shutil
import tempfile
from collections.abc import AsyncGenerator, Generator
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from api.main import app
from core.database import Base, get_db
from core.models import Notebook
from tests.fake_provider import FakeEmbeddingProvider, FakeLLMProvider


def pytest_configure(config):
    config.addinivalue_line("markers", "unit: fast isolated unit tests")
    config.addinivalue_line("markers", "integration: multi-component integration tests")
    config.addinivalue_line("markers", "eval: evaluation and regression tests")
    config.addinivalue_line("markers", "slow: slow-running load/stress tests")

@pytest.fixture(scope="session")
def test_temp_dir():
    temp_dir = tempfile.mkdtemp(prefix="notebooklm_test_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)

@pytest.fixture(scope="session")
def test_engine():
    """Create a persistent in-memory SQLite engine with StaticPool for test session."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    """Yield an isolated database session per test function."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def test_db_session(db_session: Session) -> Session:
    """Alias for db_session."""
    return db_session

@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_notebook(db_session: Session) -> Notebook:
    """Fixture providing a persisted test notebook."""
    nb = Notebook(title="Pytest Test Notebook")
    db_session.add(nb)
    db_session.commit()
    db_session.refresh(nb)
    return nb

@pytest_asyncio.fixture
async def async_client(db_session: Session, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """Async test client with dependency overrides and fake LLM/embedding providers."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Ensure fake LLM and embedding providers are active
    from core.rag.providers import LLMProvider
    monkeypatch.setattr(LLMProvider, "stream_response", FakeLLMProvider.stream_response)

    from core.rag import embeddings
    fake_embed = FakeEmbeddingProvider()
    monkeypatch.setattr(embeddings, "embedding_provider", fake_embed)
    from core.rag import retriever
    monkeypatch.setattr(retriever, "embedding_provider", fake_embed)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
