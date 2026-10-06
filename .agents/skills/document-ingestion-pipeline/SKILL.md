---
name: document-ingestion-pipeline
description: >-
  Use this skill when implementing, debugging, or extending document parsing,
  text extraction, and semantic chunking for PDF, Markdown, DOCX, and TXT files
  in NotebookLM-lite.
---

# Document Ingestion Pipeline Skill

This skill provides step-by-step procedures for ingesting diverse document types, extracting text with page-level coordinates, and generating overlap-safe semantic chunks with metadata for NotebookLM-lite.

---

## 1. Document Extraction Procedures

### 1.1 PDF Processing (`pypdf` / `pymupdf`)
When extracting text from PDF files:
1. **Preserve Page Numbers**: Always extract text page by page (1-indexed) so each text segment retains its source page number.
2. **Handle Multi-Column Layouts**: PyMuPDF (`fitz.open()`) handles multi-column reading order better than standard line splits. Use `page.get_text("blocks")` or sort text blocks by vertical `y0` then horizontal `x0`.
3. **Filter Header/Footer Noise**: Strip running headers, page footers, and page numbers when they repeat across pages to avoid polluting vector embeddings.
4. **Fallback Handling**: If extracted text length on a page is < 50 characters, flag as scanned or image-only and return a graceful warning.

### 1.2 Markdown & Plain Text Processing
1. **Preserve Section Hierarchy**: Detect `#`, `##`, `###` headings to store `section_title` metadata with each chunk.
2. **Preserve Code Blocks & Tables**: Ensure fenced code blocks (```` ``` ````) and markdown tables are not split across chunks mid-block.

### 1.3 DOCX Processing (`python-docx`)
1. Read paragraph blocks and document tables sequentially.
2. Track heading styles (`Heading 1`, `Heading 2`) to assign current section context.

---

## 2. Semantic Sliding-Window Chunking

Follow this chunking algorithm to preserve semantic coherence and context:

```python
# Standard Parameters:
TARGET_CHUNK_TOKENS = 512
OVERLAP_TOKENS = 64
CHARS_PER_TOKEN_APPROX = 4  # ~2048 chars per chunk, ~256 chars overlap
```

### Chunk Creation Steps:
1. **Boundary Splitting**:
   - First split by double newlines (`\n\n`), then single newlines (`\n`), then sentence terminators (`. `, `! `, `? `).
2. **Accumulate Chunks**:
   - Accumulate text blocks until the target token limit is reached.
   - When cutting a chunk, preserve the last `OVERLAP_TOKENS` tokens at the beginning of the subsequent chunk.
3. **Assign Metadata**:
   - Generate a deterministic SHA256 content hash: `sha256(chunk_text.encode())[:16]`.
   - Store: `chunk_id`, `source_id`, `notebook_id`, `page_number`, `section_title`, `char_start`, `char_end`.

---

## 3. Verification & Validation Steps

1. **Verify Chunk Continuity**:
   - Check that `char_end - char_start` matches `len(chunk_text)`.
2. **Verify Page Alignment**:
   - Confirm that chunks extracted from Page $N$ of a PDF have `page_number == N`.
3. **Verify Overlap Coverage**:
   - Check that the prefix of chunk $i+1$ matches the suffix of chunk $i$ for at least `OVERLAP_TOKENS * 3` characters.
