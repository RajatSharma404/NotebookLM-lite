// ============================================================================
// NotebookLM-lite Strict Type Definitions
// Follows: typescript-pro, typescript-expert, typescript-advanced-types
// ============================================================================

// ----------------------------------------------------------------------------
// Branded Identifier Types
// ----------------------------------------------------------------------------
declare const __brand: unique symbol;
export type Brand<B extends string> = { readonly [__brand]?: B };

export type NotebookId = string & Brand<'NotebookId'>;
export type SourceId = string & Brand<'SourceId'>;
export type ChunkId = string & Brand<'ChunkId'>;
export type MessageId = string & Brand<'MessageId'>;
export type ThreadId = string & Brand<'ThreadId'>;
export type NoteId = string & Brand<'NoteId'>;
export type ArtifactId = string & Brand<'ArtifactId'>;

export const asNotebookId = (id: string): NotebookId => id as NotebookId;
export const asSourceId = (id: string): SourceId => id as SourceId;
export const asChunkId = (id: string): ChunkId => id as ChunkId;
export const asMessageId = (id: string): MessageId => id as MessageId;
export const asThreadId = (id: string): ThreadId => id as ThreadId;
export const asNoteId = (id: string): NoteId => id as NoteId;
export const asArtifactId = (id: string): ArtifactId => id as ArtifactId;

// ----------------------------------------------------------------------------
// Core Application Error
// ----------------------------------------------------------------------------
export interface AppError {
  code: string;
  message: string;
  retryable?: boolean;
  status?: number;
  details?: unknown;
}

export const createAppError = (code: string, message: string, retryable = false, status?: number): AppError => ({
  code,
  message,
  retryable,
  status
});

// ----------------------------------------------------------------------------
// Async State Discriminated Union (react-ui-patterns)
// ----------------------------------------------------------------------------
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AppError };

// ----------------------------------------------------------------------------
// Domain Entities
// ----------------------------------------------------------------------------
export interface Notebook {
  id: NotebookId;
  title: string;
  created_at: string;
  updated_at: string;
  source_count: number;
  note_count: number;
}

export interface Source {
  id: SourceId;
  notebook_id: NotebookId;
  filename: string;
  file_type: string;
  file_size: number;
  token_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ChunkItem {
  id: ChunkId;
  source_id: SourceId;
  notebook_id: NotebookId;
  page_number: number;
  section_title?: string;
  content: string;
  char_start: number;
  char_end: number;
}

// ----------------------------------------------------------------------------
// Citation Discriminated Union
// ----------------------------------------------------------------------------
export type Citation =
  | {
      kind: 'chunk';
      sourceId: SourceId;
      chunkId?: ChunkId;
      sourceTitle?: string;
      page?: number;
      quote?: string;
      marker?: number;
    }
  | {
      kind: 'unresolved';
      marker: number;
    };

export interface CitationItemPayload {
  index: number;
  chunk_id?: string;
  source_id?: string;
  source_title: string;
  page_number: number;
  snippet: string;
}

export type CitationItem = CitationItemPayload;

// ----------------------------------------------------------------------------
// Messages & Stream Events
// ----------------------------------------------------------------------------
export interface Message {
  id: MessageId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  citations: CitationItem[];
}

export interface ChatThread {
  id: ThreadId;
  notebook_id: NotebookId;
  title: string;
  created_at: string;
  messages: Message[];
}

export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'citation'; marker: number; citation: Citation }
  | { type: 'done'; messageId: MessageId }
  | { type: 'error'; code: string; message: string; retryable: boolean };

// ----------------------------------------------------------------------------
// Studio Artifacts & Notes
// ----------------------------------------------------------------------------
export type ArtifactKind =
  | 'study-guide'
  | 'briefing'
  | 'faq-glossary'
  | 'timeline'
  | 'audio-overview';

export type BackendArtifactType =
  | 'study_guide'
  | 'briefing_doc'
  | 'faq'
  | 'timeline'
  | 'audio_overview';

export interface StudioArtifact {
  id: ArtifactId;
  notebook_id: NotebookId;
  artifact_type: BackendArtifactType;
  kind?: ArtifactKind;
  title: string;
  content_json?: string;
  content_markdown?: string;
  media_url?: string;
  created_at: string;
}

export interface Note {
  id: NoteId;
  notebook_id: NotebookId;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Chunk Auditor Flags (Phase 3)
// ----------------------------------------------------------------------------
export type ChunkIssueType = 'empty' | 'oversized' | 'duplicate' | 'mid-sentence';

export interface ChunkAuditFlag {
  type: ChunkIssueType;
  description: string;
}

// ----------------------------------------------------------------------------
// Converters & Type Guards
// ----------------------------------------------------------------------------
export function toArtifactKind(type: BackendArtifactType | string): ArtifactKind {
  switch (type) {
    case 'study_guide':
      return 'study-guide';
    case 'briefing_doc':
      return 'briefing';
    case 'faq':
      return 'faq-glossary';
    case 'timeline':
      return 'timeline';
    case 'audio_overview':
      return 'audio-overview';
    default:
      return 'study-guide';
  }
}

export function toBackendArtifactType(kind: ArtifactKind): BackendArtifactType {
  switch (kind) {
    case 'study-guide':
      return 'study_guide';
    case 'briefing':
      return 'briefing_doc';
    case 'faq-glossary':
      return 'faq';
    case 'timeline':
      return 'timeline';
    case 'audio-overview':
      return 'audio_overview';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isStreamEvent(data: unknown): data is StreamEvent {
  if (typeof data !== 'object' || data === null) return false;
  const evt = data as { type?: unknown };
  return (
    evt.type === 'token' ||
    evt.type === 'citation' ||
    evt.type === 'done' ||
    evt.type === 'error'
  );
}

// Exhaustive pattern-matching check
export function assertExhaustive(value: never, message = 'Unexpected union value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
