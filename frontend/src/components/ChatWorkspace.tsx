import React, { useState, useRef, useEffect } from 'react';
import { Message, Source, CitationItem } from '../types';
import { CitationPill } from './CitationPill';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  ArrowUp, 
  Copy, 
  Bookmark, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Zap, 
  Layers,
  CornerDownLeft,
  Search
} from 'lucide-react';

interface ChatWorkspaceProps {
  messages: Message[];
  activeSources: Source[];
  totalTokens?: number;
  isStreaming: boolean;
  onSendMessage: (query: string) => void;
  onSaveToNote: (content: string) => void;
}

interface ResearchStarterCardProps {
  index: string;
  category: string;
  title: string;
  prompt: string;
  onClick: () => void;
}

const ResearchStarterCard: React.FC<ResearchStarterCardProps> = ({ 
  index, 
  category, 
  title, 
  prompt, 
  onClick 
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: hovered ? 'var(--bg-2)' : 'var(--bg-1)',
        border: hovered ? '1px solid var(--accent-border)' : '1px solid var(--line)',
        boxShadow: hovered ? 'var(--shadow-glow)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all var(--duration-fast) var(--ease-spring)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span 
          className="mono" 
          style={{ 
            fontSize: '9px', 
            fontWeight: 700, 
            letterSpacing: '0.1em',
            color: hovered ? 'var(--accent)' : 'var(--text-3)',
            padding: '2px 5px',
            borderRadius: '3px',
            backgroundColor: hovered ? 'var(--accent-muted)' : 'var(--bg-2)',
            border: `1px solid ${hovered ? 'var(--accent-border)' : 'var(--line)'}`
          }}
        >
          {index} // {category}
        </span>
        <span 
          style={{ 
            fontSize: '12px', 
            color: 'var(--accent)', 
            opacity: hovered ? 1 : 0, 
            transform: hovered ? 'translateX(0)' : 'translateX(-4px)',
            transition: 'all var(--duration-fast) var(--ease-spring)'
          }}
        >
          ↵
        </span>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>
        {title}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.45 }}>
        {prompt}
      </div>
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
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 180)}px`;
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

  const starters = [
    {
      index: '01',
      category: 'SYNTHESIZE',
      title: 'Synthesize Core Arguments',
      prompt: 'Extract the foundational premises, methodology, and primary conclusions across all active sources.'
    },
    {
      index: '02',
      category: 'DIALECTIC',
      title: 'Cross-Source Comparison',
      prompt: 'Identify points of agreement and tension between the methodologies and evidence presented.'
    },
    {
      index: '03',
      category: 'EXTRACTION',
      title: 'Formulate Executive Brief',
      prompt: 'Summarize actionable takeaways, key statistical metrics, and strategic implications.'
    },
    {
      index: '04',
      category: 'VERIFICATION',
      title: 'Evaluate Evidentiary Rigor',
      prompt: 'Scrutinize the cited evidence, empirical limitations, and unanswered questions in the text.'
    }
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
      {/* Background Cyber Grid */}
      <div className="cyber-grid" />

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 28px 20px',
        position: 'relative',
        zIndex: 1
      }}>
        {messages.length === 0 ? (
          <div style={{
            maxWidth: '740px',
            margin: '4vh auto 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Top Mission Control Telemetry Banner */}
            <div 
              style={{
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                boxShadow: 'var(--shadow-raised)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle accent glow line at top */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)'
              }} />

              {/* Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-online" style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: activeSources.length > 0 ? 'var(--accent)' : 'var(--signal)',
                    display: 'inline-block'
                  }} />
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-1)' }}>
                    {activeSources.length > 0 ? 'SYS.MISSION_CONTROL // ACTIVE' : 'SYS.STANDBY // ZERO_SOURCES'}
                  </span>
                </div>

                <span 
                  className="mono" 
                  style={{ 
                    fontSize: '10px', 
                    color: 'var(--accent)', 
                    backgroundColor: 'var(--accent-muted)', 
                    padding: '2px 8px', 
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--accent-border)'
                  }}
                >
                  STRICT RAG GROUNDED
                </span>
              </div>

              {/* Console Headline */}
              <h1 style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-1)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Interactive Research Synthesizer
              </h1>

              <p style={{
                fontSize: '13px',
                color: 'var(--text-2)',
                lineHeight: 1.5,
                maxWidth: '620px',
                marginBottom: '18px'
              }}>
                Every answer query runs through hybrid dense-vector & BM25Okapi retrieval.
                Facts are strictly attributed with verifiable inline citation tokens linked directly to your source chunks.
              </p>

              {/* Real Telemetry Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                    Active Ingested
                  </span>
                  <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>
                    {activeSources.length} {activeSources.length === 1 ? 'Document' : 'Documents'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                    Context Density
                  </span>
                  <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>
                    {effectiveTokens.toLocaleString()} Tokens
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                    Grounding Protocol
                  </span>
                  <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    Reciprocal Rank Fusion
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if no sources active */}
            {activeSources.length === 0 && (
              <div style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 51, 102, 0.08)',
                border: '1px solid rgba(255, 51, 102, 0.3)',
                color: 'var(--text-1)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertCircle size={18} color="var(--signal)" />
                <span>
                  No active documents selected. Toggle or ingest files in the Knowledge Sources ledger on the left to activate grounding.
                </span>
              </div>
            )}

            {/* Asymmetric Starter Modules */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <span className="mono" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                  QUICK TELEMETRY PROMPTS
                </span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                  Click to execute query
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                {starters.map((st) => (
                  <ResearchStarterCard
                    key={st.index}
                    index={st.index}
                    category={st.category}
                    title={st.title}
                    prompt={st.prompt}
                    onClick={() => onSendMessage(st.prompt)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            maxWidth: '740px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px'
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
                  /* User Turn: High-contrast terminal query card */
                  <div style={{
                    backgroundColor: 'var(--bg-1)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    position: 'relative'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={12} style={{ color: 'var(--accent)' }} />
                        <span className="mono" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)' }}>
                          USER // QUERY
                        </span>
                      </div>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: 'var(--text-1)',
                      lineHeight: 1.5
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant Turn: Precision synthesis pane */
                  <div style={{
                    backgroundColor: 'var(--bg-1)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 20px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* Header Strip */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--line)',
                      paddingBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent)',
                          boxShadow: '0 0 6px var(--accent)'
                        }} />
                        <span className="mono" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)' }}>
                          GROUNDED SYNTHESIS
                        </span>
                        {msg.citations && msg.citations.length > 0 && (
                          <span 
                            className="mono" 
                            style={{ 
                              fontSize: '9px', 
                              padding: '1px 5px', 
                              borderRadius: '3px', 
                              backgroundColor: 'var(--accent-muted)', 
                              color: 'var(--accent)', 
                              border: '1px solid var(--accent-border)' 
                            }}
                          >
                            {msg.citations.length} {msg.citations.length === 1 ? 'citation' : 'citations'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="mono"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: copiedId === msg.id ? 'var(--accent)' : 'var(--text-3)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--line)',
                            backgroundColor: 'var(--bg-2)'
                          }}
                        >
                          {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleSave(msg.id, msg.content)}
                          className="mono"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: savedId === msg.id ? 'var(--accent)' : 'var(--text-3)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--line)',
                            backgroundColor: 'var(--bg-2)'
                          }}
                        >
                          {savedId === msg.id ? <Check size={11} /> : <Bookmark size={11} />}
                          <span>{savedId === msg.id ? 'Saved' : 'Save Note'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Content Markdown */}
                    <div style={{
                      fontSize: '14.5px',
                      lineHeight: 1.65,
                      color: 'var(--text-1)'
                    }}>
                      <MarkdownRenderer content={msg.content} citations={msg.citations} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming State */}
            {isStreaming && (
              <div style={{
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--accent)'
                }} className="mono">
                  <span className="pulse-online" style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent)',
                    display: 'inline-block'
                  }} />
                  <span>Cross-referencing vector chunks and grounding citations...</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'var(--line)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: '40%',
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 0 10px var(--accent)'
                    }}
                    className="pulse-online"
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Precision Command Bar */}
      <div style={{
        padding: '14px 28px 18px',
        backgroundColor: 'var(--glass-bg)',
        borderTop: '1px solid var(--line)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{ maxWidth: '740px', margin: '0 auto' }}>
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: 'var(--bg-2)',
              border: isFocused ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: isFocused ? 'var(--shadow-raised), 0 0 16px var(--accent-glow)' : 'var(--shadow-sm)',
              transition: 'all var(--duration-fast) var(--ease-spring)',
              padding: '12px 16px 10px',
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
              placeholder="Ask questions across active sources, contrast findings, synthesize notes..."
              rows={1}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '180px',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: 'var(--text-1)',
                fontSize: '14px',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none'
              }}
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '4px',
              borderTop: '1px solid var(--line)'
            }}>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <CornerDownLeft size={10} /> Send: <strong style={{ color: 'var(--text-2)' }}>↵ Enter</strong>
                </span>
                <span>•</span>
                <span>Newline: <strong style={{ color: 'var(--text-2)' }}>Shift+Enter</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  className="mono" 
                  style={{ 
                    fontSize: '10px', 
                    color: activeSources.length > 0 ? 'var(--accent)' : 'var(--signal)',
                    backgroundColor: 'var(--bg-1)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--line)'
                  }}
                >
                  {activeSources.length} sources active
                </span>

                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isStreaming}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: inputQuery.trim() && !isStreaming ? 'var(--accent)' : 'var(--bg-3)',
                    color: inputQuery.trim() && !isStreaming ? 'var(--accent-text)' : 'var(--text-3)',
                    border: `1px solid ${inputQuery.trim() && !isStreaming ? 'var(--accent)' : 'var(--line)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputQuery.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                    boxShadow: inputQuery.trim() && !isStreaming ? 'var(--shadow-glow)' : 'none',
                    transition: 'all var(--duration-fast) var(--ease-spring)'
                  }}
                  aria-label="Send query"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
