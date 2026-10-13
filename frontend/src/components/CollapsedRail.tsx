// ============================================================================
// CollapsedRail Component
// Follows: notebooklm-design-system, fixing-accessibility
// ============================================================================

import React from 'react';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

export interface CollapsedRailProps {
  side: 'left' | 'right';
  label: string;
  count?: number;
  shortcut: string;
  onExpand: () => void;
}

export function CollapsedRail({
  side,
  label,
  count,
  shortcut,
  onExpand
}: CollapsedRailProps) {
  const Icon = side === 'left' ? PanelLeftOpen : PanelRightOpen;

  return (
    <div
      style={{
        width: '56px',
        height: '100%',
        backgroundColor: 'var(--bg-0)',
        borderRight: side === 'left' ? '1px solid var(--line)' : 'none',
        borderLeft: side === 'right' ? '1px solid var(--line)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-3) 0',
        gap: 'var(--space-4)',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      <Tooltip content={`Expand ${label}`} kbdShortcut={shortcut} side={side === 'left' ? 'right' : 'left'}>
        <IconButton
          size="md"
          variant="ghost"
          aria-label={`Expand ${label} panel (${shortcut})`}
          onClick={onExpand}
        >
          <Icon size={16} />
        </IconButton>
      </Tooltip>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)'
        }}
      >
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: side === 'left' ? 'rotate(180deg)' : 'none',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-14)',
            color: 'var(--text-2)',
            letterSpacing: '0.04em'
          }}
        >
          {label}
        </span>

        {count !== undefined && (
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 6px'
            }}
          >
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
