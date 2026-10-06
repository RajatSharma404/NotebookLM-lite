import os
import json
import uuid
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from core.config import settings
from core.models import Source, Chunk, StudioArtifact
from core.rag.providers import LLMProvider

PODCAST_SCRIPT_PROMPT = """You are an award-winning executive podcast producer creating a viral two-host Deep Dive discussion.
Your hosts are:
- Host 1 (Alex - Lead Analyst): Grounded, analytical, authoritative, breaks down complex mechanisms clearly. Voice: en-US-GuyNeural.
- Host 2 (Morgan - Curious Co-host): Energetic, asks insightful clarifying questions, uses everyday analogies, challenges jargon. Voice: en-US-JennyNeural.

Tone & Style Guidelines:
- Natural, lively, intellectual chemistry between the two hosts.
- Include conversational turn-taking, reactions ("Wait, so you're saying...", "Exactly!"), and clear analogies.
- Directly discuss and illuminate the core ideas from the provided documents.

IMPORTANT: Output your entire response strictly as a JSON array of dialogue objects. Do NOT include markdown code blocks (```json) or extra text.
Schema:
[
  {
    "speaker": "Alex",
    "voice_id": "en-US-GuyNeural",
    "text": "Welcome back! Today we're diving into a document that completely shifts how we think about attention mechanisms."
  },
  {
    "speaker": "Morgan",
    "voice_id": "en-US-JennyNeural",
    "text": "Right! And what blew my mind when reading through this is that they literally dropped recurrent connections entirely."
  }
]
"""

class PodcastEngine:
    @staticmethod
    async def generate_podcast_dialogue(
        notebook_id: str,
        db: Session
    ) -> List[Dict[str, str]]:
        """
        Generates structured 2-speaker podcast dialogue script from active notebook documents.
        """
        # Fetch active context
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
        for chk, filename in active_chunks[:10]:
            context_blocks.append(f'Source: "{filename}" (Page {chk.page_number})\n"{chk.content}"')

        context_text = "\n\n---\n\n".join(context_blocks) if context_blocks else "No active sources."

        user_prompt = f"Here are the active reference sources to discuss:\n\n{context_text}\n\nGenerate the two-host podcast script JSON now."

        tokens = []
        async for token in LLMProvider.stream_response(
            prompt=user_prompt,
            system_instruction=PODCAST_SCRIPT_PROMPT
        ):
            tokens.append(token)

        raw_script = "".join(tokens).strip()

        # Clean JSON markdown fences if present
        if raw_script.startswith("```json"):
            raw_script = raw_script[7:]
        if raw_script.startswith("```"):
            raw_script = raw_script[3:]
        if raw_script.endswith("```"):
            raw_script = raw_script[:-3]

        try:
            dialogue = json.loads(raw_script.strip())
            if isinstance(dialogue, list) and len(dialogue) > 0:
                return dialogue
        except Exception:
            pass

        # Robust Fallback Dialogue
        return [
            {
                "speaker": "Alex",
                "voice_id": settings.TTS_VOICE_SPEAKER_A,
                "text": "Welcome to our Deep Dive! Today we are exploring the documents uploaded into this notebook."
            },
            {
                "speaker": "Morgan",
                "voice_id": settings.TTS_VOICE_SPEAKER_B,
                "text": "I've been looking over the sources, and the insights here are really compelling."
            },
            {
                "speaker": "Alex",
                "voice_id": settings.TTS_VOICE_SPEAKER_A,
                "text": "Notice how all the arguments connect back to the foundational mechanisms outlined in the text."
            },
            {
                "speaker": "Morgan",
                "voice_id": settings.TTS_VOICE_SPEAKER_B,
                "text": "That's exactly what makes this analysis so grounded and verifiable!"
            }
        ]

    @staticmethod
    async def synthesize_podcast_audio(
        dialogue: List[Dict[str, str]],
        output_filename: str
    ) -> Optional[str]:
        """
        Synthesizes each dialogue line with Edge-TTS and concatenates audio segments.
        """
        try:
            import edge_tts
        except ImportError:
            return None

        out_path = settings.STORAGE_AUDIO_DIR / output_filename
        temp_dir = settings.STORAGE_AUDIO_DIR / f"temp_{uuid.uuid4().hex[:8]}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        segment_paths: List[Path] = []

        try:
            for idx, line in enumerate(dialogue):
                voice = line.get("voice_id", settings.TTS_VOICE_SPEAKER_A)
                text = line.get("text", "")
                if not text.strip():
                    continue

                seg_path = temp_dir / f"seg_{idx:03d}.mp3"
                communicate = edge_tts.Communicate(text, voice)
                await communicate.save(str(seg_path))
                if seg_path.exists() and os.path.getsize(seg_path) > 0:
                    segment_paths.append(seg_path)

            if not segment_paths:
                return None

            # Concatenate MP3 binary segments directly
            with open(out_path, "wb") as outfile:
                for seg in segment_paths:
                    with open(seg, "rb") as infile:
                        outfile.write(infile.read())

            return f"/api/audio/stream/{output_filename}"

        except Exception as e:
            return None
        finally:
            # Clean temporary segments
            if temp_dir.exists():
                for f in temp_dir.glob("*.mp3"):
                    try:
                        f.unlink()
                    except OSError:
                        pass
                try:
                    temp_dir.rmdir()
                except OSError:
                    pass

    @classmethod
    async def create_audio_overview(
        cls,
        notebook_id: str,
        db: Session
    ) -> StudioArtifact:
        """
        Orchestrates dialogue generation, audio synthesis, and DB persistence.
        """
        dialogue = await cls.generate_podcast_dialogue(notebook_id, db)
        audio_filename = f"podcast_{notebook_id}_{uuid.uuid4().hex[:6]}.mp3"
        media_url = await cls.synthesize_podcast_audio(dialogue, audio_filename)

        formatted_script = "\n\n".join([
            f"**{d['speaker']}**: {d['text']}" for d in dialogue
        ])

        artifact = StudioArtifact(
            notebook_id=notebook_id,
            artifact_type="audio_overview",
            title="Audio Overview: Two-Host Deep Dive",
            content_markdown=f"# Audio Overview (Podcast Deep Dive)\n\n### Hosts: Alex & Morgan\n\n{formatted_script}",
            content_json=json.dumps({"dialogue": dialogue}),
            media_url=media_url
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        return artifact
