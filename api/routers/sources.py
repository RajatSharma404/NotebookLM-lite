from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Notebook, Source, Chunk
from core.schemas import SourceResponse, SourceToggleRequest, ChunkResponse

router = APIRouter(prefix="/notebooks/{notebook_id}/sources", tags=["Sources"])

@router.get("", response_model=List[SourceResponse])
def list_sources(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db.query(Source).filter(Source.notebook_id == notebook_id).order_by(Source.created_at.desc()).all()

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
    db.delete(source)
    db.commit()
    return None
