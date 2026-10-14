from datetime import datetime

from pydantic import BaseModel, Field


# Notebook Schemas
class NotebookBase(BaseModel):
    title: str = Field(default="Untitled Notebook", max_length=255)

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)

class NotebookResponse(NotebookBase):
    id: str
    created_at: datetime
    updated_at: datetime
    source_count: int = 0
    note_count: int = 0

    class Config:
        from_attributes = True

# Source Schemas
class SourceBase(BaseModel):
    filename: str
    file_type: str
    is_active: bool = True

class SourcePasteCreate(BaseModel):
    title: str = Field(..., max_length=255)
    content: str = Field(..., min_length=1)

class SourceToggleRequest(BaseModel):
    is_active: bool

class SourceResponse(SourceBase):
    id: str
    notebook_id: str
    file_size: int
    token_count: int
    created_at: datetime
    parser_version: str | None = None
    chunker_version: str | None = None

    class Config:
        from_attributes = True

# Citation & Chunk Schemas
class CitationItem(BaseModel):
    index: int
    chunk_id: str | None = None
    source_id: str | None = None
    source_title: str
    page_number: int = 1
    snippet: str
    snippet_char_start: int | None = None
    snippet_char_end: int | None = None
    rerank_score: float | None = None
    verification_status: str | None = None
    verification_score: float | None = None
    flags: list[str] | None = None

class ChunkResponse(BaseModel):
    id: str
    source_id: str
    notebook_id: str
    page_number: int
    section_title: str | None = None
    content: str
    char_start: int
    char_end: int

    class Config:
        from_attributes = True

# Chat & Message Schemas
class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    thread_id: str | None = None
    llm_provider: str | None = None  # gemini, openai, anthropic, ollama
    model_name: str | None = None

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    citations: list[CitationItem] = []

    class Config:
        from_attributes = True

class ChatThreadResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    created_at: datetime
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True

# Notes Schemas
class NoteCreate(BaseModel):
    title: str = Field(default="Untitled Note", max_length=255)
    content: str = ""

class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None

class NoteResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SynthesizeNotesRequest(BaseModel):
    note_ids: list[str] = Field(..., min_length=2)
    instructions: str | None = None

# Studio Artifact Schemas
class StudioArtifactGenerateRequest(BaseModel):
    artifact_type: str = Field(..., description="study_guide | briefing_doc | faq | timeline | audio_overview")
    custom_instructions: str | None = None

class StudioArtifactResponse(BaseModel):
    id: str
    notebook_id: str
    artifact_type: str
    title: str
    content_json: str | None = None
    content_markdown: str | None = None
    media_url: str | None = None
    chunks_total: int | None = None
    chunks_used: int | None = None
    sources_used: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True

# Audio Overview Schemas
class DialogueLine(BaseModel):
    speaker: str  # Alex | Morgan
    voice_id: str
    text: str

class AudioOverviewResponse(BaseModel):
    artifact_id: str
    title: str
    dialogue: list[DialogueLine]
    audio_url: str | None = None
    duration_seconds: float | None = None

# Job System Schemas
class JobResponse(BaseModel):
    id: str
    kind: str
    notebook_id: str | None = None
    status: str
    stage: str | None = None
    progress: float = 0.0
    result_ref: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    class Config:
        from_attributes = True
