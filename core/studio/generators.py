from sqlalchemy.orm import Session

from core.models import Chunk, Source, StudioArtifact
from core.prompts import STUDIO_PROMPTS_V1
from core.rag.providers import LLMProvider
from core.telemetry import logger

STUDIO_PROMPTS = STUDIO_PROMPTS_V1


class StudioGenerator:
    @classmethod
    async def _map_partition(cls, chunks: list[tuple[Chunk, str]]) -> str:
        """Map phase: extracts condensed key findings and facts from a partition of source chunks."""
        blocks = [f'Source: "{filename}" (Page {chk.page_number})\n"{chk.content}"' for chk, filename in chunks]
        prompt = "Extract and bullet-point the key facts, findings, definitions, and conclusions from these excerpts:\n\n" + "\n\n---\n\n".join(blocks)
        tokens = []
        async for token in LLMProvider.stream_response(
            prompt=prompt,
            system_instruction="You are a research distillation assistant. Output structured bullet points of key facts."
        ):
            tokens.append(token)
        return "".join(tokens)

    @classmethod
    async def generate_artifact(
        cls,
        notebook_id: str,
        artifact_type: str,
        db: Session,
        custom_instructions: str | None = None
    ) -> StudioArtifact:
        """
        Generates studio artifacts with Corpus-Wide Map-Reduce synthesis when source count is large.
        """
        # Fetch all active chunks for notebook
        active_chunks = (
            db.query(Chunk, Source.filename)
            .join(Source, Chunk.source_id == Source.id)
            .filter(
                Chunk.notebook_id == notebook_id,
                Source.is_active
            )
            .all()
        )

        if not active_chunks:
            context_text = "No active documents found in this notebook."
        elif len(active_chunks) <= 12:
            # Direct generation for small to medium document corpuses
            context_blocks = [f'Source: "{filename}" (Page {chk.page_number})\n"{chk.content}"' for chk, filename in active_chunks]
            context_text = "\n\n---\n\n".join(context_blocks)
        else:
            # Map-Reduce generation for large corpuses (>12 chunks)
            logger.info(f"Executing Map-Reduce studio synthesis across {len(active_chunks)} active chunks...")
            batch_size = 8
            batches = [active_chunks[i:i + batch_size] for i in range(0, len(active_chunks), batch_size)]

            # Map phase
            mapped_summaries = []
            for b in batches[:6]:  # Cap map iterations for response latency
                summary = await cls._map_partition(b)
                mapped_summaries.append(summary)

            # Reduce context
            context_text = "Corpus Synthesis Summaries:\n\n" + "\n\n---\n\n".join(mapped_summaries)

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
            title=title_map.get(artifact_type, "Generated Studio Artifact"),
            content_markdown=generated_markdown,
            chunks_total=len(active_chunks),
            chunks_used=min(len(active_chunks), 12),
            sources_used=len({filename for _, filename in active_chunks})
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)

        return artifact
