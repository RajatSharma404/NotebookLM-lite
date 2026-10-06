import React, { useState, useEffect } from 'react';
import { Notebook, Source, Message, Note, StudioArtifact } from './types';
import { SourcesPanel } from './components/SourcesPanel';
import { ChatWorkspace } from './components/ChatWorkspace';
import { StudioPanel } from './components/StudioPanel';
import { 
  BookMarked, 
  Moon, 
  Sun, 
  ChevronLeft, 
  ChevronRight, 
  Cpu, 
  Sparkles,
  FolderOpen
} from 'lucide-react';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState('Gemini 1.5 Flash');

  // Active Notebook State
  const [activeNotebook, setActiveNotebook] = useState<Notebook>({
    id: 'nb_default',
    title: 'Research Workspace',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_count: 2,
    note_count: 1
  });

  // Sources State (initialized with sample demonstrative sources)
  const [sources, setSources] = useState<Source[]>([
    {
      id: 'src_1',
      notebook_id: 'nb_default',
      filename: 'Attention_Is_All_You_Need.pdf',
      file_type: 'pdf',
      file_size: 2200000,
      token_count: 5400,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'src_2',
      notebook_id: 'nb_default',
      filename: 'Transformer_Architecture_Notes.md',
      file_type: 'md',
      file_size: 14500,
      token_count: 1850,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);

  // Messages State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_1',
      role: 'user',
      content: 'How does multi-head attention improve representation learning over single attention?',
      created_at: new Date().toISOString(),
      citations: []
    },
    {
      id: 'msg_2',
      role: 'assistant',
      content: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions [1]. With a single attention head, averaging inhibits this capability [1]. Instead, multi-head attention projects queries, keys, and values $h$ times with learned linear projections [2], allowing the model to simultaneously capture different semantic relationships.',
      created_at: new Date().toISOString(),
      citations: [
        {
          index: 1,
          source_title: 'Attention_Is_All_You_Need.pdf',
          page_number: 4,
          snippet: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.'
        },
        {
          index: 2,
          source_title: 'Transformer_Architecture_Notes.md',
          page_number: 1,
          snippet: 'Instead of performing a single attention function, we found it beneficial to linearly project the queries, keys and values h times with different learned linear projections.'
        }
      ]
    }
  ]);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 'note_1',
      notebook_id: 'nb_default',
      title: 'Attention Mechanism Takeaways',
      content: 'Key idea: Scaled dot-product attention computes softmax(QK^T / sqrt(d_k))V. Multi-head attention projects vectors into multiple subspaces.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);

  // Studio Artifacts State
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Toggle Dark / Light Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Source Actions
  const handleToggleSource = (sourceId: string, currentActive: boolean) => {
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, is_active: !currentActive } : s));
  };

  const handleDeleteSource = (sourceId: string) => {
    setSources(prev => prev.filter(s => s.id !== sourceId));
  };

  const handleAddSource = (file: File) => {
    const ext = file.name.split('.').pop() || 'txt';
    const newSrc: Source = {
      id: `src_${Date.now()}`,
      notebook_id: activeNotebook.id,
      filename: file.name,
      file_type: ext,
      file_size: file.size,
      token_count: Math.round(file.size / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    setSources(prev => [newSrc, ...prev]);
  };

  const handlePasteText = (title: string, content: string) => {
    const newSrc: Source = {
      id: `src_${Date.now()}`,
      notebook_id: activeNotebook.id,
      filename: `${title}.txt`,
      file_type: 'txt',
      file_size: content.length,
      token_count: Math.round(content.length / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    setSources(prev => [newSrc, ...prev]);
  };

  // Chat Actions
  const handleSendMessage = (query: string) => {
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
      citations: []
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Mock grounded generation with citation resolution
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `Based on the active documents in "${activeNotebook.title}", the core insight indicates that self-attention mechanisms replace recurrent layers to achieve significantly faster parallel training [1]. The scaled dot-product factor $1/\\sqrt{d_k}$ prevents gradients from vanishing in large dimension spaces [2].`,
        created_at: new Date().toISOString(),
        citations: [
          {
            index: 1,
            source_title: 'Attention_Is_All_You_Need.pdf',
            page_number: 2,
            snippet: 'Self-attention allows the model to link distant tokens without sequential unrolling.'
          },
          {
            index: 2,
            source_title: 'Transformer_Architecture_Notes.md',
            page_number: 1,
            snippet: 'We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients.'
          }
        ]
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsStreaming(false);
    }, 1200);
  };

  // Note Actions
  const handleSaveNote = (title: string, content: string) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      notebook_id: activeNotebook.id,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleSaveToNote = (content: string) => {
    handleSaveNote("Saved Insight", content);
  };

  const handleSynthesizeNotes = (noteIds: string[]) => {
    const selected = notes.filter(n => noteIds.includes(n.id));
    const mergedContent = selected.map(n => `### ${n.title}\n${n.content}`).join('\n\n---\n\n');
    handleSaveNote("Synthesized Research Summary", mergedContent);
  };

  // Studio Artifact Actions
  const handleGenerateArtifact = (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => {
    const titleMap = {
      study_guide: 'Comprehensive Study Guide & Quiz',
      briefing_doc: 'Executive Briefing Document',
      faq: 'Domain FAQ & Key Glossary',
      timeline: 'Chronological Milestones & Timeline'
    };

    const newArtifact: StudioArtifact = {
      id: `art_${Date.now()}`,
      notebook_id: activeNotebook.id,
      artifact_type: type,
      title: titleMap[type],
      content_markdown: `# ${titleMap[type]}\n\nGenerated from active notebook documents.\n\n### 1. Core Summary\nThis document synthesizes key architectural principles extracted from the provided sources.\n\n### 2. Verified Insights\n- Grounded attribution confirms transformer scalability.\n- Multi-head projections decouple feature spaces.`,
      created_at: new Date().toISOString()
    };
    setArtifacts(prev => [newArtifact, ...prev]);
  };

  const activeSources = sources.filter(s => s.is_active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Navigation Bar */}
      <header style={{
        height: '52px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100
      }}>
        {/* Brand & Notebook Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <BookMarked size={16} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
              NotebookLM<span style={{ color: 'var(--brand-primary)', fontWeight: 400, marginLeft: '3px' }}>lite</span>
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-panel-elevated)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-default)',
            fontSize: '12px'
          }}>
            <FolderOpen size={13} color="var(--brand-primary)" />
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{activeNotebook.title}</span>
          </div>
        </div>

        {/* Model Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Model Provider Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '12px'
          }}>
            <Cpu size={13} color="var(--accent-cyan)" />
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="Gemini 1.5 Flash">Gemini 1.5 Flash</option>
              <option value="GPT-4o-mini">GPT-4o-mini</option>
              <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
              <option value="Ollama (Local Llama 3.2)">Ollama (Local Llama 3.2)</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-panel-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)'
            }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main 3-Column Content Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left Sources Column */}
        <div style={{
          width: leftOpen ? '300px' : '0px',
          minWidth: leftOpen ? '300px' : '0px',
          height: '100%',
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        }}>
          <SourcesPanel
            sources={sources}
            onToggleSource={handleToggleSource}
            onDeleteSource={handleDeleteSource}
            onAddSource={handleAddSource}
            onPasteText={handlePasteText}
          />
        </div>

        {/* Left Toggle Button */}
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          style={{
            position: 'absolute',
            left: leftOpen ? '292px' : '8px',
            top: '12px',
            zIndex: 50,
            width: '20px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left 0.25s ease'
          }}
          title={leftOpen ? "Collapse Sources" : "Expand Sources"}
        >
          {leftOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Center Grounded Workspace */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <ChatWorkspace
            messages={messages}
            activeSources={activeSources}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onSaveToNote={handleSaveToNote}
          />
        </div>

        {/* Right Toggle Button */}
        <button
          onClick={() => setRightOpen(!rightOpen)}
          style={{
            position: 'absolute',
            right: rightOpen ? '352px' : '8px',
            top: '12px',
            zIndex: 50,
            width: '20px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            transition: 'right 0.25s ease'
          }}
          title={rightOpen ? "Collapse Studio" : "Expand Studio"}
        >
          {rightOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Right Studio Column */}
        <div style={{
          width: rightOpen ? '360px' : '0px',
          minWidth: rightOpen ? '360px' : '0px',
          height: '100%',
          overflow: 'hidden',
          transition: 'all 0.25s ease'
        }}>
          <StudioPanel
            artifacts={artifacts}
            notes={notes}
            onGenerateArtifact={handleGenerateArtifact}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onSynthesizeNotes={handleSynthesizeNotes}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
