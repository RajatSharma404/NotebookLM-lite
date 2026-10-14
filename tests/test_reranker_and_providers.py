from core.rag.providers import LLMProvider
from core.rag.reranker import FlashRankReranker


def test_flashrank_reranker_basic_and_fallback():
    reranker = FlashRankReranker()
    query = "What is the capital of France?"
    candidates = [
        {"id": "c1", "content": "Berlin is the capital of Germany and known for technology and art."},
        {"id": "c2", "content": "Paris is the capital of France and situated along the Seine River."},
        {"id": "c3", "content": "Tokyo is the capital of Japan and the most populous metropolitan area."},
        {"id": "c4", "content": "Rome is the capital of Italy and home to the Vatican."}
    ]

    reranked = reranker.rerank(query, candidates, top_k=2)
    assert len(reranked) == 2
    # The top result should be c2 (Paris, France)
    assert reranked[0]["id"] == "c2"

def test_context_budget_enforcement():
    short_prompt = "Summarize quantum physics."
    short_system = "You are a physics expert."
    p, s = LLMProvider.enforce_context_budget(short_prompt, short_system, max_tokens=1000)
    assert p == short_prompt
    assert s == short_system

    # Oversized context exceeding max_tokens
    long_system = "\n".join([f"Line {i}: Detailed context about domain physics." for i in range(200)])
    p2, s2 = LLMProvider.enforce_context_budget(short_prompt, long_system, max_tokens=100)
    assert p2 == short_prompt
    # System instruction trimmed
    assert len(s2) < len(long_system)
