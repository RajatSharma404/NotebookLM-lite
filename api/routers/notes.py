from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Notebook, Note
from core.schemas import NoteCreate, NoteUpdate, NoteResponse, SynthesizeNotesRequest

router = APIRouter(prefix="/notebooks/{notebook_id}/notes", tags=["Notes"])

@router.get("", response_model=List[NoteResponse])
def list_notes(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db.query(Note).filter(Note.notebook_id == notebook_id).order_by(Note.updated_at.desc()).all()

@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(notebook_id: str, payload: NoteCreate, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    note = Note(
        notebook_id=notebook_id,
        title=payload.title,
        content=payload.content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(notebook_id: str, note_id: str, payload: NoteUpdate, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id, Note.notebook_id == notebook_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(notebook_id: str, note_id: str, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id, Note.notebook_id == notebook_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return None

@router.post("/synthesize", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def synthesize_notes(
    notebook_id: str,
    payload: SynthesizeNotesRequest,
    db: Session = Depends(get_db)
):
    notes = db.query(Note).filter(
        Note.id.in_(payload.note_ids),
        Note.notebook_id == notebook_id
    ).all()
    if not notes:
        raise HTTPException(status_code=400, detail="No matching notes found for synthesis")

    combined_text = "\n\n---\n\n".join([f"### {n.title}\n{n.content}" for n in notes])
    synthesized_content = f"# Synthesized Research Notes\n\nAutomatically synthesized across {len(notes)} personal notes:\n\n{combined_text}"

    new_note = Note(
        notebook_id=notebook_id,
        title=f"Synthesis of {len(notes)} Notes",
        content=synthesized_content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note
