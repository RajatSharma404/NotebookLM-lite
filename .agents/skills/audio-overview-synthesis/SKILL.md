---
name: audio-overview-synthesis
description: >-
  Use this skill when developing, testing, or modifying the two-host podcast
  dialogue generation, speech synthesis pipeline (TTS), and audio waveform
  playback in NotebookLM-lite.
---

# Audio Overview Synthesis Skill

This skill documents the step-by-step pipeline for generating Google NotebookLM-style "Audio Overview" conversational podcast deep dives from uploaded documents.

---

## 1. Persona Definitions & Script Generation

The dialogue must sound like an authentic, highly engaging intellectual podcast conversation between two experienced hosts.

### Host Personas:
- **Speaker 1: Alex (Lead Analyst)**
  - *Tone*: Thoughtful, authoritative, structured, and insightful.
  - *Voice*: Deep, articulate (e.g., `en-US-GuyNeural`).
  - *Role*: Breaks down complex mechanisms, introduces key concepts, and provides authoritative synthesis.
- **Speaker 2: Morgan (Inquisitive Co-host)**
  - *Tone*: Energetic, curious, intuitive, and conversational.
  - *Voice*: Expressive, dynamic (e.g., `en-US-JennyNeural`).
  - *Role*: Reacts to revelations, asks "wait, how does that actually work?", draws real-world analogies, and keeps the energy lively.

### Dialogue Script Schema:
Prompt the LLM to output strictly formatted JSON:
```json
[
  {
    "speaker": "Alex",
    "voice_id": "en-US-GuyNeural",
    "text": "Welcome back! Today we're diving into a document that completely shifts how we think about attention mechanisms."
  },
  {
    "speaker": "Morgan",
    "voice_id": "en-US-JennyNeural",
    "text": "Right! And what blew my mind when reading through this is that they literally dropped recurrent connections entirely."
  }
]
```

---

## 2. Audio Synthesis Pipeline

### 2.1 Asynchronous TTS Generation (`edge-tts`)
Use Python `asyncio` to synthesize dialogue turns:

```python
import edge_tts
import asyncio

async def synthesize_turn(text: str, voice: str, output_path: str):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
```

### 2.2 Segment Concatenation & Audio Normalization
1. **Pacing**: Insert a brief 250ms–350ms silence pause between speaker turns to simulate natural conversational breathing and turn-taking.
2. **Audio Concatenation**: Concatenate temporary audio segments using `pydub.AudioSegment` or `ffmpeg`.
3. **Volume Normalization**: Normalize final combined track to standard podcast broadcast loudness (-16 LUFS).
4. **Artifact Storage**: Save the output file to `storage/audio/podcast_{notebook_id}_{timestamp}.mp3`.

---

## 3. Playback & Waveform Visualization

1. **HTML5 Audio / Web Audio API**:
   - Provide standard audio element controls: Play, Pause, Seek, and Speed adjustments (`0.8x`, `1.0x`, `1.2x`, `1.5x`).
2. **Waveform Visualizer**:
   - Implement an animated Canvas visualizer reading the `AudioContext` and `AnalyserNode` frequency data or pre-rendered amplitude bars.
3. **Active Speaker Badge**:
   - Track current playback time against calculated dialogue turn durations to highlight whether Alex or Morgan is speaking.

---

## 4. Verification & Fallback Procedures

1. **Script Validation**: Validate that the script has at least 8 alternating turns and both hosts speak.
2. **TTS Failure Recovery**: If TTS generation encounters rate limits or offline network issues, gracefully retain the generated script text and present an interactive "Read Transcript" mode.
