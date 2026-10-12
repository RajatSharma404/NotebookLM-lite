import os
import io
import re
import zipfile
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.models import Notebook, Source, Note, utcnow
from core.schemas import NotebookCreate, NotebookUpdate, NotebookResponse

router = APIRouter(prefix="/notebooks", tags=["Notebooks"])

@router.get("", response_model=List[NotebookResponse])
def list_notebooks(db: Session = Depends(get_db)):
    notebooks = db.query(Notebook).order_by(Notebook.updated_at.desc()).all()
    results = []
    for nb in notebooks:
        src_cnt = db.query(func.count(Source.id)).filter(Source.notebook_id == nb.id).scalar() or 0
        note_cnt = db.query(func.count(Note.id)).filter(Note.notebook_id == nb.id).scalar() or 0
        results.append(NotebookResponse(
            id=nb.id,
            title=nb.title,
            created_at=nb.created_at,
            updated_at=nb.updated_at,
            source_count=src_cnt,
            note_count=note_cnt
        ))
    return results

@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
def create_notebook(payload: NotebookCreate, db: Session = Depends(get_db)):
    nb = Notebook(title=payload.title)
    db.add(nb)
    db.commit()
    db.refresh(nb)
    return NotebookResponse(
        id=nb.id,
        title=nb.title,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
        source_count=0,
        note_count=0
    )

@router.get("/{notebook_id}", response_model=NotebookResponse)
def get_notebook(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    src_cnt = db.query(func.count(Source.id)).filter(Source.notebook_id == nb.id).scalar() or 0
    note_cnt = db.query(func.count(Note.id)).filter(Note.notebook_id == nb.id).scalar() or 0
    return NotebookResponse(
        id=nb.id,
        title=nb.title,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
        source_count=src_cnt,
        note_count=note_cnt
    )

@router.patch("/{notebook_id}", response_model=NotebookResponse)
def update_notebook(notebook_id: str, payload: NotebookUpdate, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if payload.title is not None:
        nb.title = payload.title
    db.commit()
    db.refresh(nb)
    src_cnt = db.query(func.count(Source.id)).filter(Source.notebook_id == nb.id).scalar() or 0
    note_cnt = db.query(func.count(Note.id)).filter(Note.notebook_id == nb.id).scalar() or 0
    return NotebookResponse(
        id=nb.id,
        title=nb.title,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
        source_count=src_cnt,
        note_count=note_cnt
    )

@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    # Clean up uploaded files on disk
    for src in nb.sources:
        if src.file_path:
            import os
            try:
                if os.path.exists(src.file_path):
                    os.remove(src.file_path)
            except OSError:
                pass

    # Clean up vector chunks from ChromaDB
    try:
        from core.rag.chroma_store import chroma_store
        chroma_store.delete_notebook_chunks(notebook_id)
    except Exception:
        pass

    db.delete(nb)
    db.commit()
    return None

@router.get("/{notebook_id}/export")
def export_notebook(notebook_id: str, db: Session = Depends(get_db)):
    import io
    import re
    import zipfile
    from fastapi.responses import Response

    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    def clean_name(name: str) -> str:
        s = re.sub(r'[\\/*?:"<>|]', "_", name).strip()
        return s if s else "untitled"

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 1. Summary README.md
        readme = [
            f"# {nb.title}",
            f"**Exported:** {utcnow().isoformat()}",
            f"**Notebook ID:** {nb.id}",
            f"",
            f"## Contents",
            f"- Sources: {len(nb.sources)}",
            f"- Notes: {len(nb.notes)}",
            f"- Chat Threads: {len(nb.chat_threads)}",
            f"- Studio Artifacts: {len(nb.studio_artifacts)}",
            f"",
            f"Exported from NotebookLM-lite.",
        ]
        zf.writestr("README.md", "\n".join(readme))

        # 2. Sources
        for src in nb.sources:
            safe_fname = clean_name(src.filename)
            written = False
            if src.file_path and os.path.exists(src.file_path):
                try:
                    with open(src.file_path, "rb") as f:
                        zf.writestr(f"sources/{safe_fname}", f.read())
                    written = True
                except Exception:
                    written = False
            if not written:
                # Fallback to chunk text representation
                chunks_text = "\n\n".join(c.content for c in src.chunks)
                zf.writestr(f"sources/{safe_fname}.txt", chunks_text)

        # 3. Notes
        for i, note in enumerate(nb.notes, 1):
            safe_title = clean_name(note.title)
            note_content = f"# {note.title}\n\nLast updated: {note.updated_at}\n\n{note.content or ''}"
            zf.writestr(f"notes/{i:02d}_{safe_title}.md", note_content)

        # 4. Chat Threads
        for t_idx, thread in enumerate(nb.chat_threads, 1):
            t_title = clean_name(thread.title)
            chat_lines = [f"# Thread: {thread.title}", f"Created: {thread.created_at}", ""]
            for msg in thread.messages:
                role_label = "**User**" if msg.role == "user" else "**Assistant**"
                chat_lines.append(f"### {role_label} ({msg.created_at})")
                chat_lines.append(msg.content or "")
                if msg.citations:
                    chat_lines.append("\n*Citations:*")
                    for cit in msg.citations:
                        chat_lines.append(f"- [{cit.citation_index}] {cit.source_title} (p.{cit.page_number}): \"{cit.snippet[:120]}...\"")
                chat_lines.append("\n---")
            zf.writestr(f"chat_history/{t_idx:02d}_{t_title}.md", "\n".join(chat_lines))

        # 5. Studio Artifacts
        for a_idx, art in enumerate(nb.studio_artifacts, 1):
            safe_art_title = clean_name(art.title)
            art_text = f"# {art.title}\nType: {art.artifact_type}\nCreated: {art.created_at}\n\n{art.content_markdown or ''}"
            zf.writestr(f"studio/{a_idx:02d}_{art.artifact_type}_{safe_art_title}.md", art_text)

    safe_nb_title = clean_name(nb.title)
    zip_bytes = zip_buffer.getvalue()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_nb_title}_export.zip"'
        }
    )
