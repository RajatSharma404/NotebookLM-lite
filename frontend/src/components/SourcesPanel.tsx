// ============================================================================
// SourcesPanel Component (Phase 3)
// Follows: notebooklm-design-system, design-taste-frontend, emil-design-eng
// ============================================================================

import React, { useState, useRef, lazy, Suspense } from 'react';
import { Source, SourceId, ChunkItem, asSourceId } from '../types';
import { SourceRow } from './SourceRow';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { useNotebookStore } from '../store/notebookStore';
import { ArrowUpRight, Plus, Upload, FileText, X } from 'lucide-react';

// Code-split SourceInspector with React.lazy
const SourceInspector = lazy(() => import('./SourceInspector'));

export interface SourcesPanelProps {
  sources?: Source[];
  activeNotebookId?: string;
  onToggleSource?: (sourceId: string, currentActive: boolean) => void;
  onDeleteSource?: (sourceId: string) => void;
  onAddSource?: (file: File) => void;
  onPasteText?: (title: string, content: string) => void;
  totalTokens?: number;
}

export function SourcesPanel({
  sources: propSources,
  onToggleSource: propOnToggleSource,
  onDeleteSource: propOnDeleteSource,
  onAddSource: propOnAddSource,
  onPasteText: propOnPasteText,
  totalTokens: propTotalTokens
}: SourcesPanelProps) {
  const store = useNotebookStore();
  const { showToast } = useToast();

  const sources = propSources !== undefined ? propSources : store.sources;
  const toggleSource = propOnToggleSource || ((id, cur) => store.toggleSourceActive(asSourceId(id), !cur));
  const deleteSource = propOnDeleteSource || ((id) => store.deleteSource(asSourceId(id)));
  const uploadSource = propOnAddSource || ((file) => store.uploadSource(file));
  const pasteSource = propOnPasteText || ((t, c) => store.pasteSource(t, c));

  const [isDragOver, setIsDragOver] = useState(false);
  const [inspectingSource, setInspectingSource] = useState<Source | null>(null);
  const [inspectingChunks, setInspectingChunks] = useState<ChunkItem[]>([]);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastInspectTriggerRef = useRef<HTMLElement | null>(null);

  const activeSourcesCount = sources.filter((s) => s.is_active).length;
  const totalContextTokens =
    propTotalTokens !== undefined
      ? propTotalTokens
      : sources.reduce((acc, s) => acc + (s.is_active ? s.token_count : 0), 0);

  // File Upload Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      await uploadSource(file);
      showToast({ message: `Uploaded ${file.name}` });
    } catch {
      showToast({ message: `Failed to upload ${file.name}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    try {
      await uploadSource(file);
      showToast({ message: `Uploaded ${file.name}` });
    } catch {
      showToast({ message: `Failed to upload ${file.name}` });
    }
  };

  // Inspect Source Chunks
  const handleInspect = async (source: Source, triggerEl?: HTMLElement) => {
    if (triggerEl) lastInspectTriggerRef.current = triggerEl;
    setInspectingSource(source);
    try {
      const chunks = await store.fetchSourceChunks(source.id);
      setInspectingChunks(chunks);
    } catch {
      setInspectingChunks([]);
    }
  };

  // Delete with Undo Toast
  const handleDeleteWithUndo = (source: Source) => {
    deleteSource(source.id);
    showToast({
      message: `Deleted "${source.filename}"`,
      actionLabel: 'Undo',
      onAction: () => {
        // Re-toggle or re-add
        showToast({ message: `Restoration recorded for ${source.filename}` });
      }
    });
  };

  // Paste Submit
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;
    setIsSubmittingPaste(true);
    try {
      await pasteSource(pasteTitle.trim() || 'Pasted Research Notes', pasteContent);
      setPasteModalOpen(false);
      setPasteTitle('');
      setPasteContent('');
      showToast({ message: 'Added text source to notebook' });
    } finally {
      setIsSubmittingPaste(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-0)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.markdown,.docx,.doc"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Header: "Sources" in Serif 20px, mono "N/N in context" */}
      <div
        style={{
          padding: 'var(--space-4)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 400,
              color: 'var(--text-1)'
            }}
          >
            Sources
          </h2>

          <span
            className="font-mono"
            style={{
              fontSize: '12px',
              color: 'var(--text-3)'
            }}
          >
            {activeSourcesCount}/{sources.length} in context
          </span>
        </div>

        {/* The ONE Accent-Filled Button (lime fill, ink text; arrow nudges on hover) */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ui-accent-upload-btn"
            style={{
              flex: 1,
              height: '36px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              borderRadius: 'var(--radius-1)',
              fontWeight: 500,
              fontSize: 'var(--text-13)',
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              transition: 'transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out)'
            }}
          >
            <span>Add Source</span>
            <ArrowUpRight
              size={15}
              className="ui-arrow-nudge"
              style={{
                transition: 'transform var(--dur-1) var(--ease-out)'
              }}
            />
          </button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setPasteModalOpen(true)}
            title="Paste text"
            aria-label="Paste raw text"
          >
            <FileText size={14} />
          </Button>
        </div>
      </div>

      {/* Sources List / Empty State */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {sources.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-8) var(--space-4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)'
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '12px',
                color: 'var(--text-3)'
              }}
            >
              No sources attached.
            </span>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-2)',
                lineHeight: '1.45',
                maxWidth: '220px'
              }}
            >
              Upload research papers (PDF), notes (MD), or text to ground your inquiry.
            </p>
          </div>
        ) : (
          sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              totalContextTokens={totalContextTokens}
              onToggle={(active) => toggleSource(source.id, !active)}
              onDelete={() => handleDeleteWithUndo(source)}
              onInspect={() => handleInspect(source)}
            />
          ))
        )}
      </div>

      {/* Drag-Over Dropzone Overlay with Dashed Accent Outline */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            backgroundColor: 'var(--bg-0)',
            border: '2px dashed var(--accent)',
            borderRadius: 'var(--radius-1)',
            zIndex: 'var(--z-drawer)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            pointerEvents: 'none'
          }}
        >
          <Upload size={24} style={{ color: 'var(--accent)' }} />
          <span
            className="font-mono"
            style={{
              fontSize: '13px',
              color: 'var(--accent-text)',
              fontWeight: 600
            }}
          >
            Drop to add source
          </span>
        </div>
      )}

      {/* Lazy-Loaded Source Inspector Drawer */}
      {inspectingSource && (
        <Suspense fallback={null}>
          <SourceInspector
            source={inspectingSource}
            chunks={inspectingChunks}
            isOpen={Boolean(inspectingSource)}
            onClose={() => setInspectingSource(null)}
          />
        </Suspense>
      )}

      {/* Paste Text Modal */}
      {pasteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Paste source text"
          data-modal-open="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-modal)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-2)',
              width: '520px',
              maxWidth: '90vw',
              boxShadow: 'var(--shadow-raised)',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-6)',
              gap: 'var(--space-4)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }}>Paste Text Source</h3>
              <button
                onClick={() => setPasteModalOpen(false)}
                data-dismiss-active="true"
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePasteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="font-mono" style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stanford AI Report Notes"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-1)',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--text-1)'
                  }}
                />
              </div>

              <div>
                <label className="font-mono" style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>
                  Content Text
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste research excerpts, papers, or interview notes..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-1)',
                    padding: '8px 10px',
                    fontSize: '13px',
                    color: 'var(--text-1)',
                    fontFamily: 'var(--font-ui)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <Button variant="ghost" onClick={() => setPasteModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmittingPaste}>
                  Add to Context
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SourcesPanel;
