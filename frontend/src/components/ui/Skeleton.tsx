// ============================================================================
// Skeleton Loading Component
// Follows: react-ui-patterns, fixing-motion-performance
// ============================================================================

import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-1)',
  className = '',
  style
}: SkeletonProps) {
  return (
    <div
      className={`ui-skeleton ${className}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--line-strong)',
        opacity: 0.5,
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
        ...style
      }}
    />
  );
}
