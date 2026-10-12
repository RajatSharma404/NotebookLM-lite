import io
import pytest
from fastapi.testclient import TestClient

def test_source_upload_path_traversal_prevention(client: TestClient, test_notebook):
    """Ensure directory traversal filenames are sanitized and cannot write outside uploads dir."""
    file_content = b"# Safe content in malicious filename"
    traversal_filename = "../../../../evil_path.md"

    response = client.post(
        f"/api/notebooks/{test_notebook.id}/sources/upload",
        files={"file": (traversal_filename, io.BytesIO(file_content), "text/markdown")}
    )
    assert response.status_code == 201
    data = response.json()
    # Filename must be sanitized to basename without ../
    assert ".." not in data["filename"]
    assert "/" not in data["filename"]
    assert "\\" not in data["filename"]
    assert "evil_path.md" in data["filename"]

def test_source_upload_disallowed_extension(client: TestClient, test_notebook):
    """Ensure dangerous file extensions are rejected with 400 Bad Request."""
    bad_files = [
        ("malicious.exe", b"binary executable content", "application/x-msdownload"),
        ("script.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh"),
        ("exploit.bat", b"@echo off", "application/x-bat"),
    ]

    for fname, content, ctype in bad_files:
        response = client.post(
            f"/api/notebooks/{test_notebook.id}/sources/upload",
            files={"file": (fname, io.BytesIO(content), ctype)}
        )
        assert response.status_code == 400
        assert "Unsupported file format" in response.json()["detail"]

def test_audio_stream_path_traversal_prevention(client: TestClient):
    """Ensure audio streaming rejects path traversal attempts."""
    traversal_attacks = [
        "../../../../etc/passwd",
        "..\\..\\Windows\\win.ini",
        "%2e%2e%2fconfig.json",
    ]

    for attack in traversal_attacks:
        response = client.get(f"/api/audio/stream/{attack}")
        assert response.status_code in [400, 404]

def test_api_key_masking_previews(client: TestClient):
    """Ensure get_settings returns masked preview strings rather than raw keys."""
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()

    for key in ["openai_api_key", "anthropic_api_key", "gemini_api_key"]:
        val = data.get(key)
        if val:
            assert val.startswith("sk-") or val.startswith("AI")
            assert "..." in val
            assert len(val) < 20, "Masked key should be an abbreviated preview"
