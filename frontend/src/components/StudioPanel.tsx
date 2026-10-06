import React, { useState } from 'react';
import { StudioArtifact, Note } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { 
  Sparkles, 
  BookOpen, 
  FileCheck, 
  HelpCircle, 
  Clock, 
  FileEdit, 
  Plus, 
  Save, 
  Trash2, 
  Layers 
} from 'lucide-react';

interface StudioPanelProps {
  artifacts: StudioArtifact[];
  notes: Note[];
  onGenerateArtifact: (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => void;
  onSaveNote: (title: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSynthesizeNotes: (noteIds: string[]) => void;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({
  artifacts,
  notes,
  onGenerateArtifact,
  onSaveNote,
  onDeleteNote,
  onSynthesizeNotes
}) => {
  const [activeTab, setActiveTab] = useState<'studio' | 'notes'>('studio');
  const [noteTitle, setNoteTitle] = useState('Research Notes');
  const [noteContent, setNoteContent] = useState('');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<StudioArtifact | null>(null);

  const artifactButtons = [
    { type: 'study_guide' as const, label: 'Study Guide', icon: <BookOpen size={14} />, desc: 'Key concepts & practice quiz' },
    { type: 'briefing_doc' as const, label: 'Briefing Doc', icon: <FileCheck size={14} />, desc: 'Executive takeaways & risks' },
    { type: 'faq' as const, label: 'FAQ & Glossary', icon: <HelpCircle size={14} />, desc: 'Domain questions & definitions' },
    { type: 'timeline' as const, label: 'Timeline', icon: <Clock size={14} />, desc: 'Chronological event sequence' },
  ];

  const handleSaveCurrentNote = () => {
    if (!noteTitle.trim()) return;
    onSaveNote(noteTitle, noteContent);
  };

  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-subtle)'
    }}>
      {/* Tabs Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-app)',
        padding: '6px 8px'
      }}>
        <button
          onClick={() => setActiveTab('studio')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: activeTab === 'studio' ? 'var(--bg-panel)' : 'transparent',
            color: activeTab === 'studio' ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          <Sparkles size={14} color="var(--brand-primary)" />
          Studio
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          style={{
            flex: 1,
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: activeTab === 'notes' ? 'var(--bg-panel)' : 'transparent',
            color: activeTab === 'notes' ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
        >
          <FileEdit size={14} color="var(--accent-cyan)" />
          Notes ({notes.length})
        </button>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'studio' ? (
          <div>
            {/* Podcast Audio Overview Card */}
            <AudioPlayer />

            {/* Studio Generators Section */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Generative Studio Artifacts
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {artifactButtons.map((btn) => (
                <div
                  key={btn.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-panel-elevated)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: 'var(--brand-primary)' }}>
                      {btn.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {btn.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {btn.desc}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onGenerateArtifact(btn.type)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--brand-primary)',
                      border: '1px solid var(--border-focus)',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  >
                    Generate
                  </button>
                </div>
              ))}
            </div>

            {/* Existing Artifacts */}
            {artifacts.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Generated Artifacts
                </div>
                {artifacts.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setActiveArtifact(art)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{art.title}</span>
                    <span style={{ color: 'var(--text-muted)' }}>View ↗</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Active Scratchpad */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-panel-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    width: '70%'
                  }}
                  placeholder="Note Title"
                />
                <button
                  onClick={handleSaveCurrentNote}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#ffffff',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  <Save size={12} /> Save
                </button>
              </div>

              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Type research thoughts, citations, or scratch notes..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Saved Notes List */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Saved Notes
              </div>
              {selectedNoteIds.length >= 2 && (
                <button
                  onClick={() => onSynthesizeNotes(selectedNoteIds)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600
                  }}
                >
                  <Layers size={12} /> Synthesize ({selectedNoteIds.length})
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: selectedNoteIds.includes(note.id) ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-app)',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div 
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => {
                      setNoteTitle(note.title);
                      setNoteContent(note.content);
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{note.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {note.content || '(Empty note)'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedNoteIds.includes(note.id)} 
                      onChange={() => toggleSelectNote(note.id)}
                      title="Select for synthesis"
                      style={{ cursor: 'pointer' }}
                    />
                    <button 
                      onClick={() => onDeleteNote(note.id)} 
                      style={{ color: 'var(--text-muted)', padding: '2px' }}
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Artifact Modal Viewer */}
      {activeArtifact && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '640px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{activeArtifact.title}</h3>
              <button 
                onClick={() => setActiveArtifact(null)} 
                style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {activeArtifact.content_markdown || activeArtifact.content_json}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
