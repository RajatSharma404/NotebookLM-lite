from pathlib import Path
from typing import List, Dict, Any

class DocxParser:
    @staticmethod
    def parse(file_path: Path) -> List[Dict[str, Any]]:
        """
        Parses Microsoft Word (.docx) documents preserving heading structure.
        """
        import docx
        doc = docx.Document(str(file_path))
        
        sections = []
        current_section = "Document Content"
        current_paragraphs: List[str] = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            # Detect headings
            if p.style and p.style.name and p.style.name.startswith("Heading"):
                if current_paragraphs:
                    sections.append({
                        "page_number": 1,
                        "text": "\n".join(current_paragraphs),
                        "section": current_section
                    })
                    current_paragraphs = []
                current_section = text
            else:
                current_paragraphs.append(text)

        if current_paragraphs:
            sections.append({
                "page_number": 1,
                "text": "\n".join(current_paragraphs),
                "section": current_section
            })

        return sections
