"""
Golden Evaluation Corpus & Benchmark Test Matrix for NotebookLM-lite.
All synthetic questions are explicitly labeled with `is_synthetic: True`.
"""

from typing import Any

GOLDEN_DOCUMENTS: list[dict[str, Any]] = [
    {
        "id": "doc_transformer",
        "title": "Attention Mechanism and Transformer Architecture.txt",
        "chunks": [
            {
                "id": "chk_gold_trans_01",
                "page": 1,
                "section": "Introduction",
                "content": "The Transformer is a neural network architecture that eschews recurrence and convolutions, relying entirely on self-attention mechanisms to compute representations of input and output sequences. It achieves faster training times and superior parallelization compared to LSTM architectures."
            },
            {
                "id": "chk_gold_trans_02",
                "page": 2,
                "section": "Multi-Head Attention",
                "content": "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. Scaled dot-product attention computes queries, keys, and values with dimension d_k, dividing dot products by the square root of d_k."
            }
        ]
    },
    {
        "id": "doc_rag",
        "title": "Hybrid Retrieval-Augmented Generation.txt",
        "chunks": [
            {
                "id": "chk_gold_rag_01",
                "page": 1,
                "section": "Hybrid Search",
                "content": "Hybrid RAG combines dense semantic embedding search with sparse keyword search (BM25). Dense search captures semantic conceptual similarity, while sparse BM25 preserves exact terminology, acronyms, and alphanumeric identifiers."
            },
            {
                "id": "chk_gold_rag_02",
                "page": 2,
                "section": "Reciprocal Rank Fusion",
                "content": "Reciprocal Rank Fusion (RRF) merges disparate ranked candidate lists without requiring score normalization. With constant k=60, each document score is calculated as 1 / (60 + rank), rewarding items that rank well across both sparse and dense channels."
            }
        ]
    },
    {
        "id": "doc_sqlite",
        "title": "SQLite WAL Mode and Transaction Mechanics.txt",
        "chunks": [
            {
                "id": "chk_gold_sql_01",
                "page": 1,
                "section": "Write-Ahead Logging",
                "content": "Write-Ahead Logging (WAL) allows concurrent readers and writers in SQLite. Writers append changes to a separate -wal file while readers read snapshots from the main database, eliminating reader-writer lock contention."
            },
            {
                "id": "chk_gold_sql_02",
                "page": 2,
                "section": "Busy Timeout and Concurrency",
                "content": "Setting PRAGMA busy_timeout=5000 configures SQLite to sleep and retry locked transactions for up to 5000 milliseconds before raising an OperationalError: database is locked exception."
            }
        ]
    }
]

GOLDEN_EVAL_ITEMS: list[dict[str, Any]] = [
    # 1. Single-source questions (labeled synthetic)
    {
        "id": "eval_01",
        "query": "How does multi-head attention work in the Transformer?",
        "type": "single_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_trans_02"],
        "expected_facts": ["different representation subspaces", "scaled dot-product", "square root of d_k"],
        "should_abstain": False
    },
    {
        "id": "eval_02",
        "query": "Why does hybrid search combine dense and sparse BM25?",
        "type": "single_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_rag_01"],
        "expected_facts": ["semantic conceptual similarity", "exact terminology, acronyms"],
        "should_abstain": False
    },
    {
        "id": "eval_03",
        "query": "How does SQLite WAL mode prevent reader-writer contention?",
        "type": "single_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_sql_01"],
        "expected_facts": ["separate -wal file", "readers read snapshots"],
        "should_abstain": False
    },
    {
        "id": "eval_04",
        "query": "What role does busy_timeout play in SQLite?",
        "type": "single_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_sql_02"],
        "expected_facts": ["sleep and retry", "5000 milliseconds", "database is locked"],
        "should_abstain": False
    },

    # 2. Multi-source synthesis questions (labeled synthetic)
    {
        "id": "eval_05",
        "query": "Compare the scaling and concurrency advantages of Transformers versus SQLite WAL.",
        "type": "multi_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_trans_01", "chk_gold_sql_01"],
        "expected_facts": ["parallelization", "concurrent readers and writers", "-wal file"],
        "should_abstain": False
    },
    {
        "id": "eval_06",
        "query": "How does Reciprocal Rank Fusion merge sparse and dense rankings?",
        "type": "multi_source",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_rag_01", "chk_gold_rag_02"],
        "expected_facts": ["k=60", "1 / (60 + rank)", "without score normalization"],
        "should_abstain": False
    },

    # 3. Multi-turn follow-up questions (labeled synthetic)
    {
        "id": "eval_07",
        "query": "What constant is used in RRF?",
        "context_turn": "We were discussing Reciprocal Rank Fusion in RAG.",
        "type": "multi_turn",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_rag_02"],
        "expected_facts": ["constant k=60"],
        "should_abstain": False
    },
    {
        "id": "eval_08",
        "query": "What dimension are the queries and keys divided by?",
        "context_turn": "We were examining scaled dot-product attention.",
        "type": "multi_turn",
        "is_synthetic": True,
        "expected_chunk_ids": ["chk_gold_trans_02"],
        "expected_facts": ["square root of d_k"],
        "should_abstain": False
    },

    # 4. Unanswerable / Abstention questions (labeled synthetic)
    {
        "id": "eval_09",
        "query": "What is the quantum flux capacitor efficiency rating?",
        "type": "unanswerable",
        "is_synthetic": True,
        "expected_chunk_ids": [],
        "expected_facts": [],
        "should_abstain": True
    },
    {
        "id": "eval_10",
        "query": "Who won the 1994 FIFA World Cup final in football?",
        "type": "unanswerable",
        "is_synthetic": True,
        "expected_chunk_ids": [],
        "expected_facts": [],
        "should_abstain": True
    },
    {
        "id": "eval_11",
        "query": "What is the recommended dosage for paracetamol in pediatric patients?",
        "type": "unanswerable",
        "is_synthetic": True,
        "expected_chunk_ids": [],
        "expected_facts": [],
        "should_abstain": True
    }
]
