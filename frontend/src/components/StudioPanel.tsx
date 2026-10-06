import React, { useState } from 'react';
import { StudioArtifact, Note } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { 
  Plus, 
  Trash2, 
  Layers, 
  ArrowUpRight, 
  Check, 
  X,
  FileText
} from 'lucide-react';

interface StudioPanelProps {
  artifacts: StudioArtifact[];
  notes: Note[];
  onGenerateArtifact: (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => void;
  onSaveNote: (title: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSynthesizeNotes: (noteIds: string[]) => void;
}

// Custom editorial vector icons for the 4 generators
const StudyGuideIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="14" y2="10" />
  </svg>
);

const BriefingDocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FaqIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const TimelineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

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
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const generatorTiles = [
    {
      type: 'study_guide' as const,
      label: 'Study Guide',
      icon: <StudyGuideIcon />,
      desc: 'Key concepts & practice quiz',
      tag: 'GUIDE'
    },
    {
      type: 'briefing_doc' as const,
      label: 'Briefing Doc',
      icon: <BriefingDocIcon />,
      desc: 'Executive takeaways & risks',
      tag: 'BRIEF'
    },
    {
      type: 'faq' as const,
      label: 'FAQ & Glossary',
      icon: <FaqIcon />,
      desc: 'Domain questions & definitions',
      tag: 'FAQ'
    },
    {
      type: 'timeline' as const,
      label: 'Timeline',
      icon: <TimelineIcon />,
      desc: 'Chronological event sequence',
      tag: 'TIMELINE'
    },
  ];

