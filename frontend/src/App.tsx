// ============================================================================
// NotebookLM-lite Main Application Shell (Phase 2)
// Follows: notebooklm-design-system, design-taste-frontend, emil-design-eng
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PaneBorderHandle } from './components/PaneBorderHandle';
import { CollapsedRail } from './components/CollapsedRail';
import { ToastProvider, useToast } from './components/ui/Toast';
import { SourcesPanel } from './components/SourcesPanel';
import { ChatPanel } from './components/ChatPanel';
import { StudioPanel } from './components/StudioPanel';
import { useNotebookStore } from './store/notebookStore';
import { useUiPrefsStore } from './store/uiPrefsStore';
import { useHotkeys } from './hooks/useHotkeys';
import { Source, asSourceId, asNoteId } from './types';

function AppContent() {
  const {
    activeNotebookId,
    fetchNotebooks,
    sources,
    messages,
    notes,
    artifacts,
    isStreaming,
    toggleSourceActive,
    deleteSource,
    uploadSource,
    pasteSource,
    sendMessage,
    createNote,
    deleteNote,
    synthesizeNotes,
    generateArtifact,
    generateAudioOverview
  } = useNotebookStore();

  const {
    sourcesCollapsed,
    studioCollapsed,
    toggleSourcesCollapsed,
    toggleStudioCollapsed
  } = useUiPrefsStore();

  const { showToast } = useToast();

  // Initial load
  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  // Global Keyboard Shortcuts
  useHotkeys([
    {
      combo: 'mod+b',
      handler: () => toggleSourcesCollapsed(),
      description: 'Toggle Sources Panel'
    },
    {
      combo: 'mod+j',
      handler: () => toggleStudioCollapsed(),
      description: 'Toggle Studio Panel'
    },
    {
      combo: 'escape',
      handler: () => {
        // Dismiss topmost active popover / modal
        const closeBtn = document.querySelector<HTMLButtonElement>('[data-dismiss-active="true"]');
        closeBtn?.click();
      },
      description: 'Close active popover or inspector'
    }
  ]);

  const activeSourcesCount = sources.filter((s) => s.is_active).length;
  const studioItemsCount = notes.length + artifacts.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-0)',
        color: 'var(--text-1)'
      }}
    >
      {/* 3-4% SVG-Noise Grain Ambient Overlay */}
      <div className="app-noise-overlay" aria-hidden="true" />

      {/* Primary Semantic Header */}
      <Header
        onExportClick={() => {
          showToast({
            message: 'Preparing notebook archive export...',
            durationMs: 3000
          });
          const downloadLink = document.createElement('a');
          downloadLink.href = `/api/notebooks/current/export`;
          downloadLink.download = `notebook_export.zip`;
          downloadLink.click();
        }}
      />

      {/* Main 3-Pane Structural Layout (1px hairline rules, zero card boxes) */}
      <div
        className="app-panes-layout"
        style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 52px)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* ==================================================================
            PANE 1: Sources Dock (~280px or 56px Collapsed Rail)
            ================================================================== */}
        {sourcesCollapsed ? (
          <CollapsedRail
            side="left"
            label="Sources"
            count={activeSourcesCount}
            shortcut="Mod+B"
            onExpand={toggleSourcesCollapsed}
          />
        ) : (
          <aside
            role="complementary"
            aria-label="Sources Dock"
            style={{
              width: '280px',
              minWidth: '280px',
              maxWidth: '280px',
              height: '100%',
              borderRight: '1px solid var(--line)',
              backgroundColor: 'var(--bg-0)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <SourcesPanel
              sources={sources}
              activeNotebookId={activeNotebookId || undefined}
              onToggleSource={(id, cur) => toggleSourceActive(asSourceId(id), !cur)}
              onDeleteSource={(id) => deleteSource(asSourceId(id))}
              onAddSource={(file) => uploadSource(file)}
              onPasteText={(t, c) => pasteSource(t, c)}
              totalTokens={sources.reduce((acc, s) => acc + (s.is_active ? s.token_count : 0), 0)}
            />
            {/* Edge Border Hit Handle */}
            <PaneBorderHandle
              side="left"
              isCollapsed={false}
              onToggle={toggleSourcesCollapsed}
              panelName="Sources"
            />
          </aside>
        )}

        {/* ==================================================================
            PANE 2: Grounded Chat (Flexible, ~720px Reading Column)
            ================================================================== */}
        <main
          role="main"
          aria-label="Grounded Chat Workspace"
          style={{
            flex: 1,
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-0)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <ChatPanel />
        </main>

        {/* ==================================================================
            PANE 3: Studio Panel (~380px or 56px Collapsed Rail)
            ================================================================== */}
        {studioCollapsed ? (
          <CollapsedRail
            side="right"
            label="Studio"
            count={studioItemsCount}
            shortcut="Mod+J"
            onExpand={toggleStudioCollapsed}
          />
        ) : (
          <aside
            role="complementary"
            aria-label="Studio Panel"
            style={{
              width: '380px',
              minWidth: '380px',
              maxWidth: '380px',
              height: '100%',
              borderLeft: '1px solid var(--line)',
              backgroundColor: 'var(--bg-0)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Edge Border Hit Handle */}
            <PaneBorderHandle
              side="right"
              isCollapsed={false}
              onToggle={toggleStudioCollapsed}
              panelName="Studio"
            />
            <StudioPanel
              artifacts={artifacts}
              notes={notes}
              onGenerateArtifact={(t) => generateArtifact(t)}
              onSaveNote={(t, c) => createNote(t, c)}
              onDeleteNote={(id) => deleteNote(asNoteId(id))}
              onSynthesizeNotes={(ids) => synthesizeNotes(ids.map(asNoteId))}
              onGenerateAudio={() => generateAudioOverview()}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
