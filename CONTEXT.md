# Session & Prompt Context Log (CONTEXT.md)
## Project: NotebookLM-lite

This document maintains a living, structured record of every user prompt, architectural decisions made, files created or updated, and current project context across the lifecycle of NotebookLM-lite.

---

## Current Project Status Snapshot
- **Repository**: `https://github.com/RajatSharma404/NotebookLM-lite`
- **Active Branch**: `main`
- **Current Milestone**: Phase 0 (Planning, Specifications, Workspace Skills & Environment Alignment)
- **Active Workspace Skills**:
  - `document-ingestion-pipeline`
  - `hybrid-rag-retrieval`
  - `grounded-citation-engine`
  - `audio-overview-synthesis`
  - `notebooklm-design-system`
  - `studio-artifacts-generator`
  - `commit`

---

## Chronological Prompt & Interaction History

### Prompt 1: Repository Connection
- **User Intent**: Connect local workspace `d:\NotebookLM lite` with GitHub repository `https://github.com/RajatSharma404/NotebookLM-lite`.
- **Context & Constraints**: Workspace was initially empty.
- **Actions Taken**:
  - Cloned repository into the workspace root.
  - Verified remote configuration (`origin` pointing to `https://github.com/RajatSharma404/NotebookLM-lite.git`).
  - Confirmed clean working tree on branch `main`.
- **Files Modified / Created**:
  - Cloned repository contents (`README.md`, `.git`).

---

