import pytest
from core.models import Notebook, StudioArtifact
from core.ingest.pipeline import IngestionPipeline
from core.studio.generators import StudioGenerator
from core.audio.podcast import PodcastEngine

@pytest.fixture
def populated_notebook(db_session, test_notebook):
    """Seed test notebook with technical document content."""
    source_text = """# Positional Encoding in Transformers
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.
To this end, we add positional encodings to the input embeddings at the bottoms of the encoder and decoder stacks.
We use sine and cosine functions of different frequencies:
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
"""
    IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Positional_Encoding_Paper",
        content=source_text,
        db=db_session
    )
    return test_notebook

@pytest.mark.asyncio
async def test_study_guide_generation(db_session, populated_notebook):
    """Verify Study Guide studio artifact generation and structure."""
    study_guide = await StudioGenerator.generate_artifact(
        notebook_id=populated_notebook.id,
        artifact_type="study_guide",
        db=db_session
    )
    assert study_guide.id is not None
    assert study_guide.artifact_type == "study_guide"
    assert len(study_guide.content_markdown) > 50
    assert "Study Guide" in study_guide.title

@pytest.mark.asyncio
async def test_briefing_doc_generation(db_session, populated_notebook):
    """Verify Briefing Document studio artifact generation."""
    briefing = await StudioGenerator.generate_artifact(
        notebook_id=populated_notebook.id,
        artifact_type="briefing_doc",
        db=db_session
    )
    assert briefing.id is not None
    assert briefing.artifact_type == "briefing_doc"
    assert len(briefing.content_markdown) > 50

@pytest.mark.asyncio
async def test_audio_overview_podcast_generation(db_session, populated_notebook):
    """Verify two-host Audio Overview podcast script and audio generation."""
    podcast_art = await PodcastEngine.create_audio_overview(
        notebook_id=populated_notebook.id,
        db=db_session
    )
    assert podcast_art.id is not None
    assert podcast_art.artifact_type == "audio_overview"
    assert len(podcast_art.content_markdown) > 50
    # Must contain host dialogue turns
    assert "Host" in podcast_art.content_markdown

    # Verify studio artifacts count in DB
    artifacts = db_session.query(StudioArtifact).filter(
        StudioArtifact.notebook_id == populated_notebook.id
    ).all()
    assert len(artifacts) >= 1
