// ============================================================================
// NotesPanel Component (Personal Research Notes & Synthesis)
// Follows: notebooklm-design-system, react-patterns
// ============================================================================

import React, { useState } from 'react';
import { Note, NoteId, asNoteId } from '../types';
import { useNotebookStore } from '../store/notebookStore';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { useToast } from './ui/Toast';
import { Plus, Trash2, Edit2, Sparkles, Check, X } from 'lucide-react';

export function NotesPanel() {
  const { notes, createNote, updateNote, deleteNote, synthesizeNotes } = useNotebookStore();
  const { showToast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<NoteId | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  // Multi-selection for note synthesis
  const [selectedNoteIds, setSelectedNoteIds] = useState<NoteId[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const startCreate = () => {
    setIsCreating(true);
    setDraftTitle('');
    setDraftContent('');
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
  };

  const handleSave = async () => {
    if (!draftTitle.trim() && !draftContent.trim()) {
      setIsCreating(false);
      setEditingNoteId(null);
      return;
    }

    if (editingNoteId) {
      await updateNote(editingNoteId, draftTitle.trim() || 'Untitled Note', draftContent);
      showToast({ message: 'Note updated' });
      setEditingNoteId(null);
    } else {
      await createNote(draftTitle.trim() || 'Untitled Note', draftContent);
      showToast({ message: 'Note created' });
      setIsCreating(false);
    }
  };

  const toggleSelectNote = (id: NoteId) => {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSynthesize = async () => {
    if (selectedNoteIds.length < 2) return;
    setIsSynthesizing(true);
    try {
      await synthesizeNotes(selectedNoteIds);
      showToast({ message: `Synthesized ${selectedNoteIds.length} notes into a cohesive summary` });
      setSelectedNoteIds([]);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-0)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header & Actions */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-1)'
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {notes.length} Research Note{notes.length === 1 ? '' : 's'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {selectedNoteIds.length >= 2 && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Sparkles size={12} />}
              isLoading={isSynthesizing}
              onClick={handleSynthesize}
            >
              Synthesize ({selectedNoteIds.length})
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus size={12} />}
            onClick={startCreate}
          >
            New Note
          </Button>
        </div>
      </div>

      {/* Editor Surface if Creating or Editing */}
      {(isCreating || editingNoteId) && (
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--line)',
            backgroundColor: 'var(--bg-1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)'
          }}
        >
          <input
            type="text"
            placeholder="Note Title..."
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              backgroundColor: 'var(--bg-0)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-1)',
              padding: '6px 10px',
              color: 'var(--text-1)'
            }}
          />

          <textarea
            rows={5}
            placeholder="Write research takeaways, synthesis notes, or citations..."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              lineHeight: '1.5',
              backgroundColor: 'var(--bg-0)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-1)',
              padding: '8px 10px',
              color: 'var(--text-1)',
              resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: '4px' }}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                setEditingNoteId(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave}>
              Save Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {notes.length === 0 && !isCreating ? (
          <div
            style={{
              padding: 'var(--space-8) var(--space-4)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}
          >
            <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              No notes saved yet.
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: '240px', lineHeight: '1.4' }}>
              Save assistant answers, artifact excerpts, or write personal study notes.
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isSelected = selectedNoteIds.includes(note.id);
            return (
              <div
                key={note.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-3)',
                  transition: 'background-color var(--dur-1) var(--ease-out)',
                  backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent'
                }}
              >
                {/* Synthesis Checkbox */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${note.title} for synthesis`}
                  onClick={() => toggleSelectNote(note.id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--line-strong)'}`,
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginTop: '2px',
                    padding: 0
                  }}
                >
                  {isSelected && <Check size={12} stroke="var(--accent-ink)" strokeWidth={2.5} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '15px',
                      color: 'var(--text-1)',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {note.title}
                  </div>
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-2)',
                      lineHeight: '1.4',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {note.content}
                  </p>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-3)',
                      marginTop: '4px',
                      display: 'block'
                    }}
                  >
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Row Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${note.title}`}
                    onClick={() => startEdit(note)}
                  >
                    <Edit2 size={12} />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${note.title}`}
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default NotesPanel;
