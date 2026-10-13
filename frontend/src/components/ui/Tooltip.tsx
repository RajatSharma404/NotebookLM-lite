// ============================================================================
// Tooltip Component
// Follows: fixing-accessibility, emil-design-eng
// ============================================================================

import React, { useState, useRef, ReactNode } from 'react';

export interface TooltipProps {
  content: string;
  kbdShortcut?: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export function Tooltip({
  content,
  kbdShortcut,
  children,
  side = 'bottom',
  delayMs = 200
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delayMs);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const sideStyles: Record<string, React.CSSProperties> = {
    top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' }
  };

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 'var(--z-popover)',
            backgroundColor: 'var(--bg-2)',
            color: 'var(--text-1)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-1)',
            padding: 'var(--space-1) var(--space-2)',
            fontSize: 'var(--text-12)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            boxShadow: 'var(--shadow-raised)',
            ...sideStyles[side]
          }}
        >
          <span>{content}</span>
          {kbdShortcut && (
            <kbd
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-0)',
                border: '1px solid var(--line)',
                borderRadius: '3px',
                padding: '1px 4px',
                fontSize: '10px',
                color: 'var(--text-3)'
              }}
            >
              {kbdShortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
}
