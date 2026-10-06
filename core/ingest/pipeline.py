import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from core.config import settings
from core.models import Source, Chunk
from core.ingest.pdf_parser import PDFParser
from core.ingest.md_parser import MarkdownParser
from core.ingest.docx_parser import DocxParser
from core.ingest.chunker import SemanticChunker

class IngestionPipeline:
    @staticmethod
    def process_file(
        notebook_id: str,
        filename: str,
        temp_file_path: Path,
        db: Session
    ) -> Source:
        """
        Ingests an uploaded file, extracts text, chunks it, and saves metadata into DB.
        """
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        
        # Save file to permanent uploads directory
        dest_filename = f"{notebook_id}_{os.urandom(4).hex()}_{filename}"
        dest_path = settings.STORAGE_UPLOADS_DIR / dest_filename
        shutil.copyfile(temp_file_path, dest_path)
        file_size = os.path.getsize(dest_path)

        # Parse sections based on extension
        if ext == "pdf":
            sections = PDFParser.parse(dest_path)
        elif ext in ["md", "markdown", "txt"]:
            sections = MarkdownParser.parse(dest_path)
        elif ext in ["docx", "doc"]:
            sections = DocxParser.parse(dest_path)
        else:
            sections = MarkdownParser.parse(dest_path)

        # Create source record
        source = Source(
            notebook_id=notebook_id,
            filename=filename,
            file_type=ext,
            file_size=file_size,
            file_path=str(dest_path),
            is_active=True
        )
        db.add(source)
        db.flush()  # Populates source.id

        # Chunk sections and persist
        total_tokens = 0
        all_chunks: List[Chunk] = []

        for sec in sections:
            raw_chunks = SemanticChunker.chunk_section(
                text=sec["text"],
                page_number=sec.get("page_number", 1),
                section_title=sec.get("section", "General")
            )
            for chk_data in raw_chunks:
                chunk = Chunk(
                    source_id=source.id,
                    notebook_id=notebook_id,
                    page_number=chk_data["page_number"],
                    section_title=chk_data["section_title"],
                    content=chk_data["content"],
                    char_start=chk_data["char_start"],
                    char_end=chk_data["char_end"],
                    sha256=chk_data["sha256"]
                )
                total_tokens += chk_data["token_count"]
                all_chunks.append(chunk)

        db.add_all(all_chunks)
        source.token_count = total_tokens
        db.commit()
        db.refresh(source)

        # Index chunks into ChromaDB
        try:
            from core.rag.chroma_store import chroma_store
            from core.rag.embeddings import embedding_provider
            
            chunk_records = [
                {
                    "id": c.id,
                    "notebook_id": c.notebook_id,
                    "source_id": c.source_id,
                    "page_number": c.page_number,
                    "section_title": c.section_title or "General",
                    "content": c.content
                }
                for c in all_chunks
            ]
            embeddings = embedding_provider.embed_batch([c["content"] for c in chunk_records])
            chroma_store.add_chunks(chunk_records, embeddings)
        except Exception:
            pass

        return source

    @staticmethod
    def process_pasted_text(
        notebook_id: str,
        title: str,
        content: str,
        db: Session
    ) -> Source:
        """
        Ingests user-pasted text as a source.
        """
        filename = f"{title}.txt" if not title.endswith(".txt") else title
        dest_filename = f"{notebook_id}_{os.urandom(4).hex()}_{filename}"
        dest_path = settings.STORAGE_UPLOADS_DIR / dest_filename

        with open(dest_path, "w", encoding="utf-8") as f:
            f.write(content)

        file_size = len(content.encode("utf-8"))

        source = Source(
            notebook_id=notebook_id,
            filename=filename,
            file_type="txt",
            file_size=file_size,
            file_path=str(dest_path),
            is_active=True
        )
        db.add(source)
        db.flush()

        raw_chunks = SemanticChunker.chunk_section(
            text=content,
            page_number=1,
            section_title="Pasted Notes"
        )

        total_tokens = 0
        all_chunks: List[Chunk] = []
        for chk_data in raw_chunks:
            chunk = Chunk(
                source_id=source.id,
                notebook_id=notebook_id,
                page_number=1,
                section_title=chk_data["section_title"],
                content=chk_data["content"],
                char_start=chk_data["char_start"],
                char_end=chk_data["char_end"],
                sha256=chk_data["sha256"]
            )
            total_tokens += chk_data["token_count"]
            all_chunks.append(chunk)

        db.add_all(all_chunks)
        source.token_count = total_tokens
        db.commit()
        db.refresh(source)

        try:
            from core.rag.chroma_store import chroma_store
            from core.rag.embeddings import embedding_provider

            chunk_records = [
                {
                    "id": c.id,
                    "notebook_id": c.notebook_id,
                    "source_id": c.source_id,
                    "page_number": c.page_number,
                    "section_title": c.section_title or "General",
                    "content": c.content
                }
                for c in all_chunks
            ]
            embeddings = embedding_provider.embed_batch([c["content"] for c in chunk_records])
            chroma_store.add_chunks(chunk_records, embeddings)
        except Exception:
            pass

        return source
