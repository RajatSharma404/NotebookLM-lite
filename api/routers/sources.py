import tempfile
import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Notebook, Source, Chunk
from core.schemas import SourceResponse, SourceToggleRequest, SourcePasteCreate, ChunkResponse
from core.ingest.pipeline import IngestionPipeline

router = APIRouter(prefix="/notebooks/{notebook_id}/sources", tags=["Sources"])

@router.get("", response_model=List[SourceResponse])
def list_sources(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db.query(Source).filter(Source.notebook_id == notebook_id).order_by(Source.created_at.desc()).all()

@router.post("/upload", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_source(
    notebook_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    # Save to temporary file for parsing
    suffix = Path(file.filename or "temp.txt").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        source = IngestionPipeline.process_file(
            notebook_id=notebook_id,
            filename=file.filename or "uploaded_document",
            temp_file_path=tmp_path,
            db=db
        )
        return source
    finally:
        if tmp_path.exists():
            os.remove(tmp_path)

@router.post("/paste", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
def paste_source(
    notebook_id: str,
    payload: SourcePasteCreate,
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return IngestionPipeline.process_pasted_text(
        notebook_id=notebook_id,
        title=payload.title,
        content=payload.content,
        db=db
    )

@router.patch("/{source_id}/toggle", response_model=SourceResponse)
def toggle_source(notebook_id: str, source_id: str, payload: SourceToggleRequest, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id, Source.notebook_id == notebook_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    source.is_active = payload.is_active
    db.commit()
    db.refresh(source)
    return source

@router.get("/{source_id}/chunks", response_model=List[ChunkResponse])
def get_source_chunks(notebook_id: str, source_id: str, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id, Source.notebook_id == notebook_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return db.query(Chunk).filter(Chunk.source_id == source_id).order_by(Chunk.page_number.asc(), Chunk.char_start.asc()).all()

@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(notebook_id: str, source_id: str, db: Session = Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id, Source.notebook_id == notebook_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    # Clean up file on disk if exists
    if source.file_path and os.path.exists(source.file_path):
        try:
            os.remove(source.file_path)
        except OSError:
            pass

    # Prune vectors from ChromaDB
    try:
        from core.rag.chroma_store import chroma_store
        chroma_store.delete_source_chunks(source_id)
    except Exception:
        pass

    db.delete(source)
    db.commit()
    return None
