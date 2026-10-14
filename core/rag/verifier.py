import re
from typing import Any


class CitationVerifier:
    """
    Automated grounded citation verifier:
    - Extracts inline citation markers [n] from generated response
    - Extracts the enclosing claim sentence for each marker
    - Compares claim text against the source chunk content
    - Computes n-gram / lexical containment score
    - Classifies citation into: 'verified' (score >= 0.5), 'partial' (score >= 0.2), or 'unsupported' (score < 0.2)
    - Returns overall groundedness score (0.0 to 1.0)
    """
    @staticmethod
    def extract_sentences_with_citations(text: str) -> list[tuple[str, list[int]]]:
        """
        Splits text into sentences and finds all citation indices [n] in each sentence.
        """
        raw_sentences = re.split(r'(?<=[.!?\n])\s+', text)
        results = []
        for s in raw_sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            indices = [int(m) for m in re.findall(r'\[(\d+)\]', s_clean)]
            if indices:
                results.append((s_clean, indices))
        return results

    @classmethod
    def verify(
        cls,
        text: str,
        citations: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Verifies all inline citations in response text against retrieved source chunks.
        """
        citation_by_index = {c["index"]: c for c in citations}
        sentence_citations = cls.extract_sentences_with_citations(text)

        verification_map: dict[str, Any] = {}
        all_scores: list[float] = []

        for sentence, indices in sentence_citations:
            claim = re.sub(r'\[\d+\]', '', sentence).strip()
            claim_words = set(re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', claim.lower()))

            for idx in indices:
                cit_info = citation_by_index.get(idx)
                if not cit_info:
                    verification_map[str(idx)] = {
                        "status": "unsupported",
                        "score": 0.0,
                        "claim": claim[:150],
                        "reason": f"Citation [{idx}] does not map to any retrieved source."
                    }
                    all_scores.append(0.0)
                    continue

                chunk_text = cit_info.get("snippet", "") + " " + cit_info.get("content", "")
                chunk_words = set(re.findall(r'\b[a-zA-Z0-9_-]{3,}\b', chunk_text.lower()))

                if not claim_words:
                    score = 1.0
                else:
                    overlap = len(claim_words.intersection(chunk_words))
                    score = min(1.0, overlap / max(1, len(claim_words) * 0.4))

                if score >= 0.5:
                    status = "verified"
                elif score >= 0.2:
                    status = "partial"
                else:
                    status = "unsupported"

                verification_map[str(idx)] = {
                    "status": status,
                    "score": round(score, 3),
                    "source_title": cit_info.get("source_title", ""),
                    "page_number": cit_info.get("page_number", 1)
                }
                all_scores.append(score)

        overall_groundedness = round(sum(all_scores) / max(1, len(all_scores)), 3) if all_scores else 1.0
        overall_status = "verified" if overall_groundedness >= 0.6 else ("partial" if overall_groundedness >= 0.3 else "unsupported")

        return {
            "overall_status": overall_status,
            "overall_groundedness": overall_groundedness,
            "citation_map": verification_map,
            "total_citations_checked": len(all_scores)
        }
