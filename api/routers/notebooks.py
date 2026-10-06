from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from core.models import Notebook, Source, Note
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
    db.delete(nb)
    db.commit()
    return None
