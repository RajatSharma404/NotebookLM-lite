import unicodedata
from pathlib import Path
from typing import Any

from core.telemetry import logger


def format_table_as_markdown(table: list[list[str | None]]) -> str:
    """Converts a 2D list of extracted table cells into a clean Markdown table."""
    if not table:
        return ""
    cleaned_rows: list[list[str]] = []
    for row in table:
        if not row:
            continue
        cleaned_row = [(cell or "").replace("\x00", "").replace("\n", " ").strip() for cell in row]
        if any(cleaned_row):
            cleaned_rows.append(cleaned_row)

    if not cleaned_rows:
        return ""

    num_cols = max(len(row) for row in cleaned_rows)
    padded = [row + [""] * (num_cols - len(row)) for row in cleaned_rows]
    header = "| " + " | ".join(padded[0]) + " |"
    separator = "| " + " | ".join(["---"] * num_cols) + " |"
    body = ["| " + " | ".join(r) + " |" for r in padded[1:]]
    return "\n\n" + "\n".join([header, separator, *body]) + "\n\n"


class PDFParser:
    VERSION = "2.0.0"

    @staticmethod
    def sanitize_text(text: str) -> str:
        """Strip null bytes, normalize Unicode NFKC, and strip excessive whitespace."""
        if not text:
            return ""
        text = text.replace("\x00", "")
        text = unicodedata.normalize("NFKC", text)
        return text.strip()

    @classmethod
    def parse(cls, file_path: Path) -> list[dict[str, Any]]:
        """
        Extracts layout-aware text, Markdown tables, and section headings from PDF.
        Pipeline order: pdfplumber -> PyMuPDF (fitz) -> pypdf fallback.
        """
        results: list[dict[str, Any]] = []

        # 1. Primary: pdfplumber for layout & table extraction
        try:
            import pdfplumber

            heading_stack: list[str] = []
            with pdfplumber.open(str(file_path)) as pdf:
                for page_idx, page in enumerate(pdf.pages, start=1):
                    # Extract tables first
                    tables = page.extract_tables() or []
                    table_mds = [format_table_as_markdown(t) for t in tables if t]

                    # Extract words with sizes to infer headings
                    words = page.extract_words(extra_attrs=["size"]) or []
                    avg_size = (sum(w.get("size", 10.0) for w in words) / len(words)) if words else 10.0

                    # Extract full page text
                    raw_text = page.extract_text(layout=False) or ""
                    clean_text = cls.sanitize_text(raw_text)

                    # Append any extracted tables
                    if table_mds:
                        clean_text = clean_text + "\n" + "".join(table_mds)

                    if not clean_text:
                        continue

                    # Infer heading from prominent words (>1.25x avg size)
                    page_headings = [
                        w["text"] for w in words
                        if w.get("size", 0) > avg_size * 1.25 and len(w["text"]) > 3
                    ]
                    current_section = f"Page {page_idx}"
                    if page_headings:
                        candidate_title = " ".join(page_headings[:5]).strip()
                        if len(candidate_title) > 3:
                            current_section = candidate_title
                            if not heading_stack or heading_stack[-1] != candidate_title:
                                heading_stack.append(candidate_title)
                                if len(heading_stack) > 4:
                                    heading_stack.pop(0)

                    results.append({
                        "page_number": page_idx,
                        "text": clean_text,
                        "section": current_section,
                        "heading_hierarchy": list(heading_stack) if heading_stack else [f"Page {page_idx}"]
                    })

            if results:
                return results
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed or had error: {e}; falling back to secondary parsers.")

        # 2. Secondary fallback: PyMuPDF (fitz)
        try:
            import fitz

            doc = fitz.open(str(file_path))
            for page_idx, page in enumerate(doc, start=1):
                raw_text = page.get_text("text") or ""
                clean_text = cls.sanitize_text(raw_text)
                if not clean_text:
                    continue
                results.append({
                    "page_number": page_idx,
                    "text": clean_text,
                    "section": f"Page {page_idx}",
                    "heading_hierarchy": [f"Page {page_idx}"]
                })
            doc.close()
            if results:
                return results
        except Exception:
            pass

        # 3. Tertiary fallback: pypdf
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(file_path))
            for page_idx, page in enumerate(reader.pages, start=1):
                raw_text = page.extract_text() or ""
                clean_text = cls.sanitize_text(raw_text)
                if not clean_text:
                    continue
                results.append({
                    "page_number": page_idx,
                    "text": clean_text,
                    "section": f"Page {page_idx}",
                    "heading_hierarchy": [f"Page {page_idx}"]
                })
        except Exception as e:
            logger.error(f"All PDF extraction strategies failed for {file_path}: {e}")

        return results
