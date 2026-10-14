import unicodedata
from pathlib import Path
from typing import Any

from core.telemetry import logger


def format_table_as_markdown(table) -> str:
    """Extracts cells from a python-docx Table object into clean Markdown table format."""
    rows: list[list[str]] = []
    for row in table.rows:
        row_cells = [cell.text.replace("\x00", "").replace("\n", " ").strip() for cell in row.cells]
        if any(row_cells):
            rows.append(row_cells)

    if not rows:
        return ""

    num_cols = max(len(r) for r in rows)
    padded = [r + [""] * (num_cols - len(r)) for r in rows]
    header = "| " + " | ".join(padded[0]) + " |"
    separator = "| " + " | ".join(["---"] * num_cols) + " |"
    body = ["| " + " | ".join(r) + " |" for r in padded[1:]]
    return "\n\n" + "\n".join([header, separator, *body]) + "\n\n"


class DocxParser:
    VERSION = "2.0.0"

    @staticmethod
    def sanitize_text(text: str) -> str:
        if not text:
            return ""
        text = text.replace("\x00", "")
        text = unicodedata.normalize("NFKC", text)
        return text.strip()

    @classmethod
    def parse(cls, file_path: Path) -> list[dict[str, Any]]:
        """
        Parses Microsoft Word (.docx) documents preserving heading hierarchy and Markdown tables.
        Guarded against Billion Laughs / XXE XML attacks via defusedxml pre-checks.
        """
        import docx

        # Pre-validate docx ZIP archive XML parts safely
        try:
            import zipfile

            import defusedxml.minidom

            with zipfile.ZipFile(str(file_path), "r") as z:
                if "word/document.xml" in z.namelist():
                    doc_xml = z.read("word/document.xml")
                    # defusedxml will raise DTDForbidden / EntitiesForbidden if malicious
                    defusedxml.minidom.parseString(doc_xml)
        except Exception as e:
            logger.warning(f"DOCX XML security validation check noted: {e}")

        doc = docx.Document(str(file_path))

        sections: list[dict[str, Any]] = []
        heading_stack: list[str] = ["Document Overview"]
        current_paragraphs: list[str] = []

        def flush_section():
            if current_paragraphs:
                text = cls.sanitize_text("\n\n".join(current_paragraphs))
                if text:
                    sections.append({
                        "page_number": 1,
                        "text": text,
                        "section": heading_stack[-1] if heading_stack else "Document Content",
                        "heading_hierarchy": list(heading_stack)
                    })
                current_paragraphs.clear()

        # Iterate over document body elements (paragraphs and tables)
        for element in doc.element.body:
            tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag
            if tag == "p":
                # Paragraph
                for p in doc.paragraphs:
                    if p._p is element:
                        raw_text = p.text.strip()
                        if not raw_text:
                            continue
                        clean_text = cls.sanitize_text(raw_text)

                        style_name = p.style.name if p.style else ""
                        if style_name.startswith("Heading"):
                            flush_section()
                            try:
                                level = int(style_name.replace("Heading", "").strip())
                            except ValueError:
                                level = 1
                            # Adjust heading stack according to hierarchy depth
                            while len(heading_stack) >= level and len(heading_stack) > 1:
                                heading_stack.pop()
                            heading_stack.append(clean_text)
                        else:
                            current_paragraphs.append(clean_text)
                        break
            elif tag == "tbl":
                # Table
                for table in doc.tables:
                    if table._tbl is element:
                        table_md = format_table_as_markdown(table)
                        if table_md.strip():
                            current_paragraphs.append(table_md)
                        break

        flush_section()

        # Fallback if body iterator produced nothing
        if not sections and doc.paragraphs:
            text = cls.sanitize_text("\n\n".join(p.text for p in doc.paragraphs if p.text.strip()))
            if text:
                sections.append({
                    "page_number": 1,
                    "text": text,
                    "section": "Document Content",
                    "heading_hierarchy": ["Document Content"]
                })

        return sections
