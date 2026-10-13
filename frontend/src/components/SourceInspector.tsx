// ============================================================================
// SourceInspector Component (Lazy Loaded Drawer + Chunk Auditor)
// Follows: notebooklm-design-system, react-component-performance, fixing-accessibility
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Source, ChunkItem } from '../types';
import { auditChunks } from '../utils/chunkAuditor';
import { formatTokens } from '../utils/text';
import { IconButton } from './ui/IconButton';
import { Button } from './ui/Button';
import { X, Search, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react';

export interface SourceInspectorProps {
  source: Source;
  chunks: ChunkItem[];
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export function SourceInspector({
  source,
  chunks,
  isOpen,
  onClose,
  triggerRef
}: SourceInspectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Client-Side Chunk Audit Map
  const auditFlagsByChunk = useMemo(() => auditChunks(chunks), [chunks]);

  // Total issues detected
  const totalAuditIssues = useMemo(() => {
    let count = 0;
    for (const flags of auditFlagsByChunk.values()) {
      count += flags.length;
    }
    return count;
  }, [auditFlagsByChunk]);

  // Filtered Chunks based on in-drawer search
  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;
    const q = searchQuery.toLowerCase();
    return chunks.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        (c.section_title && c.section_title.toLowerCase().includes(q))
    );
  }, [chunks, searchQuery]);

  // Focus trap & Escape dismiss
  useEffect(() => {
    if (!isOpen) return;

    // Focus search input on open
    setTimeout(() => searchInputRef.current?.focus(), 50);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const copyChunk = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(id);
    setTimeout(() => setCopiedChunkId(null), 1500);
  };

  // Match highlighting helper
  const renderHighlightedContent = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-ink)',
            padding: '0 2px',
            borderRadius: '2px'
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Source Inspector for ${source.filename}`}
      data-modal-open="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer)',
        display: 'flex',
        justifyContent: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.40)',
        backdropFilter: 'blur(2px)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={drawerRef}
        style={{
          width: '560px',
          maxWidth: '90vw',
          height: '100%',
          backgroundColor: 'var(--bg-1)',
          borderRight: '1px solid var(--line-strong)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-popover)',
          animation: 'slideInLeft var(--dur-2) var(--ease-out)'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span
              className="font-mono"
              style={{
                fontSize: '11px',
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Source Inspector & Chunk Auditor
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-20)',
                color: 'var(--text-1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {source.filename}
            </h3>
          </div>

          <IconButton
            size="md"
            variant="ghost"
            aria-label="Close inspector"
            data-dismiss-active="true"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
          >
            <X size={16} />
          </IconButton>
        </div>

        {/* Auditor Summary Banner & Search */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--line)',
            backgroundColor: 'var(--bg-0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}
        >
          {/* Audit Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-2)' }}>
              <span>{chunks.length} Chunks Indexed</span> &bull;{' '}
              <span>{formatTokens(source.token_count)} Total Tokens</span>
            </div>

            {totalAuditIssues === 0 ? (
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-text)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle size={12} /> Auditor: Healthy
              </span>
            ) : (
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--danger)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle size={12} /> {totalAuditIssues} Quality Issue{totalAuditIssues > 1 ? 's' : ''} Flagged
              </span>
            )}
          </div>

          {/* Search in Drawer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-1)',
              padding: '0 var(--space-2)'
            }}
          >
            <Search size={14} style={{ color: 'var(--text-3)' }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search across chunks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-mono"
              style={{
                flex: 1,
                border: 'none',
                background: 'none',
                padding: 'var(--space-2) 0',
                fontSize: '13px',
                color: 'var(--text-1)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Chunk List with CSS content-visibility for ultra-fast rendering */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {filteredChunks.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-8)',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}
            >
              No chunks match search query.
            </div>
          ) : (
            filteredChunks.map((chunk, index) => {
              const flags = auditFlagsByChunk.get(chunk.id) || [];
              const hasFlags = flags.length > 0;
              const isCopied = copiedChunkId === chunk.id;
              const approxTokens = Math.max(1, Math.round(chunk.content.length / 4));

              return (
                <div
                  key={chunk.id}
                  style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--line)',
                    backgroundColor: hasFlags ? 'var(--bg-0)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    // High-Performance CSS Property (no virtualization dependency)
                    contentVisibility: 'auto',
                    containIntrinsicSize: '0 120px'
                  }}
                >
                  {/* Chunk Metadata Bar in Mono */}
                  <div
                    className="font-mono"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
                        #{index + 1}
                      </span>
                      <span>Page {chunk.page_number}</span>
                      <span>&bull;</span>
                      <span>~{approxTokens} tok</span>
                      <span>&bull;</span>
                      <span>Chars {chunk.char_start}–{chunk.char_end}</span>
                    </div>

                    <IconButton
                      size="sm"
                      variant="ghost"
                      aria-label="Copy chunk text"
                      onClick={() => copyChunk(chunk.id, chunk.content)}
                    >
                      {isCopied ? <Check size={12} style={{ color: 'var(--accent)' }} /> : <Copy size={12} />}
                    </IconButton>
                  </div>

                  {/* Section Title if present */}
                  {chunk.section_title && (
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '14px',
                        color: 'var(--text-1)'
                      }}
                    >
                      {chunk.section_title}
                    </div>
                  )}

                  {/* Chunk Text Body */}
                  <div
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: 'var(--text-2)',
                      fontFamily: 'var(--font-ui)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {renderHighlightedContent(chunk.content, searchQuery)}
                  </div>

                  {/* Auditor Flags Banner */}
                  {hasFlags && (
                    <div
                      style={{
                        marginTop: 'var(--space-1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      {flags.map((flag, fi) => (
                        <div
                          key={fi}
                          className="font-mono"
                          style={{
                            fontSize: '10px',
                            color: 'var(--danger)',
                            backgroundColor: 'var(--danger-bg)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'fit-content'
                          }}
                        >
                          <AlertTriangle size={10} />
                          <span>[{flag.type.toUpperCase()}] {flag.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default SourceInspector;
