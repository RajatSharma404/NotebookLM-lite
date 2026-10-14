import tempfile
from pathlib import Path

from core.ingest.chunker import SemanticChunker, count_tokens
from core.ingest.md_parser import MarkdownParser
from core.ingest.pdf_parser import PDFParser, format_table_as_markdown


def test_pdf_table_formatting_and_sanitization():
    table_data = [
        ["Model", "Parameters", "MMLU Score"],
        ["Gemini 2.5", "Unknown", "88.5%"],
        ["GPT-4o", "Unknown", "88.7%"]
    ]
    md = format_table_as_markdown(table_data)
    assert "| Model | Parameters | MMLU Score |" in md
    assert "| --- | --- | --- |" in md
    assert "| Gemini 2.5 | Unknown | 88.5% |" in md

    # Sanitization
    dirty = "Hello\x00 World \uff41"
    clean = PDFParser.sanitize_text(dirty)
    assert "\x00" not in clean
    assert clean == "Hello World a"

def test_markdown_hierarchical_heading_parser():
    md_content = """# Artificial Intelligence
Introductory concepts.

## Machine Learning
Subfield overview.

### Supervised Learning
Training on labeled datasets.

# Quantum Computing
Qubits and superposition.
"""
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(md_content)
        path = Path(f.name)

    try:
        sections = MarkdownParser.parse(path)
        assert len(sections) >= 3
        # Verify heading hierarchy
        sec_ml = next((s for s in sections if "labeled datasets" in s["text"]), None)
        assert sec_ml is not None
        assert "Supervised Learning" in sec_ml["section"]
        assert "Artificial Intelligence" in sec_ml["heading_hierarchy"]
        assert "Machine Learning" in sec_ml["heading_hierarchy"]
    finally:
        if path.exists():
            path.unlink()

def test_semantic_chunker_tiktoken_offsets():
    text = (
        "Retrieval-Augmented Generation (RAG) significantly improves knowledge grounding. "
        "By dynamically retrieving relevant source passages, language models can answer queries accurately. "
        "This architecture minimizes hallucination rates and enables verifiable inline citations. "
    ) * 20

    chunks = SemanticChunker.chunk_section(
        text=text,
        page_number=1,
        section_title="RAG Systems",
        heading_hierarchy=["Architecture", "RAG Systems"]
    )

    assert len(chunks) >= 2
    for chk in chunks:
        assert chk["token_count"] > 0
        assert chk["char_end"] > chk["char_start"]
        assert chk["byte_end"] > chk["byte_start"]
        assert chk["section_title"] == "RAG Systems"
        assert chk["heading_hierarchy"] == ["Architecture", "RAG Systems"]
        assert len(chk["sha256"]) == 16
        assert chk["parser_version"] == "2.0.0"
        assert chk["chunker_version"] == "2.0.0"

    # Test count_tokens helper
    tokens = count_tokens("Hello world from NotebookLM-lite")
    assert tokens >= 4
