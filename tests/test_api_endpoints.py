import io
import zipfile
import pytest
from fastapi.testclient import TestClient

def test_notebook_crud_lifecycle(client: TestClient):
    """Test creating, reading, updating, and deleting a notebook."""
    # 1. Create
    create_res = client.post("/api/notebooks", json={"title": "Test Research NB"})
    assert create_res.status_code == 201
    nb = create_res.json()
    nb_id = nb["id"]
    assert nb["title"] == "Test Research NB"

    # 2. List
    list_res = client.get("/api/notebooks")
    assert list_res.status_code == 200
    all_nbs = list_res.json()
    assert any(n["id"] == nb_id for n in all_nbs)

    # 3. Get Single
    get_res = client.get(f"/api/notebooks/{nb_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Test Research NB"

    # 4. Update
    patch_res = client.patch(f"/api/notebooks/{nb_id}", json={"title": "Renamed Research NB"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Renamed Research NB"

    # 5. Delete
    del_res = client.delete(f"/api/notebooks/{nb_id}")
    assert del_res.status_code == 204

    # 6. Verify 404 after deletion
    get_after_del = client.get(f"/api/notebooks/{nb_id}")
    assert get_after_del.status_code == 404

def test_notebook_export_archive(client: TestClient, test_notebook):
    """Test exporting a notebook as a complete, structured ZIP archive."""
    # Add a note
    client.post(
        f"/api/notebooks/{test_notebook.id}/notes",
        json={"title": "Exported Note", "content": "# Research Findings\nKey points discovered."}
    )

    # Add a pasted source
    client.post(
        f"/api/notebooks/{test_notebook.id}/sources/paste",
        json={"title": "Export Source", "content": "# Overview\nIngested source content for export."}
    )

    # Download zip export
    res = client.get(f"/api/notebooks/{test_notebook.id}/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in res.headers["content-disposition"]

    # Verify zip content
    zip_bytes = io.BytesIO(res.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "README.md" in namelist
        readme_content = zf.read("README.md").decode("utf-8")
        assert test_notebook.title in readme_content

        # Verify notes directory
        note_files = [f for f in namelist if f.startswith("notes/")]
        assert len(note_files) >= 1

        # Verify sources directory
        src_files = [f for f in namelist if f.startswith("sources/")]
        assert len(src_files) >= 1

def test_notes_crud_and_synthesis(client: TestClient, test_notebook):
    """Test creating, updating, synthesizing, and deleting notes."""
    # Create Note 1
    n1_res = client.post(
        f"/api/notebooks/{test_notebook.id}/notes",
        json={"title": "Hypothesis A", "content": "Transformer models benefit from self-attention."}
    )
    assert n1_res.status_code == 201
    n1_id = n1_res.json()["id"]

    # Create Note 2
    n2_res = client.post(
        f"/api/notebooks/{test_notebook.id}/notes",
        json={"title": "Hypothesis B", "content": "Positional encodings provide sequence order awareness."}
    )
    assert n2_res.status_code == 201
    n2_id = n2_res.json()["id"]

    # Synthesize both notes
    synth_res = client.post(
        f"/api/notebooks/{test_notebook.id}/notes/synthesize",
        json={"note_ids": [n1_id, n2_id], "instructions": "Synthesize the two hypotheses into a summary"}
    )
    assert synth_res.status_code == 201
    synth_note = synth_res.json()
    assert "Synthesis" in synth_note["title"]
    assert len(synth_note["content"]) > 0

    # Delete Note 1
    del_res = client.delete(f"/api/notebooks/{test_notebook.id}/notes/{n1_id}")
    assert del_res.status_code == 204

def test_sources_toggle_and_management(client: TestClient, test_notebook):
    """Test source paste, active state toggling, and deletion."""
    # Paste source
    paste_res = client.post(
        f"/api/notebooks/{test_notebook.id}/sources/paste",
        json={"title": "Toggle Doc", "content": "# Toggleable Context\nContent to toggle."}
    )
    assert paste_res.status_code == 201
    src = paste_res.json()
    src_id = src["id"]
    assert src["is_active"] is True

    # Toggle to inactive
    toggle_res = client.patch(
        f"/api/notebooks/{test_notebook.id}/sources/{src_id}",
        json={"is_active": False}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Delete source
    del_res = client.delete(f"/api/notebooks/{test_notebook.id}/sources/{src_id}")
    assert del_res.status_code == 204
