from collections.abc import AsyncGenerator

import numpy as np


class FakeLLMProvider:
    """
    Deterministic LLM Provider for unit, integration, characterization, and eval tests.
    Produces repeatable streams containing grounded claims and [n] citations without network calls.
    """
    @staticmethod
    async def stream_response(
        prompt: str,
        system_instruction: str,
        provider: str | None = None,
        model: str | None = None
    ) -> AsyncGenerator[str, None]:
        prompt_lower = prompt.lower()

        # Check for unanswerable trigger
        if "unanswerable" in prompt_lower or "unknown" in prompt_lower or "quantum flux" in prompt_lower:
            tokens = [
                "Based ", "on ", "the ", "provided ", "sources, ",
                "there ", "is ", "no ", "information ", "regarding ",
                "this ", "topic."
            ]
            for token in tokens:
                yield token
            return

        # Check for studio generation prompts
        if "study guide" in system_instruction.lower() or "study guide" in prompt_lower:
            tokens = [
                "# Study Guide: Comprehensive Synthesis\n\n",
                "## 1. Executive Summary & Core Thesis\n",
                "This document covers core foundational architectures and methodologies [1].\n\n",
                "## 2. Key Concepts & Principles\n",
                "- Principle A: High cohesion and decoupled processing [1].\n",
                "- Principle B: Scalable linear representation [2].\n\n",
                "## 3. In-Depth Technical Analysis\n",
                "Detailed mathematical formulations demonstrate optimal performance [1, 2].\n\n",
                "## 4. Deep Review Questions\n",
                "1. What is the fundamental mechanism [1]?\n\n",
                "## 5. Practice Quiz & Answer Key\n",
                "Q1: How does retrieval scale? A: Logarithmically.\n"
            ]
            for token in tokens:
                yield token
            return

        if "podcast" in system_instruction.lower() or "dialogue objects" in system_instruction.lower():
            json_script = (
                '[\n'
                '  {\n'
                '    "speaker": "Alex",\n'
                '    "voice_id": "en-US-GuyNeural",\n'
                '    "text": "Welcome! Today we are looking at a breakthrough architecture [1]."\n'
                '  },\n'
                '  {\n'
                '    "speaker": "Morgan",\n'
                '    "voice_id": "en-US-JennyNeural",\n'
                '    "text": "What surprised me most is how efficient the retrieval stage is [2]."\n'
                '  }\n'
                ']'
            )
            # Yield in chunks
            for i in range(0, len(json_script), 15):
                yield json_script[i:i+15]
            return

        # Standard Grounded Q&A response
        tokens = [
            "According ", "to ", "the ", "analyzed ", "research ", "documentation, ",
            "the ", "primary ", "architecture ", "relies ", "on ", "hybrid ",
            "retrieval ", "[1]. ",
            "Furthermore, ", "cross-encoder ", "reranking ", "significantly ",
            "improves ", "top-k ", "precision ", "[2]. ",
            "In ", "conclusion, ", "grounded ", "generation ", "prevents ", "hallucinations ", "[1, 2]."
        ]
        for token in tokens:
            yield token


class FakeEmbeddingProvider:
    """
    Deterministic 384-dimension vectorizer for fast test execution.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def embed_text(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        import hashlib
        results = []
        for text in texts:
            vec = np.zeros(self.dimension, dtype=np.float32)
            words = text.lower().split()
            if not words:
                results.append(vec.tolist())
                continue
            for word in words:
                h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
                idx = h % self.dimension
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            results.append(vec.tolist())
        return results
