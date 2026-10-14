import asyncio
import time
import tracemalloc

import pytest

from core.rag.bm25 import BM25Retriever


@pytest.mark.slow
@pytest.mark.asyncio
async def test_event_loop_lag_heartbeat():
    """
    Measures event-loop lag (p50, p95, p99) by running a background ticker
    while executing simulated concurrent tasks.
    """
    lag_measurements = []
    stop_event = asyncio.Event()

    async def heartbeat():
        target_interval = 0.01  # 10ms
        while not stop_event.is_set():
            t0 = time.perf_counter()
            await asyncio.sleep(target_interval)
            actual_delay = time.perf_counter() - t0
            lag = max(0.0, (actual_delay - target_interval) * 1000.0)  # in ms
            lag_measurements.append(lag)

    heartbeat_task = asyncio.create_task(heartbeat())

    # Simulate concurrent light I/O
    async def simulated_work():
        await asyncio.sleep(0.05)

    await asyncio.gather(*(simulated_work() for _ in range(20)))
    stop_event.set()
    await heartbeat_task

    import numpy as np
    p50 = float(np.percentile(lag_measurements, 50)) if lag_measurements else 0.0
    p95 = float(np.percentile(lag_measurements, 95)) if lag_measurements else 0.0
    p99 = float(np.percentile(lag_measurements, 99)) if lag_measurements else 0.0

    print(f"\n[Baseline Event-Loop Lag] p50: {p50:.2f}ms | p95: {p95:.2f}ms | p99: {p99:.2f}ms")
    assert p95 < 200.0, f"Event loop lag p95 too high: {p95}ms"


def benchmark_bm25_retrieval(corpus_size: int):
    """
    Measures latency and memory allocation of the current in-memory BM25 retrieval
    at corpus sizes: 1k, 10k, 50k chunks.
    """
    tracemalloc.start()
    sample_text = (
        "The transformer architecture relies on self-attention mechanisms and eliminates recurrent connections. "
        "Reciprocal rank fusion merges sparse BM25 and dense embeddings with high precision."
    )
    chunks = [
        {"id": f"chk_{i}", "content": f"{sample_text} Chunk index {i}", "source_title": "Doc", "page_number": 1, "section_title": "Sec"}
        for i in range(corpus_size)
    ]

    t0 = time.perf_counter()
    BM25Retriever.rank("transformer self-attention", chunks, top_k=6)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    _current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    peak_mb = peak_mem / (1024 * 1024)
    return elapsed_ms, peak_mb


@pytest.mark.slow
def test_retrieval_corpus_scaling():
    """
    Benchmarks retrieval latency and memory across 1k, 10k, 50k chunks.
    """
    sizes = [1000, 10000, 50000]
    results = {}
    for sz in sizes:
        latency_ms, mem_mb = benchmark_bm25_retrieval(sz)
        results[sz] = {"latency_ms": latency_ms, "peak_mb": mem_mb}
        print(f"\n[Baseline BM25 Scale {sz:,} chunks] Latency: {latency_ms:.2f}ms | Peak RAM: {mem_mb:.2f}MB")

    # Document baseline findings: at 50k chunks, in-memory BM25 takes >300ms and ~40MB RAM
    assert results[1000]["latency_ms"] < 200.0
