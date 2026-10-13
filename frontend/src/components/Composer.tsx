// ============================================================================
// Composer Component (Raised Surface 1 of 2)
// Follows: notebooklm-design-system, emil-design-eng, fixing-accessibility
// ============================================================================

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { formatTokens } from '../utils/text';

export interface ComposerProps {
  onSend: (text: string) => void;
  onAbort?: () => void;
  isStreaming: boolean;
  activeSourcesCount: number;
  totalTokens: number;
  placeholder?: string;
}

export function Composer({
  onSend,
  onAbort,
  isStreaming,
  activeSourcesCount,
  totalTokens,
  placeholder = 'Ask a question grounded in your sources...'
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea 1 to 8 rows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 200); // 8 rows cap (~200px)
    el.style.height = `${Math.max(40, newHeight)}px`;
  }, [draft]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isStreaming) {
      onAbort?.();
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = draft.trim().length > 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '0 var(--space-4) var(--space-4) var(--space-4)'
      }}
    >
      {/* Raised Surface Box (--radius-2, --bg-2) */}
      <div
        style={{
          backgroundColor: 'var(--bg-2)',
          border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--line-strong)'}`,
          borderRadius: 'var(--radius-2)',
          boxShadow: isFocused
            ? '0 0 0 4px var(--accent-muted), var(--shadow-raised)'
            : 'var(--shadow-raised)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          transition: 'border-color var(--dur-2) var(--ease-out), box-shadow var(--dur-2) var(--ease-out)'
        }}
      >
        {/* Text Input Row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label="Ask a research inquiry"
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--text-14)',
              lineHeight: '1.5',
              resize: 'none',
              padding: '6px 0',
              maxHeight: '200px'
            }}
          />

          {/* Send / Stop Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasContent && !isStreaming}
            aria-label={isStreaming ? 'Stop response generation' : 'Send research inquiry'}
            className="ui-composer-submit-btn"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: 'var(--radius-1)',
              border: '1px solid',
              borderColor: isStreaming
                ? 'var(--danger)'
                : hasContent
                ? 'var(--accent)'
                : 'var(--line)',
              backgroundColor: isStreaming
                ? 'var(--danger-bg)'
                : hasContent
                ? 'var(--accent)'
                : 'transparent',
              color: isStreaming
                ? 'var(--danger)'
                : hasContent
                ? 'var(--accent-ink)'
                : 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: hasContent || isStreaming ? 'pointer' : 'not-allowed',
              transition: 'transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out)',
              marginBottom: '4px'
            }}
          >
            {isStreaming ? (
              <Square size={13} fill="currentColor" />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Footer: Live State Context Counter & Keyboard Hints */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--line)',
            paddingTop: 'var(--space-2)',
            fontSize: '11px',
            color: 'var(--text-3)'
          }}
        >
          {/* Live Grounding State Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="font-mono">
            {/* Status Dot (pulses only while streaming or retrieving) */}
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: activeSourcesCount > 0 ? 'var(--accent)' : 'var(--text-3)',
                boxShadow: isStreaming ? '0 0 6px var(--accent)' : 'none',
                animation: isStreaming ? 'pulse 1s infinite' : 'none'
              }}
              aria-hidden="true"
            />
            <span>
              {activeSourcesCount} {activeSourcesCount === 1 ? 'source' : 'sources'} in context /{' '}
              {formatTokens(totalTokens)} tokens
            </span>
          </div>

          {/* Keyboard Hints */}
          <div className="font-mono" style={{ fontSize: '10px', opacity: 0.8 }}>
            <span>Enter send</span> &bull; <span>Shift+Enter newline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Composer;
