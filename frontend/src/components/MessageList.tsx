// ============================================================================
// MessageList Component
// Follows: notebooklm-design-system, react-component-performance, fixing-accessibility
// ============================================================================

import React, { memo, useState, useEffect } from 'react';
import { Message, Citation } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { IconButton } from './ui/IconButton';
import { Tooltip } from './ui/Tooltip';
import { Copy, Bookmark, Check, AlertCircle, RefreshCw } from 'lucide-react';

export interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  streamingCitations: Citation[];
  activeSourcesCount: number;
  onSaveToNotes?: (text: string) => void;
  onRetry?: () => void;
}

// ----------------------------------------------------------------------------
// Memoized Historical Assistant Message Component
// ----------------------------------------------------------------------------
interface AssistantMessageItemProps {
  message: Message;
  onSaveToNotes?: (text: string) => void;
}

const AssistantMessageItem = memo(function AssistantMessageItem({
  message,
  onSaveToNotes
}: AssistantMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    onSaveToNotes?.(message.content);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <article
      aria-label="Assistant Response"
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 'var(--space-6)',
        position: 'relative'
      }}
    >
      {/* Body Text: 16px / 1.65 reading column */}
      <div
        style={{
          fontSize: 'var(--text-16)',
          lineHeight: 'var(--lh-body)',
          color: 'var(--text-1)'
        }}
      >
        <MarkdownRenderer content={message.content} citations={message.citations} />
      </div>

      {/* Action Bar: Copy & Save to Notes */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-2)'
        }}
      >
        <Tooltip content={copied ? 'Copied' : 'Copy response'}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Copy response text"
            onClick={handleCopy}
          >
            {copied ? <Check size={13} style={{ color: 'var(--accent)' }} /> : <Copy size={13} />}
          </IconButton>
        </Tooltip>

        <Tooltip content={saved ? 'Saved to Notes' : 'Save to Notes'}>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Save response to Notes"
            onClick={handleSave}
          >
            {saved ? <Check size={13} style={{ color: 'var(--accent)' }} /> : <Bookmark size={13} />}
          </IconButton>
        </Tooltip>
      </div>
    </article>
  );
});

// ----------------------------------------------------------------------------
// Memoized Historical User Turn Component
// ----------------------------------------------------------------------------
interface UserTurnItemProps {
  content: string;
}

const UserTurnItem = memo(function UserTurnItem({ content }: UserTurnItemProps) {
  return (
    <div
      aria-label="User Question"
      style={{
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: '20px',
        color: 'var(--text-1)',
        lineHeight: '1.3',
        paddingLeft: 'var(--space-3)',
        borderLeft: '2px solid var(--accent)',
        margin: 'var(--space-6) 0 var(--space-4) 0'
      }}
    >
      {content}
    </div>
  );
});

// ----------------------------------------------------------------------------
// Primary MessageList
// ----------------------------------------------------------------------------
export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  streamingCitations,
  activeSourcesCount,
  onSaveToNotes,
  onRetry
}: MessageListProps) {
  const [streamAnnouncement, setStreamAnnouncement] = useState('');
  const prevStreamingRef = React.useRef(isStreaming);

  // Announce only stream completion to screen readers (fixing-accessibility)
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setStreamAnnouncement(`Response generated from ${activeSourcesCount} sources.`);
      const timer = setTimeout(() => setStreamAnnouncement(''), 3000);
      return () => clearTimeout(timer);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, activeSourcesCount]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Screen Reader Announcement for Completion */}
      <div className="sr-only" aria-live="polite">
        {streamAnnouncement}
      </div>

      {/* Historical Messages */}
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserTurnItem key={msg.id} content={msg.content} />
        ) : (
          <AssistantMessageItem
            key={msg.id}
            message={msg}
            onSaveToNotes={onSaveToNotes}
          />
        )
      )}

      {/* Live Streaming Message Container */}
      {isStreaming && (
        <article
          aria-label="Generating Response"
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'var(--space-2)',
            position: 'relative'
          }}
        >
          {/* Shimmer line & source inspection indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)'
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '12px',
                color: 'var(--accent-text)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent)',
                  animation: 'pulse 1s infinite'
                }}
              />
              Reading {activeSourcesCount} {activeSourcesCount === 1 ? 'source' : 'sources'}...
            </span>

            {/* Shimmer hairline */}
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)',
                opacity: 0.6
              }}
            />
          </div>

          {/* Active Streaming Token Body with Caret */}
          <div
            style={{
              fontSize: 'var(--text-16)',
              lineHeight: 'var(--lh-body)',
              color: 'var(--text-1)'
            }}
          >
            <MarkdownRenderer
              content={streamingContent}
              citations={streamingCitations}
            />
            {/* Blinking Caret */}
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '16px',
                backgroundColor: 'var(--accent)',
                marginLeft: '3px',
                verticalAlign: 'text-bottom',
                animation: 'blink 900ms infinite'
              }}
              aria-hidden="true"
            />
          </div>
        </article>
      )}
    </div>
  );
}

export default MessageList;
