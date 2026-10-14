
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import ChatThread, Notebook
from core.rag.generator import GroundedChatEngine
from core.rate_limit import limiter
from core.schemas import (
    ChatQueryRequest,
    ChatThreadResponse,
    CitationItem,
    MessageResponse,
)

router = APIRouter(prefix="/notebooks/{notebook_id}/chat", tags=["Chat"])

@router.get("/threads", response_model=list[ChatThreadResponse])
def get_chat_threads(notebook_id: str, db: Session = Depends(get_db)):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    threads = db.query(ChatThread).filter(ChatThread.notebook_id == notebook_id).order_by(ChatThread.created_at.desc()).all()

    results = []
    for thread in threads:
        msg_items = []
        for msg in thread.messages:
            cit_items = [
                CitationItem(
                    index=cit.citation_index,
                    chunk_id=cit.chunk_id,
                    source_id=cit.source_id,
                    source_title=cit.source_title,
                    page_number=cit.page_number,
                    snippet=cit.snippet
                ) for cit in msg.citations
            ]
            msg_items.append(MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
                citations=cit_items
            ))
        results.append(ChatThreadResponse(
            id=thread.id,
            notebook_id=thread.notebook_id,
            title=thread.title,
            created_at=thread.created_at,
            messages=msg_items
        ))
    return results


@router.post("/stream")
@limiter.limit("30/minute")
async def stream_chat(
    notebook_id: str,
    payload: ChatQueryRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    nb = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    thread_id = payload.thread_id
    if not thread_id:
        # Create default thread
        thread = ChatThread(notebook_id=notebook_id, title=payload.query[:40])
        db.add(thread)
        db.commit()
        db.refresh(thread)
        thread_id = thread.id

    return StreamingResponse(
        GroundedChatEngine.stream_chat(
            query=payload.query,
            notebook_id=notebook_id,
            thread_id=thread_id,
            db=db,
            llm_provider=payload.llm_provider,
            model_name=payload.model_name,
            request=request
        ),
        media_type="text/event-stream"
    )
