from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Notebook Schemas
class NotebookBase(BaseModel):
    title: str = Field(default="Untitled Notebook", max_length=255)

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)

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

    class Config:
        from_attributes = True

# Citation & Chunk Schemas
class CitationItem(BaseModel):
    index: int
    chunk_id: Optional[str] = None
    source_id: Optional[str] = None
    source_title: str
    page_number: int = 1
    snippet: str

class ChunkResponse(BaseModel):
    id: str
    source_id: str
    notebook_id: str
    page_number: int
    section_title: Optional[str] = None
    content: str
    char_start: int
    char_end: int

    class Config:
        from_attributes = True

# Chat & Message Schemas
class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    thread_id: Optional[str] = None
    llm_provider: Optional[str] = None  # gemini, openai, anthropic, ollama
    model_name: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    citations: List[CitationItem] = []

    class Config:
        from_attributes = True

class ChatThreadResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# Notes Schemas
class NoteCreate(BaseModel):
    title: str = Field(default="Untitled Note", max_length=255)
    content: str = ""

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

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
    note_ids: List[str] = Field(..., min_length=2)
    instructions: Optional[str] = None

# Studio Artifact Schemas
class StudioArtifactGenerateRequest(BaseModel):
    artifact_type: str = Field(..., description="study_guide | briefing_doc | faq | timeline | audio_overview")
    custom_instructions: Optional[str] = None

class StudioArtifactResponse(BaseModel):
    id: str
    notebook_id: str
    artifact_type: str
    title: str
    content_json: Optional[str] = None
    content_markdown: Optional[str] = None
    media_url: Optional[str] = None
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
    dialogue: List[DialogueLine]
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
