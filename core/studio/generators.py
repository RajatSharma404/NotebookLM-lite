import json

from sqlalchemy.orm import Session

from core.models import Chunk, Source, StudioArtifact
from core.prompts import STUDIO_PROMPTS_V1
from core.rag.providers import LLMProvider

STUDIO_PROMPTS = STUDIO_PROMPTS_V1

class StudioGenerator:
    @staticmethod
    async def generate_artifact(
        notebook_id: str,
        artifact_type: str,
        db: Session,
        custom_instructions: str | None = None
    ) -> StudioArtifact:
        # Fetch active chunks
        active_chunks = (
            db.query(Chunk, Source.filename)
            .join(Source, Chunk.source_id == Source.id)
            .filter(
                Chunk.notebook_id == notebook_id,
                Source.is_active
            )
            .all()
        )

        context_blocks = []
        for chk, filename in active_chunks[:12]:
            context_blocks.append(f'Source: "{filename}" (Page {chk.page_number})\n"{chk.content}"')

        context_text = "\n\n---\n\n".join(context_blocks) if context_blocks else "No active documents found."

        system_prompt = STUDIO_PROMPTS.get(artifact_type, STUDIO_PROMPTS["study_guide"])
        if custom_instructions:
            system_prompt += f"\n\nAdditional User Guidance:\n{custom_instructions}"

        user_prompt = f"Here are the active reference sources:\n\n{context_text}\n\nGenerate the complete artifact now."

        # Generate markdown via LLM
        tokens = []
        async for token in LLMProvider.stream_response(
            prompt=user_prompt,
            system_instruction=system_prompt
        ):
            tokens.append(token)

        generated_markdown = "".join(tokens)
        title_map = {
            "study_guide": "Comprehensive Study Guide",
            "briefing_doc": "Executive Briefing Document",
            "faq": "FAQ & Domain Glossary",
            "timeline": "Chronological Timeline"
        }

        artifact = StudioArtifact(
            notebook_id=notebook_id,
            artifact_type=artifact_type,
            title=title_map.get(artifact_type, "Generated Artifact"),
            content_markdown=generated_markdown,
            content_json=json.dumps({"type": artifact_type, "generated_from_sources": len(active_chunks)})
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        return artifact
