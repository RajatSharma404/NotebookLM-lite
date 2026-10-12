import json
import pytest
from core.models import Notebook, ChatThread, Message, CitationRef
from core.ingest.pipeline import IngestionPipeline
from core.rag.generator import GroundedChatEngine

@pytest.mark.asyncio
async def test_grounded_streaming_chat(db_session, test_notebook):
    """Test SSE streaming chat events and grounded citation generation."""
    doc_text = """# Scaled Dot-Product Attention
The two most commonly used attention functions are additive attention and dot-product attention.
Dot-product attention is much faster and more space-efficient in practice because it can be implemented using highly optimized matrix multiplication code.
While for small values of d_k the two mechanisms perform similarly, additive attention outperforms dot product attention without scaling for larger values of d_k.
"""
    IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Attention_Specs",
        content=doc_text,
        db=db_session
    )

    thread = ChatThread(notebook_id=test_notebook.id, title="Test Stream Thread")
    db_session.add(thread)
    db_session.commit()
    db_session.refresh(thread)

    query = "Why is dot-product attention faster in practice?"

    sources_event_received = False
    tokens_received = []
    done_event_received = False

    async for sse_chunk in GroundedChatEngine.stream_chat(
        query=query,
        notebook_id=test_notebook.id,
        thread_id=thread.id,
        db=db_session
    ):
        lines = sse_chunk.strip().splitlines()
        for line in lines:
            if line.startswith("data: "):
                payload = json.loads(line[6:])
                event_type = payload.get("type")

                if event_type == "sources":
                    sources_event_received = True
                    citations = payload.get("citations", [])
                    assert len(citations) > 0, "Citations list in sources event must not be empty"
                elif event_type == "token":
                    tokens_received.append(payload.get("content", ""))
                elif event_type == "done":
                    done_event_received = True
                    assert payload.get("message_id") is not None

    assert sources_event_received, "Must receive 'sources' event before tokens"
    assert len(tokens_received) > 0, "Must receive token stream"
    assert done_event_received, "Must receive completion 'done' event"

    # Verify database persistence
    messages = db_session.query(Message).filter(Message.thread_id == thread.id).all()
    assert len(messages) == 2, "Expected 1 user message and 1 assistant message"

    user_msg = next(m for m in messages if m.role == "user")
    assert user_msg.content == query

    assistant_msg = next(m for m in messages if m.role == "assistant")
    assert len(assistant_msg.content) > 0

    citations_db = db_session.query(CitationRef).filter(CitationRef.message_id == assistant_msg.id).all()
    assert len(citations_db) > 0, "At least 1 citation must be persisted in DB"
    assert "Attention_Specs" in citations_db[0].source_title
