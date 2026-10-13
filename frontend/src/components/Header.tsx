// ============================================================================
// Header Component
// Follows: notebooklm-design-system, design-taste-frontend, emil-design-eng
// ============================================================================

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { useUiPrefsStore } from '../store/uiPrefsStore';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Popover } from './ui/Popover';
import { Tooltip } from './ui/Tooltip';
import { Sun, Moon, Check, Plus, Trash2, Edit2, Download, ChevronDown } from 'lucide-react';
import { asNotebookId, NotebookId } from '../types';

export const AVAILABLE_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', speed: 'Ultra Fast' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', speed: 'Deep Reasoning' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', speed: 'High Capability' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic', speed: 'Precision' },
  { id: 'llama3:8b', name: 'Llama 3 (8B Local)', provider: 'ollama', speed: 'Private Offline' }
];

export interface HeaderProps {
  onExportClick?: () => void;
}

export function Header({ onExportClick }: HeaderProps) {
  const {
    notebooks,
    activeNotebookId,
    selectNotebook,
    createNotebook,
    renameNotebook,
    deleteNotebook
  } = useNotebookStore();

  const {
    theme,
    toggleTheme,
    selectedModel,
    setSelectedModel
  } = useUiPrefsStore();

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);

  // Inline rename state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Deletion confirm state in switcher
  const [confirmDeleteId, setConfirmDeleteId] = useState<NotebookId | null>(null);

  useEffect(() => {
    if (isEditingTitle) {
      setDraftTitle(activeNotebook?.title || '');
      setTimeout(() => titleInputRef.current?.focus(), 20);
    }
  }, [isEditingTitle, activeNotebook?.title]);

  const commitTitleRename = async () => {
    if (activeNotebookId && draftTitle.trim() && draftTitle.trim() !== activeNotebook?.title) {
      await renameNotebook(activeNotebookId, draftTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitleRename();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  return (
    <header
      role="banner"
      style={{
        height: '52px',
        borderBottom: '1px solid var(--line)',
        backgroundColor: 'var(--bg-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        position: 'relative',
        zIndex: 'var(--z-raised)',
        userSelect: 'none'
      }}
    >
      {/* Left Section: Geometric Mark, Wordmark, and Notebook Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Geometric Inline-SVG Logo Mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px'
          }}
          aria-hidden="true"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="var(--text-2)" strokeWidth="1.2" strokeDasharray="1.5 2" />
            <rect x="7" y="7" width="10" height="10" stroke="var(--accent)" strokeWidth="1.2" transform="rotate(45 12 12)" />
            <circle cx="12" cy="12" r="1.5" fill="var(--accent)" />
          </svg>
        </div>

        {/* Wordmark: Notebook (Serif), LM (Mono), lite (Superscript) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 400,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em'
            }}
          >
            Notebook
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-1)'
            }}
          >
            LM
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '10px',
              color: 'var(--accent-text)',
              verticalAlign: 'super',
              marginLeft: '2px',
              fontWeight: 500
            }}
          >
            lite
          </span>
        </div>

        {/* Divider */}
        <span
          className="font-mono"
          style={{
            color: 'var(--text-3)',
            fontSize: 'var(--text-13)',
            opacity: 0.6
          }}
          aria-hidden="true"
        >
          /
        </span>

        {/* Notebook Title & Switcher Popover */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitleRename}
            onKeyDown={handleTitleKeyDown}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              color: 'var(--text-1)',
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-1)',
              padding: '2px 8px',
              outline: 'none',
              width: '260px'
            }}
          />
        ) : (
          <Popover
            align="left"
            side="bottom"
            trigger={({ isOpen, toggle, ref }) => (
              <button
                ref={ref}
                onClick={toggle}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background: 'none',
                  border: 'none',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-1)',
                  cursor: 'pointer',
                  color: 'var(--text-1)',
                  transition: 'background-color var(--dur-1) var(--ease-out)'
                }}
                className="header-notebook-trigger"
              >
                <span
                  className="header-notebook-title"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 400,
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {activeNotebook?.title || 'Untitled Notebook'}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-3)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform var(--dur-1) var(--ease-out)'
                  }}
                />
              </button>
            )}
          >
            {({ close }) => (
              <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) var(--space-3)',
                    borderBottom: '1px solid var(--line)'
                  }}
                >
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 'var(--text-12)',
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Notebooks ({notebooks.length})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Plus size={12} />}
                    onClick={async () => {
                      const created = await createNotebook('New Research Notebook');
                      close();
                    }}
                  >
                    New
                  </Button>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  {notebooks.map((nb) => {
                    const isSelected = nb.id === activeNotebookId;
                    const isConfirming = confirmDeleteId === nb.id;

                    return (
                      <div
                        key={nb.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-1)',
                          backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                          transition: 'background-color var(--dur-1) var(--ease-out)'
                        }}
                      >
                        <button
                          onClick={() => {
                            selectNotebook(nb.id);
                            close();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            flex: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)'
                          }}
                        >
                          {isSelected && <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 'var(--text-14)',
                              color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {nb.title}
                          </span>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isSelected && (
                            <IconButton
                              size="sm"
                              variant="ghost"
                              aria-label="Rename notebook"
                              title="Rename notebook"
                              onClick={() => {
                                close();
                                setIsEditingTitle(true);
                              }}
                            >
                              <Edit2 size={12} />
                            </IconButton>
                          )}

                          {isConfirming ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                await deleteNotebook(nb.id);
                                setConfirmDeleteId(null);
                                if (notebooks.length <= 1) close();
                              }}
                            >
                              Confirm
                            </Button>
                          ) : (
                            notebooks.length > 1 && (
                              <IconButton
                                size="sm"
                                variant="ghost"
                                aria-label="Delete notebook"
                                title="Delete notebook"
                                onClick={() => setConfirmDeleteId(nb.id)}
                              >
                                <Trash2 size={12} />
                              </IconButton>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Popover>
        )}
      </div>

      {/* Right Section: Model Selector, Theme Toggle, Export Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Model Selector Popover */}
        <Popover
          align="right"
          side="bottom"
          trigger={({ isOpen, toggle, ref }) => (
            <button
              ref={ref}
              onClick={toggle}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className="header-model-selector"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-1)',
                padding: '4px 10px',
                height: '32px',
                cursor: 'pointer',
                transition: 'border-color var(--dur-1) var(--ease-out)'
              }}
            >
              {/* Pulsing Active Status Dot */}
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)'
                }}
                aria-hidden="true"
              />
              <span
                className="font-mono"
                style={{
                  fontSize: 'var(--text-12)',
                  color: 'var(--text-2)',
                  letterSpacing: '-0.01em'
                }}
              >
                {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || selectedModel}
              </span>
              <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
            </button>
          )}
        >
          {({ close }) => (
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '2px' }} role="listbox">
              <span
                className="font-mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  padding: 'var(--space-2) var(--space-3)',
                  letterSpacing: '0.05em'
                }}
              >
                Grounded LLM Model
              </span>
              {AVAILABLE_MODELS.map((m) => {
                const isCurrent = m.id === selectedModel;
                return (
                  <button
                    key={m.id}
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setSelectedModel(m.id, m.provider);
                      close();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-1)',
                      backgroundColor: isCurrent ? 'var(--bg-hover)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 'var(--text-13)',
                          color: isCurrent ? 'var(--text-1)' : 'var(--text-2)',
                          fontWeight: isCurrent ? 600 : 400
                        }}
                      >
                        {m.name}
                      </div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-3)'
                        }}
                      >
                        {m.speed}
                      </div>
                    </div>
                    {isCurrent && <Check size={14} style={{ color: 'var(--accent)' }} />}
                  </button>
                );
              })}
            </div>
          )}
        </Popover>

        {/* Theme Toggle (36px Icon Button with rotational crossfade) */}
        <Tooltip content={theme === 'dark' ? 'Switch to Light paper' : 'Switch to Dark ink'}>
          <IconButton
            size="md"
            variant="ghost"
            aria-label={theme === 'dark' ? 'Switch to Light paper theme' : 'Switch to Dark ink theme'}
            onClick={toggleTheme}
            style={{
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(90deg)',
                transition: 'transform var(--dur-2) var(--ease-out)'
              }}
            >
              {theme === 'dark' ? (
                <Moon size={16} style={{ color: 'var(--text-2)' }} />
              ) : (
                <Sun size={16} style={{ color: 'var(--text-1)' }} />
              )}
            </span>
          </IconButton>
        </Tooltip>

        {/* Export Notebook Trigger */}
        <div className="header-export-btn">
          <Tooltip content="Export entire notebook archive (.zip)">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Download size={13} />}
              onClick={onExportClick}
            >
              Export
            </Button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
