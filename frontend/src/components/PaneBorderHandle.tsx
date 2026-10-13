// ============================================================================
// PaneBorderHandle Component
// Follows: emil-design-eng, fixing-accessibility, fixing-motion-performance
// ============================================================================

import React, { useState } from 'react';

export interface PaneBorderHandleProps {
  side: 'left' | 'right';
  isCollapsed: boolean;
  onToggle: () => void;
  panelName: string;
}

export function PaneBorderHandle({
  side,
  isCollapsed,
  onToggle,
  panelName
}: PaneBorderHandleProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${panelName} (Mod+${side === 'left' ? 'B' : 'J'})`}
      title={`${isCollapsed ? 'Expand' : 'Collapse'} ${panelName} (Mod+${side === 'left' ? 'B' : 'J'})`}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side === 'left' ? 'right' : 'left']: '-4px',
        width: '8px',
        cursor: 'col-resize',
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        zIndex: 'var(--z-raised)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* 1px accent hairline indicator on hover/focus */}
      <span
        style={{
          width: '2px',
          height: isHovered ? '48px' : '24px',
          backgroundColor: isHovered ? 'var(--accent)' : 'var(--line-strong)',
          borderRadius: '1px',
          transition: 'height var(--dur-2) var(--ease-out), background-color var(--dur-1) var(--ease-out)'
        }}
        aria-hidden="true"
      />
    </button>
  );
}
