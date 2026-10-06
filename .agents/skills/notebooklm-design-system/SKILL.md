---
name: notebooklm-design-system
description: >-
  Use this skill when building, styling, or refining UI components, layouts,
  CSS themes, citation badges, or interactive micro-interactions for NotebookLM-lite.
---

# NotebookLM Design System Skill

This skill provides styling standards, layout guidelines, and component patterns for creating a high-aesthetic, scholarly, and distraction-free user interface for NotebookLM-lite.

---

## 1. The 3-Column Layout Pattern

The interface is structured into three primary columns with collapsible sidebars:

```text
+---------------------------------------------------------------------------------+
| Top Bar: Project Switcher | Model Dropdown | Theme Toggle (Dark/Light) | Settings|
+---------------------------------------------------------------------------------+
| Sources Dock          | Grounded Workspace          | Studio & Notes Panel      |
| width: 300px          | flex: 1 (min-width: 480px)  | width: 360px              |
| Collapsible [<<]      | Grounded Streaming Chat     | Collapsible [>>]          |
| Multi-file selection  | Interactive [1] Citations   | Podcast Player & Notes    |
+---------------------------------------------------------------------------------+
```

### Layout Rules:
1. **Collapsible State**: Both sidebars must collapse gracefully with smooth CSS transitions (`transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s ease`).
2. **Keyboard Shortcuts**:
   - `Ctrl+B`: Toggle Left Sources Dock.
   - `Ctrl+J`: Toggle Right Studio Panel.
   - `Ctrl+Enter`: Send chat prompt.

---

## 2. Core Interactive Components

### 2.1 The Citation Pill (`<CitationPill />`)
- **Visual Style**: Rounded badge (pill), height `20px`, font size `11px`, bold weight.
- **Theme Variables**:
  - Background: `var(--citation-bg)`
  - Border: `1px solid var(--citation-border)`
  - Text: `var(--citation-text)`
- **Hover Micro-interaction**:
  - Glow effect: `box-shadow: 0 0 10px var(--brand-glow)`
  - Displays popover tooltip anchored above the pill showing source title, page number, and highlighted quote.

### 2.2 Source Card (`<SourceCard />`)
- Checkbox toggle switch indicating active state in retrieval scope.
- File badge with distinct colors:
  - `.pdf` (Crimson / Red accent)
  - `.md` / `.txt` (Sky blue accent)
  - `.docx` (Royal blue accent)
- Metadata subtitle: page count, estimated token count, and indexing status badge.

### 2.3 Audio Waveform Visualizer
- Canvas element drawing 32 dynamic amplitude bars.
- When audio is playing, animate bars with a subtle sine wave or live `AnalyserNode` frequency bins.
- Active host indicator:
  - Display chip with avatar: "🎙️ Alex speaking" or "🎙️ Morgan speaking".

---

## 3. Dark & Light Theme Implementation

Theme tokens must be defined in `tokens.css` using CSS custom properties:
- Never use inline color hex codes in component files; reference `var(--bg-app)`, `var(--text-primary)`, `var(--brand-primary)`, etc.
- Default to Dark mode with high-contrast text (`#f8fafc` on `#0b0f17`).
- Light mode must maintain an academic reading feel with warm paper tints (`#f8fafc` base, `#0f172a` text).
