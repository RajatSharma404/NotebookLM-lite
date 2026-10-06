# Product Requirements Document (PRD)
## Project: NotebookLM-lite

---

## 1. Executive Summary
**NotebookLM-lite** is a localized, privacy-conscious, and developer-friendly alternative to Google NotebookLM. It empowers researchers, students, developers, and knowledge workers to synthesize, interrogate, and interact with complex document collections through grounded, verifiable artificial intelligence.

Unlike generic LLM chat interfaces that hallucinate or provide vague attributions, NotebookLM-lite operates under a **strict grounding contract**: every generated claim, summary, and audio dialogue must be directly tied to verifiable source citations extracted from uploaded documents.

---

## 2. Problem Statement
1. **Information Overload**: Modern professionals and learners digest dozens of papers, technical specs, PDFs, and notes daily without an efficient synthesis engine.
2. **Hallucination & Lack of Trust**: Standard LLM chats provide plausible-sounding answers with non-existent or fabricated sources.
3. **Context Fragmentation**: Users must manually read, cross-reference, and summarize across disparate files (PDFs, Markdown notes, research reports).
4. **Passive Reading vs. Active Engagement**: Traditional notes are static; users lack multi-modal synthesis such as conversational audio deep dives ("audio podcast overviews"), automated study guides, and interactive source-grounded queries.
5. **Data Privacy Concerns**: Cloud-exclusive enterprise tools often send sensitive internal documents to third-party proprietary clouds with opaque retention policies.

---

## 3. Product Vision & Goals
### 3.1 Vision
To create the premier lightweight, extensible, and locally/hybrid-deployable personal research assistant that transforms static documents into a dynamic, interactive, and audible thinking partner.

### 3.2 Core Objectives
- **Zero-Unverified Claims**: Deliver RAG (Retrieval-Augmented Generation) where every statement references specific source excerpts with exact page/chunk coordinates.
- **Source-Centric Workspace**: Support dynamic toggling of sources so users can query subsets of their knowledge base on demand.
- **Studio Generative Artifacts**: Automate one-click generation of Audio Deep Dives (two-speaker podcast discussions), Study Guides, FAQs, Briefing Documents, and Timelines.
- **Fluid, Integrated Notes**: Provide a first-class scratchpad note-taking system where answers and citations can be instantly converted into notes and synthesized.
- **Provider Agnostic**: Run seamlessly with cloud providers (OpenAI, Anthropic, Google Gemini) or local models (Ollama, vLLM, local embeddings) with zero vendor lock-in.

---

## 4. Target Personas & Primary Use Cases

| Persona | Core Need | Key Feature Utilized |
| :--- | :--- | :--- |
| **Academic Researcher** | Compare multiple research papers, verify methodology | Source comparison, citation drill-down, study guides |
| **Software Engineer** | Ingest architecture specs, RFCs, and API documentation | Multi-file grounded Q&A, markdown export, code snippets |
| **Student / Lifelong Learner** | Revise textbooks, prepare for exams on the go | Audio Overview podcast generator, flashcards/study guides |
| **Legal / Compliance Analyst** | Strict document verification with clause tracing | Exact sentence-level citations with highlight previews |

---

## 5. Functional Requirements (FR)

### 5.1 Knowledge Ingestion & Source Management
- **FR-1.1 Supported File Types**:
  - PDF (`.pdf`) with text extraction and page coordinate tracking.
  - Markdown (`.md`) and Plain Text (`.txt`).
  - Rich Text / Word Documents (`.docx`).
  - Direct Text Pasting (raw notes or web clippings).
  - Web URL / HTML text extraction (future local fetcher).
- **FR-1.2 Multi-Notebook Hierarchy**:
  - Users can create isolated workspaces ("Notebooks") with dedicated vector indexes and notes.
- **FR-1.3 Granular Source Toggling**:
  - Each source within a notebook has an active/inactive toggle switch.
  - Queries only retrieve context from active sources.
- **FR-1.4 Source Inspector**:
  - Clicking any source in the sidebar opens the document reader view with highlight overlays for retrieved chunks.

### 5.2 Retrieval & Grounded Q&A (Chat Engine)
- **FR-2.1 Strict Grounding Guardrail**:
  - The model is instructed to answer *strictly* using the retrieved source context. If an answer cannot be corroborated, the model must explicitly state insufficient context.
- **FR-2.2 Interactive Inline Citations**:
  - Generated responses must contain clickable citation badges (e.g., `[1]`, `[2]`).
  - Hovering/clicking a citation reveals a popover containing the exact text chunk, source title, and page/section number.
