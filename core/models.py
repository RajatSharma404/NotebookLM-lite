import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from core.database import Base

def generate_id(prefix: str = "") -> str:
    short_uuid = uuid.uuid4().hex[:12]
    return f"{prefix}_{short_uuid}" if prefix else short_uuid

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("nb"))
    title = Column(String(255), nullable=False, default="Untitled Notebook")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    sources = relationship("Source", back_populates="notebook", cascade="all, delete-orphan")
    chat_threads = relationship("ChatThread", back_populates="notebook", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="notebook", cascade="all, delete-orphan")
    studio_artifacts = relationship("StudioArtifact", back_populates="notebook", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("src"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)  # pdf, md, txt, docx, paste
    file_size = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    file_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="sources")
    chunks = relationship("Chunk", back_populates="source", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("chk"))
    source_id = Column(String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, default=1)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    char_start = Column(Integer, default=0)
    char_end = Column(Integer, default=0)
    sha256 = Column(String(64), nullable=True)
    vector_id = Column(String(64), nullable=True)

    # Relationships
    source = relationship("Source", back_populates="chunks")

class ChatThread(Base):
    __tablename__ = "chat_threads"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("thd"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="General Inquiry")
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="chat_threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("msg"))
    thread_id = Column(String(36), ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(32), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    thread = relationship("ChatThread", back_populates="messages")
    citations = relationship("CitationRef", back_populates="message", cascade="all, delete-orphan")

class CitationRef(Base):
    __tablename__ = "citation_refs"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("cit"))
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    citation_index = Column(Integer, nullable=False)
    chunk_id = Column(String(36), nullable=True)
    source_id = Column(String(36), nullable=True)
    source_title = Column(String(255), nullable=False)
    page_number = Column(Integer, default=1)
    snippet = Column(Text, nullable=False)

    # Relationships
    message = relationship("Message", back_populates="citations")

class Note(Base):
    __tablename__ = "notes"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("not"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Untitled Note")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="notes")

class StudioArtifact(Base):
    __tablename__ = "studio_artifacts"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("art"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False)
    artifact_type = Column(String(64), nullable=False)  # study_guide, briefing_doc, faq, timeline, audio_overview
    title = Column(String(255), nullable=False)
    content_json = Column(Text, nullable=True)
    content_markdown = Column(Text, nullable=True)
    media_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="studio_artifacts")
