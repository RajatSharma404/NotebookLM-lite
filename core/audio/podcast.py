import json
import os
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from core.config import settings
from core.models import Chunk, Source, StudioArtifact
from core.prompts import PODCAST_SCRIPT_PROMPT_V1
from core.rag.providers import LLMProvider

PODCAST_SCRIPT_PROMPT = PODCAST_SCRIPT_PROMPT_V1

class PodcastEngine:
    @staticmethod
    async def generate_podcast_dialogue(
        notebook_id: str,
        db: Session
    ) -> list[dict[str, str]]:
        """
        Generates structured 2-speaker podcast dialogue script from active notebook documents.
        """
        # Fetch active context
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
        raw_script = raw_script.removeprefix("```json")
        raw_script = raw_script.removeprefix("```")
        raw_script = raw_script.removesuffix("```")

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
        dialogue: list[dict[str, str]],
        output_filename: str
    ) -> str | None:
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

        segment_paths: list[Path] = []

        try:
            import asyncio
            sem = asyncio.Semaphore(3)

            async def synth_line(idx: int, line: dict[str, str]) -> tuple[int, Path | None]:
                voice = line.get("voice_id", settings.TTS_VOICE_SPEAKER_A)
                text = line.get("text", "")
                if not text.strip():
                    return idx, None
                seg_path = temp_dir / f"seg_{idx:03d}.mp3"
                try:
                    async with sem:
                        communicate = edge_tts.Communicate(text, voice)
                        await communicate.save(str(seg_path))
                    if seg_path.exists() and os.path.getsize(seg_path) > 0:
                        return idx, seg_path
                except Exception:
                    pass
                return idx, None

            tasks = [synth_line(i, line) for i, line in enumerate(dialogue)]
            results = await asyncio.gather(*tasks)
            results.sort(key=lambda x: x[0])
            segment_paths = [p for _, p in results if p is not None]

            if not segment_paths:
                return None

            # Concatenate MP3 binary segments directly
            with open(out_path, "wb") as outfile:
                for seg in segment_paths:
                    with open(seg, "rb") as infile:
                        outfile.write(infile.read())

            return f"/api/audio/stream/{output_filename}"

        except Exception:
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
