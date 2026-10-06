from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import init_db, SessionLocal
from core.models import Notebook

# Routers
from api.routers.notebooks import router as notebooks_router
from api.routers.sources import router as sources_router
from api.routers.chat import router as chat_router
from api.routers.notes import router as notes_router
from api.routers.studio import router as studio_router
from api.routers.audio import router as audio_router

@asynccontextmanager
async def lifespan(app: FastAPI):
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

app = FastAPI(
    title="NotebookLM-lite API",
    description="Grounded AI Research Assistant with Verifiable Citations and Studio Artifacts",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(notebooks_router, prefix="/api")
app.include_router(sources_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(studio_router, prefix="/api")
app.include_router(audio_router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NotebookLM-lite",
        "env": settings.APP_ENV,
        "default_llm": settings.DEFAULT_LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER
    }
