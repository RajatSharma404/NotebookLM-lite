import re
from typing import List, Dict, Any, Tuple
from rank_bm25 import BM25Okapi

class BM25Retriever:
    """
    Lightweight, high-speed sparse lexical search index for exact keyword matching.
    """
    @staticmethod
    def tokenize(text: str) -> List[str]:
        # Lowercase and extract alphanumeric words
        clean = text.lower()
        tokens = re.findall(r'\b[a-z0-9_-]+\b', clean)
        return tokens

    @classmethod
    def rank(
        cls,
        query: str,
        corpus_chunks: List[Dict[str, Any]],
        top_k: int = 20
    ) -> List[Tuple[str, float]]:
        """
        Ranks corpus_chunks against query using BM25Okapi.
        Each chunk dict should have 'id' and 'content'.
        Returns list of tuples: [(chunk_id, bm25_score), ...]
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
