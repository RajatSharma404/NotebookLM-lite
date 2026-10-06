import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from core.models import Source, Chunk, StudioArtifact
from core.rag.providers import LLMProvider

STUDIO_PROMPTS = {
    "study_guide": """You are an elite academic educator. Generate a structured, comprehensive Study Guide based exclusively on the provided document sources.
Structure your output in Markdown with the following exact sections:
# Study Guide: Comprehensive Synthesis

## 1. Executive Summary & Core Thesis
(Provide a 2-3 paragraph foundational overview of the subject matter)

## 2. Key Concepts & Principles
(Provide a detailed bulleted breakdown of fundamental concepts, mechanisms, and rules explained in the text)

## 3. In-Depth Technical Analysis
(Elaborate on methodologies, formulas, and structural relationships described)

## 4. Deep Review Questions
(Provide 5 challenging conceptual questions that test comprehension)

## 5. Practice Quiz & Answer Key
(Provide 3 multiple choice questions and 2 short answer questions with answers revealed at the end)
""",

    "briefing_doc": """You are a senior strategic research analyst. Create an Executive Briefing Document based exclusively on the provided sources.
Structure your output in Markdown with the following exact sections:
# Executive Briefing Document

## 1. Executive Summary
(High-level synthesis for senior decision makers)

## 2. Key Findings & Core Contributions
(Bullet points detailing concrete discoveries, novel insights, or benchmark findings)

## 3. Strategic Implications & Technical Trade-offs
(Nuanced analysis of advantages, constraints, limitations, and resource demands)

## 4. Recommendations & Next Action Items
(Actionable conclusions directly supported by the text)
""",

    "faq": """You are an expert technical communicator. Generate a comprehensive FAQ & Glossary based exclusively on the provided sources.
Structure your output in Markdown with the following exact sections:
# Frequently Asked Questions & Domain Glossary

## Part 1: Core FAQs
(8-10 high-value questions framed from a curious reader's perspective, answered rigorously with source attribution)

## Part 2: Comprehensive Domain Glossary
(Alphabetized list of domain-specific terminology, mathematical notations, and acronyms with authoritative definitions)
""",

    "timeline": """You are a historical and chronological research specialist. Extract a Chronological Timeline of events, milestones, or developmental phases from the provided sources.
Structure your output in Markdown with the following exact sections:
# Chronological Milestones & Event Timeline

## Overview
(Brief summary of the developmental arc presented across the documents)

## Milestone Sequence
(Format as a Markdown table: | Phase / Date | Event / Discovery | Impact / Context |)

## Key Turning Points
(Bulleted analysis of critical inflections described in the text)
"""
}

class StudioGenerator:
    @staticmethod
    async def generate_artifact(
        notebook_id: str,
        artifact_type: str,
        db: Session,
        custom_instructions: str = None
    ) -> StudioArtifact:
        # Fetch active chunks
        active_chunks = (
            db.query(Chunk, Source.filename)
            .join(Source, Chunk.source_id == Source.id)
            .filter(
                Chunk.notebook_id == notebook_id,
                Source.is_active == True
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
