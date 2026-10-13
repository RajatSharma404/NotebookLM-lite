// ============================================================================
// Studio, Audio Scrubber & Artifacts Unit Tests (Phase 5)
// Follows: vitest-skill, fixing-motion-performance
// ============================================================================

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  seekFromPointer,
  formatAudioTime,
  generateDeterministicBars
} from '../utils/audioMath';
import { ArtifactTile } from '../components/ArtifactTile';
import { NotesPanel } from '../components/NotesPanel';
import { ToastProvider } from '../components/ui/Toast';
import { useNotebookStore } from '../store/notebookStore';
import { asNoteId } from '../types';

describe('Audio Scrubber Math & Waveform Utilities', () => {
  it('correctly calculates seek time from pointer coordinates and bounds', () => {
    // Middle of 500px scrubber with 180s duration
    expect(seekFromPointer(250, 0, 500, 180)).toBe(90);

    // Quarter of 400px scrubber with 200s duration
    expect(seekFromPointer(100, 0, 400, 200)).toBe(50);

    // Negative pointer clamps to 0
    expect(seekFromPointer(-50, 0, 500, 180)).toBe(0);

    // Beyond width clamps to full duration
    expect(seekFromPointer(600, 0, 500, 180)).toBe(180);
  });

  it('formats audio seconds into tabular MM:SS string', () => {
    expect(formatAudioTime(0)).toBe('00:00');
    expect(formatAudioTime(65)).toBe('01:05');
    expect(formatAudioTime(185)).toBe('03:05');
    expect(formatAudioTime(-1)).toBe('00:00');
  });

  it('generates deterministic 52 bars within [0.15, 1.0] range', () => {
    const bars1 = generateDeterministicBars(52, 'deep_dive_podcast');
    const bars2 = generateDeterministicBars(52, 'deep_dive_podcast');

    expect(bars1).toHaveLength(52);
    expect(bars1).toEqual(bars2); // Deterministic

    for (const height of bars1) {
      expect(height).toBeGreaterThanOrEqual(0.15);
      expect(height).toBeLessThanOrEqual(1.0);
    }
  });
});

describe('ArtifactTile Component', () => {
  it('renders idle tile and triggers generation callback on click', () => {
    const onGenerate = vi.fn();
    render(
      <ArtifactTile
        type="study_guide"
        title="Study Guide"
        subtitle="Key concepts & quizzes"
        state="idle"
        onGenerate={onGenerate}
      />
    );

    expect(screen.getByText('Study Guide')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('disables click and shows timer while generating', () => {
    const onGenerate = vi.fn();
    render(
      <ArtifactTile
        type="briefing_doc"
        title="Briefing Doc"
        subtitle="Executive summary"
        state="generating"
        onGenerate={onGenerate}
      />
    );

    expect(screen.getByText(/Generating/i)).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('triggers view action when state is done', () => {
    const onView = vi.fn();
    render(
      <ArtifactTile
        type="faq"
        title="FAQ & Glossary"
        subtitle="Questions & terms"
        state="done"
        onGenerate={vi.fn()}
        onView={onView}
      />
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onView).toHaveBeenCalledTimes(1);
  });
});

describe('NotesPanel Component', () => {
  it('renders notes and triggers creation', async () => {
    useNotebookStore.setState({
      notes: [
        {
          id: asNoteId('note_1'),
          notebook_id: 'nb_1' as any,
          title: 'Quantum Entanglement Note',
          content: 'EPR paradox details',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    });

    render(
      <ToastProvider>
        <NotesPanel />
      </ToastProvider>
    );

    expect(screen.getByText('Quantum Entanglement Note')).toBeInTheDocument();
    expect(screen.getByText('EPR paradox details')).toBeInTheDocument();

    const newBtn = screen.getByRole('button', { name: /New Note/i });
    fireEvent.click(newBtn);
    expect(screen.getByPlaceholderText('Note Title...')).toBeInTheDocument();
  });
});
