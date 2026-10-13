// ============================================================================
// EmptyState Component
// Follows: react-ui-patterns, design-taste-frontend
// ============================================================================

import React, { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionNode?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  actionNode,
  children,
  className = ''
}: EmptyStateProps) {
  return (
    <div
      className={`ui-empty-state dot-grid-bg ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        padding: 'var(--space-8) var(--space-6)',
        maxWidth: '720px',
        margin: '0 auto',
        width: '100%',
        position: 'relative'
      }}
    >
      {eyebrow && (
        <span
          className="font-mono"
          style={{
            fontSize: 'var(--text-12)',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 'var(--space-2)'
          }}
        >
          {eyebrow}
        </span>
      )}

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-32)',
          fontWeight: 400,
          color: 'var(--text-1)',
          marginBottom: 'var(--space-2)',
          lineHeight: 1.15
        }}
      >
        {title}
      </h2>

      <p
        style={{
          fontSize: 'var(--text-14)',
          color: 'var(--text-2)',
          lineHeight: 'var(--lh-body)',
          marginBottom: 'var(--space-6)',
          maxWidth: '540px'
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}

      {actionNode}

      {children}
    </div>
  );
}
