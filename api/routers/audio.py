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
    import os
    safe_name = os.path.basename(filename)
    file_path = (settings.STORAGE_AUDIO_DIR / safe_name).resolve()
    audio_dir = settings.STORAGE_AUDIO_DIR.resolve()
    if not str(file_path).startswith(str(audio_dir)) or not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=file_path, media_type="audio/mpeg", filename=safe_name)

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
