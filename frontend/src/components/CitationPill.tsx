import React, { useState } from 'react';
import { CitationItem } from '../types';
import { BookOpen, FileText } from 'lucide-react';

interface CitationPillProps {
  index: number;
  citation?: CitationItem;
}

export const CitationPill: React.FC<CitationPillProps> = ({ index, citation }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span 
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'baseline', margin: '0 2px' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--citation-bg)',
          color: 'var(--citation-text)',
          border: '1px solid var(--citation-border)',
          borderRadius: '10px',
          padding: '0 6px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          lineHeight: '18px',
          transition: 'all 0.15s ease'
        }}
        aria-label={`Citation ${index}`}
      >
        {index}
      </button>

      {showTooltip && citation && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '10px 12px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            color: 'var(--text-primary)',
            fontSize: '12px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--brand-primary)', fontWeight: 600 }}>
            <FileText size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {citation.source_title}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (p. {citation.page_number})
            </span>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            borderLeft: '2px solid var(--brand-primary)',
            paddingLeft: '8px',
            fontStyle: 'italic',
            maxHeight: '120px',
            overflowY: 'hidden'
          }}>
            "{citation.snippet}"
          </div>
        </div>
      )}
    </span>
  );
};
