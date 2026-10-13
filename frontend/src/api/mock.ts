// ============================================================================
// NotebookLM-lite Typed Mock Adapter
// Follows: typescript-pro, react-ui-patterns
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
  toArtifactKind
} from '../types';

const INITIAL_NOTEBOOK_ID = asNotebookId('nb_mock_001');

let mockNotebooks: Notebook[] = [
  {
    id: INITIAL_NOTEBOOK_ID,
    title: 'Attention Mechanism & Transformers',
    source_count: 2,
    note_count: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

let mockSources: Source[] = [
  {
    id: asSourceId('src_mock_001'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    filename: 'vaswani2017_attention.pdf',
    file_type: '.pdf',
    file_size: 2211840,
    token_count: 12450,
    is_active: true,
    created_at: new Date(Date.now() - 72000000).toISOString()
  },
  {
    id: asSourceId('src_mock_002'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    filename: 'residual_learning_he2015.md',
    file_type: '.md',
    file_size: 450000,
    token_count: 5200,
    is_active: true,
    created_at: new Date(Date.now() - 54000000).toISOString()
  }
];

let mockChunks: ChunkItem[] = [
  {
    id: asChunkId('chk_001'),
    source_id: asSourceId('src_mock_001'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    page_number: 1,
    section_title: '1. Introduction',
    content: 'Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states.',
    char_start: 0,
    char_end: 215
  },
  {
    id: asChunkId('chk_002'),
    source_id: asSourceId('src_mock_001'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    page_number: 3,
    section_title: '3.2 Multi-Head Attention',
    content: 'An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. Scaled Dot-Product Attention computes the dot products of the query with all keys, divided by sqrt(d_k).',
    char_start: 1200,
    char_end: 1475
  }
];

let mockNotes: Note[] = [
  {
    id: asNoteId('note_001'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    title: 'Self-Attention Complexity',
    content: 'Computational complexity per layer: Self-Attention is O(n^2 * d) while Recurrent is O(n * d^2). When sequence length n is smaller than representation dimension d, self-attention is substantially faster.',
    created_at: new Date(Date.now() - 36000000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

let mockArtifacts: StudioArtifact[] = [
  {
    id: asArtifactId('art_001'),
    notebook_id: INITIAL_NOTEBOOK_ID,
    artifact_type: 'study_guide',
    kind: 'study-guide',
    title: 'Study Guide: Attention Architecture',
    content_markdown: '# Study Guide: Attention & Self-Attention\n\n### Key Concepts\n- **Scaled Dot-Product Attention**: Solves vanishing gradients for large dimensions.\n- **Multi-Head Projections**: Allows attending to information from different representation subspaces.\n\n### Core Invariant\nEliminates recurrence completely in favor of parallelized matrix products.',
    created_at: new Date(Date.now() - 18000000).toISOString()
  }
];

export const mockApiClient = {
  async getNotebooks(): Promise<Notebook[]> {
    return [...mockNotebooks];
  },

  async createNotebook(title = 'Untitled Notebook'): Promise<Notebook> {
    const nb: Notebook = {
      id: asNotebookId(`nb_mock_${Date.now()}`),
      title,
      source_count: 0,
      note_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockNotebooks.push(nb);
    return nb;
  },

  async updateNotebook(id: NotebookId, title: string): Promise<Notebook> {
    const nb = mockNotebooks.find((n) => n.id === id);
    if (!nb) throw new Error('Notebook not found');
    nb.title = title;
    nb.updated_at = new Date().toISOString();
    return { ...nb };
  },

  async deleteNotebook(id: NotebookId): Promise<void> {
    mockNotebooks = mockNotebooks.filter((n) => n.id !== id);
  },

  getExportZipUrl(id: NotebookId): string {
    return `/api/notebooks/${id}/export`;
  },

  async getSources(notebookId: NotebookId): Promise<Source[]> {
    return mockSources.filter((s) => s.notebook_id === notebookId);
  },

  async uploadSource(notebookId: NotebookId, file: File): Promise<Source> {
    const s: Source = {
      id: asSourceId(`src_mock_${Date.now()}`),
      notebook_id: notebookId,
      filename: file.name,
      file_type: `.${file.name.split('.').pop() || 'txt'}`,
      file_size: file.size,
      token_count: Math.floor(file.size / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    mockSources.push(s);
    return s;
  },

  async pasteSource(notebookId: NotebookId, title: string, content: string): Promise<Source> {
    const s: Source = {
      id: asSourceId(`src_mock_${Date.now()}`),
      notebook_id: notebookId,
      filename: `${title.toLowerCase().replace(/\s+/g, '_')}.txt`,
      file_type: '.txt',
      file_size: content.length,
      token_count: Math.floor(content.length / 4),
      is_active: true,
      created_at: new Date().toISOString()
    };
    mockSources.push(s);
    return s;
  },

  async toggleSource(notebookId: NotebookId, sourceId: SourceId, isActive: boolean): Promise<Source> {
    const s = mockSources.find((src) => src.id === sourceId && src.notebook_id === notebookId);
    if (!s) throw new Error('Source not found');
    s.is_active = isActive;
    return { ...s };
  },

  async deleteSource(notebookId: NotebookId, sourceId: SourceId): Promise<void> {
    mockSources = mockSources.filter((src) => !(src.id === sourceId && src.notebook_id === notebookId));
  },

  async getSourceChunks(notebookId: NotebookId, sourceId: SourceId): Promise<ChunkItem[]> {
    return mockChunks.filter((c) => c.source_id === sourceId && c.notebook_id === notebookId);
  },

  async getChatThreads(notebookId: NotebookId): Promise<ChatThread[]> {
    return [
      {
        id: asThreadId('th_mock_001'),
        notebook_id: notebookId,
        title: 'Initial Research Query',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        messages: [
          {
            id: asMessageId('msg_001'),
            role: 'user',
            content: 'How does scaled dot-product attention compute scores?',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            citations: []
          },
          {
            id: asMessageId('msg_002'),
            role: 'assistant',
            content: 'According to the architecture specification [1], Scaled Dot-Product Attention takes queries and keys of dimension $d_k$, and values of dimension $d_v$. It computes the dot products of the query with all keys, divides each by $\\sqrt{d_k}$, and applies a softmax function to obtain weights on the values [2].',
            created_at: new Date(Date.now() - 3550000).toISOString(),
            citations: [
              {
                index: 1,
                chunk_id: 'chk_001',
                source_id: 'src_mock_001',
                source_title: 'vaswani2017_attention.pdf',
                page_number: 1,
                snippet: 'Recurrent models typically factor computation along symbol positions.'
              },
              {
                index: 2,
                chunk_id: 'chk_002',
                source_id: 'src_mock_001',
                source_title: 'vaswani2017_attention.pdf',
                page_number: 3,
                snippet: 'Scaled Dot-Product Attention computes the dot products of the query with all keys.'
              }
            ]
          }
        ]
      }
    ];
  },

  async streamChat(
    notebookId: NotebookId,
    query: string,
    options: {
      threadId?: ThreadId;
      onEvent: (event: StreamEvent) => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    // Emit citations first
    options.onEvent({
      type: 'citation',
      marker: 1,
      citation: {
        kind: 'chunk',
        marker: 1,
        sourceId: asSourceId('src_mock_001'),
        chunkId: asChunkId('chk_002'),
        sourceTitle: 'vaswani2017_attention.pdf',
        page: 3,
        quote: 'Scaled Dot-Product Attention computes the dot products of the query with all keys.'
      }
    });

    const responseTokens = [
      'Based ', 'on ', 'the ', 'grounded ', 'sources ', '[1], ',
      'the ', 'query ', 'and ', 'keys ', 'are ', 'multiplied ',
      'together ', 'and ', 'scaled ', 'by ', '$\\frac{1}{\\sqrt{d_k}}$. ',
      'This ', 'prevents ', 'extremely ', 'small ', 'gradients ',
      'in ', 'softmax ', 'when ', '$d_k$ ', 'is ', 'large.'
    ];

    for (const token of responseTokens) {
      if (options.signal?.aborted) return;
      await new Promise((r) => setTimeout(r, 25));
      options.onEvent({ type: 'token', text: token });
    }

    options.onEvent({ type: 'done', messageId: asMessageId(`msg_${Date.now()}`) });
  },

  async getNotes(notebookId: NotebookId): Promise<Note[]> {
    return mockNotes.filter((n) => n.notebook_id === notebookId);
  },

  async createNote(notebookId: NotebookId, title: string, content: string): Promise<Note> {
    const n: Note = {
      id: asNoteId(`note_${Date.now()}`),
      notebook_id: notebookId,
      title,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockNotes.push(n);
    return n;
  },

  async updateNote(
    notebookId: NotebookId,
    noteId: NoteId,
    updates: { title?: string; content?: string }
  ): Promise<Note> {
    const n = mockNotes.find((item) => item.id === noteId && item.notebook_id === notebookId);
    if (!n) throw new Error('Note not found');
    if (updates.title !== undefined) n.title = updates.title;
    if (updates.content !== undefined) n.content = updates.content;
    n.updated_at = new Date().toISOString();
    return { ...n };
  },

  async deleteNote(notebookId: NotebookId, noteId: NoteId): Promise<void> {
    mockNotes = mockNotes.filter((item) => !(item.id === noteId && item.notebook_id === notebookId));
  },

  async synthesizeNotes(notebookId: NotebookId, noteIds: NoteId[]): Promise<Note> {
    const matched = mockNotes.filter((n) => noteIds.includes(n.id) && n.notebook_id === notebookId);
    const content = `# Synthesized Study Note\n\nCombined insights from ${matched.length} notes:\n\n` +
      matched.map((m) => `## ${m.title}\n${m.content}`).join('\n\n');
    return this.createNote(notebookId, 'Synthesis: Combined Notes', content);
  },

  async getStudioArtifacts(notebookId: NotebookId): Promise<StudioArtifact[]> {
    return mockArtifacts.filter((a) => a.notebook_id === notebookId);
  },

  async generateStudioArtifact(
    notebookId: NotebookId,
    artifactType: BackendArtifactType,
    customInstructions?: string
  ): Promise<StudioArtifact> {
    const art: StudioArtifact = {
      id: asArtifactId(`art_${Date.now()}`),
      notebook_id: notebookId,
      artifact_type: artifactType,
      kind: toArtifactKind(artifactType),
      title: `${artifactType.replace('_', ' ').toUpperCase()} Overview`,
      content_markdown: `# Generated ${artifactType}\n\nStrictly synthesized from your active notebook sources.\n\n${customInstructions ? `*Instructions: ${customInstructions}*\n\n` : ''}- Point 1: Empirical observation\n- Point 2: Theoretical implication`,
      created_at: new Date().toISOString()
    };
    mockArtifacts.push(art);
    return art;
  },

  async deleteStudioArtifact(notebookId: NotebookId, artifactId: ArtifactId): Promise<void> {
    mockArtifacts = mockArtifacts.filter((a) => !(a.id === artifactId && a.notebook_id === notebookId));
  },

  async generateAudioOverview(notebookId: NotebookId): Promise<StudioArtifact> {
    const art: StudioArtifact = {
      id: asArtifactId(`art_audio_${Date.now()}`),
      notebook_id: notebookId,
      artifact_type: 'audio_overview',
      kind: 'audio-overview',
      title: 'Deep Dive: Attention Podcast',
      media_url: '/api/audio/stream/mock_audio.mp3',
      content_markdown: '# Audio Discussion Overview\n\n**Host Alex & Morgan**: Deep dive into transformers and attention mechanisms.',
      created_at: new Date().toISOString()
    };
    mockArtifacts.push(art);
    return art;
  }
};
