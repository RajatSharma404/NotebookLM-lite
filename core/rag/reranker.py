from typing import Any

from core.telemetry import logger


class FlashRankReranker:
    """
    Cross-encoder re-ranking using FlashRank (ultra-fast, quantized ONNX cross-encoder).
    Re-ranks top candidate chunks to maximize precision and semantic relevance before generation.
    """
    def __init__(self, model_name: str = "ms-marco-TinyBERT-L-2-v2"):
        self.model_name = model_name
        self._ranker = None
        self._initialized = False

    def _get_ranker(self):
        if not self._initialized:
            self._initialized = True
            try:
                from flashrank import Ranker
                self._ranker = Ranker(model_name=self.model_name, cache_dir="storage/models")
            except Exception as e:
                logger.warning(f"FlashRank initialization noted ({e}); falling back to passthrough.")
                self._ranker = None
        return self._ranker

    def rerank(
        self,
        query: str,
        candidates: list[dict[str, Any]],
        top_k: int = 6
    ) -> list[dict[str, Any]]:
        """
        Reranks candidates list of dicts: [{"id": str, "content": str, ...}] against query.
        Returns top_k reranked dicts.
        """
        if not candidates or len(candidates) <= top_k or not query.strip():
            return candidates[:top_k]

        ranker = self._get_ranker()
        if ranker is None:
            return candidates[:top_k]

        try:
            from flashrank import RerankRequest

            passages = [
                {"id": idx, "text": c.get("content", c.get("text", ""))}
                for idx, c in enumerate(candidates)
            ]
            req = RerankRequest(query=query, passages=passages)
            ranked_passages = ranker.rerank(req)
            reranked = [candidates[item["id"]] for item in ranked_passages if item["id"] < len(candidates)]
            return reranked[:top_k] if reranked else candidates[:top_k]
        except Exception as e:
            logger.debug(f"FlashRank rerank fallback: {e}")
            return candidates[:top_k]


flashrank_reranker = FlashRankReranker()
