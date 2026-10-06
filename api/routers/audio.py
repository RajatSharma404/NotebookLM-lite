from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from core.config import settings

router = APIRouter(prefix="/audio", tags=["Audio Stream"])

@router.get("/stream/{filename}")
def stream_audio(filename: str):
    file_path = settings.STORAGE_AUDIO_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=file_path, media_type="audio/mpeg", filename=filename)
