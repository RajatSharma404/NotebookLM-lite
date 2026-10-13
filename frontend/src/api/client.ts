// ============================================================================
// NotebookLM-lite Typed API Client
// Follows: typescript-pro, typescript-expert, frontend-security-coder
// ============================================================================

import {
  Notebook,
  NotebookId,
  Source,
  SourceId,
  ChunkItem,
  ChatThread,
  ThreadId,
  StreamEvent,
  Note,
  NoteId,
  StudioArtifact,
  ArtifactId,
  BackendArtifactType,
  asNotebookId,
  asSourceId,
  asChunkId,
  asThreadId,
  asMessageId,
  asNoteId,
  asArtifactId,
  toArtifactKind,
  AppError,
  createAppError
} from '../types';
import { consumeSSEStream } from './sse';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network request failed';
    throw createAppError('NETWORK_ERROR', msg, true);
  }

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      if (errJson && typeof errJson === 'object' && 'detail' in errJson) {
        errorDetail = String(errJson.detail);
      }
    } catch {
      // Ignore json parse error on error response
    }
    throw createAppError(`HTTP_${res.status}`, errorDetail, res.status >= 500, res.status);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  // --------------------------------------------------------------------------
  // Notebooks
  // --------------------------------------------------------------------------
  async getNotebooks(): Promise<Notebook[]> {
    const raw = await request<Array<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      source_count?: number;
      note_count?: number;
    }>>('/notebooks');
    return raw.map((nb) => ({
      id: asNotebookId(nb.id),
      title: nb.title,
      created_at: nb.created_at,
      updated_at: nb.updated_at,
      source_count: nb.source_count ?? 0,
      note_count: nb.note_count ?? 0
    }));
  },

  async createNotebook(title = 'Untitled Notebook'): Promise<Notebook> {
    const raw = await request<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      source_count?: number;
      note_count?: number;
    }>('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
    return {
      id: asNotebookId(raw.id),
      title: raw.title,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      source_count: raw.source_count ?? 0,
      note_count: raw.note_count ?? 0
    };
  },

  async updateNotebook(id: NotebookId, title: string): Promise<Notebook> {
    const raw = await request<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
      source_count?: number;
      note_count?: number;
    }>(`/notebooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    });
    return {
      id: asNotebookId(raw.id),
      title: raw.title,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      source_count: raw.source_count ?? 0,
      note_count: raw.note_count ?? 0
    };
  },

  async deleteNotebook(id: NotebookId): Promise<void> {
    await request<void>(`/notebooks/${id}`, { method: 'DELETE' });
  },

  getExportZipUrl(id: NotebookId): string {
    return `${BASE_URL}/notebooks/${id}/export`;
  },

  // --------------------------------------------------------------------------
  // Sources
  // --------------------------------------------------------------------------
  async getSources(notebookId: NotebookId): Promise<Source[]> {
    const raw = await request<Array<{
      id: string;
      notebook_id: string;
      filename: string;
      file_type: string;
      file_size: number;
      token_count: number;
      is_active: boolean;
      created_at: string;
    }>>(`/notebooks/${notebookId}/sources`);
    return raw.map((s) => ({
      id: asSourceId(s.id),
      notebook_id: asNotebookId(s.notebook_id),
      filename: s.filename,
      file_type: s.file_type,
      file_size: s.file_size,
      token_count: s.token_count,
      is_active: s.is_active,
      created_at: s.created_at
    }));
  },

  async uploadSource(notebookId: NotebookId, file: File): Promise<Source> {
    const formData = new FormData();
    formData.append('file', file);
    const raw = await request<{
      id: string;
      notebook_id: string;
      filename: string;
      file_type: string;
      file_size: number;
      token_count: number;
      is_active: boolean;
      created_at: string;
    }>(`/notebooks/${notebookId}/sources/upload`, {
      method: 'POST',
      body: formData
    });
    return {
      id: asSourceId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      filename: raw.filename,
      file_type: raw.file_type,
      file_size: raw.file_size,
      token_count: raw.token_count,
      is_active: raw.is_active,
      created_at: raw.created_at
    };
  },

  async pasteSource(notebookId: NotebookId, title: string, content: string): Promise<Source> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      filename: string;
      file_type: string;
      file_size: number;
      token_count: number;
      is_active: boolean;
      created_at: string;
    }>(`/notebooks/${notebookId}/sources/paste`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    return {
      id: asSourceId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      filename: raw.filename,
      file_type: raw.file_type,
      file_size: raw.file_size,
      token_count: raw.token_count,
      is_active: raw.is_active,
      created_at: raw.created_at
    };
  },

  async toggleSource(notebookId: NotebookId, sourceId: SourceId, isActive: boolean): Promise<Source> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      filename: string;
      file_type: string;
      file_size: number;
      token_count: number;
      is_active: boolean;
      created_at: string;
    }>(`/notebooks/${notebookId}/sources/${sourceId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
    return {
      id: asSourceId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      filename: raw.filename,
      file_type: raw.file_type,
      file_size: raw.file_size,
      token_count: raw.token_count,
      is_active: raw.is_active,
      created_at: raw.created_at
    };
  },

  async deleteSource(notebookId: NotebookId, sourceId: SourceId): Promise<void> {
    await request<void>(`/notebooks/${notebookId}/sources/${sourceId}`, {
      method: 'DELETE'
    });
  },

  async getSourceChunks(notebookId: NotebookId, sourceId: SourceId): Promise<ChunkItem[]> {
    const raw = await request<Array<{
      id: string;
      source_id: string;
      notebook_id: string;
      page_number: number;
      section_title?: string;
      content: string;
      char_start: number;
      char_end: number;
    }>>(`/notebooks/${notebookId}/sources/${sourceId}/chunks`);
    return raw.map((c) => ({
      id: asChunkId(c.id),
      source_id: asSourceId(c.source_id),
      notebook_id: asNotebookId(c.notebook_id),
      page_number: c.page_number,
      section_title: c.section_title,
      content: c.content,
      char_start: c.char_start,
      char_end: c.char_end
    }));
  },

  // --------------------------------------------------------------------------
  // Chat Threads & Streaming
  // --------------------------------------------------------------------------
  async getChatThreads(notebookId: NotebookId): Promise<ChatThread[]> {
    const raw = await request<Array<{
      id: string;
      notebook_id: string;
      title: string;
      created_at: string;
      messages: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        created_at: string;
        citations: Array<{
          index: number;
          chunk_id?: string;
          source_id?: string;
          source_title: string;
          page_number: number;
          snippet: string;
        }>;
      }>;
    }>>(`/notebooks/${notebookId}/chat/threads`);

    return raw.map((th) => ({
      id: asThreadId(th.id),
      notebook_id: asNotebookId(th.notebook_id),
      title: th.title,
      created_at: th.created_at,
      messages: th.messages.map((m) => ({
        id: asMessageId(m.id),
        role: m.role,
        content: m.content,
        created_at: m.created_at,
        citations: m.citations.map((c) => ({
          index: c.index,
          chunk_id: c.chunk_id,
          source_id: c.source_id,
          source_title: c.source_title,
          page_number: c.page_number,
          snippet: c.snippet
        }))
      }))
    }));
  },

  async streamChat(
    notebookId: NotebookId,
    query: string,
    options: {
      threadId?: ThreadId;
      llmProvider?: string;
      modelName?: string;
      signal?: AbortSignal;
      onEvent: (event: StreamEvent) => void;
    }
  ): Promise<void> {
    const url = `${BASE_URL}/notebooks/${notebookId}/chat/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        thread_id: options.threadId,
        llm_provider: options.llmProvider,
        model_name: options.modelName
      }),
      signal: options.signal
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) detail = String(errJson.detail);
      } catch {
        // ignore
      }
      options.onEvent({
        type: 'error',
        code: `HTTP_${res.status}`,
        message: detail,
        retryable: res.status >= 500
      });
      return;
    }

    if (!res.body) {
      options.onEvent({
        type: 'error',
        code: 'EMPTY_RESPONSE_BODY',
        message: 'No response body stream received from server',
        retryable: true
      });
      return;
    }

    await consumeSSEStream(res.body, options.onEvent, options.signal);
  },

  // --------------------------------------------------------------------------
  // Notes
  // --------------------------------------------------------------------------
  async getNotes(notebookId: NotebookId): Promise<Note[]> {
    const raw = await request<Array<{
      id: string;
      notebook_id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>>(`/notebooks/${notebookId}/notes`);
    return raw.map((n) => ({
      id: asNoteId(n.id),
      notebook_id: asNotebookId(n.notebook_id),
      title: n.title,
      content: n.content,
      created_at: n.created_at,
      updated_at: n.updated_at
    }));
  },

  async createNote(notebookId: NotebookId, title: string, content: string): Promise<Note> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>(`/notebooks/${notebookId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    return {
      id: asNoteId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      title: raw.title,
      content: raw.content,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  },

  async updateNote(
    notebookId: NotebookId,
    noteId: NoteId,
    updates: { title?: string; content?: string }
  ): Promise<Note> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>(`/notebooks/${notebookId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return {
      id: asNoteId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      title: raw.title,
      content: raw.content,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  },

  async deleteNote(notebookId: NotebookId, noteId: NoteId): Promise<void> {
    await request<void>(`/notebooks/${notebookId}/notes/${noteId}`, {
      method: 'DELETE'
    });
  },

  async synthesizeNotes(
    notebookId: NotebookId,
    noteIds: NoteId[],
    instructions?: string
  ): Promise<Note> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>(`/notebooks/${notebookId}/notes/synthesize`, {
      method: 'POST',
      body: JSON.stringify({ note_ids: noteIds, instructions })
    });
    return {
      id: asNoteId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      title: raw.title,
      content: raw.content,
      created_at: raw.created_at,
      updated_at: raw.updated_at
    };
  },

  // --------------------------------------------------------------------------
  // Studio Artifacts & Audio
  // --------------------------------------------------------------------------
  async getStudioArtifacts(notebookId: NotebookId): Promise<StudioArtifact[]> {
    const raw = await request<Array<{
      id: string;
      notebook_id: string;
      artifact_type: BackendArtifactType;
      title: string;
      content_json?: string;
      content_markdown?: string;
      media_url?: string;
      created_at: string;
    }>>(`/notebooks/${notebookId}/studio`);
    return raw.map((a) => ({
      id: asArtifactId(a.id),
      notebook_id: asNotebookId(a.notebook_id),
      artifact_type: a.artifact_type,
      kind: toArtifactKind(a.artifact_type),
      title: a.title,
      content_json: a.content_json,
      content_markdown: a.content_markdown,
      media_url: a.media_url,
      created_at: a.created_at
    }));
  },

  async generateStudioArtifact(
    notebookId: NotebookId,
    artifactType: BackendArtifactType,
    customInstructions?: string
  ): Promise<StudioArtifact> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      artifact_type: BackendArtifactType;
      title: string;
      content_json?: string;
      content_markdown?: string;
      media_url?: string;
      created_at: string;
    }>(`/notebooks/${notebookId}/studio/generate`, {
      method: 'POST',
      body: JSON.stringify({
        artifact_type: artifactType,
        custom_instructions: customInstructions
      })
    });
    return {
      id: asArtifactId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      artifact_type: raw.artifact_type,
      kind: toArtifactKind(raw.artifact_type),
      title: raw.title,
      content_json: raw.content_json,
      content_markdown: raw.content_markdown,
      media_url: raw.media_url,
      created_at: raw.created_at
    };
  },

  async deleteStudioArtifact(notebookId: NotebookId, artifactId: ArtifactId): Promise<void> {
    await request<void>(`/notebooks/${notebookId}/studio/${artifactId}`, {
      method: 'DELETE'
    });
  },

  async generateAudioOverview(notebookId: NotebookId): Promise<StudioArtifact> {
    const raw = await request<{
      id: string;
      notebook_id: string;
      artifact_type: BackendArtifactType;
      title: string;
      content_json?: string;
      content_markdown?: string;
      media_url?: string;
      created_at: string;
    }>(`/notebooks/${notebookId}/audio/generate`, {
      method: 'POST'
    });
    return {
      id: asArtifactId(raw.id),
      notebook_id: asNotebookId(raw.notebook_id),
      artifact_type: raw.artifact_type,
      kind: toArtifactKind(raw.artifact_type),
      title: raw.title,
      content_json: raw.content_json,
      content_markdown: raw.content_markdown,
      media_url: raw.media_url,
      created_at: raw.created_at
    };
  }
};
