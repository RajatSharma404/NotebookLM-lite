from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Notebook, StudioArtifact
from core.schemas import StudioArtifactResponse, StudioArtifactGenerateRequest
from core.studio.generators import StudioGenerator

router = APIRouter(prefix="/notebooks/{notebook_id}/studio", tags=["Studio Artifacts"])

@router.get("", response_model=List[StudioArtifactResponse])
def list_studio_artifacts(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return db.query(StudioArtifact).filter(StudioArtifact.notebook_id == notebook_id).order_by(StudioArtifact.created_at.desc()).all()

@router.post("/generate", response_model=StudioArtifactResponse, status_code=status.HTTP_201_CREATED)
async def generate_studio_artifact(
    notebook_id: str,
    payload: StudioArtifactGenerateRequest,
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    artifact = await StudioGenerator.generate_artifact(
        notebook_id=notebook_id,
        artifact_type=payload.artifact_type,
        db=db,
        custom_instructions=payload.custom_instructions
    )
    return artifact

@router.delete("/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_studio_artifact(notebook_id: str, artifact_id: str, db: Session = Depends(get_db)):
    artifact = db.query(StudioArtifact).filter(
        StudioArtifact.id == artifact_id,
        StudioArtifact.notebook_id == notebook_id
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    db.delete(artifact)
    db.commit()
    return None
