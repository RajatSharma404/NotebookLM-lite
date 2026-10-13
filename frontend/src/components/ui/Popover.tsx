// ============================================================================
// Popover Component
// Follows: react-patterns, fixing-accessibility
// ============================================================================

import React, {
  useState,
  useRef,
  useEffect,
  ReactNode,
  useCallback
} from 'react';

export interface PopoverProps {
  trigger: (props: { isOpen: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement> }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'left' | 'right' | 'center';
  side?: 'top' | 'bottom';
  className?: string;
}

export function Popover({
  trigger,
  children,
  align = 'left',
  side = 'bottom',
  className = ''
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close]);

  const alignmentStyles: React.CSSProperties = {
    position: 'absolute',
    zIndex: 'var(--z-popover)',
    backgroundColor: 'var(--bg-1)',
    border: '1px solid var(--line-strong)',
    borderRadius: 'var(--radius-1)',
    boxShadow: 'var(--shadow-popover)',
    padding: 'var(--space-2)',
    minWidth: '220px',
    ...(side === 'bottom' ? { top: 'calc(100% + var(--space-1))' } : { bottom: 'calc(100% + var(--space-1))' }),
    ...(align === 'left' ? { left: 0 } : align === 'right' ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' })
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className={className}>
      {trigger({ isOpen, toggle, ref: triggerRef })}

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="false"
          style={alignmentStyles}
          className="ui-popover-content"
        >
          {children({ close })}
        </div>
      )}
    </div>
  );
}
