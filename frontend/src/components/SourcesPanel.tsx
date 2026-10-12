import React, { useState } from 'react';
import { Source, ChunkItem } from '../types';
import { ArrowUpRight, FileEdit, Trash2, FileText, FileCode, Search, Copy, Check, X, Layers } from 'lucide-react';

interface SourcesPanelProps {
  sources: Source[];
  activeNotebookId?: string;
  onToggleSource: (sourceId: string, currentActive: boolean) => void;
  onDeleteSource: (sourceId: string) => void;
  onAddSource: (file: File) => void;
  onPasteText: (title: string, content: string) => void;
  totalTokens?: number;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  activeNotebookId,
  onToggleSource,
  onDeleteSource,
  onAddSource,
  onPasteText,
  totalTokens = 0
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

  // Source Inspector State
  const [inspectingSource, setInspectingSource] = useState<Source | null>(null);
  const [inspectChunks, setInspectChunks] = useState<ChunkItem[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkFilter, setChunkFilter] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  const handleInspectSource = async (src: Source) => {
    setInspectingSource(src);
    setLoadingChunks(true);
    setChunkFilter('');
    try {
      const nbId = activeNotebookId || src.notebook_id;
      const res = await fetch(`/api/notebooks/${nbId}/sources/${src.id}/chunks`);
      if (res.ok) {
        const data = await res.json();
        setInspectChunks(data);
      } else {
        setInspectChunks([]);
      }
    } catch (err) {
      console.error("Failed to fetch chunks:", err);
      setInspectChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleCopyAllText = () => {
    const fullText = inspectChunks.map(c => `[Page ${c.page_number} | ${c.section_title || 'General'}]\n${c.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const activeCount = sources.filter(s => s.is_active).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddSource(e.target.files[0]);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim() || !pasteContent.trim()) return;
    onPasteText(pasteTitle, pasteContent);
    setPasteTitle('');
    setPasteContent('');
    setShowPasteModal(false);
  };

  const truncateMiddle = (name: string, maxLen: number = 22): string => {
    if (name.length <= maxLen) return name;
    const dotIdx = name.lastIndexOf('.');
    const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
    const base = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
    const avail = maxLen - ext.length - 1; // 1 for ellipsis
    if (avail <= 4) return name.slice(0, maxLen - 1) + '…';
    const frontChars = Math.ceil(avail / 2);
    const backChars = Math.floor(avail / 2);
    return `${base.slice(0, frontChars)}…${base.slice(-backChars)}${ext}`;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onAddSource(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-1)',
        position: 'relative',
        userSelect: 'none'
      }}
    >
      {/* Drag Over Overlay */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          inset: '8px',
          border: '2px dashed var(--accent)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(214, 255, 63, 0.08)',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.05em'
        }}>
          Drop to add source
        </div>
      )}

      {/* Header (No Card, Hairline Separator) */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 className="serif" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-1)', lineHeight: 1 }}>
            Sources
          </h2>
          <div className="mono" style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>
            {activeCount}/{sources.length} in context
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Upload Button: Sole accent-filled button here */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform var(--duration-fast) var(--ease-out)'
            }}
            title="Upload PDF, Markdown, DOCX, or text file"
          >
            <span>Upload</span>
            <ArrowUpRight size={13} style={{ transition: 'transform var(--duration-fast) var(--ease-out)' }} />
            <input type="file" onChange={handleFileUpload} accept=".pdf,.md,.txt,.docx" style={{ display: 'none' }} />
          </label>

          {/* Secondary Ghost Button: Paste text snippet */}
          <button
            onClick={() => setShowPasteModal(true)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              transition: 'color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out)'
            }}
            title="Paste text snippet"
            aria-label="Paste text snippet"
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-1)';
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <FileEdit size={14} />
          </button>
        </div>
      </div>

      {/* Sources List: Ledger rows with hairline separators */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sources.length === 0 ? (
          <div style={{
            padding: '36px 20px',
            color: 'var(--text-3)',
            fontSize: '13px',
            lineHeight: 1.5
          }}>
            <p>No documents uploaded.</p>
            <p style={{ marginTop: '6px', fontSize: '12px' }}>Upload a file or paste text to ground your research.</p>
          </div>
        ) : (
          sources.map((source) => {
            const isHovered = hoveredSourceId === source.id;
            const tokenShare = totalTokens > 0 ? Math.min(100, Math.round(((source.token_count || 0) / totalTokens) * 100)) : 0;

            return (
              <div
                key={source.id}
                onMouseEnter={() => setHoveredSourceId(source.id)}
                onMouseLeave={() => setHoveredSourceId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--line)',
                  opacity: source.is_active ? 1 : 0.5,
                  transition: 'opacity var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out)',
                  backgroundColor: isHovered ? 'var(--bg-hover)' : 'transparent'
                }}
              >
                {/* Left: Custom Checkbox + Filename + Token Bar */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => onToggleSource(source.id, source.is_active)}
                >
                  {/* Custom Square Checkbox */}
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block' }}>
                      <rect
                        x="0.5" y="0.5" width="13" height="13" rx="2"
                        stroke={source.is_active ? "var(--accent)" : "var(--line-strong)"}
                        fill={source.is_active ? "var(--accent)" : "transparent"}
                        strokeWidth="1"
                      />
                      {source.is_active && (
                        <path
                          d="M3.5 7L5.5 9.5L10.5 4.5"
                          stroke="var(--accent-text)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Filename in mono with middle-ellipsis */}
                    <div
                      className="mono"
                      title={source.filename}
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-1)',
                        lineHeight: 1.3
                      }}
                    >
                      {truncateMiddle(source.filename, 22)}
                    </div>

                    {/* Metadata & Token Share Bar */}
                    <div style={{ marginTop: '6px' }}>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {source.token_count > 0 ? `${source.token_count.toLocaleString()} tokens` : `${Math.round(source.file_size / 1024)} KB`}
                      </div>

                      {/* 2px Token Share Bar */}
                      <div style={{ width: '100%', height: '2px', backgroundColor: 'var(--line)', marginTop: '4px', borderRadius: '1px', overflow: 'hidden' }}>
                        <div style={{ width: `${tokenShare}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width var(--duration-fast) var(--ease-out)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  {/* Inspect Chunks Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspectSource(source);
                    }}
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
                      color: 'var(--text-3)',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Inspect chunks and text"
                    aria-label={`Inspect ${source.filename}`}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}
                  >
                    <FileText size={13} />
                  </button>

                  {/* Delete Button (hover/focus only, signal color on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSource(source.id);
                    }}
                    style={{
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)',
                      color: 'var(--text-3)',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Remove source"
                    aria-label={`Remove source ${source.filename}`}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--signal)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paste Modal (Editorial Research Desk Styled) */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(12, 12, 11, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            width: '460px',
            padding: '24px',
            boxShadow: 'var(--shadow-raised)'
          }}>
            <h3 className="serif" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-1)', marginBottom: '16px' }}>
              Paste Source Text
            </h3>
            <form onSubmit={handlePasteSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label className="mono" style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={e => setPasteTitle(e.target.value)}
                  placeholder="e.g. Field Notes / Reference Outline"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-1)'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="mono" style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Content
                </label>
                <textarea
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                  rows={8}
                  placeholder="Paste text snippet or raw markdown..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-1)',
                    resize: 'vertical',
                    fontFamily: 'var(--font-mono)'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-2)',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Source Inspector Modal */}
      {inspectingSource && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(12, 12, 11, 0.78)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            width: '680px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-raised)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(214, 255, 63, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid var(--line)',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  {inspectingSource.file_type || 'SOURCE'}
                </span>
                <h3
                  className="serif"
                  style={{
                    fontSize: '18px',
                    fontWeight: 400,
                    color: 'var(--text-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={inspectingSource.filename}
                >
                  {inspectingSource.filename}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleCopyAllText}
                  disabled={loadingChunks || inspectChunks.length === 0}
                  className="mono"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    color: copiedAll ? 'var(--accent)' : 'var(--text-2)',
                    backgroundColor: 'transparent'
                  }}
                  title="Copy complete extracted text"
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
                </button>
                <button
                  onClick={() => setInspectingSource(null)}
                  style={{ color: 'var(--text-3)', padding: '4px' }}
                  aria-label="Close Inspector"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sub-bar: stats and search */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'var(--bg-1)'
            }}>
              <div className="mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {loadingChunks ? 'Loading chunks...' : `${inspectChunks.length} chunks • ${inspectingSource.token_count.toLocaleString()} tokens`}
              </div>

              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input
                  type="text"
                  placeholder="Filter chunks..."
                  value={chunkFilter}
                  onChange={e => setChunkFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px 4px 28px',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-1)'
                  }}
                />
              </div>
            </div>

            {/* Chunks List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {loadingChunks ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }} className="mono">
                  Extracting indexed chunks from vector store...
                </div>
              ) : inspectChunks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }} className="mono">
                  No chunks indexed for this source.
                </div>
              ) : (
                inspectChunks
                  .filter(c => !chunkFilter || c.content.toLowerCase().includes(chunkFilter.toLowerCase()) || (c.section_title && c.section_title.toLowerCase().includes(chunkFilter.toLowerCase())))
                  .map((chunk, idx) => (
                    <div
                      key={chunk.id || idx}
                      style={{
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)', backgroundColor: 'rgba(214, 255, 63, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            p. {chunk.page_number}
                          </span>
                          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                            {chunk.section_title || `Chunk ${idx + 1}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                            [{chunk.char_start}..{chunk.char_end}]
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(chunk.content);
                              setCopiedChunkId(chunk.id || String(idx));
                              setTimeout(() => setCopiedChunkId(null), 1500);
                            }}
                            style={{ color: copiedChunkId === (chunk.id || String(idx)) ? 'var(--accent)' : 'var(--text-3)', padding: '2px' }}
                            title="Copy chunk"
                          >
                            {copiedChunkId === (chunk.id || String(idx)) ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <p style={{
                        fontSize: '13px',
                        lineHeight: 1.55,
                        color: 'var(--text-1)',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-ui)'
                      }}>
                        {chunk.content}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
