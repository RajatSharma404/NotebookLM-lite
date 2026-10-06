---
name: studio-artifacts-generator
description: >-
  Use this skill when implementing, prompting, or testing generative studio
  artifacts (Study Guides, Briefing Documents, FAQs, Timelines) and personal
  notes synthesis in NotebookLM-lite.
---

# Studio Artifacts Generator Skill

This skill defines the workflows for generating structured intellectual artifacts and synthesizing personal notes from ingested notebook documents.

---

## 1. Supported Artifact Types & Prompts

### 1.1 Study Guide (`artifact_type: "study_guide"`)
- **Structure**:
  1. *Executive Summary*: High-level core argument (2-3 paragraphs).
  2. *Key Concepts & Definitions*: Bulleted terms with clear explanations.
  3. *Review Questions*: 5 deep conceptual questions testing comprehension.
  4. *Practice Quiz*: 3-5 multiple choice or short-answer questions with spoiler-tagged answers.
- **Generation Prompt Template**:
  ```text
  You are an expert educator. Create a comprehensive Study Guide based exclusively on the provided documents.
  Include: Key Concepts, Detailed Explanations, Review Questions, and a Practice Quiz with Answer Key.
  Ground all explanations in the sources.
  ```

### 1.2 Briefing Document (`artifact_type: "briefing_doc"`)
- **Structure**:
  1. *Executive Overview*: 1-paragraph summary for senior leadership/researchers.
  2. *Key Findings & Strategic Takeaways*: Bulleted list of primary discoveries.
  3. *Critical Analysis & Risk/Trade-offs*: Nuanced considerations or technical limitations mentioned in the sources.
  4. *Next Steps & Recommendations*.

### 1.3 FAQ & Glossary (`artifact_type: "faq"`)
- **Structure**:
  - 8-12 common questions framed from a curious reader's perspective, answered with authoritative source citations.
  - Comprehensive alphabetized glossary of specialized acronyms and domain terms.

### 1.4 Timeline & Chronology (`artifact_type: "timeline"`)
- **Structure**:
  - Chronological table of dates, milestones, paper publication iterations, or experiment sequences extracted from the text.

---

## 2. Personal Notes & Synthesis Workflow

### 2.1 "Save to Note" Action
1. User clicks "Save to Note" icon on any assistant message or studio artifact.
2. The system appends the markdown content into the active notebook's scratchpad notes table.
3. Automatically attaches source attribution headers to preserve origin metadata.

### 2.2 Multi-Note Synthesis Action
1. User selects two or more notes from the Notes tab.
2. User clicks "Synthesize Selected Notes".
3. The LLM merges the selected notes into a unified, coherent synthesis draft highlighting intersections and contrasts.

---

## 3. Storage & Export Formats

1. Store artifacts in the `STUDIO_ARTIFACT` table as structured JSON (`content_json`) and formatted Markdown.
2. Provide one-click export actions:
   - **Copy to Clipboard** (Markdown)
   - **Download as .md**
   - **Send to Personal Scratchpad Note**
