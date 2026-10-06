from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from core.config import settings

class ChromaVectorStore:
    def __init__(self, persist_dir: Optional[Path] = None):
        self.persist_dir = persist_dir or settings.STORAGE_VECTOR_DIR
        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.collection = self.client.get_or_create_collection(
            name="notebooklm_chunks",
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> None:
        """
        Adds chunk records with embeddings into ChromaDB.
        """
        if not chunks:
            return

        ids = [c["id"] for c in chunks]
        documents = [c["content"] for c in chunks]
        metadatas = [
            {
                "notebook_id": c["notebook_id"],
                "source_id": c["source_id"],
                "page_number": c.get("page_number", 1),
                "section_title": c.get("section_title", "General")
            }
            for c in chunks
        ]

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def delete_source_chunks(self, source_id: str) -> None:
        """
        Deletes all chunks belonging to a deleted source.
        """
        try:
            self.collection.delete(where={"source_id": source_id})
        except Exception:
            pass

    def query(
        self,
        query_embedding: List[float],
        notebook_id: str,
        active_source_ids: List[str],
        top_k: int = 15
    ) -> List[Dict[str, Any]]:
        """
        Queries ChromaDB filtered by notebook and active sources.
        """
        if not active_source_ids:
            return []

        where_clause = {
            "$and": [
                {"notebook_id": {"$eq": notebook_id}},
                {"source_id": {"$in": active_source_ids}}
            ]
        }

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_clause
        )

        output = []
        if results and "ids" in results and results["ids"]:
            ids = results["ids"][0]
            docs = results["documents"][0] if "documents" in results else []
            metas = results["metadatas"][0] if "metadatas" in results else []
            dists = results["distances"][0] if "distances" in results else []

            for i in range(len(ids)):
                output.append({
                    "id": ids[i],
                    "content": docs[i] if i < len(docs) else "",
                    "metadata": metas[i] if i < len(metas) else {},
                    "score": 1.0 - dists[i] if i < len(dists) else 0.0
                })
        return output

chroma_store = ChromaVectorStore()
