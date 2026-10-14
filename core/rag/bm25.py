import re
from typing import Any

from rank_bm25 import BM25Okapi


class BM25Retriever:
    """
    Dual-engine Sparse Lexical Search:
    Primary: SQLite FTS5 BM25 virtual table (sub-10ms latency across 50k+ chunks).
    Fallback: In-memory BM25Okapi for unindexed sessions and unit testing.
    """
    @staticmethod
    def tokenize(text: str) -> list[str]:
        clean = text.lower()
        return re.findall(r'\b[a-z0-9_-]+\b', clean)

    @classmethod
    def rank_with_fts5(
        cls,
        db: Any,
        query: str,
        notebook_id: str,
        active_source_ids: list[str] | None = None,
        corpus_chunks: list[dict[str, Any]] | None = None,
        top_k: int = 20
    ) -> list[tuple[str, float]]:
        """
        Executes fast FTS5 BM25 search with graceful in-memory fallback.
        """
        if db is not None:
            from core.rag.fts5 import FTS5IndexManager
            fts_results = FTS5IndexManager.search(
                db=db,
                query=query,
                notebook_id=notebook_id,
                active_source_ids=active_source_ids,
                top_k=top_k
            )
            if fts_results:
                return fts_results

        # Fallback to in-memory BM25 if FTS5 returned no matches or is not yet initialized
        if corpus_chunks:
            return cls.rank(query, corpus_chunks, top_k)
        return []

    @classmethod
    def rank(
        cls,
        query: str,
        corpus_chunks: list[dict[str, Any]],
        top_k: int = 20
    ) -> list[tuple[str, float]]:
        """
        In-memory fallback ranking using rank_bm25.BM25Okapi.
        """
        if not corpus_chunks or not query.strip():
            return []

        tokenized_corpus = [cls.tokenize(c["content"]) for c in corpus_chunks]
        tokenized_query = cls.tokenize(query)

        if not tokenized_query:
            return []

        bm25 = BM25Okapi(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)

        results = []
        for idx, score in enumerate(scores):
            if score > 0.0:
                results.append((corpus_chunks[idx]["id"], float(score)))

        # Sort descending by score
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
