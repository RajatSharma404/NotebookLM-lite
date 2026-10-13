// ============================================================================
// ExportNotebookButton Component
// Follows: frontend-security-coder, react-best-practices
// ============================================================================

import React, { useState } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';
import { sanitizeFilename, dedupeFilenames } from '../utils/sanitize';
import { Download } from 'lucide-react';

export function ExportNotebookButton() {
  const { notebooks, activeNotebookId, sources, messages, notes, artifacts } = useNotebookStore();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);

  const handleExport = async () => {
    setIsExporting(true);
    showToast({ message: 'Generating notebook ZIP bundle...' });

    try {
      // Dynamic import of fflate (code-splitting requirement)
      const { zipSync, strToU8 } = await import('fflate');

      const archiveFiles: Record<string, Uint8Array> = {};

      // 1. notebook.json
      const notebookMeta = {
        title: activeNotebook?.title || 'Untitled Notebook',
        exportedAt: new Date().toISOString(),
        sources: sources.map((s) => ({
          filename: s.filename,
          tokens: s.token_count,
          size: s.file_size
        })),
        notesCount: notes.length,
        artifactsCount: artifacts.length
      };
      archiveFiles['notebook.json'] = strToU8(JSON.stringify(notebookMeta, null, 2));

      // 2. notes/*.md with sanitized and deduplicated names
      const rawNoteNames = notes.map((n) => `${n.title}.md`);
      const sanitizedNoteNames = dedupeFilenames(rawNoteNames);
      notes.forEach((note, i) => {
        const safeName = sanitizedNoteNames[i];
        archiveFiles[`notes/${safeName}`] = strToU8(`# ${note.title}\n\n${note.content}`);
      });

      // 3. artifacts/*.md with sanitized and deduplicated names
      const rawArtifactNames = artifacts.map((a) => `${a.title}.md`);
      const sanitizedArtifactNames = dedupeFilenames(rawArtifactNames);
      artifacts.forEach((art, i) => {
        const safeName = sanitizedArtifactNames[i];
        const content = art.content_markdown || '# Untitled\n';
        archiveFiles[`artifacts/${safeName}`] = strToU8(content);
      });

      // 4. chat_transcript.md with citations resolved as markdown footnotes
      let transcriptMd = `# Chat Transcript: ${activeNotebook?.title || 'Research Inquiry'}\n\n`;
      messages.forEach((msg, mi) => {
        if (msg.role === 'user') {
          transcriptMd += `### User\n*${msg.content}*\n\n`;
        } else {
          transcriptMd += `### Assistant\n${msg.content}\n\n`;
          if (msg.citations && msg.citations.length > 0) {
            transcriptMd += `**Footnotes:**\n`;
            msg.citations.forEach((c) => {
              const marker = 'marker' in c ? c.marker : ('index' in c ? (c as { index: number }).index : 1);
              const title = 'sourceTitle' in c ? c.sourceTitle : ('source_title' in c ? (c as { source_title: string }).source_title : 'Source');
              const quote = 'quote' in c ? c.quote : ('snippet' in c ? (c as { snippet: string }).snippet : '');
              transcriptMd += `[^${marker}]: ${title} ${quote ? `— "${quote}"` : ''}\n`;
            });
            transcriptMd += '\n';
          }
        }
      });
      archiveFiles['chat_transcript.md'] = strToU8(transcriptMd);

      // Create ZIP bundle
      const zipped = zipSync(archiveFiles);

      // Trigger safe download with Blob & revoke URL
      const blob = new Blob([zipped], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const safeArchiveName = sanitizeFilename(`${activeNotebook?.title || 'notebook'}_export.zip`);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeArchiveName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke Object URL immediately (security requirement)
      URL.revokeObjectURL(blobUrl);

      showToast({ message: 'Notebook exported successfully' });
    } catch (err: unknown) {
      showToast({
        message: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      leftIcon={<Download size={13} />}
      isLoading={isExporting}
      onClick={handleExport}
      title="Export notebook archive as ZIP"
    >
      Export ZIP
    </Button>
  );
}

export default ExportNotebookButton;
