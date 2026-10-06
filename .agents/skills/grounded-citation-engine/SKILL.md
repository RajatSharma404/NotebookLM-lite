---
name: grounded-citation-engine
description: >-
  Use this skill when implementing, refining, or testing the strict grounding
  prompt system, inline citation format [1], streaming token citation resolution,
  and hallucination prevention in NotebookLM-lite.
---

# Grounded Citation Engine Skill

This skill defines the exact rules and implementation patterns for enforcing zero-hallucination responses and generating verifiable inline citations in NotebookLM-lite.

---

## 1. Grounding Prompt Construction

The system prompt must enforce strict adherence to provided sources:

```text
You are NotebookLM-lite, a grounded intellectual research partner.
Your task is to answer the user's inquiry STRICTLY and EXCLUSIVELY using the provided Source Context blocks below.

CORE GROUNDING RULES:
1. Every factual statement or assertion MUST be followed by an inline citation bracket like [1], [2], or [1, 3].
2. The number inside [X] must correspond EXACTLY to the numbered Source block [Source X] in the context.
3. If the provided sources DO NOT contain sufficient information to answer the question, state clearly and concisely:
   "Based on the provided sources, there is no information regarding [topic]."
4. NEVER invent facts, infer beyond what is written, or pull knowledge from external training data.
5. Keep explanations clear, rigorous, and directly attributed.

--- SOURCE CONTEXT BEGIN ---
[Source 1]: "{source_title_1}" (Page {page_1})
"{chunk_content_1}"

[Source 2]: "{source_title_2}" (Page {page_2})
"{chunk_content_2}"
--- SOURCE CONTEXT END ---
```

---

## 2. Server-Sent Events (SSE) Citation Streaming Protocol

The streaming endpoint (`/api/notebooks/{id}/chat/stream`) must send structured events so the frontend can display tokens and resolve citations in real time.

### Event Sequence:
1. **`event: sources`**:
   Sent immediately before token generation. Contains all retrieved chunks mapped to their citation index:
   ```json
   {
     "citations": [
       {
         "index": 1,
         "source_id": "src_123",
         "source_title": "Attention_Paper.pdf",
         "page_number": 3,
         "snippet": "Multi-head attention allows the model to jointly attend..."
       }
     ]
   }
   ```
2. **`event: token`**:
   Sent as LLM tokens are generated (`{"token": "Attention "}`).
3. **`event: done`**:
   Sent upon generation completion with full message ID and token count.

---

## 3. Client-Side Citation Parsing & Badge Rendering

In the frontend chat renderer, regular expressions detect citation markers:

```typescript
// Regex detecting citation patterns like [1], [2], [1, 2], [1-3]
const CITATION_REGEX = /\[(\d+(?:,\s*\d+)*)\]/g;
```

### Parsing Logic:
1. Replace matched citation strings with interactive `<CitationPill indices={[1]} citationMap={citations} />` components.
2. If an index cannot be found in `citations`, render a neutral indicator and log a grounding mismatch warning.

---

## 4. Citation Validation & Quality Checks

1. **Verify Citation Bounds**:
   - If context has $K$ sources (`[Source 1]` to `[Source K]`), verify no citation $> K$ exists in the generated output.
2. **Snippet Overlap Verification**:
   - Check that the sentence preceding `[X]` shares significant lexical or semantic overlap with `chunk[X].content`.
3. **Handle Missing Context Cleanly**:
   - When the user asks an out-of-scope question, confirm the response contains the refusal disclaimer and 0 hallucinated citations.
