// ============================================================================
// ErrorState Component
// Follows: react-ui-patterns, fixing-accessibility
// ============================================================================

import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`ui-error-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 'var(--space-4)',
        borderLeft: '3px solid var(--danger)',
        backgroundColor: 'var(--danger-bg)',
        borderRadius: '0 var(--radius-1) var(--radius-1) 0',
        gap: 'var(--space-2)',
        maxWidth: '720px',
        width: '100%',
        margin: 'var(--space-4) 0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-13)',
            color: 'var(--danger)'
          }}
        >
          {title}
        </span>
      </div>

      <p
        style={{
          fontSize: 'var(--text-13)',
          color: 'var(--text-2)',
          lineHeight: 'var(--lh-normal)'
        }}
      >
        {message}
      </p>

      {onRetry && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <Button variant="danger" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
