// ============================================================================
// ArtifactViewer Component (Formatted Manuscript Modal / Drawer)
// Follows: notebooklm-design-system, fixing-accessibility
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { StudioArtifact } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { X, Copy, Download, Bookmark, Check } from 'lucide-react';

export interface ArtifactViewerProps {
  artifact: StudioArtifact;
  isOpen: boolean;
  onClose: () => void;
  onSaveToNotes?: (title: string, content: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function ArtifactViewer({
  artifact,
  isOpen,
  onClose,
  onSaveToNotes,
  triggerRef
}: ArtifactViewerProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Shift focus into dialog for screen readers and keyboard users
    setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const content = artifact.content_markdown || '# Untitled Artifact\n\nNo content generated.';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.toLowerCase().replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = () => {
    onSaveToNotes?.(artifact.title, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Manuscript view for ${artifact.title}`}
      data-modal-open="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          triggerRef?.current?.focus();
        }
      }}
    >
      {/* Formatted Manuscript Card Container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        style={{
          width: '840px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-0)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-1)',
          boxShadow: 'var(--shadow-popover)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          outline: 'none'
        }}
      >
        {/* Manuscript Top Action Bar */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-6)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-1)'
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
            Studio Manuscript &bull; {artifact.artifact_type.replace('_', ' ')}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={saved ? <Check size={12} style={{ color: 'var(--accent)' }} /> : <Bookmark size={12} />}
              onClick={handleSaveNotes}
            >
              {saved ? 'Saved' : 'Save to Notes'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download size={12} />}
              onClick={handleDownload}
            >
              Download .md
            </Button>

            <Button
              size="sm"
              variant="secondary"
              leftIcon={copied ? <Check size={12} style={{ color: 'var(--accent)' }} /> : <Copy size={12} />}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>

            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Close manuscript view"
              data-dismiss-active="true"
              onClick={() => {
                onClose();
                triggerRef?.current?.focus();
              }}
            >
              <X size={15} />
            </IconButton>
          </div>
        </div>

        {/* Manuscript Document Scroll Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-8) var(--space-8)',
            maxWidth: '720px',
            margin: '0 auto',
            width: '100%'
          }}
        >
          {/* Serif Title Block */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-32)',
              fontWeight: 400,
              color: 'var(--text-1)',
              lineHeight: 1.15,
              marginBottom: 'var(--space-2)'
            }}
          >
            {artifact.title}
          </h1>

          {/* Monospace Metadata Line */}
          <div
            className="font-mono"
            style={{
              fontSize: '12px',
              color: 'var(--text-3)',
              marginBottom: 'var(--space-6)',
              paddingBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--line)'
            }}
          >
            <span>Generated {new Date(artifact.created_at).toLocaleDateString()}</span> &bull;{' '}
            <span>Grounded Corpus Synthesis</span>
          </div>

          {/* Formatted Markdown Body */}
          <div style={{ color: 'var(--text-1)', fontSize: '15px', lineHeight: '1.65' }}>
            <MarkdownRenderer content={content} citations={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtifactViewer;