- **FR-2.3 Streaming Responses**:
  - Low-latency token streaming with realtime citation resolution.
- **FR-2.4 Conversational Memory with Context Scoping**:
  - Chat history retained per notebook, combining query history with dynamically re-retrieved context.

### 5.3 Studio & Generative Artifacts
- **FR-3.1 Audio Overview (Podcast Generator)**:
  - Generate a natural, engaging two-host dialogue ("Host 1: Analyst" and "Host 2: Curious Questioner") summarizing uploaded documents.
  - Convert dialogue into audible multi-voice speech via TTS (Text-to-Speech) with playback controls (play, pause, seek, playback speed, wave visualization).
- **FR-3.2 Study Guide Generator**:
  - Automated generation of key concepts, glossary terms, review questions, and practice quiz exercises.
- **FR-3.3 Briefing Doc & Executive Summary**:
  - High-level executive synthesis with bulleted highlights, core arguments, and risk/opportunity analyses.
- **FR-3.4 FAQ & Glossary**:
  - Automatic extraction of frequently asked questions and key domain terminologies.
- **FR-3.5 Timeline Generator**:
  - Chronological extraction of milestones, events, or developmental phases across documents.

### 5.4 Personal Notes & Synthesis
- **FR-4.1 Integrated Scratchpad**:
  - Markdown note editor side-by-side with chat and sources.
- **FR-4.2 One-Click "Save to Note"**:
  - Any LLM response or user prompt can be sent to notes with citations intact.
- **FR-4.3 Note Synthesis**:
  - Users can select multiple notes and ask the AI to summarize, combine, or expand them into a coherent draft.

---

## 6. Non-Functional Requirements (NFR)

### 6.1 Performance & Latency
- **NFR-1 Ingestion Speed**: Standard 50-page PDF parsed, chunked, and embedded within < 10 seconds locally.
- **NFR-2 Time to First Token (TTFT)**: < 1.2s on cloud LLMs, < 2.5s on local models (Ollama).
- **NFR-3 Retrieval Latency**: Top-k vector + BM25 hybrid search execution in < 150ms.

### 6.2 Accuracy & Hallucination Resistance
- **NFR-4 Faithfulness Metric**: Minimum 95% faithfulness score on RAG benchmarks (context relevance vs. output claims).
- **NFR-5 Citation Integrity**: 100% of citation numbers must map to non-empty chunks retrieved for that prompt.

### 6.3 Usability & Aesthetics
- **NFR-6 Interface Standards**:
  - Premium, modern aesthetic (content-first, curated dark/light palettes, glassmorphism accents, smooth micro-interactions).
  - 3-panel split view (Sources on Left, Chat/Workspace in Center, Studio/Notes on Right) with collapsible sidebars.
- **NFR-7 Accessibility**: Keyboard shortcuts for prompt dispatch, source toggling, and note creation.

### 6.4 Security & Privacy
- **NFR-8 Local-First Storage**: Notebook documents, vector store, and chat histories persist locally on the user's filesystem or dedicated private database.
- **NFR-9 Credential Safety**: API keys stored in local environment configs, never exposed in client bundles or logged.

---

## 7. Tech Stack Overview

- **Frontend**: Modern SPA (Next.js / Vite React with TypeScript), Vanilla CSS / Custom Design System tokens, Lucide icons, Markdown-it / KaTeX for LaTeX support.
- **Backend API**: Python FastAPI (clean asynchronous endpoints, multi-threaded document parsing, streaming SSE).
- **Vector Engine**: ChromaDB / SQLite-vec (embedded, serverless, local persistence).
- **Retrieval Pipeline**: Hybrid Search (Dense vector cosine similarity + BM25 sparse keyword ranking + Reciprocal Rank Fusion).
- **Audio TTS**: Dual-voice TTS engine (Edge-TTS / OpenAI TTS / Piper TTS for offline execution).
- **LLM Abstraction**: LangChain / LiteLLM / Custom Unified Model Provider (supporting OpenAI, Anthropic, Gemini, Ollama).

---

## 8. Release Milestones & Scope
- **M1: Minimal Viable Notebook (Core RAG)**: Multi-source ingestion (PDF/MD/TXT), hybrid retrieval, 3-panel layout, streaming chat with verified inline citations.
- **M2: Studio & Notes System**: Markdown scratchpad, "Save to Note", Study Guide and Briefing Doc generators.
- **M3: Audio Overview Engine**: Two-speaker script generation, multi-voice audio synthesis, integrated waveform player.
- **M4: Offline & Local Model Mastery**: Full local pipeline support via Ollama + local sentence transformers + offline TTS.
