// ============================================================================
// Store Unit Tests
// Follows: vitest-skill, zustand-store-ts
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { useNotebookStore } from '../store/notebookStore';
import { useUiPrefsStore } from '../store/uiPrefsStore';
import { asMessageId, asSourceId } from '../types';

describe('useNotebookStore', () => {
  beforeEach(() => {
    useNotebookStore.setState({
      notebooks: [],
      activeNotebookId: null,
      sources: [],
      messages: [],
      artifacts: [],
      notes: [],
      isStreaming: false,
      streamingContent: '',
      streamingCitations: []
    });
  });

  it('accumulates streaming tokens correctly', () => {
    const store = useNotebookStore.getState();

    store.appendStreamingToken('First token. ');
    expect(useNotebookStore.getState().streamingContent).toBe('First token. ');

    store.appendStreamingToken('Second token.');
    expect(useNotebookStore.getState().streamingContent).toBe('First token. Second token.');
  });

  it('deduplicates streaming citations by marker number', () => {
    const store = useNotebookStore.getState();

    store.addStreamingCitation({
      kind: 'chunk',
      marker: 1,
      sourceId: asSourceId('src_1'),
      sourceTitle: 'Paper 1'
    });

    store.addStreamingCitation({
      kind: 'chunk',
      marker: 1,
      sourceId: asSourceId('src_1'),
      sourceTitle: 'Duplicate Paper 1'
    });

    store.addStreamingCitation({
      kind: 'chunk',
      marker: 2,
      sourceId: asSourceId('src_2'),
      sourceTitle: 'Paper 2'
    });

    const citations = useNotebookStore.getState().streamingCitations;
    expect(citations).toHaveLength(2);
    expect(citations[0].marker).toBe(1);
    expect(citations[1].marker).toBe(2);
  });

  it('finalizes streaming message and resets streaming state', () => {
    const store = useNotebookStore.getState();

    store.appendStreamingToken('Full answer text.');
    store.addStreamingCitation({
      kind: 'chunk',
      marker: 1,
      sourceId: asSourceId('src_1'),
      sourceTitle: 'Source'
    });

    const msgId = asMessageId('msg_final_1');
    store.finalizeStreamingMessage(msgId);

    const state = useNotebookStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingContent).toBe('');
    expect(state.streamingCitations).toEqual([]);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe(msgId);
    expect(state.messages[0].content).toBe('Full answer text.');
  });
});

describe('useUiPrefsStore migration and actions', () => {
  it('toggles theme correctly and updates document attribute', () => {
    const store = useUiPrefsStore.getState();
    store.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    store.toggleTheme();
    expect(useUiPrefsStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    store.toggleTheme();
    expect(useUiPrefsStore.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles collapsible panes', () => {
    const store = useUiPrefsStore.getState();
    expect(store.sourcesCollapsed).toBe(false);

    store.toggleSourcesCollapsed();
    expect(useUiPrefsStore.getState().sourcesCollapsed).toBe(true);

    store.toggleStudioCollapsed();
    expect(useUiPrefsStore.getState().studioCollapsed).toBe(true);
  });
});
