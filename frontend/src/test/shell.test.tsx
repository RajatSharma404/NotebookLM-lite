// ============================================================================
// Shell & Header Unit Tests (Phase 2)
// Follows: vitest-skill, fixing-accessibility
// ============================================================================

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/Header';
import { PaneBorderHandle } from '../components/PaneBorderHandle';
import { CollapsedRail } from '../components/CollapsedRail';
import { useNotebookStore } from '../store/notebookStore';
import { useUiPrefsStore } from '../store/uiPrefsStore';
import { asNotebookId } from '../types';

describe('Header Component', () => {
  beforeEach(() => {
    useNotebookStore.setState({
      notebooks: [
        {
          id: asNotebookId('nb_test_1'),
          title: 'Deep Residual Learning',
          source_count: 2,
          note_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      activeNotebookId: asNotebookId('nb_test_1')
    });
  });

  it('renders semantic <header> with wordmark and active notebook title', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByText('Notebook')).toBeInTheDocument();
    expect(screen.getByText('LM')).toBeInTheDocument();
    expect(screen.getByText('lite')).toBeInTheDocument();
    expect(screen.getByText('Deep Residual Learning')).toBeInTheDocument();
  });

  it('toggles theme when theme button is clicked', () => {
    render(<Header />);
    const themeBtn = screen.getByRole('button', { name: /Switch to (Light|Dark) paper/i });
    expect(themeBtn).toBeInTheDocument();

    const initialTheme = useUiPrefsStore.getState().theme;
    fireEvent.click(themeBtn);
    expect(useUiPrefsStore.getState().theme).not.toBe(initialTheme);
  });
});

describe('PaneBorderHandle Component', () => {
  it('renders button with accessible label and triggers onToggle', () => {
    const onToggle = vi.fn();
    render(
      <PaneBorderHandle
        side="left"
        isCollapsed={false}
        onToggle={onToggle}
        panelName="Sources"
      />
    );

    const btn = screen.getByRole('button', { name: /Collapse Sources/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('CollapsedRail Component', () => {
  it('renders 56px rail with vertical label and expand button', () => {
    const onExpand = vi.fn();
    render(
      <CollapsedRail
        side="left"
        label="Sources"
        count={3}
        shortcut="Mod+B"
        onExpand={onExpand}
      />
    );

    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    const expandBtn = screen.getByRole('button', { name: /Expand Sources/i });
    fireEvent.click(expandBtn);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
