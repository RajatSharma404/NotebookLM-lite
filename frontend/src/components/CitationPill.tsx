// ============================================================================
// CitationPill Component
// Follows: notebooklm-design-system, fixing-accessibility, emil-design-eng
// ============================================================================

import React, { useState, useRef } from 'react';
import { Citation } from '../types';
import { FileText, ExternalLink } from 'lucide-react';

export interface CitationPillProps {
  citation: Citation;
  onClick?: () => void;
}

export function CitationPill({ citation, onClick }: CitationPillProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isResolved = citation.kind === 'chunk';
  const markerNumber = isResolved ? citation.marker || 1 : citation.marker;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();

    // Pulse source row if in document
    if (isResolved && citation.sourceId) {
      const sourceRow = document.querySelector(`[data-source-id="${citation.sourceId}"]`);
      if (sourceRow) {
        sourceRow.classList.add('accent-pulse-highlight');
        setTimeout(() => sourceRow.classList.remove('accent-pulse-highlight'), 600);
      }
    }
  };

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        verticalAlign: 'super',
        lineHeight: 0,
        margin: '0 2px'
      }}
      onMouseEnter={() => setPopoverOpen(true)}
      onMouseLeave={() => setPopoverOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        role="button"
        aria-label={`Citation [${markerNumber}]${isResolved ? ` from ${citation.sourceTitle || 'source'}` : ' (unresolved)'}`}
        aria-haspopup="dialog"
        aria-expanded={popoverOpen}
        onFocus={() => setPopoverOpen(true)}
        onBlur={() => setPopoverOpen(false)}
        onClick={handleClick}
        className="font-mono ui-citation-pill"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1px 5px',
          fontSize: '11px',
          fontWeight: 600,
          color: isResolved ? 'var(--text-1)' : 'var(--text-3)',
          backgroundColor: isResolved ? 'var(--bg-1)' : 'transparent',
          border: '1px solid var(--line-strong)',
          borderBottom: isResolved ? '2px solid var(--accent)' : '1px solid var(--line)',
          borderRadius: 'var(--radius-1)',
          cursor: isResolved ? 'pointer' : 'default',
          transition: 'border-color var(--dur-1) var(--ease-out), transform var(--dur-1) var(--ease-out)',
          lineHeight: 1.2
        }}
      >
        <span>[{markerNumber}]</span>
      </button>

      {/* Popover on Hover / Focus */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label={`Citation details for marker ${markerNumber}`}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-popover)',
            width: '260px',
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-1)',
            padding: 'var(--space-3)',
            boxShadow: 'var(--shadow-popover)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            lineHeight: 1.4
          }}
        >
          {isResolved ? (
            <>
              {/* Header with Source & Page */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '4px'
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-text)',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '180px'
                  }}
                  title={citation.sourceTitle}
                >
                  {citation.sourceTitle || 'Source Document'}
                </span>
                {citation.page !== undefined && (
                  <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    p. {citation.page}
                  </span>
                )}
              </div>

              {/* Cited Quote Snippet */}
              {citation.quote && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-2)',
                    fontStyle: 'italic',
                    margin: 0,
                    maxHeight: '80px',
                    overflowY: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  &ldquo;{citation.quote}&rdquo;
                </p>
              )}

              <span
                className="font-mono"
                style={{
                  fontSize: '10px',
                  color: 'var(--text-3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ExternalLink size={10} /> Click to highlight in sources
              </span>
            </>
          ) : (
            <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Unresolved citation marker [{markerNumber}] &bull; source index pending
            </div>
          )}
        </div>
      )}
    </span>
  );
}

export default CitationPill;
