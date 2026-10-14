import contextvars
import json
import logging
import time
from contextlib import contextmanager
from typing import Any

# Context variable for distributed request tracing
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="req_system")

class StructuredJsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter with secret redaction and request tracing.
    """
    SENSITIVE_KEYS = {"api_key", "gemini_api_key", "openai_api_key", "anthropic_api_key", "password", "token", "secret"}

    def format(self, record: logging.LogRecord) -> str:
        req_id = request_id_ctx.get()
        log_obj: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "request_id": req_id,
            "message": record.getMessage()
        }

        # Include extra attributes attached to record
        if hasattr(record, "stage_timings"):
            log_obj["timings_ms"] = record.stage_timings
        if hasattr(record, "metrics"):
            log_obj["metrics"] = record.metrics
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Redact secrets
        return self._redact(json.dumps(log_obj))

    def _redact(self, text: str) -> str:
        for k in self.SENSITIVE_KEYS:
            if k in text.lower():
                # Redact potential key patterns
                import re
                text = re.sub(rf'("{k}"\s*:\s*)"[^"]+"', r'\1"[REDACTED]"', text, flags=re.IGNORECASE)
        return text

def setup_telemetry():
    """Configure root logger with structured JSON formatting."""
    root_logger = logging.getLogger("notebooklm")
    root_logger.setLevel(logging.INFO)

    # Avoid duplicate handlers on reload
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        root_logger.addHandler(handler)
    return root_logger

logger = logging.getLogger("notebooklm")

class StageTimer:
    """
    Context manager and tracker for granular RAG stage timings (ms).
    Stages: embed, dense, sparse, fusion, rerank, prompt_build, llm_ttft, total.
    """
    def __init__(self):
        self.timings: dict[str, float] = {}
        self._start_time: float = time.perf_counter()

    @contextmanager
    def time_stage(self, stage_name: str):
        t0 = time.perf_counter()
        try:
            yield
        finally:
            elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            self.timings[stage_name] = elapsed_ms

    def record_stage(self, stage_name: str, duration_ms: float):
        self.timings[stage_name] = round(duration_ms, 2)

    def finish(self) -> dict[str, float]:
        self.timings["total"] = round((time.perf_counter() - self._start_time) * 1000.0, 2)
        return self.timings
