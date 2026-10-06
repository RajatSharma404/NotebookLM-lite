import json
from typing import AsyncGenerator, Dict, Any, List
from sqlalchemy.orm import Session

from core.models import Notebook, ChatThread, Message, CitationRef
from core.rag.retriever import HybridRetriever
from core.rag.providers import LLMProvider

GROUNDING_SYSTEM_TEMPLATE = """You are NotebookLM-lite, a rigorous and grounded intellectual research partner.
Your task is to answer the user's inquiry STRICTLY and EXCLUSIVELY using the provided Source Context blocks below.

CORE GROUNDING RULES:
1. Every factual statement or assertion MUST be followed by an inline citation bracket like [1], [2], or [1, 3].
2. The number inside [X] must correspond EXACTLY to the numbered Source block [Source X] in the context.
3. If the provided sources DO NOT contain sufficient information to answer the question, state clearly:
   "Based on the provided sources, there is no information regarding this topic."
4. NEVER invent facts, infer beyond what is written, or pull knowledge from external training data.
5. Keep explanations clear, rigorous, and directly attributed.

--- SOURCE CONTEXT BEGIN ---
{context}
--- SOURCE CONTEXT END ---
"""

class GroundedChatEngine:
    @staticmethod
    async def stream_chat(
        query: str,
        notebook_id: str,
        thread_id: str,
        db: Session,
        llm_provider: str = None,
        model_name: str = None
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
        full_content_accum: List[str] = []

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
