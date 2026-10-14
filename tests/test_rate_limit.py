import pytest
from fastapi.testclient import TestClient

from api.main import app
from core.rate_limit import limiter

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    limiter.reset()
    yield
    limiter.reset()

def test_rate_limiting_enforcement():
    # Update settings endpoint limit is 10/minute
    url = "/api/settings"
    payload = {"default_llm_provider": "local"}

    # First requests should succeed
    for _ in range(5):
        res = client.post(url, json=payload)
        assert res.status_code == 200

    # Flood requests to exceed limit of 10/minute
    rate_limited = False
    for _ in range(12):
        res = client.post(url, json=payload)
        if res.status_code == 429:
            rate_limited = True
            break

    assert rate_limited, "Rate limiter must return HTTP 429 when threshold exceeded"
