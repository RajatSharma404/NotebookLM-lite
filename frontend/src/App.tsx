import React, { useState, useEffect } from 'react';
import { Notebook, Source, Message, Note, StudioArtifact, CitationItem } from './types';
import { SourcesPanel } from './components/SourcesPanel';
import { ChatWorkspace } from './components/ChatWorkspace';
import { StudioPanel } from './components/StudioPanel';
import { Moon, Sun, Check, ChevronDown, Settings as SettingsIcon, Key, ExternalLink, X, AlertCircle } from 'lucide-react';

const API_BASE = '/api';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);

  // Active Notebook State
  const [activeNotebook, setActiveNotebook] = useState<Notebook>({
    id: 'nb_default',
    title: 'Research Workspace',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_count: 0,
    note_count: 0
  });

  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);


  // Initialize Notebook & Data
  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch(`${API_BASE}/notebooks`);
        if (res.ok) {
          const list: Notebook[] = await res.json();
          if (list.length > 0) {
            setActiveNotebook(list[0]);
            loadNotebookData(list[0].id);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend API not reachable, using offline local state:", err);
      }
    };
    initApp();

    // Fetch API Key / Settings status
    fetch(`${API_BASE}/settings`)
      .then(r => r.json())
      .then(data => {
        setKeyConfigured(Boolean(data.gemini_api_key_configured || data.openai_api_key_configured));
        if (data.ollama_base_url) setOllamaUrl(data.ollama_base_url);
        if (data.default_llm_provider) setSelectedModel(data.default_llm_provider);
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiApiKey || undefined,
          openai_api_key: openaiApiKey || undefined,
          ollama_base_url: ollamaUrl || undefined,
          default_llm_provider: selectedModel
        })
      });
      setSettingsSaved(true);
      setKeyConfigured(Boolean(geminiApiKey || openaiApiKey));
      setTimeout(() => {
        setSettingsSaved(false);
        setSettingsModalOpen(false);
      }, 1000);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };


  const loadNotebookData = async (notebookId: string) => {
    try {
      const [srcRes, noteRes, artRes, chatRes] = await Promise.all([
        fetch(`${API_BASE}/notebooks/${notebookId}/sources`),
        fetch(`${API_BASE}/notebooks/${notebookId}/notes`),
        fetch(`${API_BASE}/notebooks/${notebookId}/studio`),
        fetch(`${API_BASE}/notebooks/${notebookId}/chat/threads`)
      ]);

      if (srcRes.ok) setSources(await srcRes.json());
      if (noteRes.ok) setNotes(await noteRes.json());
      if (artRes.ok) setArtifacts(await artRes.json());
      if (chatRes.ok) {
        const threads = await chatRes.json();
        if (threads.length > 0 && threads[0].messages) {
          setMessages(threads[0].messages);
        }
      }
    } catch (err) {
      console.warn("Error loading notebook data:", err);
    }
  };

  // Toggle Dark / Light Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Source Actions
  const handleToggleSource = async (sourceId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/sources/${sourceId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      if (res.ok) {
        const updated: Source = await res.json();
        setSources(prev => prev.map(s => s.id === sourceId ? updated : s));
        return;
      }
    } catch (e) {}
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, is_active: !currentActive } : s));
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/sources/${sourceId}`, {
        method: 'DELETE'
      });
    } catch (e) {}
    setSources(prev => prev.filter(s => s.id !== sourceId));
  };

  const handleAddSource = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/sources/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const newSrc: Source = await res.json();
        setSources(prev => [newSrc, ...prev]);
        return;
      }
    } catch (e) {}

    // Fallback local addition
    const ext = file.name.split('.').pop() || 'txt';
    const fallbackSrc: Source = {
      id: `src_${Date.now()}`,
      notebook_id: activeNotebook.id,
      filename: file.name,
      file_type: ext,
      file_size: file.size,
      token_count: Math.round(file.size / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    setSources(prev => [fallbackSrc, ...prev]);
  };

  const handlePasteText = async (title: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/sources/paste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        const newSrc: Source = await res.json();
        setSources(prev => [newSrc, ...prev]);
        return;
      }
    } catch (e) {}

    const fallbackSrc: Source = {
      id: `src_${Date.now()}`,
      notebook_id: activeNotebook.id,
      filename: `${title}.txt`,
      file_type: 'txt',
      file_size: content.length,
      token_count: Math.round(content.length / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    setSources(prev => [fallbackSrc, ...prev]);
  };

  // Chat Actions with Real SSE Streaming
  const handleSendMessage = async (query: string) => {
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
      citations: []
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsgId = `msg_${Date.now() + 1}`;
    let accumulatedContent = '';
    let currentCitations: CitationItem[] = [];

    setMessages(prev => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        citations: []
      }
    ]);

    try {
      const response = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          llm_provider: selectedModel,
          model_name: selectedModel
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const event = JSON.parse(trimmed.substring(6));
                if (event.type === 'sources') {
                  currentCitations = event.citations || [];
                } else if (event.type === 'token') {
                  accumulatedContent += event.content;
                }
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedContent, citations: currentCitations }
                      : m
                  )
                );
              } catch (e) {}
            }
          }
        }
        setIsStreaming(false);
        return;
      }
    } catch (err) {
      console.warn("SSE stream failed:", err);
      accumulatedContent = `⚠️ Unable to communicate with the FastAPI backend (http://127.0.0.1:8000). Please ensure the backend server is running.\n\nOnce running, ask again to synthesize and explain "${activeNotebook.title}".`;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: accumulatedContent, citations: [] }
            : m
        )
      );
      setIsStreaming(false);
      return;
    }
  };


  // Note Actions
  const handleSaveNote = async (title: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        const newNote: Note = await res.json();
        setNotes(prev => [newNote, ...prev]);
        return;
      }
    } catch (e) {}

    const fallbackNote: Note = {
      id: `note_${Date.now()}`,
      notebook_id: activeNotebook.id,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setNotes(prev => [fallbackNote, ...prev]);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/notes/${noteId}`, {
        method: 'DELETE'
      });
    } catch (e) {}
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleSaveToNote = (content: string) => {
    handleSaveNote("Saved Grounded Insight", content);
  };

  const handleSynthesizeNotes = async (noteIds: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/notes/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_ids: noteIds })
      });
      if (res.ok) {
        const synthesized: Note = await res.json();
        setNotes(prev => [synthesized, ...prev]);
        return;
      }
    } catch (e) {}

    const selected = notes.filter(n => noteIds.includes(n.id));
    const mergedContent = selected.map(n => `### ${n.title}\n${n.content}`).join('\n\n---\n\n');
    handleSaveNote(`Synthesized Summary of ${selected.length} Notes`, mergedContent);
  };

  // Studio Artifact Actions
  const handleGenerateArtifact = async (type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline') => {
    try {
      const res = await fetch(`${API_BASE}/notebooks/${activeNotebook.id}/studio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_type: type })
      });
      if (res.ok) {
        const art: StudioArtifact = await res.json();
        setArtifacts(prev => [art, ...prev]);
        return;
      }
    } catch (e) {}

    const titleMap = {
      study_guide: 'Comprehensive Study Guide & Quiz',
      briefing_doc: 'Executive Briefing Document',
      faq: 'Domain FAQ & Key Glossary',
      timeline: 'Chronological Milestones & Timeline'
    };

    const fallbackArt: StudioArtifact = {
      id: `art_${Date.now()}`,
      notebook_id: activeNotebook.id,
      artifact_type: type,
      title: titleMap[type],
      content_markdown: `# ${titleMap[type]}\n\nSynthesized from active notebook documents.\n\n### 1. Core Summary\nFoundational principles synthesized with verifiable citations.`,
      created_at: new Date().toISOString()
    };
    setArtifacts(prev => [fallbackArt, ...prev]);
  };

  const activeSources = sources.filter(s => s.is_active);
  const totalTokens = activeSources.reduce((acc, s) => acc + (s.token_count || 0), 0);

  const modelOptions = [
    { id: 'gemini', label: 'Gemini 1.5 Flash' },
    { id: 'openai', label: 'GPT-4o-mini' },
    { id: 'anthropic', label: 'Claude 3.5 Sonnet' },
    { id: 'ollama', label: 'Ollama (Local Llama 3.2)' }
  ];

  const currentModelLabel = modelOptions.find(m => m.id === selectedModel)?.label || 'Gemini 1.5 Flash';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-0)', position: 'relative' }}>
      {/* 3-4% SVG Noise Grain Overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Top Header Bar */}
      <header style={{
        height: '48px',
        backgroundColor: 'var(--bg-1)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 50,
        userSelect: 'none'
      }}>
        {/* Left: Geometric Wordmark + Slash + Notebook Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Logo Geometric Mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="NotebookLM mark">
              <rect x="1.5" y="1.5" width="15" height="15" stroke="var(--text-1)" strokeWidth="1.5" />
              <line x1="1.5" y1="9" x2="16.5" y2="9" stroke="var(--text-3)" strokeWidth="1" strokeDasharray="2 2" />
              <rect x="5" y="5" width="3" height="3" fill="var(--accent)" />
            </svg>
            <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              <span className="serif" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>Notebook</span>
              <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginLeft: '3px' }}>LM</span>
              <span className="mono" style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent)', marginLeft: '3px', textTransform: 'uppercase', letterSpacing: '0.08em', verticalAlign: 'super' }}>lite</span>
            </span>
          </div>

          <span className="mono" style={{ color: 'var(--text-3)', fontSize: '13px' }}>/</span>

          {/* Notebook Title in Serif (truncated) */}
          <span
            className="serif"
            title={activeNotebook.title}
            style={{
              fontSize: '17px',
              color: 'var(--text-2)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '320px'
            }}
          >
            {activeNotebook.title}
          </span>
        </div>

        {/* Right: Model Selector & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Compact Model Selector with Popover */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="mono"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                backgroundColor: 'transparent',
                fontSize: '12px',
                color: 'var(--text-2)',
                transition: 'border-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)'
              }}
              aria-label="Select model"
              aria-haspopup="listbox"
              aria-expanded={modelDropdownOpen}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
              <span>{currentModelLabel}</span>
              <ChevronDown size={12} style={{ color: 'var(--text-3)', transform: modelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--duration-fast) var(--ease-out)' }} />
            </button>

            {modelDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '210px',
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-raised)',
                  padding: '4px',
                  zIndex: 200
                }}
                role="listbox"
              >
                {modelOptions.map((opt) => {
                  const isSelected = opt.id === selectedModel;
                  return (
                    <button
                      key={opt.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedModel(opt.id);
                        setModelDropdownOpen(false);
                      }}
                      className="mono"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                        backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                        borderRadius: '4px',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={13} color="var(--accent)" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings / API Key Button */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: keyConfigured ? 'var(--accent)' : 'var(--text-2)',
              position: 'relative',
              transition: 'color var(--duration-fast) var(--ease-out)'
            }}
            aria-label="Settings and API Keys"
            title="Configure AI Models & API Keys"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = keyConfigured ? 'var(--accent)' : 'var(--text-2)'}
          >
            <SettingsIcon size={16} />
            {keyConfigured && (
              <span style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)'
              }} />
            )}
          </button>

          {/* 36px Ghost Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-2)',
              transition: 'transform 200ms var(--ease-out), color var(--duration-fast) var(--ease-out)'
            }}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'}
          >
            {theme === 'dark' ? (
              <Sun size={16} style={{ transition: 'transform 200ms var(--ease-out)' }} />
            ) : (
              <Moon size={16} style={{ transition: 'transform 200ms var(--ease-out)' }} />
            )}
          </button>
        </div>
      </header>


      {/* Main Unequal 3-Pane Shell (Separated by 1px rules, no gaps, no card wrappers) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Left Pane: Sources (280px open, 56px collapsed rail) */}
        <div style={{
          width: leftOpen ? '280px' : '56px',
          minWidth: leftOpen ? '280px' : '56px',
          height: '100%',
          overflow: 'hidden',
          borderRight: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          transition: 'width var(--duration-normal) var(--ease-out), min-width var(--duration-normal) var(--ease-out)',
          position: 'relative'
        }}>
          {leftOpen ? (
            <SourcesPanel
              sources={sources}
              onToggleSource={handleToggleSource}
              onDeleteSource={handleDeleteSource}
              onAddSource={handleAddSource}
              onPasteText={handlePasteText}
              totalTokens={totalTokens}
            />
          ) : (
            <div
              onClick={() => setLeftOpen(true)}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '20px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              title="Expand Sources panel"
            >
              <div
                className="mono"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase'
                }}
              >
                SOURCES [{activeSources.length}]
              </div>
            </div>
          )}

          {/* Left Pane Edge Handle (8px hit area, accent hairline on hover) */}
          <div
            onClick={() => setLeftOpen(!leftOpen)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8px',
              height: '100%',
              cursor: 'col-resize',
              zIndex: 30,
              backgroundColor: 'transparent',
              transition: 'background-color var(--duration-fast) var(--ease-out)'
            }}
            title={leftOpen ? "Collapse Sources" : "Expand Sources"}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          />
        </div>

        {/* Center Grounded Workspace (Reading Column ~720px) */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-0)', display: 'flex', flexDirection: 'column' }}>
          <ChatWorkspace
            messages={messages}
            activeSources={activeSources}
            totalTokens={totalTokens}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onSaveToNote={handleSaveToNote}
          />
        </div>

        {/* Right Pane: Studio & Notes (380px open, 56px collapsed rail) */}
        <div style={{
          width: rightOpen ? '380px' : '56px',
          minWidth: rightOpen ? '380px' : '56px',
          height: '100%',
          overflow: 'hidden',
          borderLeft: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          transition: 'width var(--duration-normal) var(--ease-out), min-width var(--duration-normal) var(--ease-out)',
          position: 'relative'
        }}>
          {/* Right Pane Edge Handle */}
          <div
            onClick={() => setRightOpen(!rightOpen)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '8px',
              height: '100%',
              cursor: 'col-resize',
              zIndex: 30,
              backgroundColor: 'transparent',
              transition: 'background-color var(--duration-fast) var(--ease-out)'
            }}
            title={rightOpen ? "Collapse Studio" : "Expand Studio"}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          />

          {rightOpen ? (
            <StudioPanel
              artifacts={artifacts}
              notes={notes}
              onGenerateArtifact={handleGenerateArtifact}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onSynthesizeNotes={handleSynthesizeNotes}
            />
          ) : (
            <div
              onClick={() => setRightOpen(true)}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '20px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              title="Expand Studio panel"
            >
              <div
                className="mono"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase'
                }}
              >
                STUDIO & NOTES [{artifacts.length}]
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--radius-lg)',
            width: '520px',
            maxWidth: '100%',
            boxShadow: 'var(--shadow-overlay)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span className="mono" style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                  PREFERENCES & CREDENTIALS
                </span>
                <h3 className="serif" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--text-1)', marginTop: '2px' }}>
                  Model & API Settings
                </h3>
              </div>

              <button
                onClick={() => setSettingsModalOpen(false)}
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

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Gemini Key */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="mono" style={{ fontSize: '11px', color: 'var(--text-1)', fontWeight: 600 }}>
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '11px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    Get free key <ExternalLink size={11} />
                  </a>
                </div>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={e => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy... (Paste Gemini API Key)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  Recommended: Powers Gemini 1.5 Flash for deep conversational synthesis.
                </p>
              </div>

              {/* OpenAI Key */}
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '11px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '6px' }}>
                  OpenAI API Key (Optional)
                </label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={e => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-... (Paste OpenAI API Key)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              {/* Ollama URL */}
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '11px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '6px' }}>
                  Ollama Base URL (Local Offline)
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--line)',
              backgroundColor: 'var(--bg-0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {keyConfigured ? '✓ Active API key configured' : 'Using Grounded Local Synthesizer'}
              </span>

              <button
                onClick={handleSaveSettings}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: settingsSaved ? 'var(--bg-2)' : 'var(--accent)',
                  color: settingsSaved ? 'var(--text-1)' : 'var(--ink)',
                  border: '1px solid var(--line-strong)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--duration-fast) var(--ease-out)'
                }}
              >
                {settingsSaved ? <Check size={14} color="var(--accent)" /> : <Key size={14} />}
                <span>{settingsSaved ? 'Saved & Connected!' : 'Save & Connect'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

