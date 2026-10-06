import asyncio
import json
from core.database import init_db, SessionLocal
from core.models import Notebook, ChatThread, Message, CitationRef
from core.ingest.pipeline import IngestionPipeline
from core.rag.generator import GroundedChatEngine

async def run_async_test():
    init_db()
    db = SessionLocal()

    try:
        nb = Notebook(title="Chat Stream Test Notebook")
        db.add(nb)
        db.commit()
        db.refresh(nb)

        # Ingest document
        doc_text = """# Scaled Dot-Product Attention
The two most commonly used attention functions are additive attention and dot-product attention.
Dot-product attention is much faster and more space-efficient in practice because it can be implemented using highly optimized matrix multiplication code.
While for small values of d_k the two mechanisms perform similarly, additive attention outperforms dot product attention without scaling for larger values of d_k.
"""
        src = IngestionPipeline.process_pasted_text(
            notebook_id=nb.id,
            title="Attention_Specs",
            content=doc_text,
            db=db
        )

        thread = ChatThread(notebook_id=nb.id, title="Test Thread")
        db.add(thread)
        db.commit()
        db.refresh(thread)

        print("[OK] Source ingested and thread created.")

        query = "Why is dot-product attention faster in practice?"
        print(f"\n[STREAMING] Prompt: '{query}'")

        sources_event_received = False
        token_count = 0
        done_event_received = False

        async for sse_chunk in GroundedChatEngine.stream_chat(
            query=query,
            notebook_id=nb.id,
            thread_id=thread.id,
            db=db
        ):
            lines = sse_chunk.strip().splitlines()
            for line in lines:
                if line.startswith("data: "):
                    payload = json.loads(line[6:])
                    event_type = payload.get("type")

                    if event_type == "sources":
                        sources_event_received = True
                        citations = payload.get("citations", [])
                        print(f"  -> Received citations event with {len(citations)} source(s):")
                        for c in citations:
                            print(f"     [{c['index']}] {c['source_title']} (p.{c['page_number']})")
                    elif event_type == "token":
                        token_count += 1
                        print(payload.get("content", ""), end="", flush=True)
                    elif event_type == "done":
                        done_event_received = True
                        print(f"\n  -> Received completion event for message: {payload.get('message_id')}")

        print("\n")
        assert sources_event_received, "Must receive 'sources' citation event"
        assert token_count > 0, "Must receive generated tokens"
        assert done_event_received, "Must receive 'done' event"

        # Verify database persistence
        messages = db.query(Message).filter(Message.thread_id == thread.id).all()
        print(f"[OK] Verified DB persistence: {len(messages)} messages stored in thread.")
        assert len(messages) == 2, "Expected 1 user message and 1 assistant message"

        assistant_msg = next(m for m in messages if m.role == "assistant")
        citations_db = db.query(CitationRef).filter(CitationRef.message_id == assistant_msg.id).all()
        print(f"[OK] Verified {len(citations_db)} citations persisted for assistant message.")
        assert len(citations_db) > 0, "At least 1 citation must be persisted"

        print("\nAll Grounded Streaming Chat & Citation tests passed successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_async_test())
