from core.database import init_db, SessionLocal
from core.models import Notebook, Source
from core.ingest.pipeline import IngestionPipeline
from core.rag.retriever import HybridRetriever

def run_test():
    init_db()
    db = SessionLocal()

    try:
        nb = Notebook(title="Hybrid RAG Test Notebook")
        db.add(nb)
        db.commit()
        db.refresh(nb)

        # Ingest Document 1: Transformer & Attention
        doc1_text = """# Attention Mechanisms
Multi-head attention (MHA) allows the model to jointly attend to information from different representation subspaces.
Instead of performing a single attention function, we project queries, keys, and values h times with learned linear projections.
The scaled dot-product factor 1/sqrt(d_k) prevents gradients from vanishing in high dimension spaces.
"""
        src1 = IngestionPipeline.process_pasted_text(
            notebook_id=nb.id,
            title="Attention_Paper",
            content=doc1_text,
            db=db
        )

        # Ingest Document 2: Reinforcement Learning
        doc2_text = """# Reinforcement Learning
Proximal Policy Optimization (PPO) is an on-policy policy gradient method for reinforcement learning.
PPO seeks to improve training stability by preventing updates from shifting policy weights too far from previous iterations.
"""
        src2 = IngestionPipeline.process_pasted_text(
            notebook_id=nb.id,
            title="RL_Survey",
            content=doc2_text,
            db=db
        )

        print("[OK] Test sources ingested successfully.")

        # Test Query 1: Transformer query
        query1 = "How does multi-head attention project queries and keys?"
        context, citations = HybridRetriever.retrieve(query1, nb.id, db)

        print(f"[OK] Query 1 retrieved {len(citations)} citations:")
        for c in citations:
            print(f"    Citation [{c['index']}]: {c['source_title']} -> {c['snippet'][:60]}...")

        assert len(citations) > 0, "Should retrieve at least 1 citation"
        assert "Attention_Paper" in citations[0]["source_title"], "Top citation must be Attention_Paper"

        # Test Query 2: Exact acronym keyword search for PPO
        query2 = "What does PPO do in reinforcement learning?"
        context2, citations2 = HybridRetriever.retrieve(query2, nb.id, db)

        print(f"[OK] Query 2 (BM25 acronym) retrieved top citation: {citations2[0]['source_title']}")
        assert "RL_Survey" in citations2[0]["source_title"], "Top citation must be RL_Survey"

        # Test Scoping: Toggle doc1 inactive
        src1.is_active = False
        db.commit()

        context3, citations3 = HybridRetriever.retrieve(query1, nb.id, db)
        print(f"[OK] After toggling Attention inactive, retrieved {len(citations3)} citations.")
        for c in citations3:
            assert "Attention_Paper" not in c["source_title"], "Inactive source must NOT appear in context!"

        print("\nAll Hybrid RAG Retrieval tests passed with 100% precision!")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
