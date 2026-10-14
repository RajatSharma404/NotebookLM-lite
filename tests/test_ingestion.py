from core.ingest.pdf_parser import PDFParser
from core.ingest.pipeline import IngestionPipeline
from core.models import Chunk


def test_pasted_text_ingestion(db_session, test_notebook):
    """Test ingestion of markdown pasted text into sources and chunks."""
    test_markdown = """# Machine Learning Overview
Machine learning is a subset of artificial intelligence focused on building applications that learn from data.

## Supervised Learning
In supervised learning, models are trained using labeled datasets where the input features correspond to known target outcomes.
Common algorithms include linear regression, logistic regression, support vector machines, and random forests.

## Unsupervised Learning
Unsupervised learning models identify latent patterns, clusters, and representations from unlabeled datasets.
Examples include K-means clustering, hierarchical clustering, and principal component analysis.
"""
    source = IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="ML Overview",
        content=test_markdown,
        db=db_session
    )

    assert source.id is not None
    assert source.token_count > 0
    assert source.is_active is True

    # Verify generated chunks
    chunks = db_session.query(Chunk).filter(Chunk.source_id == source.id).all()
    assert len(chunks) >= 1
    for chk in chunks:
        assert chk.sha256 is not None
        assert len(chk.sha256) >= 16
        assert len(chk.content) > 0
        assert chk.notebook_id == test_notebook.id

def test_sliding_window_large_document(db_session, test_notebook):
    """Test chunking of long documents across sliding window boundaries."""
    large_content = "\n\n".join([
        f"Paragraph {i}: This is comprehensive research text discussing neural architectures, multi-head self-attention mechanisms, cross-attention projection layers, and empirical benchmark evaluations on extensive corpora." * 5
        for i in range(1, 20)
    ])

    source = IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Deep Neural Networks Extended",
        content=large_content,
        db=db_session
    )

    chunks = db_session.query(Chunk).filter(Chunk.source_id == source.id).all()
    assert len(chunks) > 1, "Large text should produce multiple sliding window chunks"

    # Verify chunk sequence offsets
    for i in range(len(chunks) - 1):
        assert chunks[i].char_start < chunks[i+1].char_start

def test_null_byte_stripping_and_sanitization():
    """Verify that null bytes are stripped and clean text is produced."""
    corrupted_text = "Machine Learning\x00 with null\x00 bytes inside\x00 text."
    cleaned = PDFParser.sanitize_text(corrupted_text)
    assert "\x00" not in cleaned
    assert "Machine Learning with null bytes inside text." == cleaned

def test_empty_content_handling(db_session, test_notebook):
    """Verify that empty pasted text handles gracefully."""
    source = IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Empty Doc",
        content="   ",
        db=db_session
    )
    assert source.token_count == 0
    chunks = db_session.query(Chunk).filter(Chunk.source_id == source.id).all()
    assert len(chunks) == 0
