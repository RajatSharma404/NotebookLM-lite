import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from core.database import Base


def generate_id(prefix: str = "") -> str:
    short_uuid = uuid.uuid4().hex[:12]
    return f"{prefix}_{short_uuid}" if prefix else short_uuid

def utcnow() -> datetime:
    return datetime.now(UTC)

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
    jobs = relationship("Job", back_populates="notebook", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("src"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)  # pdf, md, txt, docx, paste
    file_size = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    file_path = Column(String(512), nullable=True)
    canonical_text = Column(Text, nullable=True)
    parser_version = Column(String(32), nullable=True, default="1.0.0")
    chunker_version = Column(String(32), nullable=True, default="1.0.0")
    created_at = Column(DateTime, default=utcnow)

    # Indexes
    __table_args__ = (
        Index("ix_sources_notebook_active", "notebook_id", "is_active"),
    )

    # Relationships
    notebook = relationship("Notebook", back_populates="sources")
    chunks = relationship("Chunk", back_populates="source", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("chk"))
    source_id = Column(String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True)
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, default=1)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    char_start = Column(Integer, default=0)
    char_end = Column(Integer, default=0)
    sha256 = Column(String(64), nullable=True, index=True)
    vector_id = Column(String(64), nullable=True)

    # Compound Indexes
    __table_args__ = (
        Index("ix_chunks_notebook_source", "notebook_id", "source_id"),
    )

    # Relationships
    source = relationship("Source", back_populates="chunks")

class ChatThread(Base):
    __tablename__ = "chat_threads"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("thd"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="General Inquiry")
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="chat_threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("msg"))
    thread_id = Column(String(36), ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    # Compound Indexes
    __table_args__ = (
        Index("ix_messages_thread_created", "thread_id", "created_at"),
    )

    # Relationships
    thread = relationship("ChatThread", back_populates="messages")
    citations = relationship("CitationRef", back_populates="message", cascade="all, delete-orphan")

class CitationRef(Base):
    __tablename__ = "citation_refs"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("cit"))
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    citation_index = Column(Integer, nullable=False)
    chunk_id = Column(String(36), nullable=True)
    source_id = Column(String(36), nullable=True)
    source_title = Column(String(255), nullable=False)
    page_number = Column(Integer, default=1)
    snippet = Column(Text, nullable=False)
    snippet_char_start = Column(Integer, nullable=True)
    snippet_char_end = Column(Integer, nullable=True)
    verification_status = Column(String(32), nullable=True)  # supported | unsupported | out_of_range | unchecked
    verification_score = Column(Float, nullable=True)

    # Relationships
    message = relationship("Message", back_populates="citations")

class Note(Base):
    __tablename__ = "notes"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("not"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Untitled Note")
    content = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="notes")

class StudioArtifact(Base):
    __tablename__ = "studio_artifacts"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("art"))
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_type = Column(String(64), nullable=False)  # study_guide, briefing_doc, faq, timeline, audio_overview
    title = Column(String(255), nullable=False)
    content_json = Column(Text, nullable=True)
    content_markdown = Column(Text, nullable=True)
    media_url = Column(String(512), nullable=True)
    chunks_total = Column(Integer, nullable=True)
    chunks_used = Column(Integer, nullable=True)
    sources_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    notebook = relationship("Notebook", back_populates="studio_artifacts")

class Job(Base):
    """
    Persisted asynchronous job records for upload ingestion, audio generation,
    studio synthesis, re-indexing, and maintenance operations.
    """
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: generate_id("job"))
    kind = Column(String(64), nullable=False)  # upload_ingest, audio_generate, studio_generate, reindex, reingest
    notebook_id = Column(String(36), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=True, index=True)
    status = Column(String(32), nullable=False, default="queued", index=True)  # queued, running, succeeded, failed, cancelled
    stage = Column(String(64), nullable=True)  # parsing, chunking, embedding, generating, synthesizing
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    result_ref = Column(Text, nullable=True)  # JSON or artifact/source ID
    error = Column(Text, nullable=True)
    idempotency_key = Column(String(128), nullable=True, index=True)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Compound Indexes
    __table_args__ = (
        Index("ix_jobs_notebook_status", "notebook_id", "status"),
    )

    # Relationships
    notebook = relationship("Notebook", back_populates="jobs")
