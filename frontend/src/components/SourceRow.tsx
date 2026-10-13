// ============================================================================
// SourceRow Component
// Follows: notebooklm-design-system, emil-design-eng, fixing-accessibility
// ============================================================================

import React, { useState } from 'react';
import { Source } from '../types';
import { middleEllipsis, formatTokens } from '../utils/text';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Trash2, Eye, AlertCircle, Loader2 } from 'lucide-react';

export interface SourceRowProps {
  source: Source;
  totalContextTokens: number;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  onInspect: () => void;
  isIndexing?: boolean;
  parseError?: string;
}

export function SourceRow({
  source,
  totalContextTokens,
  onToggle,
  onDelete,
  onInspect,
  isIndexing = false,
  parseError
}: SourceRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);

  // Calculate percentage of total active context tokens
  const tokenShareRatio = totalContextTokens > 0 && source.is_active
    ? Math.min(100, Math.max(2, (source.token_count / totalContextTokens) * 100))
    : 0;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--line)',
        backgroundColor: isHovered ? 'var(--bg-hover)' : 'transparent',
        opacity: source.is_active ? 1 : 0.5,
        transition: 'opacity var(--dur-2) var(--ease-out), background-color var(--dur-1) var(--ease-out)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        {/* Left: Custom Square Checkbox + Filename */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1, minWidth: 0 }}>
          {/* Custom Animated Square Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={source.is_active}
            aria-label={`Toggle ${source.filename} active in context`}
            onClick={() => onToggle(!source.is_active)}
            style={{
              width: '16px',
              height: '16px',
              minWidth: '16px',
              borderRadius: '3px',
              border: `1px solid ${source.is_active ? 'var(--accent)' : 'var(--line-strong)'}`,
              backgroundColor: source.is_active ? 'var(--accent)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer',
              transition: 'background-color var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out)'
            }}
          >
            {source.is_active && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3.5 8.5L6.5 11.5L12.5 4.5"
                  stroke="var(--accent-ink)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 16,
                    strokeDashoffset: 0,
                    animation: 'checkStroke 200ms var(--ease-out) forwards'
                  }}
                />
              </svg>
            )}
          </button>

          {/* Filename with middle ellipsis in mono */}
          <span
            className="font-mono"
            title={source.filename}
            style={{
              fontSize: '13px',
              color: 'var(--text-1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            {middleEllipsis(source.filename, 22)}
          </span>
        </div>

        {/* Right Actions: Inspect & Delete (visible on hover or focus) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity var(--dur-1) var(--ease-out)'
          }}
        >
          {/* Inspect Chunks Button */}
          <Tooltip content="Inspect Chunks & Audit">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={`Inspect chunks for ${source.filename}`}
              onClick={onInspect}
            >
              <Eye size={13} />
            </IconButton>
          </Tooltip>

          {/* Delete Button (turns danger on hover) */}
          <Tooltip content="Delete source">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={`Delete ${source.filename}`}
              onMouseEnter={() => setIsDeleteHovered(true)}
              onMouseLeave={() => setIsDeleteHovered(false)}
              onClick={onDelete}
              style={{
                color: isDeleteHovered ? 'var(--danger)' : 'var(--text-3)'
              }}
            >
              <Trash2 size={13} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Metadata & Token Bar Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'var(--space-1)',
          paddingLeft: '24px' // Aligned past checkbox
        }}
      >
        {/* Token Count in Mono */}
        <span
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-3)'
          }}
        >
          {isIndexing ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Indexing...
            </span>
          ) : parseError ? (
            <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={10} /> Parse failed
            </span>
          ) : (
            `${formatTokens(source.token_count)} tokens`
          )}
        </span>

        {/* File Type Pill */}
        <span
          className="font-mono"
          style={{
            fontSize: '10px',
            color: 'var(--text-3)',
            textTransform: 'uppercase'
          }}
        >
          {source.file_type.replace('.', '')}
        </span>
      </div>

      {/* 2px Bar Showing This Source's Share of Total Context Tokens */}
      {source.is_active && tokenShareRatio > 0 && (
        <div
          style={{
            height: '2px',
            width: '100%',
            backgroundColor: 'var(--line)',
            marginTop: 'var(--space-2)',
            borderRadius: '1px',
            overflow: 'hidden'
          }}
          aria-hidden="true"
        >
          <div
            style={{
              height: '100%',
              width: `${tokenShareRatio}%`,
              backgroundColor: 'var(--accent)',
              transition: 'width var(--dur-2) var(--ease-out)'
            }}
          />
        </div>
      )}
    </div>
  );
}
