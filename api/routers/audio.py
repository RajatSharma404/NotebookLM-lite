import os
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from core.audio.podcast import PodcastEngine
from core.config import settings
from core.database import get_db
from core.models import Notebook
from core.rate_limit import limiter
from core.schemas import StudioArtifactResponse

router = APIRouter(prefix="", tags=["Audio Overview"])


@router.get("/audio/stream/{filename}")
def stream_audio(filename: str, request: Request):
    """
    Streams audio with HTTP 206 Partial Content (Range request) support
    enabling smooth waveform scrubbing and seeking in the frontend.
    """
    safe_name = os.path.basename(filename)
    file_path = (settings.STORAGE_AUDIO_DIR / safe_name).resolve()
    audio_dir = settings.STORAGE_AUDIO_DIR.resolve()
    if not str(file_path).startswith(str(audio_dir)) or not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if not range_header:
        return FileResponse(path=file_path, media_type="audio/mpeg", filename=safe_name, headers={"Accept-Ranges": "bytes"})

    range_match = re.match(r"bytes=(\d+)-(\d+)?", range_header)
    if not range_match:
        return FileResponse(path=file_path, media_type="audio/mpeg", filename=safe_name, headers={"Accept-Ranges": "bytes"})

    start = int(range_match.group(1))
    end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
    end = min(end, file_size - 1)
    content_length = max(0, end - start + 1)

    def iterfile():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk_size = min(64 * 1024, remaining)
                data = f.read(chunk_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "audio/mpeg",
    }
    return StreamingResponse(iterfile(), status_code=206, headers=headers)


@router.post("/notebooks/{notebook_id}/audio/generate", response_model=StudioArtifactResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def generate_audio_overview(
    notebook_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    artifact = await PodcastEngine.create_audio_overview(notebook_id, db)
    return artifact
