# UI/UX & Design System Specification (DESIGN.md)
## Project: NotebookLM-lite

---

## 1. Design Philosophy

NotebookLM-lite is conceived as an **intellectual thinking environment**—a calm, distraction-free digital laboratory for deep work, synthesis, and grounded comprehension.

### Core Visual Principles
1. **Content-First & Grounded Clarity**: The UI recedes into the background, elevating the user's documents and answers. Citations are distinct, interactive, and visually authoritative.
2. **Harmonious 3-Zone Architecture**: Sources on the left (inputs), Chat in the center (process), and Studio/Notes on the right (outputs).
3. **Restrained Elegance with Micro-Delight**: Sophisticated dark/light modes with subtle glassmorphic depth, smooth transitions, and dynamic audio waveforms.
4. **Immediate Legibility**: Academic-grade typography with clear visual hierarchy, balanced line heights, and syntax-highlighted code/math blocks.

---

## 2. Design Tokens & Theme System

The design system is implemented via CSS Custom Properties to facilitate effortless theme switching and consistency.

### 2.1 Color Palette

#### Dark Mode (Default)
```css
:root[data-theme="dark"] {
  /* Surfaces & Backgrounds */
  --bg-app: #0b0f17;            /* Deep obsidian background */
  --bg-panel: #111827;          /* Card & sidebar background */
  --bg-panel-elevated: #1f2937; /* Dropdowns, popovers, modals */
  --bg-hover: #374151;          /* Hover states */
  --bg-input: #0f172a;          /* Text inputs & search fields */

  /* Borders & Dividers */
  --border-subtle: #1e293b;
  --border-default: #334155;
  --border-focus: #6366f1;

  /* Typography */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-inverse: #0b0f17;

  /* Brand & Accents */
  --brand-primary: #6366f1;     /* Indigo-500 */
  --brand-hover: #4f46e5;       /* Indigo-600 */
  --brand-glow: rgba(99, 102, 241, 0.25);
  --accent-cyan: #06b6d4;       /* Audio & podcast accents */
  --accent-emerald: #10b981;    /* Grounding verified badge */
  --accent-amber: #f59e0b;      /* Warning / partial context */
  --accent-rose: #f43f5e;       /* Error / ungrounded */

  /* Citations */
  --citation-bg: rgba(99, 102, 241, 0.15);
  --citation-border: rgba(99, 102, 241, 0.4);
  --citation-text: #a5b4fc;
}
```

#### Light Mode (Academic Crisp)
```css
:root[data-theme="light"] {
  --bg-app: #f8fafc;
  --bg-panel: #ffffff;
  --bg-panel-elevated: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-input: #ffffff;

  --border-subtle: #e2e8f0;
  --border-default: #cbd5e1;
  --border-focus: #4f46e5;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;

  --brand-primary: #4f46e5;
  --brand-hover: #4338ca;
  --brand-glow: rgba(79, 70, 229, 0.15);
  --accent-cyan: #0891b2;
  --accent-emerald: #059669;
  --accent-amber: #d97706;
  --accent-rose: #e11d48;

  --citation-bg: #eef2ff;
  --citation-border: #c7d2fe;
  --citation-text: #4338ca;
}
```

### 2.2 Typography
- **UI & Controls Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- **Reading & Document Font**: `Source Serif 4`, `Merriweather`, serif (for long-form source previews & study guides).
- **Monospace & Code Font**: `JetBrains Mono`, `Fira Code`, monospace.
- **Type Scale**:
  - `Display`: 24px (1.5rem), SemiBold 600, Line Height 1.25
  - `Heading`: 18px (1.125rem), Medium 500, Line Height 1.3
  - `Body`: 14px (0.875rem), Regular 400, Line Height 1.6
  - `Small / Badge`: 12px (0.75rem), Medium 500, Line Height 1.4
  - `Micro / Citation`: 11px (0.6875rem), SemiBold 600

---

## 3. Screen Layout & Workspace Wireframe

