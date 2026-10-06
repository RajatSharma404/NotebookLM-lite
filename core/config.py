from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    APP_ENV: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'storage' / 'notebooklm.db'}"
    STORAGE_UPLOADS_DIR: Path = BASE_DIR / "storage" / "uploads"
    STORAGE_AUDIO_DIR: Path = BASE_DIR / "storage" / "audio"
    STORAGE_VECTOR_DIR: Path = BASE_DIR / "storage" / "vector_store"

    DEFAULT_LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "llama3.2"

    EMBEDDING_PROVIDER: str = "sentence_transformers"
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    TTS_ENGINE: str = "edge-tts"
    TTS_VOICE_SPEAKER_A: str = "en-US-GuyNeural"
    TTS_VOICE_SPEAKER_B: str = "en-US-JennyNeural"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directories exist
settings.STORAGE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_VECTOR_DIR.mkdir(parents=True, exist_ok=True)
