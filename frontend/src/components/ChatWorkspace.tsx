import React, { useState, useRef, useEffect } from 'react';
import { Message, Source, CitationItem } from '../types';
import { CitationPill } from './CitationPill';
import { Send, Sparkles, Copy, Bookmark, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface ChatWorkspaceProps {
  messages: Message[];
  activeSources: Source[];
  isStreaming: boolean;
  onSendMessage: (query: string) => void;
  onSaveToNote: (content: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  activeSources,
  isStreaming,
  onSendMessage,
  onSaveToNote
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isStreaming) return;
    onSendMessage(inputQuery.trim());
    setInputQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      backgroundColor: 'var(--bg-app)',
      position: 'relative'
    }}>
      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {messages.length === 0 ? (
          <div style={{
            maxWidth: '640px',
            margin: '60px auto 0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--brand-primary)'
            }}>
              <ShieldCheck size={28} />
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Grounded Notebook Workspace
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Ask questions directly against your uploaded sources. Every answer is strictly grounded with verifiable, page-level inline citations.
            </p>

            {activeSources.length === 0 ? (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--accent-amber)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <AlertCircle size={16} />
                No active sources selected. Enable or upload sources in the left panel to begin.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
                {starterPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(prompt)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-default)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-primary)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: msg.role === 'user' ? '80%' : '100%',
                  backgroundColor: msg.role === 'user' ? 'var(--brand-primary)' : 'var(--bg-panel)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '14px 18px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: '13.5px',
                  lineHeight: 1.6
                }}>
                  {renderMessageContent(msg.content, msg.citations)}
                </div>

                {/* Assistant Message Actions */}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginLeft: '4px' }}>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                      {copiedId === msg.id ? "Copied" : "Copy"}
                    </button>

                    <button
                      onClick={() => onSaveToNote(msg.content)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                      title="Save response to scratchpad notes"
                    >
                      <Bookmark size={12} /> Save to Note
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--brand-primary)',
                fontSize: '12px'
              }}>
                <Sparkles size={14} className="spin-slow" />
                Thinking & verifying grounded citations...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar Area */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-panel)'
      }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
            <textarea
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the active sources (Press Enter to send)..."
              rows={2}
              style={{
                width: '100%',
                padding: '12px 50px 12px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            />

            <div style={{
              position: 'absolute',
              right: '10px',
              bottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <button
                type="submit"
                disabled={!inputQuery.trim() || isStreaming}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: inputQuery.trim() && !isStreaming ? 'var(--brand-primary)' : 'var(--bg-hover)',
                  color: inputQuery.trim() && !isStreaming ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputQuery.trim() && !isStreaming ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: activeSources.length > 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)'
              }} />
              <span>{activeSources.length} sources active in retrieval context</span>
            </div>
            <span>Strict grounding active • No unverified claims</span>
          </div>
        </div>
      </div>
    </div>
  );
};
