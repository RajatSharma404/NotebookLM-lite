import React, { useState } from 'react';
import { CitationItem } from '../types';

interface CitationPillProps {
  index: number;
  citation?: CitationItem;
}

export const CitationPill: React.FC<CitationPillProps> = ({ index, citation }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!citation) return;
    // Attempt to locate source item in sidebar and highlight briefly
    const sourceEl = document.querySelector(`[title="${citation.source_title}"]`);
    if (sourceEl) {
      sourceEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      sourceEl.classList.add('pulse-highlight');
      setTimeout(() => sourceEl.classList.remove('pulse-highlight'), 600);
    }
  };

  return (
    <span 
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline', margin: '0 2px' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button
        onClick={handleClick}
        className="mono"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--citation-bg)',
          color: 'var(--citation-text)',
          border: '1px solid var(--citation-border)',
          borderRadius: '3px',
          padding: '0 4px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: '14px',
          verticalAlign: 'super',
          transition: 'border-color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out)'
        }}
        aria-label={`Citation ${index}: ${citation?.source_title || 'Source'} (Page ${citation?.page_number || 1})`}
      >
        {index}
      </button>

      {showTooltip && citation && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            boxShadow: 'var(--shadow-raised)',
            zIndex: 1000,
            color: 'var(--text-1)',
            fontSize: '12px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
            <span
              className="mono"
              style={{
                fontWeight: 600,
                fontSize: '11px',
                color: 'var(--accent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {citation.source_title}
            </span>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', flexShrink: 0 }}>
              p. {citation.page_number}
            </span>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-2)',
            lineHeight: 1.5,
            borderLeft: '2px solid var(--accent)',
            paddingLeft: '8px',
            fontStyle: 'italic',
            maxHeight: '100px',
            overflowY: 'hidden'
          }}>
            "{citation.snippet}"
          </div>
        </div>
      )}
    </span>
  );
};
