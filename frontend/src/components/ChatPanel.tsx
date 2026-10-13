// ============================================================================
// ChatPanel Component (Phase 4)
// Follows: notebooklm-design-system, design-taste-frontend, emil-design-eng
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { formatTokens } from '../utils/text';
import { ArrowUpRight } from 'lucide-react';

export const RESEARCH_STARTERS = [
  {
    index: '01',
    prompt: 'What are the foundational claims and core methodologies in these sources?'
  },
  {
    index: '02',
    prompt: 'Synthesize cross-cutting insights and reconcile contradictions across the papers.'
  },
  {
    index: '03',
    prompt: 'Derive key mathematical equations and technical definitions step by step.'
  },
  {
    index: '04',
    prompt: 'Outline actionable takeaways, architectural invariants, and next steps.'
  }
];

export function ChatPanel() {
  const {
    sources,
    messages,
    isStreaming,
    streamingContent,
    streamingCitations,
    sendMessage,
    abortStream,
    createNote
  } = useNotebookStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeSources = sources.filter((s) => s.is_active);
  const totalTokens = activeSources.reduce((acc, s) => acc + s.token_count, 0);

  // Auto-scroll on new tokens or messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-0)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Scrollable Reading Column Container */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {messages.length === 0 && !isStreaming ? (
          /* ================================================================
             Scholarly Empty State (Left-aligned, ~30% from top, ~720px column)
             ================================================================ */
          <div
            className="dot-grid-bg"
            style={{
              width: '100%',
              maxWidth: '720px',
              margin: '0 auto',
              padding: '12vh var(--space-4) var(--space-8) var(--space-4)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Live State Driven Mono Eyebrow */}
            <span
              className="font-mono"
              style={{
                fontSize: '11px',
                color: 'var(--accent-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 'var(--space-2)'
              }}
            >
              GROUNDED / {activeSources.length} {activeSources.length === 1 ? 'SOURCE' : 'SOURCES'} / {formatTokens(totalTokens)} TOKENS
            </span>

            {/* Serif 56px Heading */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                lineHeight: '1.08',
                fontWeight: 400,
                color: 'var(--text-1)',
                letterSpacing: '-0.02em',
                marginBottom: 'var(--space-3)'
              }}
            >
              Ask your sources.
            </h1>

            {/* Plain Subline */}
            <p
              style={{
                fontSize: 'var(--text-16)',
                color: 'var(--text-2)',
                lineHeight: 'var(--lh-normal)',
                marginBottom: 'var(--space-8)',
                maxWidth: '560px'
              }}
            >
              Synthesize insights, verify claims with inline citations, and generate study artifacts across your research notebook.
            </p>

            {/* Four Numbered Suggestion Rows with Hairline Separators */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)'
              }}
            >
              {RESEARCH_STARTERS.map((item) => (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => sendMessage(item.prompt)}
                  className="research-suggestion-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4) 0',
                    borderBottom: '1px solid var(--line)',
                    background: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'transform var(--dur-2) var(--ease-out)'
                  }}
                >
                  <span
                    className="font-mono suggestion-index"
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-3)',
                      fontWeight: 600,
                      width: '24px',
                      transition: 'color var(--dur-1) var(--ease-out)'
                    }}
                  >
                    {item.index}
                  </span>

                  <span
                    className="suggestion-text"
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-ui)',
                      fontSize: 'var(--text-14)',
                      color: 'var(--text-1)',
                      lineHeight: '1.4',
                      transition: 'transform var(--dur-2) var(--ease-out)'
                    }}
                  >
                    {item.prompt}
                  </span>

                  <ArrowUpRight size={14} style={{ color: 'var(--text-3)' }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Message Stream History */
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            streamingCitations={streamingCitations}
            activeSourcesCount={activeSources.length}
            onSaveToNotes={(content) => createNote('Saved Research Note', content)}
          />
        )}
      </div>

      {/* Raised Surface Composer at Bottom */}
      <Composer
        onSend={(q) => sendMessage(q)}
        onAbort={() => abortStream()}
        isStreaming={isStreaming}
        activeSourcesCount={activeSources.length}
        totalTokens={totalTokens}
      />
    </div>
  );
}

export default ChatPanel;
