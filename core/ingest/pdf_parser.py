from pathlib import Path
from typing import List, Dict, Any

class PDFParser:
    @staticmethod
    def parse(file_path: Path) -> List[Dict[str, Any]]:
        """
        Extract text page-by-page from a PDF file using PyMuPDF (fitz) or PyPDF fallback.
        Returns a list of page dicts: [{"page_number": int, "text": str, "section": str}]
        """
        results = []
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(str(file_path))
            for page_idx, page in enumerate(doc, start=1):
                text = page.get_text("text").strip()
                if not text:
                    continue
                results.append({
                    "page_number": page_idx,
                    "text": text,
                    "section": f"Page {page_idx}"
                })
            doc.close()
        except ImportError:
            # Fallback to pypdf
            from pypdf import PdfReader
            reader = PdfReader(str(file_path))
            for page_idx, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()
                if not text:
                    continue
                results.append({
                    "page_number": page_idx,
                    "text": text,
                    "section": f"Page {page_idx}"
                })
        return results
