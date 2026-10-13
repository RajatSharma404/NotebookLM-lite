// ============================================================================
// Sources & Chunk Auditor Unit Tests (Phase 3)
// Follows: vitest-skill, notebooklm-design-system
// ============================================================================

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceRow } from '../components/SourceRow';
import { SourcesPanel } from '../components/SourcesPanel';
import { auditChunks } from '../utils/chunkAuditor';
import { ToastProvider } from '../components/ui/Toast';
import { Source, ChunkItem, asSourceId, asNotebookId, asChunkId } from '../types';

const mockSource: Source = {
  id: asSourceId('src_test_1'),
  notebook_id: asNotebookId('nb_1'),
  filename: 'quantum_circuits_and_error_mitigation_experiments.pdf',
  file_type: '.pdf',
  file_size: 1048576,
  token_count: 5000,
  is_active: true,
  created_at: new Date().toISOString()
};

describe('SourceRow Component', () => {
  it('renders active source with middle-ellipsis and token bar', () => {
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    const onInspect = vi.fn();

    render(
      <SourceRow
        source={mockSource}
        totalContextTokens={10000}
        onToggle={onToggle}
        onDelete={onDelete}
        onInspect={onInspect}
      />
    );

    // Assert middle-ellipsis rendered
    expect(screen.getByText(/quantum\.\.\..*\.pdf/i)).toBeInTheDocument();
    expect(screen.getByTitle(mockSource.filename)).toBeInTheDocument();
    expect(screen.getByText('5,000 tokens')).toBeInTheDocument();

    // Toggle active state
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('dims inactive source to 50% opacity', () => {
    const inactiveSource: Source = { ...mockSource, is_active: false };
    const { container } = render(
      <SourceRow
        source={inactiveSource}
        totalContextTokens={10000}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onInspect={vi.fn()}
      />
    );

    const rowEl = container.firstChild as HTMLElement;
    expect(rowEl.style.opacity).toBe('0.5');
  });

  it('triggers delete and inspect actions on button clicks', () => {
    const onDelete = vi.fn();
    const onInspect = vi.fn();

    render(
      <SourceRow
        source={mockSource}
        totalContextTokens={10000}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onInspect={onInspect}
      />
    );

    const inspectBtn = screen.getByRole('button', { name: /Inspect chunks/i });
    fireEvent.click(inspectBtn);
    expect(onInspect).toHaveBeenCalledTimes(1);

    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('Chunk Auditor Rules', () => {
  it('flags empty, oversized, duplicate, and mid-sentence chunks', () => {
    const chunks: ChunkItem[] = [
      {
        id: asChunkId('chk_empty'),
        source_id: asSourceId('src_1'),
        notebook_id: asNotebookId('nb_1'),
        page_number: 1,
        content: '   ',
        char_start: 0,
        char_end: 3
      },
      {
        id: asChunkId('chk_oversized'),
        source_id: asSourceId('src_1'),
        notebook_id: asNotebookId('nb_1'),
        page_number: 1,
        content: 'A'.repeat(6500) + '.',
        char_start: 4,
        char_end: 6505
      },
      {
        id: asChunkId('chk_original'),
        source_id: asSourceId('src_1'),
        notebook_id: asNotebookId('nb_1'),
        page_number: 2,
        content: 'This is a duplicate sentence for testing chunk quality verification.',
        char_start: 10,
        char_end: 80
      },
      {
        id: asChunkId('chk_duplicate'),
        source_id: asSourceId('src_1'),
        notebook_id: asNotebookId('nb_1'),
        page_number: 3,
        content: 'This is a duplicate sentence for testing chunk quality verification.',
        char_start: 90,
        char_end: 160
      },
      {
        id: asChunkId('chk_midsentence'),
        source_id: asSourceId('src_1'),
        notebook_id: asNotebookId('nb_1'),
        page_number: 4,
        content: 'This chunk cuts off completely mid-sentence without any period at the end',
        char_start: 170,
        char_end: 240
      }
    ];

    const auditMap = auditChunks(chunks);

    expect(auditMap.get('chk_empty')?.some((f) => f.type === 'empty')).toBe(true);
    expect(auditMap.get('chk_oversized')?.some((f) => f.type === 'oversized')).toBe(true);
    expect(auditMap.get('chk_duplicate')?.some((f) => f.type === 'duplicate')).toBe(true);
    expect(auditMap.get('chk_midsentence')?.some((f) => f.type === 'mid-sentence')).toBe(true);
  });
});

describe('SourcesPanel Drag and Drop Path', () => {
  it('handles drag-over and file drop to invoke upload', async () => {
    const onAddSource = vi.fn();

    render(
      <ToastProvider>
        <SourcesPanel
          sources={[mockSource]}
          onAddSource={onAddSource}
          onToggleSource={vi.fn()}
          onDeleteSource={vi.fn()}
        />
      </ToastProvider>
    );

    const panel = screen.getByText('Sources').closest('div')!.parentElement!;

    // Drag over shows dropzone overlay
    fireEvent.dragOver(panel);
    expect(screen.getByText('Drop to add source')).toBeInTheDocument();

    // Drop file
    const file = new File(['Research contents'], 'paper.pdf', { type: 'application/pdf' });
    fireEvent.drop(panel, {
      dataTransfer: {
        files: [file]
      }
    });

    expect(onAddSource).toHaveBeenCalledWith(file);
    expect(screen.queryByText('Drop to add source')).not.toBeInTheDocument();
  });
});
