import json
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from core.models import CitationRef, Message
from core.prompts import GROUNDING_SYSTEM_TEMPLATE_V1
from core.rag.providers import LLMProvider
from core.rag.retriever import HybridRetriever

GROUNDING_SYSTEM_TEMPLATE = GROUNDING_SYSTEM_TEMPLATE_V1

class GroundedChatEngine:
    @staticmethod
    async def stream_chat(
        query: str,
        notebook_id: str,
        thread_id: str,
        db: Session,
        llm_provider: str | None = None,
        model_name: str | None = None
    ) -> AsyncGenerator[str, None]:
        """
        Executes grounded retrieval, builds strict prompt, streams SSE events,
        and saves message and citation references to SQLite.
        """
        # 1. Retrieve hybrid context
        context_str, citations = HybridRetriever.retrieve(query, notebook_id, db)

        # Emit citations first
        yield f"data: {json.dumps({'type': 'sources', 'citations': citations})}\n\n"

        # Build system instruction
        system_instruction = GROUNDING_SYSTEM_TEMPLATE.format(context=context_str if context_str else "No active sources found.")

        # Save User Message to DB
        user_msg = Message(
            thread_id=thread_id,
            role="user",
            content=query
        )
        db.add(user_msg)
        db.commit()

        # Stream LLM tokens
        full_content_accum: list[str] = []

        async for token in LLMProvider.stream_response(
            prompt=query,
            system_instruction=system_instruction,
            provider=llm_provider,
            model=model_name
        ):
            full_content_accum.append(token)
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # Save Assistant Message and Citations to DB
        assistant_text = "".join(full_content_accum)
        assistant_msg = Message(
            thread_id=thread_id,
            role="assistant",
            content=assistant_text
        )
        db.add(assistant_msg)
        db.flush()

        # Persist Citations
        citation_records = []
        for cit in citations:
            rec = CitationRef(
                message_id=assistant_msg.id,
                citation_index=cit["index"],
                chunk_id=cit.get("chunk_id"),
                source_id=cit.get("source_id"),
                source_title=cit["source_title"],
                page_number=cit.get("page_number", 1),
                snippet=cit["snippet"]
            )
            citation_records.append(rec)

        db.add_all(citation_records)
        db.commit()

        # Emit completion
        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_msg.id})}\n\n"
