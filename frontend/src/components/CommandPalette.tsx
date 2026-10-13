import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  BookOpen, 
  Upload, 
  FileText, 
  Sparkles, 
  Download, 
  Settings, 
  Sun, 
  Moon, 
  Headphones, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { Notebook } from '../types';

export interface CommandAction {
  id: string;
  category: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  activeNotebook: Notebook;
  onSelectNotebook: (nb: Notebook) => void;
  onCreateNotebook: () => void;
  onUploadFile: () => void;
  onPasteText: () => void;
  onGenerateArtifact: (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => void;
  onGenerateAudio: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notebooks,
  activeNotebook,
  onSelectNotebook,
  onCreateNotebook,
  onUploadFile,
  onPasteText,
  onGenerateArtifact,
  onGenerateAudio,
  onExport,
  onOpenSettings,
  onToggleTheme,
  theme
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseActions: CommandAction[] = [
    {
      id: 'upload',
      category: 'Sources',
      label: 'Upload Document (PDF, MD, DOCX, TXT)',
      shortcut: '⌘U',
      icon: <Upload size={14} />,
      perform: () => { onClose(); onUploadFile(); }
    },
    {
      id: 'paste',
      category: 'Sources',
      label: 'Paste Raw Text Snippet',
      icon: <FileText size={14} />,
      perform: () => { onClose(); onPasteText(); }
    },
    {
      id: 'audio',
      category: 'Generative Studio',
      label: 'Generate Two-Host Audio Overview (Podcast)',
      icon: <Headphones size={14} />,
      perform: () => { onClose(); onGenerateAudio(); }
    },
    {
      id: 'study-guide',
      category: 'Generative Studio',
      label: 'Generate Comprehensive Study Guide',
      icon: <Sparkles size={14} />,
      perform: () => { onClose(); onGenerateArtifact('study_guide'); }
    },
    {
      id: 'briefing-doc',
      category: 'Generative Studio',
      label: 'Generate Executive Briefing Document',
      icon: <FileText size={14} />,
      perform: () => { onClose(); onGenerateArtifact('briefing_doc'); }
    },
    {
      id: 'faq',
      category: 'Generative Studio',
      label: 'Generate Technical FAQ & Glossary',
      icon: <Layers size={14} />,
      perform: () => { onClose(); onGenerateArtifact('faq'); }
    },
    {
      id: 'export',
      category: 'Workspace',
      label: 'Export Complete Notebook Archive (.ZIP)',
      shortcut: '⌘E',
      icon: <Download size={14} />,
      perform: () => { onClose(); onExport(); }
    },
    {
      id: 'theme',
      category: 'Preferences',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
      perform: () => { onClose(); onToggleTheme(); }
    },
    {
      id: 'settings',
      category: 'Preferences',
      label: 'Configure AI Models & API Keys',
      shortcut: '⌘,',
      icon: <Settings size={14} />,
      perform: () => { onClose(); onOpenSettings(); }
    },
    {
      id: 'create-nb',
      category: 'Notebooks',
      label: 'Create New Research Workspace...',
      shortcut: '⌘N',
      icon: <BookOpen size={14} />,
      perform: () => { onClose(); onCreateNotebook(); }
    }
  ];

  // Include notebook switches
  const notebookActions: CommandAction[] = notebooks
    .filter(nb => nb.id !== activeNotebook.id)
    .map(nb => ({
      id: `nb-${nb.id}`,
      category: 'Switch Workspace',
      label: `Switch to "${nb.title}"`,
      icon: <BookOpen size={14} />,
      perform: () => { onClose(); onSelectNotebook(nb); }
    }));

  const allActions = [...baseActions, ...notebookActions];
  const filteredActions = query.trim()
    ? allActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : allActions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 6, 9, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
        zIndex: 5000
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-2)'
        }}>
          <Search size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              fontSize: '14px',
              color: 'var(--text-1)',
              outline: 'none'
            }}
          />
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            ESC
          </span>
        </div>

        {/* Action Items List */}
        <div style={{
          maxHeight: '360px',
          overflowY: 'auto',
          padding: '6px'
        }}>
          {filteredActions.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              No matching commands found.
            </div>
          ) : (
            filteredActions.map((action, i) => {
              const isSelected = i === selectedIndex;
              return (
                <button
                  key={action.id}
                  onClick={action.perform}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                    border: isSelected ? '1px solid var(--line-strong)' : '1px solid transparent',
                    color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) var(--ease-out)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-3)' }}>
                      {action.icon}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {action.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                      {action.category}
                    </span>
                    {action.shortcut && (
                      <span className="mono" style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-2)' }}>
                        {action.shortcut}
                      </span>
                    )}
                    {isSelected && <ArrowRight size={12} color="var(--accent)" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--line)',
          backgroundColor: 'var(--bg-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-3)'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><strong style={{ color: 'var(--text-2)' }}>↑↓</strong> Navigate</span>
            <span><strong style={{ color: 'var(--text-2)' }}>↵</strong> Execute</span>
          </div>
          <div className="mono">NotebookLM-lite Cyber Console</div>
        </div>
      </div>
    </div>
  );
};
