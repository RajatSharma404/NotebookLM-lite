# Implementation Roadmap & Tasks (TASK.md)
## Project: NotebookLM-lite

---

## Phase 1: Foundation, Scaffolding & Configuration
- [x] **Task 1.1: Backend Structure Setup**
  - Initialize Python FastAPI project with virtual environment and pyproject/requirements (`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `chromadb`, `rank-bm25`, `edge-tts`, `pypdf`, `python-docx`).
  - Create directory layout: `api/`, `core/ingest/`, `core/rag/`, `core/studio/`, `core/audio/`, `storage/`.
  - Configure `.env.example` and environment loader with multi-provider keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`).
- [x] **Task 1.2: Database & Storage Engine**
  - Setup SQLite metadata schema with SQLAlchemy/SQLModel for `Notebook`, `Source`, `Chunk`, `ChatThread`, `Message`, `CitationRef`, `Note`, and `StudioArtifact`.
  - Implement database initialization script and migrations.
- [x] **Task 1.3: Frontend Client Setup**
  - Scaffold Vite React TypeScript app in `frontend/` directory.
  - Implement base Design System CSS (`tokens.css`, `index.css`) with light/dark theme variables from [DESIGN.md](file:///d:/NotebookLM%20lite/DESIGN.md).
  - Install core UI libraries (`lucide-react`, `markdown-it`, `katex`).

---

## Phase 2: Document Ingestion & Chunking Pipeline
- [x] **Task 2.1: Multi-Format Document Parsers**
  - Implement PDF text and page coordinate extractor (`core/ingest/pdf_parser.py`) using `pypdf` / `pymupdf`.
  - Implement Markdown & TXT parser (`core/ingest/md_parser.py`) preserving header hierarchies.
  - Implement DOCX parser (`core/ingest/docx_parser.py`).
  - Implement direct text/paste ingestion handler.
- [x] **Task 2.2: Context-Aware Semantic Chunker**
  - Build sliding-window chunker with 512 token target size and 64 token overlap.
  - Retain metadata tags: `source_id`, `notebook_id`, `page_number`, `section_title`, character spans, and SHA256 hashes.
- [x] **Task 2.3: Ingestion API Endpoints**
  - `POST /api/notebooks/{id}/sources/upload`: Multipart file upload handling with validation.
  - `POST /api/notebooks/{id}/sources/paste`: Raw text source creation.
  - `PATCH /api/notebooks/{id}/sources/{source_id}/toggle`: Enable/disable source from retrieval scope.
  - `DELETE /api/notebooks/{id}/sources/{source_id}`: Remove source and prune associated vector chunks.

---

## Phase 3: Vector Indexing & Hybrid Retrieval Engine
- [x] **Task 3.1: Vector Storage & Embedding Pipeline**
  - Integrate embedded ChromaDB (`storage/vector_store/`).
  - Implement unified `EmbeddingProvider` supporting OpenAI `text-embedding-3-small` and local HuggingFace / SentenceTransformers.
  - Index document chunks with metadata filtering on `notebook_id` and `source_id`.
- [x] **Task 3.2: BM25 Sparse Keyword Index**
  - Implement chunk-level BM25Okapi inverted index per notebook.
  - Persist and incrementally update BM25 index on source additions/deletions.
- [x] **Task 3.3: Hybrid Retriever & Reciprocal Rank Fusion (RRF)**
  - Combine Dense Cosine Similarity and Sparse BM25 results using RRF ($k=60$).
  - Filter candidates dynamically based on `active_source_ids`.
  - Implement top-k chunk context assembler with citation tag mapping (`[Source 1]`, `[Source 2]`).

---

## Phase 4: Grounded Chat & Streaming Citation Engine
- [x] **Task 4.1: Grounding Prompt & Strict Attribution Guardrail**
  - Design system prompt enforcing zero-hallucination policy and bracketed citation formatting (`[1]`, `[2]`).
  - Inject retrieved chunks with unambiguous index tags and page coordinates.
- [x] **Task 4.2: Streaming RAG Endpoint with Citation Resolution**
  - Implement `POST /api/notebooks/{id}/chat/stream` using Server-Sent Events (SSE).
  - Stream tokens in realtime while emitting metadata events containing retrieved chunk details for citation mapping.
  - Persist conversation turns, user queries, and citation references to SQLite.
- [x] **Task 4.3: LLM Provider Abstraction**
  - Implement unified provider adapters for OpenAI, Anthropic, Google Gemini, and Ollama.

---

## Phase 5: Frontend 3-Panel Workspace & Interactive Citations
- [x] **Task 5.1: Navigation Bar & Layout Scaffold**
  - Build responsive 3-panel layout: Left (Sources), Center (Chat Workspace), Right (Studio & Notes).
  - Add collapsible toggles (`[<<]`, `[>>]`) for sidebars.
  - Add Notebook switcher, LLM model selector, and Dark/Light theme toggle.
- [x] **Task 5.2: Sources Management Panel**
  - Build source upload dropzone supporting drag-and-drop for PDF, MD, TXT, DOCX.
  - Build source cards with active/inactive checkbox toggles, file size, page count, and delete actions.
  - Implement Source Quick Reader modal displaying document content with chunk highlights.
- [x] **Task 5.3: Chat Workspace & Interactive Citation Badges**
  - Build auto-scrolling streaming message list.
  - Build custom Markdown renderer with syntax highlighting and KaTeX math formulas.
  - Implement interactive `<CitationPill />` component:
    - Hover: Rich tooltip with source title, page number, and quoted excerpt.
    - Click: Focus source viewer to corresponding chunk.
  - Add "Save to Note" and "Copy to Clipboard" action buttons on assistant messages.

---

## Phase 6: Studio Generative Artifacts
- [x] **Task 6.1: Study Guide Generator**
  - Backend prompt & pipeline generating key concepts, glossary terms, practice quiz questions, and answer keys.
  - Frontend modal viewer with export to Markdown or Note.
- [x] **Task 6.2: Briefing Doc & Executive Summary**
  - Automated structured briefing: Executive Summary, Key Takeaways, Critical Analyses, and Open Questions.
- [x] **Task 6.3: FAQ & Glossary Generator**
  - Contextual extraction of frequently asked questions and high-impact terminology definitions.
- [x] **Task 6.4: Timeline & Chronology Generator**
  - Chronological timeline extractor for papers, project logs, or historical documents.

---

## Phase 7: Audio Overview (Podcast Deep Dive) Engine
- [x] **Task 7.1: Conversational Dialogue Synthesis Agent**
  - Multi-prompt pipeline extracting narrative themes and drafting natural 2-speaker dialogue between Alex (Analyst) and Morgan (Inquisitive Co-host).
  - Validate script JSON schema with speaker tags, emotion hints, and dialogue lines.
- [x] **Task 7.2: Multi-Voice TTS Audio Pipeline**
  - Implement asynchronous TTS synthesizer using `edge-tts` (or OpenAI TTS).
  - Assign distinct voices: `en-US-GuyNeural` (Alex) and `en-US-JennyNeural` (Morgan).
  - Concatenate audio segments and normalize volume to -16 LUFS.
  - Save output `.mp3` into notebook artifacts.
- [x] **Task 7.3: Frontend Audio Overview Player**
  - Build `<PodcastPlayer />` component with Play/Pause, -15s/+15s skip, speed adjustment (`0.8x` to `2.0x`), and download button.
  - Build Canvas-based animated waveform audio visualizer.
  - Display dynamic host indicator showing which speaker is talking in real time.

---

## Phase 8: Notes Scratchpad & Notebook Management
- [x] **Task 8.1: Live Scratchpad Editor**
  - Build embedded markdown note editor with auto-save.
  - Enable one-click conversion of chat responses into new notes.
- [x] **Task 8.2: Multi-Note Synthesis**
  - Allow selecting multiple notes and executing "Synthesize Notes" into a unified draft or essay.
- [x] **Task 8.3: Notebook Management**
  - Create, rename, duplicate, and delete notebooks.
  - Export entire notebook (sources, notes, chat transcripts) as a compressed archive (`.zip`).

---

## Phase 9: Testing, Optimization & Offline Capability
- [x] **Task 9.1: RAG Evaluation & Faithfulness Testing**
  - Build test suite evaluating Groundedness, Citation Accuracy, and Context Precision.
  - Benchmark chunk retrieval latency (< 150ms).
- [x] **Task 9.2: Complete Offline / Ollama Mode**
  - Test end-to-end operation with zero external internet access (Ollama LLM + local SentenceTransformers + local TTS).
- [x] **Task 9.3: UX Polish & Responsive Micro-Interactions**
  - Keyboard shortcuts (`Ctrl+Enter` to send, `Ctrl+B` toggle sources, `Ctrl+J` toggle studio).
  - Empty states, loading skeletons, and smooth CSS transitions.

---

## Phase 10: Editorial Research Desk UI/UX Redesign
- [x] **Task 10.1: Design Tokens & Typography Foundation**
  - Load Google Fonts (`Instrument Serif`, `Hanken Grotesk`, `JetBrains Mono`).
  - Implement full ink/paper tokens in `tokens.css`, eliminating AI-dashboard indigo palette.
  - Add 3.5% non-interactive SVG grain overlay, radial dot grid texture, custom scrollbars, and `prefers-reduced-motion` in `index.css`.
- [x] **Task 10.2: Header & Chrome Shell**
  - Custom SVG geometric mark, serif "Notebook" + mono "LM" + superscript "lite".
  - Minimal model popover with accent tick, 36px ghost theme toggle with 15° rotation.
  - Unequal pane layout (280px left, 380px right) separated by 1px rules with edge collapse handles.
- [x] **Task 10.3: Sources Ledger Panel**
  - Hairline ledger rows (zero cards), square animated checkboxes, middle-ellipsis filenames, 2px token share bars.
  - Accent-filled Upload button with nudge arrow, secondary ghost button for text paste, drag-and-drop overlay.
- [x] **Task 10.4: Center Column, Citations & Raised Composer**
  - Left-aligned empty state with mono eyebrow, 56px Instrument Serif H1, and 4 numbered hover rows (`01`-`04`).
  - Raised composer (`var(--bg-2)`, 14px radius, `var(--shadow-raised)`) with auto-grow textarea, accent focus ring, and status footer.
  - Message turns without bubble wrappers: user turn in serif italic with left rule, assistant in 16px body prose.
  - Interactive `<CitationPill />` superscript chips with hover excerpt popover.
- [x] **Task 10.5: Studio Panel & Audio Player**
  - Raised audio player (`var(--bg-2)`, `var(--shadow-raised)`) with `var(--signal)` accents.
  - Interactive canvas waveform scrubber (waveform IS the scrubber, no range input), host avatars (Alex/Morgan), 46px signal play button, segmented speed pills.
  - Minimal editorial tablist (`STUDIO` / `NOTES`), 2x2 clickable generator tiles, hairline artifact ledger, and manuscript modal viewer.

---

## Phase 11: LLM Engine Reliability, Local Comprehension & Settings Modal
- [x] **Task 11.1: Settings API & Dynamic Provider Credentials**
  - Implement `/api/settings` GET and POST endpoint for persistent `.env` updates (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`).
  - Add Settings Modal in frontend with credential management, free Gemini API link, and active key indicator.
- [x] **Task 11.2: High-Quality Grounded Local Comprehension Engine**
  - Replace naive 1-sentence placeholder fallback with structured synthesis engine.
  - Identify overview vs. targeted queries, extract objectives, architectural breakdown, and critical takeaways with verifiable `[1]`, `[2]` citations.
- [x] **Task 11.3: Background Process Health & Reconnection**
  - Restarted and verified background FastAPI (port 8000) and Vite (port 5173) services following server restart.