```text
+---------------------------------------------------------------------------------------------------+
|  [Logo] NotebookLM-lite  |  📁 Project: Transformer Deep Dive ▾  |  Model: Gemini 1.5 Flash ▾  | ⚙️ 🌙 |
+---------------------------------------------------------------------------------------------------+
| SOURCES (300px)           | GROUNDED WORKSPACE (Flex 1)             | STUDIO & NOTES (360px)      |
|                           |                                         |                             |
| + Add Source (PDF/Doc)    | --------------------------------------- | 🎙️ AUDIO OVERVIEW           |
|                           | User: Summarize the attention mechanism | [▶ Play] [|| Pause]  02:14  |
| [✓] Attention_Paper.pdf   | Assistant:                              | ~~~|||||~~~~||||||~~~~~     |
|     12 Pages • 4.2k toks  | Attention calculates a weighted sum of  | Host 1: Alex | Host 2: Morgan|
| [✓] Transformer_Survey.md | values based on query-key compatibility |                             |
|     8 Sections • 2.1k toks| [1]. It eliminates recurrent sequential | --------------------------- |
| [ ] Draft_RFC.txt         | dependencies entirely [2].              | 📋 STUDIO ARTIFACTS         |
|     (Inactive)            |                                         | [Study Guide]    [Generate] |
|                           | [1] Popover: Attention_Paper.pdf (p.3)  | [Briefing Doc]   [Generate] |
|                           |     "Attention functions map queries..."| [FAQs & Terms]   [Generate] |
| ------------------------- |                                         | [Timeline]       [Generate] |
| Source Quick Preview:     | [Save as Note]  [Copy]  [Regenerate]    | --------------------------- |
| "Attention Is All..."     | --------------------------------------- | 📝 SCRATCHPAD NOTES         |
| [Full Screen Reader ↗]    | Ask a question or search sources... [↑] | - Main insight: Scaled DP   |
|                           | [✓ 2 sources active]                    | - Need to review Sec 3.2    |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Key Interactive Components

### 4.1 Interactive Citation Badge (`<CitationPill />`)
- **Appearance**: A compact, rounded pill (e.g., `[1]`) with brand tint and subtle border.
- **Hover State**: Elevates with brand glow; triggers an anchored tooltip displaying:
  - Source Title & File Icon
  - Page Number or Section Heading
  - Verbatim excerpt snippet highlighted in yellow/indigo
- **Click State**: Toggles persistent side-drawer source viewer scrolled directly to the matching chunk.

### 4.2 Source Selection Tile (`<SourceCard />`)
- **Checkbox Toggle**: Checkbox indicates whether this source is included in the current RAG retrieval scope.
- **Badge Indicators**: Displays file type (`PDF`, `MD`, `TXT`), page/token count, and indexing status (`Indexed`, `Processing...`, `Error`).
- **Context Menu**: Rename source, view source chunks, download, or delete.

### 4.3 Audio Overview Player (`<PodcastPlayer />`)
- **Header**: "Audio Overview: Deep Dive (2 Hosts)".
- **Waveform Canvas**: Real-time animated canvas bars displaying audio amplitude.
- **Speaker Attribution**: Subtle active indicator highlighting which host is currently speaking (`Alex` vs `Morgan`).
- **Controls**: Play/Pause button, -15s / +15s jump buttons, Speed selector (`0.8x`, `1.0x`, `1.2x`, `1.5x`), Download MP3.

### 4.4 Studio Artifact Card (`<StudioCard />`)
- Compact card featuring:
  - Icon (Book, Document, Help Circle, Calendar)
  - Title and short description (e.g., "Study Guide: Flashcards & Quiz")
  - Action button: `Generate` (with spinner when executing) or `View` when ready
  - Generated output opens in an interactive modal with instant Markdown rendering and "Export to Note" / "Download .md".

### 4.5 Scratchpad Note Editor (`<NoteEditor />`)
- Integrated markdown editor with live preview toggle.
- Automatically supports appending AI responses via a "Send to Note" button.
- Support for auto-saving with status badge ("Saved 2m ago").

---

## 5. Responsive Behavior & Density Modes

1. **Collapsible Sidebars**:
   - Both the Sources panel and the Studio panel can be collapsed using quick toggle buttons (`[<<]`, `[>>]`) or hotkeys (`Ctrl+B`, `Ctrl+J`) to provide a focused distraction-free chat reading experience.
2. **Compact vs. Comfortable Density**:
   - User setting to toggle spacing between compact (dense research mode) and comfortable (relaxed reading mode).
3. **Modal Previews**:
   - Full-page source inspection opens cleanly in a centered dialog with pagination controls for multi-page PDFs.
