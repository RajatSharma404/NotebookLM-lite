from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from core.config import settings
from core.database import get_db
from core.models import Notebook
from core.schemas import StudioArtifactResponse
from core.audio.podcast import PodcastEngine

router = APIRouter(prefix="", tags=["Audio Overview"])

@router.get("/audio/stream/{filename}")
def stream_audio(filename: str):
    file_path = settings.STORAGE_AUDIO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=file_path, media_type="audio/mpeg", filename=filename)

@router.post("/notebooks/{notebook_id}/audio/generate", response_model=StudioArtifactResponse, status_code=status.HTTP_201_CREATED)
async def generate_audio_overview(
    notebook_id: str,
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    artifact = await PodcastEngine.create_audio_overview(notebook_id, db)
    return artifact
