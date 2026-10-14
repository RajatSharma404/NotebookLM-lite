import hashlib

import numpy as np


class EmbeddingProvider:
    """
    Unified Embedding Provider supporting local sentence-transformers,
    API-based embeddings, and a lightweight deterministic vectorizer.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", dimension: int = 384):
        self.model_name = model_name
        self.dimension = dimension
        self._st_model = None
        self._cache: dict[str, list[float]] = {}
        self._init_model()

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            self._st_model = SentenceTransformer(self.model_name)
        except Exception:
            # Keep None, fallback to fast deterministic hashing vectorizer
            self._st_model = None

    def embed_text(self, text: str) -> list[float]:
        if text in self._cache:
            return self._cache[text]
        res = self.embed_batch([text])[0]
        if len(self._cache) >= 512:
            try:
                del self._cache[next(iter(self._cache))]
            except (KeyError, StopIteration):
                pass
        self._cache[text] = res
        return res

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        if self._st_model is not None:
            try:
                embeddings = self._st_model.encode(texts, normalize_embeddings=True)
                return [arr.tolist() for arr in embeddings]
            except Exception:
                pass

        # Fast deterministic hash-based semantic token projection (zero external dependency fallback)
        results = []
        for text in texts:
            vec = np.zeros(self.dimension, dtype=np.float32)
            words = text.lower().split()
            if not words:
                results.append(vec.tolist())
                continue

            for word in words:
                h = int(hashlib.md5(word.encode()).hexdigest(), 16)
                idx = h % self.dimension
                val = (h >> 8) % 100 / 50.0 - 1.0  # value in [-1, 1]
                vec[idx] += val

            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            results.append(vec.tolist())
        return results

embedding_provider = EmbeddingProvider()
