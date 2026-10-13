// ============================================================================
// NotebookLM-lite Domain Store (Zustand + Versioned Schema)
// Follows: zustand-store-ts, react-state-management, typescript-pro
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Notebook,
  NotebookId,
  Source,
  SourceId,
  ChunkItem,
  Message,
  MessageId,
  ThreadId,
  Note,
  NoteId,
  StudioArtifact,
  ArtifactId,
  BackendArtifactType,
  Citation,
  AsyncState,
  asNotebookId,
  asMessageId,
  asThreadId
} from '../types';
import { apiClient } from '../api/client';
import { mockApiClient } from '../api/mock';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';
const api = useMock ? mockApiClient : apiClient;

export interface NotebookStoreState {
  notebooks: Notebook[];
  activeNotebookId: NotebookId | null;
  sources: Source[];
  chunksBySource: Record<SourceId, ChunkItem[]>;
  messages: Message[];
  activeThreadId: ThreadId | null;
  artifacts: StudioArtifact[];
  notes: Note[];

  // Streaming State (Ephemeral during active generation)
  isStreaming: boolean;
  streamingContent: string;
  streamingCitations: Citation[];
  streamingAbortController: AbortController | null;

  // Async States
  notebooksState: AsyncState<Notebook[]>;
  sourcesState: AsyncState<Source[]>;
  chatState: AsyncState<Message[]>;
  notesState: AsyncState<Note[]>;
  artifactsState: AsyncState<StudioArtifact[]>;

  // Actions
  fetchNotebooks: () => Promise<void>;
  selectNotebook: (id: NotebookId) => Promise<void>;
  createNotebook: (title?: string) => Promise<Notebook>;
  renameNotebook: (id: NotebookId, title: string) => Promise<void>;
  deleteNotebook: (id: NotebookId) => Promise<void>;

  fetchSources: (notebookId?: NotebookId) => Promise<void>;
  uploadSource: (file: File) => Promise<Source>;
  pasteSource: (title: string, content: string) => Promise<Source>;
  toggleSourceActive: (sourceId: SourceId, isActive: boolean) => Promise<void>;
  deleteSource: (sourceId: SourceId) => Promise<void>;
  fetchSourceChunks: (sourceId: SourceId) => Promise<ChunkItem[]>;

  fetchChatHistory: () => Promise<void>;
  sendMessage: (query: string, options?: { provider?: string; model?: string }) => Promise<void>;
  abortStream: () => void;
  appendStreamingToken: (text: string) => void;
  addStreamingCitation: (citation: Citation) => void;
  finalizeStreamingMessage: (messageId: MessageId) => void;

  fetchNotes: () => Promise<void>;
  createNote: (title: string, content: string) => Promise<Note>;
  updateNote: (noteId: NoteId, title?: string, content?: string) => Promise<Note>;
  deleteNote: (noteId: NoteId) => Promise<void>;
  synthesizeNotes: (noteIds: NoteId[], instructions?: string) => Promise<Note>;

  fetchArtifacts: () => Promise<void>;
  generateArtifact: (artifactType: BackendArtifactType, instructions?: string) => Promise<StudioArtifact>;
  deleteArtifact: (artifactId: ArtifactId) => Promise<void>;
  generateAudioOverview: () => Promise<StudioArtifact>;
}

