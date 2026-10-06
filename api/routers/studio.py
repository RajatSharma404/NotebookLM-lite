from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Notebook, StudioArtifact
from core.schemas import StudioArtifactResponse

router = APIRouter(prefix="/notebooks/{notebook_id}/studio", tags=["Studio Artifacts"])

@router.get("", response_model=List[StudioArtifactResponse])
def list_studio_artifacts(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db.query(StudioArtifact).filter(StudioArtifact.notebook_id == notebook_id).order_by(StudioArtifact.created_at.desc()).all()
