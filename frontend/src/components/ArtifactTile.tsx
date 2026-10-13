// ============================================================================
// ArtifactTile Component (2x2 Studio Grid Tile)
// Follows: notebooklm-design-system, emil-design-eng
// ============================================================================

import React, { useState, useEffect } from 'react';
import { BackendArtifactType } from '../types';
import { Check, RefreshCw } from 'lucide-react';

export type ArtifactTileState = 'idle' | 'generating' | 'done' | 'error';

export interface ArtifactTileProps {
  type: BackendArtifactType;
  title: string;
  subtitle: string;
  state: ArtifactTileState;
  onGenerate: () => void;
  onView?: () => void;
  onRetry?: () => void;
}

// Distinct SVG Glyphs (stacked lines + check, header bar + bullets, Q-A pair, vertical line with dots)
function ArtifactGlyph({ type }: { type: BackendArtifactType }) {
  const strokeColor = 'currentColor';

  switch (type) {
    case 'study_guide':
      // Stacked lines + check
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5">
          <line x1="4" y1="6" x2="16" y2="6" strokeLinecap="round" />
          <line x1="4" y1="12" x2="14" y2="12" strokeLinecap="round" />
          <line x1="4" y1="18" x2="12" y2="18" strokeLinecap="round" />
          <path d="M16 14L18.5 16.5L22 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'briefing_doc':
      // Header bar + bullets
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="4" rx="1" fill="var(--line-strong)" stroke="none" />
          <circle cx="5" cy="13" r="1.5" fill={strokeColor} stroke="none" />
          <line x1="9" y1="13" x2="20" y2="13" strokeLinecap="round" />
          <circle cx="5" cy="18" r="1.5" fill={strokeColor} stroke="none" />
          <line x1="9" y1="18" x2="18" y2="18" strokeLinecap="round" />
        </svg>
      );
    case 'faq':
      // Q-A pair
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5">
          <circle cx="8" cy="8" r="5" />
          <path d="M8 7V9" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.5" fill={strokeColor} />
          <rect x="13" y="12" width="8" height="8" rx="2" />
          <path d="M16 15L17.5 17L20 14" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'timeline':
      // Vertical line with dots
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="1.5">
          <line x1="6" y1="3" x2="6" y2="21" strokeLinecap="round" />
          <circle cx="6" cy="6" r="2" fill="var(--accent)" stroke="none" />
          <line x1="11" y1="6" x2="20" y2="6" strokeLinecap="round" />
          <circle cx="6" cy="12" r="2" fill={strokeColor} stroke="none" />
          <line x1="11" y1="12" x2="18" y2="12" strokeLinecap="round" />
          <circle cx="6" cy="18" r="2" fill="var(--accent)" stroke="none" />
          <line x1="11" y1="18" x2="21" y2="18" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function ArtifactTile({
  type,
  title,
  subtitle,
  state,
  onGenerate,
  onView,
  onRetry
}: ArtifactTileProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  // Timer while generating
  useEffect(() => {
    if (state !== 'generating') {
      setElapsedSec(0);
      return;
    }
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [state]);

  const handleClick = () => {
    if (state === 'generating') return;
    if (state === 'done') {
      onView?.();
    } else if (state === 'error') {
      onRetry?.();
    } else {
      onGenerate();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'generating'}
      className="ui-artifact-tile"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        padding: 'var(--space-4)',
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-1)',
        cursor: state === 'generating' ? 'wait' : 'pointer',
        transition: 'border-color var(--dur-2) var(--ease-out), transform var(--dur-1) var(--ease-out)',
        overflow: 'hidden',
        minHeight: '110px'
      }}
    >
      {/* Left-to-Right sweep shimmer while generating */}
      {state === 'generating' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, var(--accent-muted) 50%, transparent 100%)',
            animation: 'sweepShimmer 1.8s infinite ease-in-out'
          }}
          aria-hidden="true"
        />
      )}

      {/* Top Header: Glyph & State Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 'var(--space-2)'
        }}
      >
        <div style={{ color: state === 'done' ? 'var(--accent)' : 'var(--text-2)' }}>
          <ArtifactGlyph type={type} />
        </div>

        {/* State Badge */}
        {state === 'generating' && (
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--accent-text)',
              fontWeight: 500
            }}
          >
            Generating {String(elapsedSec).padStart(2, '0')}s
          </span>
        )}

        {state === 'done' && (
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--accent-text)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontWeight: 600
            }}
          >
            <Check size={12} /> Ready
          </span>
        )}

        {state === 'error' && (
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--danger)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <RefreshCw size={11} /> Retry
          </span>
        )}
      </div>

      {/* Title block */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          color: 'var(--text-1)',
          lineHeight: '1.2',
          marginBottom: '2px'
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '12px',
          color: 'var(--text-2)',
          lineHeight: '1.4'
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}

export default ArtifactTile;
