---
name: hybrid-rag-retrieval
description: >-
  Use this skill when implementing, tuning, or troubleshooting the dual-stage
  hybrid search (dense vector + BM25Okapi + Reciprocal Rank Fusion) and metadata
  filtering in NotebookLM-lite.
---

# Hybrid RAG Retrieval Skill

This skill outlines the standard operating procedure for constructing and maintaining the two-stage hybrid retrieval engine in NotebookLM-lite.

---

## 1. Vector Collection Management (ChromaDB)

1. **Collection Isolation**:
   - Create a single collection or per-notebook collections with metadata indexing:
     ```python
     collection = client.get_or_create_collection(
         name="notebook_chunks",
         metadata={"hnsw:space": "cosine"}
     )
     ```
2. **Metadata Filtering**:
   - Queries must always filter by `notebook_id` and the user's currently selected `active_source_ids`:
     ```python
     where_clause = {
         "$and": [
             {"notebook_id": {"$eq": notebook_id}},
             {"source_id": {"$in": active_source_ids}}
         ]
     }
     ```
3. **Dense Search Execution**:
   - Query embedding using normalized vectors. Retrieve top-20 candidates for rank fusion.

---

## 2. BM25 Sparse Keyword Indexing

Dense vector search often misses exact model numbers, acronyms, and proper nouns. BM25 provides precise lexical matching.

1. **Tokenization Pipeline**:
   - Lowercase text, strip punctuation, tokenize on whitespace, and remove excessive whitespace.
2. **Per-Notebook BM25 Index**:
   - Maintain a lightweight in-memory `BM25Okapi` index per notebook containing all active chunks.
   - When a source is toggled off, omit its chunks from the active BM25 search corpus.
3. **Sparse Search Execution**:
   - Tokenize user query and score all candidate chunks; return top-20 ranked chunk IDs.

---

## 3. Reciprocal Rank Fusion (RRF) Procedure

Combine the dense vector rank list and sparse BM25 rank list using Reciprocal Rank Fusion:

$$\text{Score}_{\text{RRF}}(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{bm25}}(d)}$$

### Fusion Algorithm:
```python
def reciprocal_rank_fusion(dense_rankings: list[str], bm25_rankings: list[str], k: int = 60) -> list[str]:
    scores = {}
    for rank, doc_id in enumerate(dense_rankings):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    for rank, doc_id in enumerate(bm25_rankings):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    # Sort descending by score
    sorted_docs = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [doc_id for doc_id, score in sorted_docs]
```

---

## 4. RAG Quality Validation (The RAG Triad)

Before returning context to the generation layer, perform sanity checks:
1. **Context Relevance**: Ensure retrieved chunks have cosine similarity > 0.4 or BM25 score > 0.
2. **Deduplication**: If two retrieved chunks share > 70% character overlap, retain only the higher-ranked chunk.
3. **Context Length Budget**: Cap total assembled context to the LLM's optimal attention window (default: top 6-8 chunks, ~3,500 tokens).
