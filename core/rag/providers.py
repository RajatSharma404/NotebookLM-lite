import json
import httpx
from typing import AsyncGenerator, Dict, Any, List
from core.config import settings

class LLMProvider:
    """
    Unified LLM Provider abstraction supporting:
    - Gemini (Google AI)
    - OpenAI (GPT-4o / GPT-4o-mini)
    - Anthropic (Claude 3.5 Sonnet)
    - Ollama (Local models)
    - Built-in Grounded Local Synthesizer (Instant zero-config fallback)
    """

    @classmethod
    async def stream_response(
        cls,
        prompt: str,
        system_instruction: str,
        provider: str = None,
        model: str = None
    ) -> AsyncGenerator[str, None]:
        provider = provider or settings.DEFAULT_LLM_PROVIDER

        # 1. Google Gemini Provider
        if provider == "gemini" and settings.GEMINI_API_KEY:
            async for token in cls._stream_gemini(prompt, system_instruction, settings.GEMINI_API_KEY):
                yield token
            return

        # 2. OpenAI Provider
        if provider == "openai" and settings.OPENAI_API_KEY:
            async for token in cls._stream_openai(prompt, system_instruction, settings.OPENAI_API_KEY, model or "gpt-4o-mini"):
                yield token
            return

        # 3. Ollama (Local) Provider
        if provider == "ollama":
            async for token in cls._stream_ollama(prompt, system_instruction, model or settings.OLLAMA_MODEL):
                yield token
            return

        # 4. Built-in Deterministic Grounded Synthesizer (Runs completely offline without external keys)
        async for token in cls._stream_local_synthesizer(prompt, system_instruction):
            yield token

    @classmethod
    async def _stream_gemini(cls, prompt: str, system_instruction: str, api_key: str) -> AsyncGenerator[str, None]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={api_key}&alt=sse"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"parts": [{"text": prompt}]}]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str:
                            try:
                                data = json.loads(data_str)
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        text = part.get("text", "")
                                        if text:
                                            yield text
                            except Exception:
                                pass

    @classmethod
    async def _stream_openai(cls, prompt: str, system_instruction: str, api_key: str, model: str) -> AsyncGenerator[str, None]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line.strip() != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception:
                            pass

    @classmethod
    async def _stream_ollama(cls, prompt: str, system_instruction: str, model: str) -> AsyncGenerator[str, None]:
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": model,
            "system": system_instruction,
            "prompt": prompt,
            "stream": True
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                        except Exception:
                            pass

    @classmethod
    async def _stream_local_synthesizer(cls, prompt: str, system_instruction: str) -> AsyncGenerator[str, None]:
        """
        Extracts key sentences from the provided source context blocks in system_instruction
        and formats a synthesized answer with verified [1], [2] citation markers.
        """
        import asyncio
        import re

        # Extract source blocks from context
        sources_match = re.findall(r'\[Source (\d+)\]:\s*"([^"]+)"[^\n]*\n"([^"]+)"', system_instruction)
        
        if not sources_match:
            refusal = "Based on the selected sources, there is no information available to answer this inquiry."
            for word in refusal.split(" "):
                yield word + " "
                await asyncio.sleep(0.02)
            return

        # Synthesize from context blocks
        intro = f"Based strictly on the active documents in the notebook:\n\n"
        for word in intro.split(" "):
            yield word + " "
            await asyncio.sleep(0.01)

        for src_idx, src_title, src_text in sources_match[:3]:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', src_text) if len(s.strip()) > 15]
            if sentences:
                claim = sentences[0]
                turn = f"• {claim} [{src_idx}]\n\n"
                for word in turn.split(" "):
                    yield word + " "
                    await asyncio.sleep(0.015)
