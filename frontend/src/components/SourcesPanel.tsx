import React, { useState } from 'react';
import { Source } from '../types';
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  FileCode, 
  Files,
  FileCheck2,
  FileEdit
} from 'lucide-react';

interface SourcesPanelProps {
  sources: Source[];
  onToggleSource: (sourceId: string, currentActive: boolean) => void;
  onDeleteSource: (sourceId: string) => void;
  onAddSource: (file: File) => void;
  onPasteText: (title: string, content: string) => void;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  onToggleSource,
  onDeleteSource,
  onAddSource,
  onPasteText
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');

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

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText size={16} color="#ef4444" />;
      case 'md':
      case 'markdown':
        return <FileCode size={16} color="#06b6d4" />;
      default:
        return <FileText size={16} color="#6366f1" />;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-subtle)',
      userSelect: 'none'
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Sources</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {activeCount} of {sources.length} active in search
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--brand-primary)',
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            <Upload size={13} />
            Upload
            <input type="file" onChange={handleFileUpload} accept=".pdf,.md,.txt,.docx" style={{ display: 'none' }} />
          </label>

          <button
            onClick={() => setShowPasteModal(true)}
            style={{
              padding: '5px 8px',
              backgroundColor: 'var(--bg-hover)',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
            title="Paste text note"
          >
            <FileEdit size={13} />
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {sources.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: 'var(--text-muted)',
            fontSize: '12px'
          }}>
            <Files size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>No sources added yet.</div>
            <div style={{ marginTop: '4px', fontSize: '11px' }}>Upload a PDF, Markdown, or text file to begin grounded research.</div>
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '8px',
                marginBottom: '6px',
                backgroundColor: source.is_active ? 'var(--bg-panel-elevated)' : 'transparent',
                border: '1px solid',
                borderColor: source.is_active ? 'var(--border-default)' : 'transparent',
                opacity: source.is_active ? 1 : 0.6,
                transition: 'all 0.15s ease'
              }}
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                onClick={() => onToggleSource(source.id, source.is_active)}
              >
                {source.is_active ? (
                  <CheckSquare size={16} color="var(--brand-primary)" />
                ) : (
                  <Square size={16} color="var(--text-muted)" />
                )}

                <div style={{ flexShrink: 0 }}>
                  {getSourceIcon(source.file_type)}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {source.filename}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {source.token_count > 0 ? `${source.token_count} tokens` : `${Math.round(source.file_size / 1024)} KB`}
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSource(source.id);
                }}
                style={{
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '4px'
                }}
                title="Remove source"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '420px',
            padding: '20px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Paste Custom Source</h3>
            <form onSubmit={handlePasteSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Title</label>
                <input 
                  type="text" 
                  value={pasteTitle} 
                  onChange={e => setPasteTitle(e.target.value)} 
                  placeholder="e.g. Lecture Notes / Research Findings"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Text Content</label>
                <textarea 
                  value={pasteContent} 
                  onChange={e => setPasteContent(e.target.value)} 
                  rows={8}
                  placeholder="Paste raw markdown or text here..."
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  style={{ padding: '6px 12px', borderRadius: '6px', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontWeight: 500
                  }}
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
