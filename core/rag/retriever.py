import numpy as np
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from core.models import Chunk, Source
from core.rag.embeddings import embedding_provider
from core.rag.bm25 import BM25Retriever

class HybridRetriever:
    """
    Two-stage Hybrid Search:
    Stage 1A: Dense Cosine Similarity
    Stage 1B: Sparse BM25 Keyword Matching
    Stage 2: Reciprocal Rank Fusion (RRF)
    """
    @staticmethod
    def retrieve(
        query: str,
        notebook_id: str,
        db: Session,
        top_k: int = 6,
        rrf_constant: int = 60
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieves top grounded context chunks for a query strictly scoped to active sources.
        Returns:
            context_string: Formatted context blocks for system prompt
            citations: List of citation metadata dicts
        """
        # 1. Fetch only active chunks for the notebook
        active_chunks = (
            db.query(Chunk, Source.filename)
            .join(Source, Chunk.source_id == Source.id)
            .filter(
                Chunk.notebook_id == notebook_id,
                Source.is_active == True
            )
            .all()
        )

        if not active_chunks:
            return "", []

        # Prepare chunk data
        chunk_dicts = []
        chunk_id_map = {}
        for chunk, filename in active_chunks:
            data = {
                "id": chunk.id,
                "source_id": chunk.source_id,
                "source_title": filename,
                "page_number": chunk.page_number,
                "section_title": chunk.section_title or "General",
                "content": chunk.content
            }
            chunk_dicts.append(data)
            chunk_id_map[chunk.id] = data

        # 2. Dense Semantic Retrieval
        query_embedding = np.array(embedding_provider.embed_text(query), dtype=np.float32)
        chunk_embeddings = np.array(
            embedding_provider.embed_batch([c["content"] for c in chunk_dicts]),
            dtype=np.float32
        )

        # Dot product of normalized vectors = Cosine Similarity
        dense_scores = np.dot(chunk_embeddings, query_embedding)
        dense_ranked_indices = np.argsort(dense_scores)[::-1]
        dense_ranked_ids = [chunk_dicts[idx]["id"] for idx in dense_ranked_indices]

        # 3. Sparse BM25 Keyword Retrieval
        bm25_ranked = BM25Retriever.rank(query, chunk_dicts, top_k=len(chunk_dicts))
        bm25_ranked_ids = [cid for cid, _ in bm25_ranked]

        # 4. Reciprocal Rank Fusion (RRF)
        rrf_scores: Dict[str, float] = {}

        for rank, cid in enumerate(dense_ranked_ids):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (rrf_constant + rank + 1)

        for rank, cid in enumerate(bm25_ranked_ids):
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (rrf_constant + rank + 1)

        # Sort by final fused RRF score
        sorted_rrf = sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)
        top_selected_ids = [cid for cid, score in sorted_rrf[:top_k]]

        # 5. Format Context Blocks and Citations
        context_blocks = []
        citations = []

        for idx, cid in enumerate(top_selected_ids, start=1):
            chk = chunk_id_map[cid]
            block = f'[Source {idx}]: "{chk["source_title"]}" (Page {chk["page_number"]}, Section: {chk["section_title"]})\n"{chk["content"]}"'
            context_blocks.append(block)

            citations.append({
                "index": idx,
                "chunk_id": chk["id"],
                "source_id": chk["source_id"],
                "source_title": chk["source_title"],
                "page_number": chk["page_number"],
                "snippet": chk["content"][:240] + ("..." if len(chk["content"]) > 240 else "")
            })

        formatted_context = "\n\n".join(context_blocks)
        return formatted_context, citations
