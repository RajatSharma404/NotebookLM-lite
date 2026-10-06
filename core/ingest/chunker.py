import hashlib
import re
from typing import List, Dict, Any

TARGET_CHARS = 1800  # ~450-512 tokens
OVERLAP_CHARS = 240  # ~60 tokens

class SemanticChunker:
    @staticmethod
    def chunk_section(
        text: str,
        page_number: int = 1,
        section_title: str = "General"
    ) -> List[Dict[str, Any]]:
        """
        Splits text into sliding window semantic chunks respecting paragraph and sentence boundaries.
        """
        chunks: List[Dict[str, Any]] = []
        if not text.strip():
            return chunks

        # If text is shorter than target, return single chunk
        if len(text) <= TARGET_CHARS:
            content = text.strip()
            sha = hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
            return [{
                "page_number": page_number,
                "section_title": section_title,
                "content": content,
                "char_start": 0,
                "char_end": len(content),
                "sha256": sha,
                "token_count": max(1, len(content) // 4)
            }]

        # Split into semantic sentences or paragraphs
        sentences = re.split(r'(?<=[.!?\n])\s+', text)
        current_chunk_sentences: List[str] = []
        current_char_count = 0
        global_char_idx = 0

        for sentence in sentences:
            sentence_len = len(sentence)
            if current_char_count + sentence_len > TARGET_CHARS and current_chunk_sentences:
                # Emit chunk
                chunk_str = " ".join(current_chunk_sentences).strip()
                if chunk_str:
                    sha = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()[:16]
                    chunks.append({
                        "page_number": page_number,
                        "section_title": section_title,
                        "content": chunk_str,
                        "char_start": global_char_idx,
                        "char_end": global_char_idx + len(chunk_str),
                        "sha256": sha,
                        "token_count": max(1, len(chunk_str) // 4)
                    })

                # Retain overlap sentences for sliding window
                overlap_accum: List[str] = []
                overlap_count = 0
                for s in reversed(current_chunk_sentences):
                    if overlap_count + len(s) <= OVERLAP_CHARS:
                        overlap_accum.insert(0, s)
                        overlap_count += len(s)
                    else:
                        break

                current_chunk_sentences = overlap_accum
                current_char_count = sum(len(s) for s in current_chunk_sentences)
                global_char_idx += len(chunk_str) - current_char_count

            current_chunk_sentences.append(sentence)
            current_char_count += sentence_len

        # Emit final trailing chunk
        if current_chunk_sentences:
            chunk_str = " ".join(current_chunk_sentences).strip()
            if chunk_str:
                sha = hashlib.sha256(chunk_str.encode("utf-8")).hexdigest()[:16]
                chunks.append({
                    "page_number": page_number,
                    "section_title": section_title,
                    "content": chunk_str,
                    "char_start": global_char_idx,
                    "char_end": global_char_idx + len(chunk_str),
                    "sha256": sha,
                    "token_count": max(1, len(chunk_str) // 4)
                })

        return chunks
