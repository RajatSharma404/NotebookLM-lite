from pathlib import Path
from typing import Any


class PDFParser:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Strip null bytes and normalize whitespace."""
        return (text or "").replace("\x00", "").strip()

    @staticmethod
    def parse(file_path: Path) -> list[dict[str, Any]]:
        """
        Extract text page-by-page from a PDF file using PyMuPDF (fitz) or PyPDF fallback.
        Returns a list of page dicts: [{"page_number": int, "text": str, "section": str}]
        """
        results = []
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(str(file_path))
            for page_idx, page in enumerate(doc, start=1):
                raw_text = page.get_text("text").strip().replace("\x00", "")
                if not raw_text:
                    continue
                results.append({
                    "page_number": page_idx,
                    "text": raw_text,
                    "section": f"Page {page_idx}"
                })
            doc.close()
        except Exception:
            # Fallback to pypdf on import error or parsing exception
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(file_path))
                for page_idx, page in enumerate(reader.pages, start=1):
                    raw_text = (page.extract_text() or "").strip().replace("\x00", "")
                    if not raw_text:
                        continue
                    results.append({
                        "page_number": page_idx,
                        "text": raw_text,
                        "section": f"Page {page_idx}"
                    })
            except Exception:
                pass
        return results
