import asyncio
from core.database import init_db, SessionLocal
from core.models import Notebook, StudioArtifact
from core.ingest.pipeline import IngestionPipeline
from core.studio.generators import StudioGenerator
from core.audio.podcast import PodcastEngine

async def run_async_test():
    init_db()
    db = SessionLocal()

    try:
        nb = Notebook(title="Studio & Audio Test Notebook")
        db.add(nb)
        db.commit()
        db.refresh(nb)

        # Ingest test source
        source_text = """# Positional Encoding in Transformers
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.
To this end, we add positional encodings to the input embeddings at the bottoms of the encoder and decoder stacks.
We use sine and cosine functions of different frequencies:
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
"""
        src = IngestionPipeline.process_pasted_text(
            notebook_id=nb.id,
            title="Positional_Encoding_Paper",
            content=source_text,
            db=db
        )

        print("[OK] Source ingested for Studio tests.")

        # Test 1: Study Guide Generator
        study_guide = await StudioGenerator.generate_artifact(
            notebook_id=nb.id,
            artifact_type="study_guide",
            db=db
        )
        print(f"[OK] Study Guide Generated: '{study_guide.title}' ({len(study_guide.content_markdown)} chars)")
        assert len(study_guide.content_markdown) > 50, "Study Guide markdown must not be empty"

        # Test 2: Briefing Doc Generator
        briefing = await StudioGenerator.generate_artifact(
            notebook_id=nb.id,
            artifact_type="briefing_doc",
            db=db
        )
        print(f"[OK] Briefing Doc Generated: '{briefing.title}' ({len(briefing.content_markdown)} chars)")
        assert len(briefing.content_markdown) > 50, "Briefing Doc markdown must not be empty"

        # Test 3: Audio Overview Podcast Dialogue & Synthesis
        podcast_art = await PodcastEngine.create_audio_overview(
            notebook_id=nb.id,
            db=db
        )
        print(f"[OK] Audio Overview Generated: '{podcast_art.title}'")
        print(f"     Script Preview: {podcast_art.content_markdown[:150]}...")
        if podcast_art.media_url:
            print(f"     Audio stream URL: {podcast_art.media_url}")
        else:
            print("     (TTS synthesized in transcript mode)")

        # Verify DB records
        artifacts_db = db.query(StudioArtifact).filter(StudioArtifact.notebook_id == nb.id).all()
        print(f"[OK] Verified DB records: {len(artifacts_db)} studio artifacts stored.")
        assert len(artifacts_db) == 3, "Expected 3 generated studio artifacts in DB"

        print("\nAll Studio Artifacts & Audio Overview tests passed successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_async_test())
