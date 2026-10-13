// ============================================================================
// Chunk Auditor Pure Client-Side Rules
// Follows: typescript-pro, react-ui-patterns
// ============================================================================

import { ChunkItem, ChunkAuditFlag } from '../types';

export const CHUNK_AUDITOR_CONFIG = {
  OVERSIZED_CHAR_THRESHOLD: 6000, // ~1500 tokens
  MIN_CONTENT_LENGTH: 1
};

/**
 * Audits an array of chunks for data quality issues:
 * 1. empty: content is whitespace only
 * 2. oversized: character length exceeds threshold
 * 3. duplicate: exact identical text as another chunk
 * 4. mid-sentence: ends abruptly without punctuation
 */
export function auditChunks(chunks: ChunkItem[]): Map<string, ChunkAuditFlag[]> {
  const flagsByChunkId = new Map<string, ChunkAuditFlag[]>();
  const seenContentHashes = new Set<string>();

  for (const chunk of chunks) {
    const flags: ChunkAuditFlag[] = [];
    const text = chunk.content ? chunk.content.trim() : '';

    // 1. Empty Check
    if (text.length < CHUNK_AUDITOR_CONFIG.MIN_CONTENT_LENGTH) {
      flags.push({
        type: 'empty',
        description: 'Chunk contains zero text or only whitespace.'
      });
    }

    // 2. Oversized Check
    if (text.length > CHUNK_AUDITOR_CONFIG.OVERSIZED_CHAR_THRESHOLD) {
      flags.push({
        type: 'oversized',
        description: `Chunk exceeds ${CHUNK_AUDITOR_CONFIG.OVERSIZED_CHAR_THRESHOLD} characters (${text.length} chars).`
      });
    }

    // 3. Duplicate Check
    const normalized = text.toLowerCase();
    if (normalized.length > 20) {
      if (seenContentHashes.has(normalized)) {
        flags.push({
          type: 'duplicate',
          description: 'Identical chunk text detected in this source.'
        });
      } else {
        seenContentHashes.add(normalized);
      }
    }

    // 4. Mid-Sentence Check
    if (text.length > 30) {
      const lastChar = text.slice(-1);
      const endsWithPunctuation = /[.!?:"')\]}\n]/.test(lastChar);
      if (!endsWithPunctuation) {
        flags.push({
          type: 'mid-sentence',
          description: 'Chunk ends abruptly mid-sentence without terminal punctuation.'
        });
      }
    }

    flagsByChunkId.set(chunk.id, flags);
  }

  return flagsByChunkId;
}
