import hashlib
import re
from typing import Any

from core.telemetry import logger

try:
    import tiktoken
    _TIKTOKEN_ENCODER = tiktoken.get_encoding("cl100k_base")

    def count_tokens(text: str) -> int:
        return len(_TIKTOKEN_ENCODER.encode(text, disallowed_special=()))
except Exception as e:
    logger.warning(f"tiktoken cl100k_base initialization error: {e}; falling back to heuristic tokenizer.")

    def count_tokens(text: str) -> int:
        return max(1, len(text) // 4)


class SemanticChunker:
    VERSION = "2.0.0"
    TARGET_TOKENS = 450
    OVERLAP_TOKENS = 60

    @classmethod
    def chunk_section(
        cls,
        text: str,
        page_number: int = 1,
        section_title: str = "General",
        heading_hierarchy: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """
        Splits section text into sliding-window chunks with strict token counting (tiktoken),
        preserving sentence boundaries, heading hierarchies, byte and character offsets.
        """
        chunks: list[dict[str, Any]] = []
        if not text or not text.strip():
            return chunks

        clean_text = text.strip()
        total_tokens = count_tokens(clean_text)
        hierarchy = heading_hierarchy or [section_title]

        # Short section: return single chunk
        if total_tokens <= cls.TARGET_TOKENS:
            sha = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()[:16]
            byte_len = len(clean_text.encode("utf-8"))
            return [{
                "page_number": page_number,
                "section_title": section_title,
                "heading_hierarchy": hierarchy,
                "content": clean_text,
                "char_start": 0,
                "char_end": len(clean_text),
                "byte_start": 0,
                "byte_end": byte_len,
                "sha256": sha,
                "token_count": total_tokens,
                "parser_version": "2.0.0",
                "chunker_version": cls.VERSION
            }]

        # Split into semantic sentences or paragraphs
        sentences = re.split(r'(?<=[.!?\n])\s+', clean_text)
        current_sentences: list[str] = []
        current_tokens = 0
        global_char_offset = 0

        for sentence in sentences:
            s_clean = sentence.strip()
            if not s_clean:
                continue
            s_tokens = count_tokens(s_clean)

            if current_tokens + s_tokens > cls.TARGET_TOKENS and current_sentences:
                # Emit chunk
                chunk_str = " ".join(current_sentences).strip()
                if chunk_str:
                    sha = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()[:16]
                    chunk_bytes = chunk_str.encode("utf-8")
                    char_start = clean_text.find(chunk_str, max(0, global_char_offset - 200))
                    if char_start == -1:
                        char_start = global_char_offset
                    char_end = char_start + len(chunk_str)
                    byte_start = len(clean_text[:char_start].encode("utf-8"))
                    byte_end = byte_start + len(chunk_bytes)

                    chunks.append({
                        "page_number": page_number,
                        "section_title": section_title,
                        "heading_hierarchy": hierarchy,
                        "content": chunk_str,
                        "char_start": char_start,
                        "char_end": char_end,
                        "byte_start": byte_start,
                        "byte_end": byte_end,
                        "sha256": sha,
                        "token_count": count_tokens(chunk_str),
                        "parser_version": "2.0.0",
                        "chunker_version": cls.VERSION
                    })
                    global_char_offset = char_end

                # Carry over overlap sentences for sliding window continuity
                overlap_accum: list[str] = []
                overlap_tokens = 0
                for s in reversed(current_sentences):
                    toks = count_tokens(s)
                    if overlap_tokens + toks <= cls.OVERLAP_TOKENS:
                        overlap_accum.insert(0, s)
                        overlap_tokens += toks
                    else:
                        break

                current_sentences = overlap_accum
                current_tokens = sum(count_tokens(s) for s in current_sentences)

            current_sentences.append(s_clean)
            current_tokens += s_tokens

        # Emit trailing chunk
        if current_sentences:
            chunk_str = " ".join(current_sentences).strip()
            if chunk_str:
                sha = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()[:16]
                char_start = clean_text.find(chunk_str, max(0, global_char_offset - 200))
                if char_start == -1:
                    char_start = global_char_offset
                char_end = char_start + len(chunk_str)
                byte_start = len(clean_text[:char_start].encode("utf-8"))
                byte_end = byte_start + len(chunk_str.encode("utf-8"))

                chunks.append({
                    "page_number": page_number,
                    "section_title": section_title,
                    "heading_hierarchy": hierarchy,
                    "content": chunk_str,
                    "char_start": char_start,
                    "char_end": char_end,
                    "byte_start": byte_start,
                    "byte_end": byte_end,
                    "sha256": sha,
                    "token_count": count_tokens(chunk_str),
                    "parser_version": "2.0.0",
                    "chunker_version": cls.VERSION
                })

        return chunks
