import tempfile
from pathlib import Path
from core.database import init_db, SessionLocal
from core.models import Notebook, Source, Chunk
from core.ingest.pipeline import IngestionPipeline

def run_test():
    init_db()
    db = SessionLocal()

    try:
        # Create a test notebook
        nb = Notebook(title="Ingestion Test Notebook")
        db.add(nb)
        db.commit()
        db.refresh(nb)

        print(f"[OK] Created notebook: {nb.id}")

        # Test pasted text ingestion
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
            notebook_id=nb.id,
            title="ML Overview",
            content=test_markdown,
            db=db
        )

        print(f"[OK] Ingested source: {source.filename} (tokens: {source.token_count})")
        assert source.token_count > 0, "Token count should be greater than 0"

        # Check chunks
        chunks = db.query(Chunk).filter(Chunk.source_id == source.id).all()
        print(f"[OK] Generated {len(chunks)} chunks:")
        for i, chk in enumerate(chunks, 1):
            print(f"    Chunk {i}: Section='{chk.section_title}', Chars={chk.char_end - chk.char_start}, SHA={chk.sha256}")
            assert chk.sha256 is not None, "SHA256 must be present"
            assert len(chk.content) > 0, "Content must not be empty"

        # Test multi-chunk large document
        large_content = "\n\n".join([f"Paragraph {i}: This is comprehensive research text discussing neural architectures, multi-head self-attention mechanisms, cross-attention projection layers, and empirical benchmark evaluations on extensive corpora." * 5 for i in range(1, 20)])
        
        large_source = IngestionPipeline.process_pasted_text(
            notebook_id=nb.id,
            title="Deep Neural Networks Extended",
            content=large_content,
            db=db
        )
        large_chunks = db.query(Chunk).filter(Chunk.source_id == large_source.id).all()
        print(f"[OK] Large source chunked into {len(large_chunks)} sliding-window chunks.")
        assert len(large_chunks) > 1, "Large text should produce multiple chunks"

        print("\nAll Ingestion Pipeline tests passed successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