  const handleTileClick = (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => {
    setGeneratingType(type);
    onGenerateArtifact(type);
    setTimeout(() => setGeneratingType(null), 1500);
  };

  const handleSaveCurrentNote = () => {
    if (!noteTitle.trim()) return;
    onSaveNote(noteTitle, noteContent);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getTagFromType = (type?: string) => {
    switch (type) {
      case 'study_guide': return 'GUIDE';
      case 'briefing_doc': return 'BRIEF';
      case 'faq': return 'FAQ';
      case 'timeline': return 'TIMELINE';
      default: return 'DOC';
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-0)',
      position: 'relative'
    }}>
      {/* Editorial Text Tabs Header */}
      <div 
        role="tablist"
        aria-label="Studio Modes"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-0)',
          padding: '0 16px'
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'studio'}
          onClick={() => setActiveTab('studio')}
          style={{
            padding: '14px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            fontWeight: activeTab === 'studio' ? 600 : 400,
            color: activeTab === 'studio' ? 'var(--text-1)' : 'var(--text-3)',
            borderBottom: activeTab === 'studio' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            transition: 'all var(--duration-fast) var(--ease-out)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          STUDIO
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
          style={{
            padding: '14px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            fontWeight: activeTab === 'notes' ? 600 : 400,
            color: activeTab === 'notes' ? 'var(--text-1)' : 'var(--text-3)',
            borderBottom: activeTab === 'notes' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-1px',
            cursor: 'pointer',
            transition: 'all var(--duration-fast) var(--ease-out)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          NOTES
          <span
            className="mono"
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '3px',
              backgroundColor: activeTab === 'notes' ? 'var(--bg-1)' : 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--text-2)'
            }}
          >
            {notes.length.toString().padStart(2, '0')}
          </span>
        </button>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'studio' ? (
          <div>
            {/* Podcast Audio Overview Card - Raised Surface */}
            <AudioPlayer />

            {/* Studio Generators Section */}
            <div
              className="mono"
              style={{
                fontSize: '11px',
                letterSpacing: '0.12em',
                color: 'var(--text-3)',
                marginBottom: '12px',
                textTransform: 'uppercase'
              }}
            >
              STUDIO / GENERATE
            </div>

            {/* 2x2 Grid where EACH TILE IS THE BUTTON */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '24px'
            }}>
              {generatorTiles.map((tile) => {
                const isThisGenerating = generatingType === tile.type;
                return (
                  <button
                    key={tile.type}
                    onClick={() => handleTileClick(tile.type)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-0)',
                      border: isThisGenerating ? '1px solid var(--accent)' : '1px solid var(--line)',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all var(--duration-fast) var(--ease-out)'
                    }}
                    onMouseEnter={e => {
                      if (!isThisGenerating) {
                        e.currentTarget.style.borderColor = 'var(--line-strong)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isThisGenerating) {
                        e.currentTarget.style.borderColor = 'var(--line)';
                        e.currentTarget.style.backgroundColor = 'var(--bg-0)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* State sweep line during generation */}
                    {isThisGenerating && (
                      <div
                        className="shimmer-bar"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'var(--accent)'
                        }}
                      />
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: 'var(--text-2)'
                    }}>
                      <div>{tile.icon}</div>
                      <span
                        className="mono"
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          color: 'var(--text-3)',
                          padding: '1px 4px',
                          border: '1px solid var(--line)',
                          borderRadius: '2px'
                        }}
                      >
                        {tile.tag}
                      </span>
                    </div>

                    <div>
                      <div
                        className="serif"
                        style={{
                          fontSize: '15px',
                          fontWeight: 400,
                          color: 'var(--text-1)',
                          lineHeight: 1.25,
                          marginBottom: '4px'
                        }}
                      >
                        {tile.label}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        lineHeight: 1.35
                      }}>
                        {tile.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Existing Generated Artifacts Ledger */}
            {artifacts.length > 0 && (
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    color: 'var(--text-3)',
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}
                >
                  GENERATED ARTIFACTS ({artifacts.length})
                </div>

                <div style={{ borderTop: '1px solid var(--line)' }}>
                  {artifacts.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => setActiveArtifact(art)}
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid var(--line)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'background-color var(--duration-fast) var(--ease-out)'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-1)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span
                          className="mono"
                          style={{
                            fontSize: '9px',
                            letterSpacing: '0.08em',
                            padding: '1px 5px',
                            border: '1px solid var(--line-strong)',
                            borderRadius: '2px',
                            color: 'var(--text-2)',
                            flexShrink: 0
                          }}
                        >
                          {getTagFromType(art.artifact_type)}
                        </span>
                        <span style={{
                          fontSize: '13px',
                          color: 'var(--text-1)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {art.title}
                        </span>
                      </div>

                      <span
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          flexShrink: 0
                        }}
                      >
                        View <ArrowUpRight size={12} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Notes Tab */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Active Scratchpad */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '8px'
              }}>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontSize: '17px',
                    color: 'var(--text-1)',
                    width: '75%',
                    outline: 'none'
                  }}
                  placeholder="Note Title..."
                />

                <button
                  onClick={handleSaveCurrentNote}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: savedSuccess ? 'var(--accent)' : 'var(--bg-2)',
                    color: savedSuccess ? 'var(--ink)' : 'var(--text-1)',
                    border: '1px solid var(--line-strong)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) var(--ease-out)',
                    fontWeight: 500
                  }}
                >
                  {savedSuccess ? <Check size={12} /> : <Plus size={12} />}
                  <span>{savedSuccess ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Type research thoughts, citations, or scratch notes..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  lineHeight: 1.6,
                  color: 'var(--text-1)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Saved Notes Header & Synthesis Action */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase'
                }}
              >
                SAVED NOTES ({notes.length})
              </div>

              {selectedNoteIds.length >= 2 && (
                <button
                  onClick={() => onSynthesizeNotes(selectedNoteIds)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--ink)',
                    backgroundColor: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Layers size={12} /> Synthesize ({selectedNoteIds.length}) →
                </button>
              )}
            </div>

            {/* Saved Notes Ledger */}
            {notes.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: '13px'
              }}>
                No notes saved yet. Capture thoughts or click "Save to Note" in chat answers.
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--line)', flex: 1, overflowY: 'auto' }}>
                {notes.map((note) => {
                  const isSelected = selectedNoteIds.includes(note.id);
                  return (
                    <div
                      key={note.id}
                      style={{
                        padding: '10px 8px',
                        borderBottom: '1px solid var(--line)',
                        backgroundColor: isSelected ? 'var(--bg-1)' : 'transparent',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'background-color var(--duration-fast) var(--ease-out)'
                      }}
                    >
                      {/* Custom Square Checkbox */}
                      <button
                        onClick={() => toggleSelectNote(note.id)}
                        aria-label="Select note for synthesis"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line-strong)',
                          backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                          color: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          flexShrink: 0,
                          cursor: 'pointer',
                          transition: 'all var(--duration-fast) var(--ease-out)'
                        }}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </button>

                      {/* Note Content preview */}
                      <div
                        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                        onClick={() => {
                          setNoteTitle(note.title);
                          setNoteContent(note.content);
                        }}
                      >
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-1)',
                          marginBottom: '2px'
                        }}>
                          {note.title}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {note.content || '(Empty note)'}
                        </div>
                      </div>

                      {/* Delete Action: Turns signal on hover */}
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        aria-label="Delete note"
                        style={{
                          color: 'var(--text-3)',
                          padding: '3px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          transition: 'color var(--duration-fast) var(--ease-out)'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--signal)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                        title="Delete note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Artifact Modal Viewer - Editorial Manuscript Inspection */}
      {activeArtifact && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            width: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-overlay)'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.12em',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  {getTagFromType(activeArtifact.artifact_type)}
                </span>
                <h3
                  className="serif"
                  style={{
                    fontSize: '22px',
                    fontWeight: 400,
                    color: 'var(--text-1)'
                  }}
                >
                  {activeArtifact.title}
                </h3>
              </div>

              <button 
                onClick={() => setActiveArtifact(null)} 
                aria-label="Close manuscript modal"
                style={{
                  color: 'var(--text-3)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--text-2)',
              fontFamily: 'var(--font-ui)'
            }}>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                margin: 0
              }}>
                {activeArtifact.content_markdown || activeArtifact.content_json}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
