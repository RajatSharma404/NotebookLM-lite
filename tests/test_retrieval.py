from core.ingest.pipeline import IngestionPipeline
from core.models import Notebook
from core.rag.retriever import HybridRetriever


def test_hybrid_retrieval_semantic_matching(db_session, test_notebook):
    """Test dense and sparse hybrid retrieval matches semantic questions."""
    doc1_text = """# Attention Mechanisms
Multi-head attention (MHA) allows the model to jointly attend to information from different representation subspaces.
Instead of performing a single attention function, we project queries, keys, and values h times with learned linear projections.
The scaled dot-product factor 1/sqrt(d_k) prevents gradients from vanishing in high dimension spaces.
"""
    IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Attention_Paper",
        content=doc1_text,
        db=db_session
    )

    query = "How does multi-head attention project queries and keys?"
    _context, citations = HybridRetriever.retrieve(query, test_notebook.id, db_session)

    assert len(citations) > 0, "Should retrieve at least 1 citation"
    assert "Attention_Paper" in citations[0]["source_title"]
    assert citations[0]["index"] == 1
    assert "attention" in citations[0]["snippet"].lower()

def test_bm25_acronym_keyword_matching(db_session, test_notebook):
    """Test BM25 keyword matching for exact acronyms like PPO."""
    doc2_text = """# Reinforcement Learning
Proximal Policy Optimization (PPO) is an on-policy policy gradient method for reinforcement learning.
PPO seeks to improve training stability by preventing updates from shifting policy weights too far from previous iterations.
"""
    IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="RL_Survey",
        content=doc2_text,
        db=db_session
    )

    query = "What does PPO do in reinforcement learning?"
    _context, citations = HybridRetriever.retrieve(query, test_notebook.id, db_session)

    assert len(citations) > 0
    assert any("RL_Survey" in c["source_title"] for c in citations)

def test_inactive_source_scoping(db_session, test_notebook):
    """Test that toggling a source to is_active=False completely excludes it from retrieval."""
    doc_text = """# Secret Internal Specifications
The confidential project codename is Operation SilverArrow.
"""
    src = IngestionPipeline.process_pasted_text(
        notebook_id=test_notebook.id,
        title="Confidential_Doc",
        content=doc_text,
        db=db_session
    )

    # First verify it is retrieved when active
    _, citations_active = HybridRetriever.retrieve("What is the project codename?", test_notebook.id, db_session)
    assert any("Confidential_Doc" in c["source_title"] for c in citations_active)

    # Now deactivate source
    src.is_active = False
    db_session.commit()

    _, citations_inactive = HybridRetriever.retrieve("What is the project codename?", test_notebook.id, db_session)
    for c in citations_inactive:
        assert "Confidential_Doc" not in c["source_title"], "Inactive source must NOT appear in retrieval!"

def test_empty_notebook_retrieval(db_session):
    """Test retrieval on a notebook with zero sources returns empty results without crashing."""
    empty_nb = Notebook(title="Empty Notebook")
    db_session.add(empty_nb)
    db_session.commit()
    db_session.refresh(empty_nb)

    context, citations = HybridRetriever.retrieve("Any query here", empty_nb.id, db_session)
    assert context == ""
    assert citations == []
