import json

import pytest
from httpx import AsyncClient

from core.models import Notebook


@pytest.mark.unit
@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    resp = await async_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "NotebookLM-lite"
    assert "default_llm" in data
    assert "embedding_provider" in data

@pytest.mark.unit
@pytest.mark.asyncio
async def test_notebooks_crud(async_client: AsyncClient):
    # 1. Create notebook
    resp = await async_client.post("/api/notebooks", json={"title": "Quantum Research"})
    assert resp.status_code == 201
    created = resp.json()
    assert created["id"].startswith("nb_")
    assert created["title"] == "Quantum Research"
    created_id = created["id"]

    # 2. List notebooks
    resp = await async_client.get("/api/notebooks")
    assert resp.status_code == 200
    nbs = resp.json()
    assert len(nbs) >= 1
    assert any(n["id"] == created_id for n in nbs)
    first_nb = nbs[0]
    assert first_nb["id"].startswith("nb_")
    assert "title" in first_nb
    assert "source_count" in first_nb
    assert "note_count" in first_nb

    # 3. Get notebook by id
    resp = await async_client.get(f"/api/notebooks/{created_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Quantum Research"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_sources_paste_and_chunks(async_client: AsyncClient, test_notebook: Notebook):
    nb_id = test_notebook.id
    paste_payload = {
        "title": "Attention Is All You Need",
        "content": (
            "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. "
            "We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism. "
            "Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable."
        )
    }

    # Paste source
    resp = await async_client.post(f"/api/notebooks/{nb_id}/sources/paste", json=paste_payload)
    assert resp.status_code == 201
    source = resp.json()
    assert source["id"].startswith("src_")
    assert source["filename"] == "Attention Is All You Need.txt"
    assert source["is_active"] is True
    assert source["file_type"] == "txt"
    src_id = source["id"]

    # List sources
    resp = await async_client.get(f"/api/notebooks/{nb_id}/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert any(s["id"] == src_id for s in sources)

    # Get source chunks
    resp = await async_client.get(f"/api/notebooks/{nb_id}/sources/{src_id}/chunks")
    assert resp.status_code == 200
    chunks = resp.json()
    assert len(chunks) >= 1
    assert chunks[0]["id"].startswith("chk_")
    assert chunks[0]["source_id"] == src_id
    assert "content" in chunks[0]
    assert "page_number" in chunks[0]

    # Toggle source
    resp = await async_client.patch(f"/api/notebooks/{nb_id}/sources/{src_id}/toggle", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # Toggle back to active for downstream tests
    resp = await async_client.patch(f"/api/notebooks/{nb_id}/sources/{src_id}/toggle", json={"is_active": True})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True

@pytest.mark.unit
@pytest.mark.asyncio
async def test_sources_upload(async_client: AsyncClient, test_notebook: Notebook):
    nb_id = test_notebook.id
    file_content = b"# Document Title\n\nThis is a sample markdown document used for testing upload pipeline."
    files = {"file": ("sample.md", file_content, "text/markdown")}

    resp = await async_client.post(f"/api/notebooks/{nb_id}/sources/upload", files=files)
    assert resp.status_code == 201
    source = resp.json()
    assert source["id"].startswith("src_")
    assert source["filename"] == "sample.md"
    assert source["file_type"] == "md"

    # Clean up source
    del_resp = await async_client.delete(f"/api/notebooks/{nb_id}/sources/{source['id']}")
    assert del_resp.status_code == 204

@pytest.mark.integration
@pytest.mark.asyncio
async def test_chat_sse_stream_contract(async_client: AsyncClient, test_notebook: Notebook):
    """
    CRITICAL COMPATIBILITY CONTRACT TEST:
    Asserts exact SSE event shapes: 'sources', 'token', 'done'.
    """
    nb_id = test_notebook.id
    payload = {
        "query": "What is the Transformer architecture?",
        "llm_provider": "local"
    }

    resp = await async_client.post(f"/api/notebooks/{nb_id}/chat/stream", json=payload)
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    lines = resp.text.split("\n")
    events = []
    for line in lines:
        if line.startswith("data: "):
            events.append(json.loads(line[6:].strip()))

    assert len(events) >= 3, f"Expected at least sources, token, done events. Got: {events}"

    # First event must be 'sources'
    assert events[0]["type"] == "sources"
    assert "citations" in events[0]
    assert isinstance(events[0]["citations"], list)

    # Middle events must be 'token'
    token_events = [e for e in events if e["type"] == "token"]
    assert len(token_events) > 0
    assert "content" in token_events[0]

    # Final event must be 'done'
    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    assert "message_id" in done_events[0]
    assert done_events[0]["message_id"].startswith("msg_")

    # Verify chat thread retrieval
    thread_resp = await async_client.get(f"/api/notebooks/{nb_id}/chat/threads")
    assert thread_resp.status_code == 200
    threads = thread_resp.json()
    assert len(threads) >= 1
    assert "messages" in threads[0]

@pytest.mark.unit
@pytest.mark.asyncio
async def test_notes_crud_and_synthesis(async_client: AsyncClient, test_notebook: Notebook):
    nb_id = test_notebook.id

    # Create note 1
    resp = await async_client.post(f"/api/notebooks/{nb_id}/notes", json={
        "title": "Key Insight",
        "content": "Attention mechanisms eliminate recurrence entirely."
    })
    assert resp.status_code == 201
    note = resp.json()
    assert note["id"].startswith("not_")
    assert note["title"] == "Key Insight"
    note_id = note["id"]

    # List notes
    resp = await async_client.get(f"/api/notebooks/{nb_id}/notes")
    assert resp.status_code == 200
    assert any(n["id"] == note_id for n in resp.json())

    # Update note
    resp = await async_client.patch(f"/api/notebooks/{nb_id}/notes/{note_id}", json={
        "title": "Updated Key Insight"
    })
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Key Insight"

    # Create second note for synthesis (min_length=2 required by schema)
    resp2 = await async_client.post(f"/api/notebooks/{nb_id}/notes", json={
        "title": "Second Insight",
        "content": "Positional encodings provide order awareness."
    })
    assert resp2.status_code == 201
    note_id_2 = resp2.json()["id"]

    # Synthesize notes
    synth_resp = await async_client.post(f"/api/notebooks/{nb_id}/notes/synthesize", json={
        "note_ids": [note_id, note_id_2],
        "instructions": "Synthesize key insights"
    })
    assert synth_resp.status_code == 201
    synth_note = synth_resp.json()
    assert synth_note["id"].startswith("not_")

    # Delete notes
    del_resp = await async_client.delete(f"/api/notebooks/{nb_id}/notes/{note_id}")
    assert del_resp.status_code == 204
    del_resp2 = await async_client.delete(f"/api/notebooks/{nb_id}/notes/{note_id_2}")
    assert del_resp2.status_code == 204

@pytest.mark.unit
@pytest.mark.asyncio
async def test_studio_artifacts_generation(async_client: AsyncClient, test_notebook: Notebook):
    nb_id = test_notebook.id

    resp = await async_client.post(f"/api/notebooks/{nb_id}/studio/generate", json={
        "artifact_type": "study_guide",
        "custom_instructions": "Focus on high performance"
    })
    assert resp.status_code == 201
    artifact = resp.json()
    assert artifact["id"].startswith("art_")
    assert artifact["artifact_type"] == "study_guide"
    assert "content_markdown" in artifact
    assert "Study Guide" in artifact["content_markdown"]

    # List studio artifacts
    list_resp = await async_client.get(f"/api/notebooks/{nb_id}/studio")
    assert list_resp.status_code == 200
    assert any(a["id"] == artifact["id"] for a in list_resp.json())

    # Delete artifact
    del_resp = await async_client.delete(f"/api/notebooks/{nb_id}/studio/{artifact['id']}")
    assert del_resp.status_code == 204

@pytest.mark.unit
@pytest.mark.asyncio
async def test_settings_security_hardening(async_client: AsyncClient):
    # Test GET settings - secret previews must NOT leak key characters
    resp = await async_client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "gemini_api_key_configured" in data
    assert "gemini_api_key_preview" in data
    assert "openai_api_key_configured" in data
    assert "anthropic_api_key_configured" in data
    # Previews must never be raw keys or partial prefixes
    assert not any(len(p) > 20 for p in [data["gemini_api_key_preview"], data["openai_api_key_preview"], data["anthropic_api_key_preview"]])

    # Test POST settings with newline injection attempt
    update_resp = await async_client.post("/api/settings", json={
        "gemini_api_key": "test_key_safe\nMALICIOUS_INJECTION=TRUE\n",
        "default_llm_provider": "gemini"
    })
    assert update_resp.status_code == 200
