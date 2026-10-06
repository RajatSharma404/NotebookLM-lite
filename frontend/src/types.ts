export interface Notebook {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  source_count: number;
  note_count: number;
}

export interface Source {
  id: string;
  notebook_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  token_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CitationItem {
  index: number;
  chunk_id?: string;
  source_id?: string;
  source_title: string;
  page_number: number;
  snippet: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  citations: CitationItem[];
}

export interface Note {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface StudioArtifact {
  id: string;
  notebook_id: string;
  artifact_type: 'study_guide' | 'briefing_doc' | 'faq' | 'timeline' | 'audio_overview';
  title: string;
  content_json?: string;
  content_markdown?: string;
  media_url?: string;
  created_at: string;
}
