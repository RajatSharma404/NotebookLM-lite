import React, { useState, useRef, useEffect } from 'react';
import { Message, Source, CitationItem } from '../types';
import { CitationPill } from './CitationPill';
import { ArrowUp, Copy, Bookmark, Check, AlertCircle } from 'lucide-react';

interface ChatWorkspaceProps {
  messages: Message[];
  activeSources: Source[];
  totalTokens?: number;
  isStreaming: boolean;
  onSendMessage: (query: string) => void;
  onSaveToNote: (content: string) => void;
}

interface SuggestedPromptRowProps {
  index: string;
  prompt: string;
  onClick: () => void;
}

const SuggestedPromptRow: React.FC<SuggestedPromptRowProps> = ({ index, prompt, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 12px',
        borderBottom: '1px solid var(--line)',
        backgroundColor: hovered ? 'var(--bg-1)' : 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color var(--duration-fast) var(--ease-out)',
        borderRadius: 'var(--radius-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flex: 1, minWidth: 0 }}>
        <span
          className="mono"
          style={{
            fontSize: '12px',
            color: hovered ? 'var(--accent)' : 'var(--text-3)',
            transition: 'color var(--duration-fast) var(--ease-out)',
            width: '24px',
            flexShrink: 0
          }}
        >
          {index}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '15px',
            color: hovered ? 'var(--text-1)' : 'var(--text-2)',
            transform: hovered ? 'translateX(4px)' : 'translateX(0)',
            transition: 'all var(--duration-fast) var(--ease-out)',
            lineHeight: 1.45
          }}
        >
          {prompt}
        </span>
      </div>
      <span
        style={{
          color: 'var(--accent)',
          fontSize: '16px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'all var(--duration-fast) var(--ease-out)',
          marginLeft: '12px',
          flexShrink: 0
        }}
      >
        →
      </span>
    </button>
  );
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  activeSources,
  totalTokens: propTotalTokens,
  isStreaming,
  onSendMessage,
  onSaveToNote
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const effectiveTokens = propTotalTokens !== undefined
    ? propTotalTokens
    : activeSources.reduce((acc, s) => acc + (s.token_count || 0), 0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 200)}px`;
    }
  }, [inputQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isStreaming) return;
    onSendMessage(inputQuery.trim());
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = (id: string, content: string) => {
    onSaveToNote(content);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  // Render text replacing [1], [2] with interactive CitationPill
  const renderMessageContent = (content: string, citations: CitationItem[]) => {
    const citationMap = new Map<number, CitationItem>();
    citations.forEach(cit => citationMap.set(cit.index, cit));

    const parts: React.ReactNode[] = [];
    const regex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;

      if (start > lastIndex) {
        parts.push(content.substring(lastIndex, start));
      }

      const citIndex = parseInt(match[1], 10);
      const citation = citationMap.get(citIndex);

      parts.push(
        <CitationPill key={`cit-${start}`} index={citIndex} citation={citation} />
      );

      lastIndex = end;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  const starterPrompts = [
    "Summarize the key findings across all active sources.",
    "What are the main theoretical contributions discussed?",
    "Extract an outline of critical arguments and conclusions.",
    "Compare the methodologies outlined in the documents."
  ];

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-0)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background dot grid pattern */}
      <div className="dot-grid-pattern" />

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 32px 16px',
        position: 'relative',
        zIndex: 1
      }}>
        {messages.length === 0 ? (
          <div style={{
            maxWidth: '720px',
            margin: '8vh auto 0',
            textAlign: 'left'
          }}>
            {/* Eyebrow */}
            <div
              className="mono"
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: 'var(--text-3)',
                marginBottom: '16px',
                textTransform: 'uppercase'
              }}
            >
              {activeSources.length > 0
                ? `GROUNDED / ${activeSources.length} ${activeSources.length === 1 ? 'SOURCE' : 'SOURCES'} / ${effectiveTokens.toLocaleString()} TOKENS`
                : 'UNGROUNDED / 0 SOURCES / 0 TOKENS'}
            </div>

            {/* Display H1 */}
            <h1
              className="serif"
              style={{
                fontSize: '56px',
                fontWeight: 400,
                lineHeight: 1.05,
                color: 'var(--text-1)',
                marginBottom: '16px',
                letterSpacing: '-0.02em'
              }}
            >
              Ask your sources.
            </h1>

            {/* Subline */}
            <p style={{
              fontSize: '16px',
              color: 'var(--text-2)',
              lineHeight: 1.5,
              maxWidth: '52ch',
              marginBottom: '40px'
            }}>
              Every answer is strictly attributed with verifiable inline citations grounded in your uploaded documents.
            </p>

            {/* Warning or Suggested Prompts */}
            {activeSources.length === 0 ? (
              <div style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--line-strong)',
                color: 'var(--text-2)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertCircle size={16} color="var(--signal)" />
                <span>No active sources selected. Enable or upload documents in the left ledger to begin retrieval.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {starterPrompts.map((prompt, i) => (
                  <SuggestedPromptRow
                    key={i}
                    index={`0${i + 1}`}
                    prompt={prompt}
                    onClick={() => onSendMessage(prompt)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '36px'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {msg.role === 'user' ? (
                  // User Turn: Editorial serif, left rule, no bubble
                  <div style={{
                    borderLeft: '2px solid var(--line-strong)',
                    paddingLeft: '16px',
                    paddingTop: '4px',
                    paddingBottom: '4px'
                  }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        color: 'var(--text-3)',
                        marginBottom: '6px',
                        textTransform: 'uppercase'
                      }}
                    >
                      QUERY
                    </div>
                    <div
                      className="serif"
                      style={{
                        fontSize: '22px',
                        lineHeight: 1.4,
                        color: 'var(--text-1)',
                        fontWeight: 400
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  // Assistant Turn: Clean reading prose, inline citations, no card box
                  <div style={{
                    paddingLeft: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)'
                      }} />
                      <span
                        className="mono"
                        style={{
                          fontSize: '10px',
                          letterSpacing: '0.12em',
                          color: 'var(--text-3)',
                          textTransform: 'uppercase'
                        }}
                      >
                        GROUNDED SYNTHESIS
                      </span>
                    </div>

                    <div style={{
                      fontSize: '15.5px',
                      lineHeight: 1.7,
                      color: 'var(--text-1)',
                      fontFamily: 'var(--font-ui)'
                    }}>
                      {renderMessageContent(msg.content, msg.citations)}
                    </div>

                    {/* Action Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '4px'
                    }}>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          color: copiedId === msg.id ? 'var(--text-1)' : 'var(--text-3)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line)',
                          transition: 'all var(--duration-fast) var(--ease-out)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--line-strong)';
                          e.currentTarget.style.color = 'var(--text-1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--line)';
                          e.currentTarget.style.color = copiedId === msg.id ? 'var(--text-1)' : 'var(--text-3)';
                        }}
                      >
                        {copiedId === msg.id ? <Check size={12} color="var(--accent)" /> : <Copy size={12} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleSave(msg.id, msg.content)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          color: savedId === msg.id ? 'var(--text-1)' : 'var(--text-3)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line)',
                          transition: 'all var(--duration-fast) var(--ease-out)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--line-strong)';
                          e.currentTarget.style.color = 'var(--text-1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--line)';
                          e.currentTarget.style.color = savedId === msg.id ? 'var(--text-1)' : 'var(--text-3)';
                        }}
                      >
                        {savedId === msg.id ? <Check size={12} color="var(--accent)" /> : <Bookmark size={12} />}
                        <span>{savedId === msg.id ? 'Saved to Notes' : 'Save to Note'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Loading Indicator */}
            {isStreaming && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '12px 0 20px',
                color: 'var(--text-2)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span className="pulsing-dot" style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    display: 'inline-block'
                  }} />
                  <span>Reading {activeSources.length} sources and grounding citations...</span>
                </div>
                <div style={{
                  width: '180px',
                  height: '2px',
                  backgroundColor: 'var(--line)',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '2px'
                }}>
                  <div
                    className="shimmer-bar"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: '50%',
                      backgroundColor: 'var(--accent)'
                    }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area - One of only TWO raised surfaces in the app */}
      <div style={{
        padding: '16px 32px 20px',
        backgroundColor: 'var(--bg-0)',
        borderTop: '1px solid var(--line)',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: 'var(--bg-2)',
              border: isFocused ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: isFocused ? '0 0 0 4px var(--accent-ring), var(--shadow-raised)' : 'var(--shadow-raised)',
              transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
              padding: '12px 14px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about findings, compare methodologies, request summaries..."
              rows={1}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '200px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-1)',
                fontSize: '15px',
                fontFamily: 'var(--font-ui)',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none'
              }}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '4px'
            }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)'
              }}>
                <span style={{
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid var(--line-strong)',
                  marginRight: '4px'
                }}>Enter</span> send
                <span style={{ margin: '0 6px' }}>•</span>
                <span style={{
                  padding: '1px 5px',
                  borderRadius: '3px',
                  border: '1px solid var(--line-strong)',
                  marginRight: '4px'
                }}>Shift+Enter</span> newline
              </div>

              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                aria-label="Send message"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: inputQuery.trim() && !isStreaming ? 'var(--accent)' : 'transparent',
                  color: inputQuery.trim() && !isStreaming ? 'var(--ink)' : 'var(--text-3)',
                  border: inputQuery.trim() && !isStreaming ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputQuery.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  fontWeight: 600
                }}
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </button>
            </div>
          </form>

          {/* Under-composer Grounding Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '0 4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="pulsing-dot"
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: activeSources.length > 0 ? 'var(--accent)' : 'var(--signal)'
                }}
              />
              <span>
                {activeSources.length > 0
                  ? `${activeSources.length} active in context • ${effectiveTokens.toLocaleString()} tokens`
                  : '0 active sources in context'}
              </span>
            </div>
            <span>Strict grounding active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