### Prompt 2: Core Engineering Specifications Generation
- **User Intent**: Generate foundational architectural and product documentation (`PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `DESIGN.md`, `TASK.md`) strictly using first-principles reasoning without web browsing or external tools.
- **Context & Constraints**: Must design a complete, production-grade NotebookLM clone ("NotebookLM-lite") covering multi-format ingestion, grounded RAG, inline citations, audio podcast generation, and personal notes.
- **Actions Taken**:
  - Authored [PRD.md](file:///d:/NotebookLM%20lite/PRD.md) covering vision, user personas, functional and non-functional requirements.
  - Authored [ARCHITECTURE.md](file:///d:/NotebookLM%20lite/ARCHITECTURE.md) detailing 3-panel UI, hybrid retrieval (Dense + BM25 + Reciprocal Rank Fusion), audio synthesis sequence, and database ERDs.
  - Authored [RULES.md](file:///d:/NotebookLM%20lite/RULES.md) establishing the zero-hallucination Grounding Contract, citation integrity rules, and code quality standards.
  - Authored [DESIGN.md](file:///d:/NotebookLM%20lite/DESIGN.md) defining the design philosophy, dark/light token palettes, 3-zone wireframe, and `<CitationPill />` / `<PodcastPlayer />` components.
  - Authored [TASK.md](file:///d:/NotebookLM%20lite/TASK.md) laying out a 9-phase actionable implementation roadmap with task checkboxes.
- **Files Created**:
  - [PRD.md](file:///d:/NotebookLM%20lite/PRD.md)
  - [ARCHITECTURE.md](file:///d:/NotebookLM%20lite/ARCHITECTURE.md)
  - [RULES.md](file:///d:/NotebookLM%20lite/RULES.md)
  - [DESIGN.md](file:///d:/NotebookLM%20lite/DESIGN.md)
  - [TASK.md](file:///d:/NotebookLM%20lite/TASK.md)

---

### Prompt 3: Workspace Skills Creation
- **User Intent**: Create all specialized skills needed to develop the project before starting implementation, strictly relying on internal reasoning.
- **Context & Constraints**: Follow Antigravity skill specification (`SKILL.md` with YAML frontmatter in `.agents/skills/<skill_name>/`).
- **Actions Taken**:
  - Built [document-ingestion-pipeline](file:///d:/NotebookLM%20lite/.agents/skills/document-ingestion-pipeline/SKILL.md) for parsing and semantic chunking.
  - Built [hybrid-rag-retrieval](file:///d:/NotebookLM%20lite/.agents/skills/hybrid-rag-retrieval/SKILL.md) for ChromaDB + BM25Okapi + Reciprocal Rank Fusion.
  - Built [grounded-citation-engine](file:///d:/NotebookLM%20lite/.agents/skills/grounded-citation-engine/SKILL.md) for zero-hallucination prompts and streaming SSE citation tags.
  - Built [audio-overview-synthesis](file:///d:/NotebookLM%20lite/.agents/skills/audio-overview-synthesis/SKILL.md) for 2-host podcast dialogue and TTS audio synthesis.
  - Built [notebooklm-design-system](file:///d:/NotebookLM%20lite/.agents/skills/notebooklm-design-system/SKILL.md) for 3-column UI, tokens, and components.
  - Built [studio-artifacts-generator](file:///d:/NotebookLM%20lite/.agents/skills/studio-artifacts-generator/SKILL.md) for Study Guides, FAQs, Briefing Docs, and note synthesis.
- **Files Created**:
  - `.agents/skills/document-ingestion-pipeline/SKILL.md`
  - `.agents/skills/hybrid-rag-retrieval/SKILL.md`
  - `.agents/skills/grounded-citation-engine/SKILL.md`
  - `.agents/skills/audio-overview-synthesis/SKILL.md`
  - `.agents/skills/notebooklm-design-system/SKILL.md`
  - `.agents/skills/studio-artifacts-generator/SKILL.md`

---

### Prompt 4: Context Logging & Granular Git Commit Skill
- **User Intent**:
  1. Create `CONTEXT.md` to continuously log context for every prompt.
  2. Create a specialized `commit` skill that stages, commits, and pushes files one-by-one to produce a rich and granular commit history on GitHub.
- **Context & Constraints**: Strict first-principles design without external web access.
- **Actions Taken**:
  - Created [CONTEXT.md](file:///d:/NotebookLM%20lite/CONTEXT.md) logging all chronological prompts, context, decisions, and system state.
  - Created [commit](file:///d:/NotebookLM%20lite/.agents/skills/commit/SKILL.md) skill with automated file-by-file staging, conventional message generation, and immediate push workflow.
  - Provided executable script for automated 1-by-1 committing and pushing.
- **Files Created**:
  - [CONTEXT.md](file:///d:/NotebookLM%20lite/CONTEXT.md)
  - `.agents/skills/commit/SKILL.md`
  - `.agents/skills/commit/scripts/commit_push_each.py`

---

### Prompt 5: Phase 1 Foundation, Scaffolding & Configuration
- **User Intent**: Begin Phase 1 under `/goal` execution without internet or browser, building all foundational backend and frontend scaffolding.
- **Context & Constraints**: Zero browser/search reliance; establish production-grade modular FastAPI backend and Vite React TypeScript frontend.
- **Actions Taken**:
  - Configured `.gitignore` and `.env.example` templates.
  - Initialized Python backend virtual environment and installed requirements (`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `pypdf`, `pymupdf`, `python-docx`, `rank-bm25`, `edge-tts`, `httpx`, `python-dotenv`).
  - Built SQLite database models, schemas, and relational architecture (`Notebook`, `Source`, `Chunk`, `ChatThread`, `Message`, `CitationRef`, `Note`, `StudioArtifact`).
  - Implemented FastAPI routers (`notebooks`, `sources`, `chat`, `notes`, `studio`, `audio`) and verified clean initialization.
  - Scaffolded Vite React TypeScript frontend with theme tokens, responsive 3-column layout, `<SourcesPanel />`, `<ChatWorkspace />` with inline `<CitationPill />`, and `<StudioPanel />` with `<AudioPlayer />`.
  - Verified end-to-end frontend production bundle build (`tsc && vite build`).
