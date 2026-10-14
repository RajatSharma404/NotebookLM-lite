import unicodedata
from pathlib import Path
from typing import Any


class MarkdownParser:
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
        Parses Markdown or plain text files, preserving hierarchical heading stacks.
        Returns a list of sections: [{"page_number": 1, "text": str, "section": str, "heading_hierarchy": list[str]}]
        """
        with open(file_path, encoding="utf-8", errors="replace") as f:
            content = f.read()

        lines = content.splitlines()
        sections: list[dict[str, Any]] = []
        heading_stack: list[str] = []
        current_lines: list[str] = []

        def flush_section():
            if current_lines:
                text_block = cls.sanitize_text("\n".join(current_lines))
                if text_block:
                    hierarchy = list(heading_stack) if heading_stack else ["General"]
                    sections.append({
                        "page_number": 1,
                        "text": text_block,
                        "section": hierarchy[-1],
                        "heading_hierarchy": hierarchy
                    })
                current_lines.clear()

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                # Count heading depth (e.g. ## -> level 2)
                level = 0
                while level < len(stripped) and stripped[level] == "#":
                    level += 1

                heading_text = stripped[level:].strip()
                if heading_text:
                    flush_section()
                    while len(heading_stack) >= level:
                        heading_stack.pop()
                    heading_stack.append(heading_text)
                    continue

            current_lines.append(line)

        flush_section()

        # If flat text without headers
        if not sections and content.strip():
            clean = cls.sanitize_text(content)
            if clean:
                sections.append({
                    "page_number": 1,
                    "text": clean,
                    "section": "General",
                    "heading_hierarchy": ["General"]
                })

        return sections
