from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.config import settings, BASE_DIR

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None
    default_llm_provider: Optional[str] = None

@router.get("")
def get_settings():
    return {
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY),
        "gemini_api_key_preview": f"{settings.GEMINI_API_KEY[:4]}...{settings.GEMINI_API_KEY[-4:]}" if len(settings.GEMINI_API_KEY) > 8 else "",
        "openai_api_key_configured": bool(settings.OPENAI_API_KEY),
        "anthropic_api_key_configured": bool(settings.ANTHROPIC_API_KEY),
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "default_llm_provider": settings.DEFAULT_LLM_PROVIDER
    }

@router.post("")
def update_settings(payload: SettingsUpdateRequest):
    env_path = BASE_DIR / ".env"
    env_lines = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env_lines[k.strip()] = v.strip()

    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip()
        env_lines["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

    if payload.openai_api_key is not None:
        settings.OPENAI_API_KEY = payload.openai_api_key.strip()
        env_lines["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

    if payload.anthropic_api_key is not None:
        settings.ANTHROPIC_API_KEY = payload.anthropic_api_key.strip()
        env_lines["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY

    if payload.ollama_base_url is not None:
        settings.OLLAMA_BASE_URL = payload.ollama_base_url.strip()
        env_lines["OLLAMA_BASE_URL"] = settings.OLLAMA_BASE_URL

    if payload.default_llm_provider is not None:
        settings.DEFAULT_LLM_PROVIDER = payload.default_llm_provider.strip()
        env_lines["DEFAULT_LLM_PROVIDER"] = settings.DEFAULT_LLM_PROVIDER

    new_env_content = "\n".join([f"{k}={v}" for k, v in env_lines.items()]) + "\n"
    env_path.write_text(new_env_content, encoding="utf-8")

    return {"status": "ok", "message": "Settings updated successfully"}
