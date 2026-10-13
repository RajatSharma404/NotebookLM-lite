// ============================================================================
// StudioPanel Component (Phase 5)
// Follows: notebooklm-design-system, design-taste-frontend, emil-design-eng
// ============================================================================

import React, { useState, lazy, Suspense } from 'react';
import { StudioArtifact, Note, BackendArtifactType } from '../types';
import { useNotebookStore } from '../store/notebookStore';
import { Tabs } from './ui/Tabs';
import { AudioPlayer } from './AudioPlayer';
import { ArtifactTile, ArtifactTileState } from './ArtifactTile';
import { NotesPanel } from './NotesPanel';
import { useToast } from './ui/Toast';
import { ExternalLink, Sparkles, Plus } from 'lucide-react';

const ArtifactViewer = lazy(() => import('./ArtifactViewer'));

export interface StudioPanelProps {
  artifacts?: StudioArtifact[];
  notes?: Note[];
  onGenerateArtifact?: (type: BackendArtifactType) => void;
  onSaveNote?: (title: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onSynthesizeNotes?: (noteIds: string[]) => void;
  onGenerateAudio?: () => void;
}

const ARTIFACT_TILES_CONFIG: Array<{
  type: BackendArtifactType;
  title: string;
  subtitle: string;
}> = [
  {
    type: 'study_guide',
    title: 'Study Guide',
    subtitle: 'Key concepts, quizzes & takeaways'
  },
  {
    type: 'briefing_doc',
    title: 'Briefing Doc',
    subtitle: 'Executive synthesis & core claims'
  },
  {
    type: 'faq',
    title: 'FAQ & Glossary',
    subtitle: 'Technical definitions & inquiries'
  },
  {
    type: 'timeline',
    title: 'Timeline',
    subtitle: 'Chronological progression of ideas'
  }
];

export function StudioPanel({
  artifacts: propArtifacts,
  notes: propNotes
}: StudioPanelProps) {
  const store = useNotebookStore();
  const { showToast } = useToast();

  const artifacts = propArtifacts !== undefined ? propArtifacts : store.artifacts;
  const notes = propNotes !== undefined ? propNotes : store.notes;

  const [activeTab, setActiveTab] = useState<'studio' | 'notes'>('studio');
  const [viewingArtifact, setViewingArtifact] = useState<StudioArtifact | null>(null);

  // Generation status per artifact type
  const [tileStates, setTileStates] = useState<Record<BackendArtifactType, ArtifactTileState>>({
    study_guide: 'idle',
    briefing_doc: 'idle',
    faq: 'idle',
    timeline: 'idle',
    audio_overview: 'idle'
  });

  const handleGenerate = async (type: BackendArtifactType) => {
    setTileStates((prev) => ({ ...prev, [type]: 'generating' }));
    showToast({ message: `Generating ${type.replace('_', ' ')}...` });

    try {
      const art = await store.generateArtifact(type);
      setTileStates((prev) => ({ ...prev, [type]: 'done' }));
      showToast({ message: `Generated ${art.title}` });
    } catch {
      setTileStates((prev) => ({ ...prev, [type]: 'error' }));
      showToast({ message: `Failed to generate ${type.replace('_', ' ')}` });
    }
  };

  const handleView = (type: BackendArtifactType) => {
    const existing = artifacts.find((a) => a.artifact_type === type);
    if (existing) {
      setViewingArtifact(existing);
    }
  };

  // Find generated audio overview if present
  const audioArtifact = artifacts.find((a) => a.artifact_type === 'audio_overview');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-0)',
        overflow: 'hidden'
      }}
    >
      <Tabs.Root defaultValue="studio" value={activeTab} onValueChange={(val) => setActiveTab(val as 'studio' | 'notes')}>
        {/* Sliding 2px Accent Underline Tabs Header */}
        <Tabs.List aria-label="Studio Views">
          <Tabs.Trigger value="studio">Studio</Tabs.Trigger>
          <Tabs.Trigger value="notes" badge={notes.length}>
            Notes
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tab 1: Studio Generators & Audio Player */}
        <Tabs.Content value="studio">
          <div
            style={{
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              overflowY: 'auto'
            }}
          >
            {/* Audio Overview Player (Raised Surface 2 of 2) */}
            <AudioPlayer
              audioUrl={audioArtifact?.media_url}
              title={audioArtifact?.title || 'Audio Overview: Deep Dive'}
              subtitle="Two-Host Grounded Podcast"
              hostName="Alex & Morgan"
              duration={210}
            />

            {/* 2x2 Artifact Tile Grid */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-2)'
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  Generate Studio Artifacts
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--space-2)'
                }}
              >
                {ARTIFACT_TILES_CONFIG.map((tile) => {
                  const hasDone = artifacts.some((a) => a.artifact_type === tile.type);
                  const currentState = tileStates[tile.type] === 'generating'
                    ? 'generating'
                    : hasDone
                    ? 'done'
                    : tileStates[tile.type];

                  return (
                    <ArtifactTile
                      key={tile.type}
                      type={tile.type}
                      title={tile.title}
                      subtitle={tile.subtitle}
                      state={currentState}
                      onGenerate={() => handleGenerate(tile.type)}
                      onView={() => handleView(tile.type)}
                      onRetry={() => handleGenerate(tile.type)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Generated Artifacts Ledger List */}
            {artifacts.length > 0 && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: 'var(--space-2)'
                  }}
                >
                  Generated Artifacts ({artifacts.length})
                </span>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)'
                  }}
                >
                  {artifacts.map((art) => (
                    <div
                      key={art.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-3) 0',
                        borderBottom: '1px solid var(--line)',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-3)',
                            backgroundColor: 'var(--bg-1)',
                            border: '1px solid var(--line)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {art.artifact_type.replace('_', ' ')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            color: 'var(--text-1)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '180px'
                          }}
                        >
                          {art.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewingArtifact(art)}
                        className="font-mono"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-text)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          textDecoration: 'underline'
                        }}
                      >
                        View &nearr;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Tab 2: Notes Surface */}
        <Tabs.Content value="notes">
          <NotesPanel />
        </Tabs.Content>
      </Tabs.Root>

      {/* Lazy Loaded Artifact Viewer Modal */}
      {viewingArtifact && (
        <Suspense fallback={null}>
          <ArtifactViewer
            artifact={viewingArtifact}
            isOpen={Boolean(viewingArtifact)}
            onClose={() => setViewingArtifact(null)}
            onSaveToNotes={(title, content) => {
              store.createNote(title, content);
              showToast({ message: 'Saved to Notes' });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

export default StudioPanel;