export const useNotebookStore = create<NotebookStoreState>()(
  persist(
    (set, get) => ({
      notebooks: [],
      activeNotebookId: null,
      sources: [],
      chunksBySource: {} as Record<SourceId, ChunkItem[]>,
      messages: [],
      activeThreadId: null,
      artifacts: [],
      notes: [],

      isStreaming: false,
      streamingContent: '',
      streamingCitations: [],
      streamingAbortController: null,

      notebooksState: { status: 'idle' },
      sourcesState: { status: 'idle' },
      chatState: { status: 'idle' },
      notesState: { status: 'idle' },
      artifactsState: { status: 'idle' },

      // ----------------------------------------------------------------------
      // Notebook Actions
      // ----------------------------------------------------------------------
      fetchNotebooks: async () => {
        set({ notebooksState: { status: 'loading' } });
        try {
          const notebooks = await api.getNotebooks();
          set({
            notebooks,
            notebooksState: { status: 'success', data: notebooks }
          });
          const { activeNotebookId } = get();
          if (!activeNotebookId) {
            if (notebooks.length > 0) {
              await get().selectNotebook(notebooks[0].id);
            } else {
              try {
                await get().createNotebook('Untitled Research Notebook');
              } catch {
                const fallbackId = asNotebookId('nb_default');
                const fallbackNb: Notebook = {
                  id: fallbackId,
                  title: 'Untitled Research Notebook',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  source_count: 0,
                  note_count: 0
                };
                set({
                  notebooks: [fallbackNb],
                  activeNotebookId: fallbackId,
                  notebooksState: { status: 'success', data: [fallbackNb] }
                });
              }
            }
          }
        } catch (err: unknown) {
          const fallbackId = asNotebookId('nb_default');
          const fallbackNb: Notebook = {
            id: fallbackId,
            title: 'Untitled Research Notebook',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            source_count: 0,
            note_count: 0
          };
          set({
            notebooks: [fallbackNb],
            activeNotebookId: fallbackId,
            notebooksState: { status: 'success', data: [fallbackNb] }
          });
        }
      },

      selectNotebook: async (id: NotebookId) => {
        set({
          activeNotebookId: id,
          sources: [],
          messages: [],
          artifacts: [],
          notes: [],
          streamingContent: '',
          streamingCitations: [],
          isStreaming: false
        });
        await Promise.all([
          get().fetchSources(id),
          get().fetchChatHistory(),
          get().fetchNotes(),
          get().fetchArtifacts()
        ]);
      },

      createNotebook: async (title = 'Untitled Notebook') => {
        const newNotebook = await api.createNotebook(title);
        set((state) => ({
          notebooks: [newNotebook, ...state.notebooks],
          activeNotebookId: newNotebook.id
        }));
        await get().selectNotebook(newNotebook.id);
        return newNotebook;
      },

      renameNotebook: async (id: NotebookId, title: string) => {
        const prev = get().notebooks;
        // Optimistic update
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, title } : nb))
        }));
        try {
          await api.updateNotebook(id, title);
        } catch {
          // Rollback
          set({ notebooks: prev });
        }
      },

      deleteNotebook: async (id: NotebookId) => {
        const prev = get().notebooks;
        set((state) => {
          const remaining = state.notebooks.filter((nb) => nb.id !== id);
          const nextActive = remaining.length > 0 ? remaining[0].id : null;
          return {
            notebooks: remaining,
            activeNotebookId: nextActive
          };
        });
        try {
          await api.deleteNotebook(id);
          const nextActive = get().activeNotebookId;
          if (nextActive) {
            await get().selectNotebook(nextActive);
          }
        } catch {
          set({ notebooks: prev });
        }
      },

      // ----------------------------------------------------------------------
      // Sources Actions
      // ----------------------------------------------------------------------
      fetchSources: async (notebookId?: NotebookId) => {
        const targetId = notebookId || get().activeNotebookId;
        if (!targetId) return;

        set({ sourcesState: { status: 'loading' } });
        try {
          const sources = await api.getSources(targetId);
          set({
            sources,
            sourcesState: { status: 'success', data: sources }
          });
        } catch (err: unknown) {
          const error = {
            code: 'FETCH_SOURCES_FAILED',
            message: err instanceof Error ? err.message : 'Failed to fetch sources'
          };
          set({ sourcesState: { status: 'error', error } });
        }
      },

      uploadSource: async (file: File) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const source = await api.uploadSource(nbId, file);
        set((state) => ({
          sources: [source, ...state.sources],
          notebooks: state.notebooks.map((nb) =>
            nb.id === nbId ? { ...nb, source_count: nb.source_count + 1 } : nb
          )
        }));
        return source;
      },

      pasteSource: async (title: string, content: string) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const source = await api.pasteSource(nbId, title, content);
        set((state) => ({
          sources: [source, ...state.sources],
          notebooks: state.notebooks.map((nb) =>
            nb.id === nbId ? { ...nb, source_count: nb.source_count + 1 } : nb
          )
        }));
        return source;
      },

      toggleSourceActive: async (sourceId: SourceId, isActive: boolean) => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        // Optimistic
        set((state) => ({
          sources: state.sources.map((s) => (s.id === sourceId ? { ...s, is_active: isActive } : s))
        }));

        try {
          await api.toggleSource(nbId, sourceId, isActive);
        } catch {
          // Revert
          set((state) => ({
            sources: state.sources.map((s) => (s.id === sourceId ? { ...s, is_active: !isActive } : s))
          }));
        }
      },

      deleteSource: async (sourceId: SourceId) => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        const prev = get().sources;
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== sourceId),
          notebooks: state.notebooks.map((nb) =>
            nb.id === nbId ? { ...nb, source_count: Math.max(0, nb.source_count - 1) } : nb
          )
        }));

        try {
          await api.deleteSource(nbId, sourceId);
        } catch {
          set({ sources: prev });
        }
      },

      fetchSourceChunks: async (sourceId: SourceId) => {
        const nbId = get().activeNotebookId;
        if (!nbId) return [];

        const cached = get().chunksBySource[sourceId];
        if (cached && cached.length > 0) return cached;

        const chunks = await api.getSourceChunks(nbId, sourceId);
        set((state) => ({
          chunksBySource: {
            ...state.chunksBySource,
            [sourceId]: chunks
          }
        }));
        return chunks;
      },

      // ----------------------------------------------------------------------
      // Chat & Streaming Actions
      // ----------------------------------------------------------------------
      fetchChatHistory: async () => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        set({ chatState: { status: 'loading' } });
        try {
          const threads = await api.getChatThreads(nbId);
          if (threads.length > 0) {
            const first = threads[0];
            set({
              activeThreadId: first.id,
              messages: first.messages,
              chatState: { status: 'success', data: first.messages }
            });
          } else {
            set({
              activeThreadId: null,
              messages: [],
              chatState: { status: 'success', data: [] }
            });
          }
        } catch (err: unknown) {
          const error = {
            code: 'FETCH_CHAT_FAILED',
            message: err instanceof Error ? err.message : 'Failed to fetch chat history'
          };
          set({ chatState: { status: 'error', error } });
        }
      },

      sendMessage: async (query: string, options?: { provider?: string; model?: string }) => {
        let nbId = get().activeNotebookId;
        if (!nbId) {
          const fallbackId = asNotebookId('nb_default');
          set({ activeNotebookId: fallbackId });
          nbId = fallbackId;
        }

        const controller = new AbortController();

        // 1. Add optimistic user message
        const userMsg: Message = {
          id: asMessageId(`msg_user_${Date.now()}`),
          role: 'user',
          content: query,
          created_at: new Date().toISOString(),
          citations: []
        };

        set((state) => ({
          messages: [...state.messages, userMsg],
          isStreaming: true,
          streamingContent: '',
          streamingCitations: [],
          streamingAbortController: controller
        }));

        try {
          await api.streamChat(nbId, query, {
            threadId: get().activeThreadId || undefined,
            llmProvider: options?.provider,
            modelName: options?.model,
            signal: controller.signal,
            onEvent: (event) => {
              if (event.type === 'token') {
                get().appendStreamingToken(event.text);
              } else if (event.type === 'citation') {
                get().addStreamingCitation(event.citation);
              } else if (event.type === 'done') {
                get().finalizeStreamingMessage(event.messageId);
              } else if (event.type === 'error') {
                // Keep whatever content was generated and surface error
                set({ isStreaming: false, streamingAbortController: null });
              }
            }
          });
        } catch {
          set({ isStreaming: false, streamingAbortController: null });
        }
      },

      abortStream: () => {
        const controller = get().streamingAbortController;
        if (controller) {
          controller.abort();
        }
        const { streamingContent, streamingCitations } = get();
        if (streamingContent) {
          get().finalizeStreamingMessage(asMessageId(`msg_aborted_${Date.now()}`));
        } else {
          set({ isStreaming: false, streamingAbortController: null });
        }
      },

      appendStreamingToken: (text: string) => {
        set((state) => ({
          streamingContent: state.streamingContent + text
        }));
      },

      addStreamingCitation: (citation: Citation) => {
        set((state) => {
          // Avoid duplicate markers
          const exists = state.streamingCitations.some((c) => c.marker === citation.marker);
          if (exists) return state;
          return {
            streamingCitations: [...state.streamingCitations, citation]
          };
        });
      },

      finalizeStreamingMessage: (messageId: MessageId) => {
        const { streamingContent, streamingCitations, messages } = get();
        const assistantMsg: Message = {
          id: messageId,
          role: 'assistant',
          content: streamingContent,
          created_at: new Date().toISOString(),
          citations: streamingCitations.map((c) => ({
            index: c.marker || 1,
            chunk_id: c.kind === 'chunk' ? c.chunkId : undefined,
            source_id: c.kind === 'chunk' ? c.sourceId : undefined,
            source_title: c.kind === 'chunk' ? c.sourceTitle || 'Source' : 'Source',
            page_number: c.kind === 'chunk' ? c.page || 1 : 1,
            snippet: c.kind === 'chunk' ? c.quote || '' : ''
          }))
        };

        set({
          messages: [...messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
          streamingCitations: [],
          streamingAbortController: null
        });
      },

      // ----------------------------------------------------------------------
      // Notes Actions
      // ----------------------------------------------------------------------
      fetchNotes: async () => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        set({ notesState: { status: 'loading' } });
        try {
          const notes = await api.getNotes(nbId);
          set({
            notes,
            notesState: { status: 'success', data: notes }
          });
        } catch (err: unknown) {
          const error = {
            code: 'FETCH_NOTES_FAILED',
            message: err instanceof Error ? err.message : 'Failed to fetch notes'
          };
          set({ notesState: { status: 'error', error } });
        }
      },

      createNote: async (title: string, content: string) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const note = await api.createNote(nbId, title, content);
        set((state) => ({
          notes: [note, ...state.notes],
          notebooks: state.notebooks.map((nb) =>
            nb.id === nbId ? { ...nb, note_count: nb.note_count + 1 } : nb
          )
        }));
        return note;
      },

      updateNote: async (noteId: NoteId, title?: string, content?: string) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const note = await api.updateNote(nbId, noteId, { title, content });
        set((state) => ({
          notes: state.notes.map((n) => (n.id === noteId ? note : n))
        }));
        return note;
      },

      deleteNote: async (noteId: NoteId) => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        set((state) => ({
          notes: state.notes.filter((n) => n.id !== noteId),
          notebooks: state.notebooks.map((nb) =>
            nb.id === nbId ? { ...nb, note_count: Math.max(0, nb.note_count - 1) } : nb
          )
        }));
        await api.deleteNote(nbId, noteId);
      },

      synthesizeNotes: async (noteIds: NoteId[], instructions?: string) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const synthesizedNote = await api.synthesizeNotes(nbId, noteIds, instructions);
        set((state) => ({
          notes: [synthesizedNote, ...state.notes]
        }));
        return synthesizedNote;
      },

      // ----------------------------------------------------------------------
      // Studio Artifacts Actions
      // ----------------------------------------------------------------------
      fetchArtifacts: async () => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        set({ artifactsState: { status: 'loading' } });
        try {
          const artifacts = await api.getStudioArtifacts(nbId);
          set({
            artifacts,
            artifactsState: { status: 'success', data: artifacts }
          });
        } catch (err: unknown) {
          const error = {
            code: 'FETCH_ARTIFACTS_FAILED',
            message: err instanceof Error ? err.message : 'Failed to fetch artifacts'
          };
          set({ artifactsState: { status: 'error', error } });
        }
      },

      generateArtifact: async (artifactType: BackendArtifactType, instructions?: string) => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const artifact = await api.generateStudioArtifact(nbId, artifactType, instructions);
        set((state) => ({
          artifacts: [artifact, ...state.artifacts]
        }));
        return artifact;
      },

      deleteArtifact: async (artifactId: ArtifactId) => {
        const nbId = get().activeNotebookId;
        if (!nbId) return;

        set((state) => ({
          artifacts: state.artifacts.filter((a) => a.id !== artifactId)
        }));
        await api.deleteStudioArtifact(nbId, artifactId);
      },

      generateAudioOverview: async () => {
        const nbId = get().activeNotebookId;
        if (!nbId) throw new Error('No active notebook');

        const artifact = await api.generateAudioOverview(nbId);
        set((state) => ({
          artifacts: [artifact, ...state.artifacts]
        }));
        return artifact;
      }
    }),
    {
      name: 'notebooklm_data_v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist persistent domain data, exclude active stream and abort controllers
      partialize: (state) => ({
        activeNotebookId: state.activeNotebookId
      }),
      migrate: (persistedState: unknown) => {
        return persistedState as NotebookStoreState;
      }
    }
  )
);
