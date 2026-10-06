from pathlib import Path
from typing import List, Dict, Any

class MarkdownParser:
    @staticmethod
    def parse(file_path: Path) -> List[Dict[str, Any]]:
        """
        Parses Markdown or plain text files, preserving section hierarchies.
        Returns a list of sections: [{"page_number": 1, "text": str, "section": str}]
        """
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        lines = content.splitlines()
        sections = []
        current_section = "Introduction"
        current_lines: List[str] = []

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                # Header found
                if current_lines:
                    text_block = "\n".join(current_lines).strip()
                    if text_block:
                        sections.append({
                            "page_number": 1,
                            "text": text_block,
                            "section": current_section
                        })
                    current_lines = []
                current_section = stripped.lstrip("#").strip()
            else:
                current_lines.append(line)

        if current_lines:
            text_block = "\n".join(current_lines).strip()
            if text_block:
                sections.append({
                    "page_number": 1,
                    "text": text_block,
                    "section": current_section
                })

        # If empty or flat text
        if not sections and content.strip():
            sections.append({
                "page_number": 1,
                "text": content.strip(),
                "section": "General"
            })

        return sections
