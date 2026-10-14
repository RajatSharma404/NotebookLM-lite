import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.routers.audio import router as audio_router
from api.routers.chat import router as chat_router

# Routers
from api.routers.notebooks import router as notebooks_router
from api.routers.notes import router as notes_router
from api.routers.settings import router as settings_router
from api.routers.sources import router as sources_router
from api.routers.studio import router as studio_router
from core.config import settings
from core.database import SessionLocal, init_db
from core.models import Notebook
from core.telemetry import logger, request_id_ctx, setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup structured JSON logging
    setup_telemetry()
    logger.info("Initializing NotebookLM-lite backend...")

    # Single-worker architecture check
    # Multiple uvicorn workers would cause race conditions on in-process queues and SQLite locks
    workers_env = os.environ.get("WEB_CONCURRENCY") or os.environ.get("UVICORN_WORKERS")
    if workers_env and int(workers_env) > 1:
        logger.warning(
            f"WARNING: Multiple workers detected ({workers_env}). "
            "NotebookLM-lite is architected as a local-first single-process application. "
            "Running multiple workers may cause SQLite database lock contention and job queue fragmentation."
        )

    # Initialize SQLite database schema
    init_db()

    # Seed default notebook if empty
    db = SessionLocal()
    try:
        count = db.query(Notebook).count()
        if count == 0:
            default_nb = Notebook(title="My Research Notebook")
            db.add(default_nb)
            db.commit()
    finally:
        db.close()

    yield
    logger.info("Shutting down NotebookLM-lite backend...")

app = FastAPI(
    title="NotebookLM-lite API",
    description="Grounded AI Research Assistant with Verifiable Citations and Studio Artifacts",
    version="1.0.0",
    lifespan=lifespan
)

# Request ID Tracing Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:10]}"
    token = request_id_ctx.set(req_id)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response
    finally:
        request_id_ctx.reset(token)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(notebooks_router, prefix="/api")
app.include_router(sources_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(studio_router, prefix="/api")
app.include_router(audio_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NotebookLM-lite",
        "env": settings.APP_ENV,
        "default_llm": settings.DEFAULT_LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER
    }
