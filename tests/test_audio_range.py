import os

from fastapi.testclient import TestClient

from api.main import app
from core.config import settings

client = TestClient(app)


def test_audio_streaming_full_and_range_requests():
    # Create a small dummy audio file in storage/audio
    test_file_name = "test_audio_range.mp3"
    test_file_path = settings.STORAGE_AUDIO_DIR / test_file_name
    dummy_data = b"ID3" + b"\x00" * 500 + b"MP3_DATA" * 50
    with open(test_file_path, "wb") as f:
        f.write(dummy_data)

    try:
        # 1. Full stream request
        res = client.get(f"/api/audio/stream/{test_file_name}")
        assert res.status_code == 200
        assert res.headers.get("accept-ranges") == "bytes"
        assert len(res.content) == len(dummy_data)

        # 2. HTTP 206 Partial content range request (first 100 bytes)
        range_res = client.get(
            f"/api/audio/stream/{test_file_name}",
            headers={"Range": "bytes=0-99"}
        )
        assert range_res.status_code == 206
        assert len(range_res.content) == 100
        assert range_res.content == dummy_data[:100]
        assert range_res.headers.get("content-range") == f"bytes 0-99/{len(dummy_data)}"

        # 3. HTTP 206 Offset range request (byte 200 to end)
        range_end_res = client.get(
            f"/api/audio/stream/{test_file_name}",
            headers={"Range": "bytes=200-"}
        )
        assert range_end_res.status_code == 206
        assert len(range_end_res.content) == len(dummy_data) - 200
        assert range_end_res.content == dummy_data[200:]
    finally:
        if os.path.exists(test_file_path):
            os.remove(test_file_path)
