# Engineering & Development Rules (RULES.md)
## Project: NotebookLM-lite

---

## 1. Prime Directive: The Grounding Contract
NotebookLM-lite is not a generic conversational chatbot. Its core value proposition is **absolute grounding and verifiable attribution**.

1. **Zero Hallucination Policy**:
   - The AI assistant must never fabricate details that cannot be directly supported by the retrieved document chunks.
   - If the uploaded sources lack information to answer a user prompt, the system must unequivocally answer:
     > *"Based on the selected sources, there is no mention of [topic]."*
2. **Mandatory Inline Citations**:
   - Every substantive claim must be followed by a bracketed citation index (e.g., `[1]`, `[2]`).
   - Every citation index must resolve to an exact retrieved chunk stored in the session payload.
3. **Source Scoping Honesty**:
   - Only sources marked `is_active = True` by the user in the sidebar may be injected into the retrieval context. Inactive sources must be strictly omitted.

---

## 2. Codebase Architecture & Modularity Rules

1. **Separation of Concerns**:
   - `core/ingest/`: Responsible exclusively for parsing files into raw text and bounding metadata. No LLM or vector logic.
   - `core/rag/`: Responsible for chunking, vector embedding, hybrid retrieval, and prompt context assembly.
   - `core/studio/`: Responsible for generative artifacts (Audio script, Study Guides, FAQs, Briefing Docs).
   - `core/audio/`: Responsible for TTS generation and audio segment stitching.
   - `api/`: FastAPI route handlers and request/response validation schemas. No direct filesystem mutations or raw database SQL.
   - `frontend/`: UI components, layout state, audio visualizers, and API clients.
2. **Provider Agnostic Abstraction**:
   - Never hardcode vendor-specific LLM calls in business logic. Always code against the unified `LLMProvider` interface (`generate()`, `stream()`, `embed()`).
3. **Database Transactions & Data Safety**:
   - All write operations across SQLite and Vector DB must be atomic or cleanly rolled back if chunking/indexing fails mid-process.

---

## 3. Language & Coding Standards

### 3.1 Python Backend Standards
- **Python Version**: Python 3.11+.
- **Typing**: Strict type hints (`mypy` compliant) on every function signature. No naked `Any` without explicit justification.
- **Pydantic Validation**: All API request bodies and response models must use Pydantic v2 schemas.
- **Asynchronous Execution**: All I/O bound operations (API requests, database queries, vector retrieval, audio file writes) must use `async`/`await`.
- **Error Handling**: Use custom application exceptions (`SourceNotFoundError`, `IngestionError`, `GroundingException`) with consistent HTTP status codes.

### 3.2 Frontend (TypeScript & React) Standards
- **TypeScript**: Strict mode enabled (`"strict": true`). No `any` types; define comprehensive interfaces for all API payloads and chunk states.
- **Component Design**: Functional components with custom hooks for business logic (e.g., `useNotebook()`, `useAudioPlayer()`, `useRAGStream()`).
- **Styling Architecture**: Vanilla CSS with CSS Modules and centralized theme custom properties (`var(--...)`). Do not use ad-hoc inline styles.
- **Accessibility (a11y)**: Every button, toggle, and citation trigger must include descriptive `aria-label` attributes and keyboard focus indicators.

---

## 4. Audio Overview & Synthesis Standards

1. **Conversational Naturalness**:
   - Audio dialogue scripts must feature two distinct persona voices (Speaker A: Analyst / Speaker B: Inquisitive).
   - Scripts should avoid robotic readouts; include natural conversational transitions, questions, analogies, and dynamic pacing.
2. **Audio Pipeline Safety**:
   - TTS requests must be processed asynchronously in manageable sentence batches.
   - Audio files must be stored as standard `.mp3` or `.wav` with normalized volume levels (target -16 LUFS).
   - If audio synthesis fails or is interrupted, the UI must fall back gracefully to displaying the text dialogue script.

---

## 5. Security & Privacy Rules

1. **Local-First & Path Sanitization**:
   - Validate and sanitize all uploaded filenames to prevent directory traversal attacks (`../`).
   - Store uploaded files strictly within the designated user workspace directory (`./storage/uploads/`).
2. **Secret Management**:
   - API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) must **NEVER** be committed to Git.
   - Provide a `.env.example` template and load configurations exclusively through environment variables.
3. **CORS & Binding**:
   - Default server binding must be restricted to `127.0.0.1` / `localhost`.

---

## 6. Testing & Quality Metrics

1. **Unit Testing**:
   - Chunking algorithms must be tested for boundary preservation, character offset accuracy, and token limits.
   - Citation parsers must be tested with malformed markdown to ensure regex extraction does not panic.
2. **RAG Faithfulness Evaluation (The RAG Triad)**:
   - **Context Relevance**: Did the retriever fetch chunks relevant to the user's prompt?
   - **Groundedness**: Is every sentence in the response directly supported by the retrieved chunks?
   - **Answer Relevance**: Did the response directly address the question without generic filler?
3. **Regression Prevention**:
   - Any bug fix must be accompanied by an automated test reproducing the edge case before merging.

---

## 7. Version Control & Commit Conventions
- Use Conventional Commits standard:
  - `feat(rag): add reciprocal rank fusion hybrid search`
  - `fix(ingest): handle scanned PDF text extraction exceptions`
  - `docs(prd): update audio overview specifications`
  - `style(ui): improve citation popover elevation and contrast`
- Never commit large binary files or generated audio artifacts to Git. Maintain an exhaustive `.gitignore`.
