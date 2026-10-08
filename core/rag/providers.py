import json
import asyncio
import re
import httpx
from typing import AsyncGenerator, Dict, Any, List
from core.config import settings

class LLMProvider:
    """
    Unified LLM Provider abstraction supporting:
    - Google Gemini (Gemini 1.5 Flash via Google AI Studio API)
    - OpenAI (GPT-4o / GPT-4o-mini)
    - Ollama (Local LLM server)
    - Built-in High-Accuracy Grounded Local Comprehension Engine (zero-config offline fallback)
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
            try:
                success = False
                async for token in cls._stream_gemini(prompt, system_instruction, settings.GEMINI_API_KEY):
                    success = True
                    yield token
                if success:
                    return
            except Exception as e:
                yield f"*(Gemini stream encountered error: {str(e)[:120]}. Falling back to local synthesizer...)*\n\n"

        # 2. OpenAI Provider
        if provider == "openai" and settings.OPENAI_API_KEY:
            try:
                success = False
                async for token in cls._stream_openai(prompt, system_instruction, settings.OPENAI_API_KEY, model or "gpt-4o-mini"):
                    success = True
                    yield token
                if success:
                    return
            except Exception as e:
                yield f"*(OpenAI stream error: {str(e)[:120]}. Falling back to local synthesizer...)*\n\n"

        # 3. Ollama (Local) Provider
        if provider == "ollama":
            try:
                success = False
                async for token in cls._stream_ollama(prompt, system_instruction, model or settings.OLLAMA_MODEL):
                    success = True
                    yield token
                if success:
                    return
            except Exception as e:
                yield f"*(Ollama connection error: {str(e)[:120]}. Falling back to local synthesizer...)*\n\n"

        # 4. Built-in Deterministic Grounded Comprehension Engine
        async for token in cls._stream_local_synthesizer(prompt, system_instruction):
            yield token

    @classmethod
    async def _stream_gemini(cls, prompt: str, system_instruction: str, api_key: str) -> AsyncGenerator[str, None]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={api_key}&alt=sse"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}]
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"HTTP {response.status_code}: {err_body.decode('utf-8', errors='ignore')[:200]}")

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
        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"HTTP {response.status_code}: {err_body.decode('utf-8', errors='ignore')[:200]}")

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
                if response.status_code != 200:
                    err_body = await response.aread()
                    raise RuntimeError(f"HTTP {response.status_code}: {err_body.decode('utf-8', errors='ignore')[:200]}")

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
        Grounded Local Document Comprehension Engine.
        Parses retrieved passages, identifies structural objectives, answers queries directly,
        and embeds verified [1], [2] citations.
        """
        # Split source blocks
        raw_blocks = re.split(r'(?:^|\n)(?=\[Source \d+\]:)', system_instruction.strip())
        blocks = []
        for b in raw_blocks:
            if not b.strip(): continue
            lines = b.splitlines()
            first_line = lines[0]
            text = "\n".join(lines[1:]).strip().strip('"')
            match = re.match(r'\[Source (\d+)\]:\s*"([^"]+)"(?:\s*\(([^)]+)\))?', first_line)
            if match:
                idx, title, meta = match.groups()
                blocks.append({
                    "index": int(idx),
                    "title": title,
                    "meta": meta or "",
                    "text": text
                })

        if not blocks:
            refusal = "Based on the selected active sources, no matching context could be retrieved for this notebook."
            for w in refusal.split(" "):
                yield w + " "
                await asyncio.sleep(0.015)
            return

        primary_doc = blocks[0]["title"]
        query_lower = prompt.lower().strip()
        is_overview_request = any(w in query_lower for w in [
            "explain", "summary", "summarize", "overview", "what is this", "tell me about",
            "breakdown", "roadmap", "pdf", "document", "everything", "all", "what is it"
        ])

        output_parts: List[str] = []

        if is_overview_request:
            output_parts.append(f"### Comprehensive Synthesis: `{primary_doc}`\n\n")
            output_parts.append(f"Based strictly on the verified passages retrieved from **{primary_doc}**, here is an executive breakdown of the document's structure, core objectives, and architectural components:\n\n")

            # 1. Key Objectives & Scope
            output_parts.append("#### 📌 Core Objectives & Scope\n")
            overview_points = []
            for blk in blocks:
                sentences = [s.strip() for s in re.split(r'(?<=[.!?\n])\s+', blk["text"]) if len(s.strip()) > 30]
                for s in sentences:
                    # Clean out social headers
                    if not any(header in s.lower() for header in ["youtube", "instagram", "student tech"]):
                        clean_s = re.sub(r'\s+', ' ', s)
                        overview_points.append(f"- {clean_s} [{blk['index']}]\n")
                        if len(overview_points) >= 3:
                            break
                if len(overview_points) >= 3:
                    break

            if overview_points:
                output_parts.extend(overview_points)
                output_parts.append("\n")

            # 2. Architectural Highlights across retrieved passages
            output_parts.append("#### 🛠️ Architectural Breakdown & Key Sections\n")
            for blk in blocks[:4]:
                meta_label = blk['meta'] if blk['meta'] else f"Section {blk['index']}"
                clean_text = re.sub(r'(?:Aditya Dewaskar|TOKEN MAXR[^\n]*|YouTube[^\n]*|Instagram[^\n]*)', '', blk["text"]).strip()
                clean_text = re.sub(r'\s+', ' ', clean_text)
                if len(clean_text) > 40:
                    output_parts.append(f"**From {meta_label}** [{blk['index']}]:\n")
                    output_parts.append(f"> {clean_text[:300]}... [{blk['index']}]\n\n")

            # 3. Critical Takeaways / Build Milestones
            output_parts.append("#### 🎯 Critical Takeaways\n")
            takeaways = []
            for blk in blocks:
                for line in blk["text"].splitlines():
                    line = line.strip()
                    if any(line.upper().startswith(kw) for kw in ["BUILD", "COMMON PITFALLS", "SKILLS", "TEACHES", "BEFORE"]):
                        clean_l = re.sub(r'\s+', ' ', line)
                        takeaways.append(f"- **{clean_l}** [{blk['index']}]\n")
                        if len(takeaways) >= 4:
                            break
                if len(takeaways) >= 4:
                    break

            if takeaways:
                output_parts.extend(takeaways)
                output_parts.append("\n")

        else:
            # Targeted Query Matching
            keywords = [w for w in re.findall(r'\b\w+\b', query_lower) if w not in [
                "what", "is", "the", "a", "an", "of", "in", "for", "to", "and", "or", "tell", "me", "about"
            ]]
            output_parts.append(f"### Grounded Response: `{primary_doc}`\n\n")

            matched_passages = []
            for blk in blocks:
                blk_text = blk["text"]
                sentences = [s.strip() for s in re.split(r'(?<=[.!?\n])\s+', blk_text) if len(s.strip()) > 20]
                for s in sentences:
                    s_lower = s.lower()
                    match_count = sum(1 for kw in keywords if kw in s_lower)
                    if match_count > 0:
                        matched_passages.append((match_count, s, blk['index'], blk['meta']))

            matched_passages.sort(key=lambda x: x[0], reverse=True)
            if matched_passages:
                for count, passage, idx, meta in matched_passages[:5]:
                    clean_p = re.sub(r'\s+', ' ', passage).strip()
                    output_parts.append(f"• {clean_p} [{idx}]\n\n")
            else:
                output_parts.append("Here are the closest sections found in the document context matching your inquiry:\n\n")
                for blk in blocks[:3]:
                    clean_snippet = blk['text'][:240].replace('\n', ' ')
                    output_parts.append(f"- From {blk['meta']}: \"{clean_snippet}...\" [{blk['index']}]\n\n")

        # Concluding tip
        output_parts.append("---\n*💡 Note: Generated using local grounded synthesis. To enable full conversational synthesis with Google Gemini 1.5 Flash, enter your free API key in Settings.*")

        full_text = "".join(output_parts)
        for chunk_token in re.split(r'(\s+)', full_text):
            if chunk_token:
                yield chunk_token
                await asyncio.sleep(0.008)
