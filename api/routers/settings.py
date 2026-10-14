import os
import re

from fastapi import APIRouter, Request
from filelock import FileLock
from pydantic import BaseModel, Field, field_validator

from core.config import BASE_DIR, settings
from core.rate_limit import limiter

router = APIRouter(prefix="/settings", tags=["Settings"])

ALLOWED_PROVIDERS = {"gemini", "openai", "anthropic", "ollama", "local"}

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: str | None = Field(default=None, max_length=512)
    openai_api_key: str | None = Field(default=None, max_length=512)
    anthropic_api_key: str | None = Field(default=None, max_length=512)
    ollama_base_url: str | None = Field(default=None, max_length=512)
    default_llm_provider: str | None = Field(default=None, max_length=64)

    @field_validator("gemini_api_key", "openai_api_key", "anthropic_api_key", "ollama_base_url", "default_llm_provider")
    @classmethod
    def sanitize_no_newlines(cls, v: str | None) -> str | None:
        if v is None:
            return None
        # Strict defense against newline/carriage-return injection into .env files
        cleaned = re.sub(r"[\r\n]", "", v).strip()
        return cleaned

    @field_validator("default_llm_provider")
    @classmethod
    def validate_provider(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in ALLOWED_PROVIDERS:
            raise ValueError(f"Invalid default_llm_provider. Must be one of: {', '.join(sorted(ALLOWED_PROVIDERS))}")
        return v.lower() if v is not None else None


@router.get("")
def get_settings():
    """
    Returns settings status.
    SECURITY HARDENING: Never echo partial secret keys (e.g. key[:4]...key[-4:]).
    Return only 'configured' or empty string to prevent key entropy leakage while
    maintaining strict backward compatibility with the frontend schema.
    """
    def safe_status(key: str) -> str:
        return "configured" if bool(key and key.strip()) else ""

    return {
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY),
        "gemini_api_key_preview": safe_status(settings.GEMINI_API_KEY),
        "openai_api_key_configured": bool(settings.OPENAI_API_KEY),
        "openai_api_key_preview": safe_status(settings.OPENAI_API_KEY),
        "anthropic_api_key_configured": bool(settings.ANTHROPIC_API_KEY),
        "anthropic_api_key_preview": safe_status(settings.ANTHROPIC_API_KEY),
        "ollama_base_url": settings.OLLAMA_BASE_URL,
        "default_llm_provider": settings.DEFAULT_LLM_PROVIDER
    }


@router.post("")
@limiter.limit("10/minute")
def update_settings(payload: SettingsUpdateRequest, request: Request):
    """
    Updates settings and writes to .env atomically with a file lock and restricted permissions.
    """
    env_path = BASE_DIR / ".env"
    lock_path = BASE_DIR / ".env.lock"
    tmp_path = BASE_DIR / ".env.tmp"

    with FileLock(str(lock_path), timeout=10.0):
        env_lines = {}
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.split("=", 1)
                    env_lines[k.strip()] = v.strip()

        if payload.gemini_api_key is not None:
            settings.GEMINI_API_KEY = payload.gemini_api_key
            env_lines["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

        if payload.openai_api_key is not None:
            settings.OPENAI_API_KEY = payload.openai_api_key
            env_lines["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

        if payload.anthropic_api_key is not None:
            settings.ANTHROPIC_API_KEY = payload.anthropic_api_key
            env_lines["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY

        if payload.ollama_base_url is not None:
            settings.OLLAMA_BASE_URL = payload.ollama_base_url
            env_lines["OLLAMA_BASE_URL"] = settings.OLLAMA_BASE_URL

        if payload.default_llm_provider is not None:
            settings.DEFAULT_LLM_PROVIDER = payload.default_llm_provider
            env_lines["DEFAULT_LLM_PROVIDER"] = settings.DEFAULT_LLM_PROVIDER

        new_env_content = "\n".join([f"{k}={v}" for k, v in env_lines.items()]) + "\n"

        # Atomic write via temporary file replace
        tmp_path.write_text(new_env_content, encoding="utf-8")
        try:
            # Set restrictive permissions (0600) on POSIX platforms
            if hasattr(os, "chmod"):
                os.chmod(tmp_path, 0o600)
        except OSError:
            pass

        # Atomic replacement
        tmp_path.replace(env_path)

    return {"status": "ok", "message": "Settings updated successfully"}