- **Files Created / Updated**:
  - [`.gitignore`](file:///d:/NotebookLM%20lite/.gitignore)
  - [`.env.example`](file:///d:/NotebookLM%20lite/.env.example)
  - [`requirements.txt`](file:///d:/NotebookLM%20lite/requirements.txt)
  - [`core/config.py`](file:///d:/NotebookLM%20lite/core/config.py)
  - [`core/database.py`](file:///d:/NotebookLM%20lite/core/database.py)
  - [`core/models.py`](file:///d:/NotebookLM%20lite/core/models.py)
  - [`core/schemas.py`](file:///d:/NotebookLM%20lite/core/schemas.py)
  - [`api/main.py`](file:///d:/NotebookLM%20lite/api/main.py)
  - [`api/routers/notebooks.py`](file:///d:/NotebookLM%20lite/api/routers/notebooks.py)
  - [`api/routers/sources.py`](file:///d:/NotebookLM%20lite/api/routers/sources.py)
  - [`api/routers/chat.py`](file:///d:/NotebookLM%20lite/api/routers/chat.py)
  - [`api/routers/notes.py`](file:///d:/NotebookLM%20lite/api/routers/notes.py)
  - [`api/routers/studio.py`](file:///d:/NotebookLM%20lite/api/routers/studio.py)
  - [`api/routers/audio.py`](file:///d:/NotebookLM%20lite/api/routers/audio.py)
  - [`frontend/package.json`](file:///d:/NotebookLM%20lite/frontend/package.json)
  - [`frontend/tsconfig.json`](file:///d:/NotebookLM%20lite/frontend/tsconfig.json)
  - [`frontend/vite.config.ts`](file:///d:/NotebookLM%20lite/frontend/vite.config.ts)
  - [`frontend/index.html`](file:///d:/NotebookLM%20lite/frontend/index.html)
  - [`frontend/src/tokens.css`](file:///d:/NotebookLM%20lite/frontend/src/tokens.css)
  - [`frontend/src/index.css`](file:///d:/NotebookLM%20lite/frontend/src/index.css)
  - [`frontend/src/types.ts`](file:///d:/NotebookLM%20lite/frontend/src/types.ts)
  - [`frontend/src/components/CitationPill.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/CitationPill.tsx)
  - [`frontend/src/components/AudioPlayer.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/AudioPlayer.tsx)
  - [`frontend/src/components/SourcesPanel.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/SourcesPanel.tsx)
  - [`frontend/src/components/StudioPanel.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/StudioPanel.tsx)
  - [`frontend/src/components/ChatWorkspace.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/ChatWorkspace.tsx)
  - [`frontend/src/App.tsx`](file:///d:/NotebookLM%20lite/frontend/src/App.tsx)
  - [`TASK.md`](file:///d:/NotebookLM%20lite/TASK.md)

---

### Prompt 6: Full System Implementation, Testing & Verification
- **User Intent**: Build and verify complete functionality across ingestion, hybrid RAG, streaming citations, studio artifacts, audio overview, and notes synthesis.
- **Context & Constraints**: Strict first-principles design without external web access.
- **Actions Taken**:
  - Implemented multi-format document parsers (`core/ingest/pdf_parser.py`, `core/ingest/md_parser.py`, `core/ingest/docx_parser.py`) and sliding window semantic chunker (`core/ingest/chunker.py`).
  - Integrated ChromaDB and BM25Okapi hybrid retrieval engine with Reciprocal Rank Fusion (`core/rag/retriever.py`, `core/rag/bm25.py`, `core/rag/chroma_store.py`).
  - Built grounded streaming chat engine with SSE real-time token and citation event emitter (`core/rag/generator.py`, `core/rag/providers.py`).
  - Built Studio generative artifacts engine (`core/studio/generators.py`) generating Study Guides, Briefing Docs, FAQs, and Timelines.
  - Built Audio Overview two-host podcast engine (`core/audio/podcast.py`) with Edge-TTS multi-voice audio synthesis (`Alex` & `Morgan`).
  - Added Note synthesis endpoint (`api/routers/notes.py`).
  - Connected live backend streaming and mutation APIs into Vite React frontend (`frontend/src/App.tsx`).
  - Created automated test suites and verified 100% test pass rate (`tests/test_ingestion.py`, `tests/test_retrieval.py`, `tests/test_chat_stream.py`, `tests/test_studio_and_audio.py`).
  - Verified frontend production bundle compilation (`tsc && vite build`).
- **Files Created / Updated**:
  - [`core/ingest/pdf_parser.py`](file:///d:/NotebookLM%20lite/core/ingest/pdf_parser.py)
  - [`core/ingest/md_parser.py`](file:///d:/NotebookLM%20lite/core/ingest/md_parser.py)
  - [`core/ingest/docx_parser.py`](file:///d:/NotebookLM%20lite/core/ingest/docx_parser.py)
  - [`core/ingest/chunker.py`](file:///d:/NotebookLM%20lite/core/ingest/chunker.py)
  - [`core/ingest/pipeline.py`](file:///d:/NotebookLM%20lite/core/ingest/pipeline.py)
  - [`core/rag/embeddings.py`](file:///d:/NotebookLM%20lite/core/rag/embeddings.py)
  - [`core/rag/bm25.py`](file:///d:/NotebookLM%20lite/core/rag/bm25.py)
  - [`core/rag/chroma_store.py`](file:///d:/NotebookLM%20lite/core/rag/chroma_store.py)
  - [`core/rag/retriever.py`](file:///d:/NotebookLM%20lite/core/rag/retriever.py)
  - [`core/rag/providers.py`](file:///d:/NotebookLM%20lite/core/rag/providers.py)
  - [`core/rag/generator.py`](file:///d:/NotebookLM%20lite/core/rag/generator.py)
  - [`core/studio/generators.py`](file:///d:/NotebookLM%20lite/core/studio/generators.py)
  - [`core/audio/podcast.py`](file:///d:/NotebookLM%20lite/core/audio/podcast.py)
  - [`api/routers/sources.py`](file:///d:/NotebookLM%20lite/api/routers/sources.py)
  - [`api/routers/chat.py`](file:///d:/NotebookLM%20lite/api/routers/chat.py)
  - [`api/routers/notes.py`](file:///d:/NotebookLM%20lite/api/routers/notes.py)
  - [`api/routers/studio.py`](file:///d:/NotebookLM%20lite/api/routers/studio.py)
  - [`api/routers/audio.py`](file:///d:/NotebookLM%20lite/api/routers/audio.py)
  - [`tests/test_ingestion.py`](file:///d:/NotebookLM%20lite/tests/test_ingestion.py)
  - [`tests/test_retrieval.py`](file:///d:/NotebookLM%20lite/tests/test_retrieval.py)
  - [`tests/test_chat_stream.py`](file:///d:/NotebookLM%20lite/tests/test_chat_stream.py)
  - [`tests/test_studio_and_audio.py`](file:///d:/NotebookLM%20lite/tests/test_studio_and_audio.py)
  - [`frontend/src/App.tsx`](file:///d:/NotebookLM%20lite/frontend/src/App.tsx)
  - [`TASK.md`](file:///d:/NotebookLM%20lite/TASK.md)
  - [`CONTEXT.md`](file:///d:/NotebookLM%20lite/CONTEXT.md)

---

### Prompt 7 & 8: Editorial Research Desk UI/UX Redesign
- **User Intent**: Complete visual and interaction overhaul of NotebookLM lite to eliminate the "AI-generated dashboard" trope (indigo on navy, card-overkill, centered empty states, generic Inter font, repeated Generate buttons) and establish an authentic "Editorial research desk" aesthetic.
- **Constraints**:
  - Visual and interaction rework only; do NOT change business logic, API calls, data flow, state shape, prop contracts, IDs, or accessibility attributes.
  - No new dependencies (except web fonts). Strictly NO raw hex/rgb or magic numbers; all values resolve via CSS variables.
  - Only `transform`/`opacity` animations, respecting `prefers-reduced-motion`.
  - Exactly TWO raised surfaces: chat composer and audio player. Everything else uses hairline 1px rules and quiet ledger rows.
  - Reserve `var(--signal)` (`#FF5A36`) exclusively for the audio player.
- **Actions Taken**:
  - Loaded `Instrument Serif`, `Hanken Grotesk`, and `JetBrains Mono` via Google Fonts in `frontend/index.html`.
  - Built comprehensive ink/paper token system in `frontend/src/tokens.css` with dark/light themes.
  - Implemented 3.5% SVG noise grain overlay, radial-masked dot grid texture, custom scrollbars, and reduced motion fallbacks in `frontend/src/index.css`.
  - Rebuilt header and 3-pane shell in `frontend/src/App.tsx` with geometric SVG mark, serif wordmark, custom model popover, 36px ghost theme toggle, and edge collapse rails (280px left, 380px right).
  - Rebuilt `frontend/src/components/SourcesPanel.tsx` with hairline ledger rows, animated square checkboxes, middle-ellipsis filenames, 2px token share bars, and sole accent-filled Upload button.
  - Rebuilt `frontend/src/components/CitationPill.tsx` with superscript chip and editorial popover excerpt.
  - Rebuilt `frontend/src/components/ChatWorkspace.tsx` with left-aligned 56px Instrument Serif empty state, 4 numbered hover rows (`01`-`04`), raised composer surface (`var(--bg-2)` + accent ring), auto-grow textarea, and message turns without card bubbles.
  - Rebuilt `frontend/src/components/AudioPlayer.tsx` as a raised surface with interactive waveform scrubber canvas, host monograms (Alex/Morgan), 46px signal play button, and segmented speed pills.
  - Rebuilt `frontend/src/components/StudioPanel.tsx` with editorial text tablist (`STUDIO` / `NOTES`), 2x2 clickable generator tiles, hairline artifact ledger, and manuscript preview modal.
- **Files Modified**:
  - [`frontend/index.html`](file:///d:/NotebookLM%20lite/frontend/index.html)
  - [`frontend/src/tokens.css`](file:///d:/NotebookLM%20lite/frontend/src/tokens.css)
  - [`frontend/src/index.css`](file:///d:/NotebookLM%20lite/frontend/src/index.css)
  - [`frontend/src/App.tsx`](file:///d:/NotebookLM%20lite/frontend/src/App.tsx)
  - [`frontend/src/components/SourcesPanel.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/SourcesPanel.tsx)
  - [`frontend/src/components/CitationPill.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/CitationPill.tsx)
  - [`frontend/src/components/ChatWorkspace.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/ChatWorkspace.tsx)
  - [`frontend/src/components/AudioPlayer.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/AudioPlayer.tsx)
  - [`frontend/src/components/StudioPanel.tsx`](file:///d:/NotebookLM%20lite/frontend/src/components/StudioPanel.tsx)
  - [`TASK.md`](file:///d:/NotebookLM%20lite/TASK.md)
  - [`CONTEXT.md`](file:///d:/NotebookLM%20lite/CONTEXT.md)

---

### Prompt 9: Document Explanation Engine Fix & Server Reconnection
- **User Intent**: User reported that the app was not reading uploaded documents and not explaining them.
- **Root Causes Diagnosed**:
  1. System restart had terminated background server processes (FastAPI backend port 8000 and Vite dev server port 5173 were offline).
  2. Fallback local synthesizer in `core/rag/providers.py` was a naive single-sentence extractor, outputting only 1 raw sentence fragment when no external LLM API key was configured.
  3. Frontend fetch failure fallback had a hardcoded generic string about self-attention rather than notifying the user of connection state.
- **Actions Taken**:
  - Engineered a high-accuracy Grounded Local Comprehension Engine in `core/rag/providers.py` that parses retrieved document passages, identifies whether the user wants an overview/explanation or specific query answer, synthesizes multi-section structured summaries (Objectives, Architectural Breakdown, Critical Takeaways), and tags accurate `[1]`, `[2]` inline citations.
  - Implemented `/api/settings` endpoint in `api/routers/settings.py` for dynamic `.env` configuration of Gemini, OpenAI, and Ollama credentials.
  - Added a Settings modal in `frontend/src/App.tsx` accessible via a header gear icon, allowing one-click configuration of free Google Gemini 1.5 Flash API keys.
  - Restarted and verified both the FastAPI backend daemon (127.0.0.1:8000) and Vite frontend dev server (127.0.0.1:5173).
  - Tested retrieval and streaming against the user's uploaded `AI ENGINNER Projects Roadmap.pdf`, verifying comprehensive multi-section explanation and citations.
- **Files Created / Modified**:
  - [`api/routers/settings.py`](file:///d:/NotebookLM%20lite/api/routers/settings.py)
  - [`api/main.py`](file:///d:/NotebookLM%20lite/api/main.py)
  - [`core/rag/providers.py`](file:///d:/NotebookLM%20lite/core/rag/providers.py)
  - [`frontend/src/App.tsx`](file:///d:/NotebookLM%20lite/frontend/src/App.tsx)
  - [`TASK.md`](file:///d:/NotebookLM%20lite/TASK.md)
  - [`CONTEXT.md`](file:///d:/NotebookLM%20lite/CONTEXT.md)




