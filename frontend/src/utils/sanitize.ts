// ============================================================================
// Sanitization & Security Utilities
// Follows: frontend-security-coder, api-security-best-practices
// ============================================================================

/**
 * Sanitizes a filename for file system and ZIP archive exports:
 * 1. Strips directory traversal sequences ('..', '/', '\\')
 * 2. Strips ASCII control characters (0x00 - 0x1F, 0x7F)
 * 3. Strips special reserved characters
 * 4. Caps filename length (default 128 chars)
 * 5. Guarantees non-empty filename fallback
 */
export function sanitizeFilename(name: string, maxLength = 128): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }

  // 1. Strip directory traversal sequences ('../' or '..\')
  let clean = name.replace(/(?:\.\.[/\\])+/g, '');

  // 2. Convert remaining path separators to underscore
  clean = clean.replace(/[/\\]+/g, '_');

  // 3. Strip ASCII control characters and null bytes
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

  // 4. Strip or replace reserved/unsafe characters
  clean = clean.replace(/[<>:"|?*]/g, '_');

  // 5. Deduplicate underscores
  clean = clean.replace(/_+/g, '_');

  // 6. Trim leading/trailing dots and underscores
  clean = clean.trim().replace(/^[\._]+|[\._]+$/g, '');

  // 7. Cap length while preserving extension if possible
  if (clean.length > maxLength) {
    const lastDot = clean.lastIndexOf('.');
    if (lastDot > 0 && clean.length - lastDot <= 10) {
      const ext = clean.slice(lastDot);
      const base = clean.slice(0, maxLength - ext.length);
      clean = `${base}${ext}`;
    } else {
      clean = clean.slice(0, maxLength);
    }
  }

  return clean.length > 0 ? clean : 'untitled';
}

/**
 * Deduplicates filenames by appending sequential counters if collisions occur.
 */
export function dedupeFilenames(names: string[]): string[] {
  const seenCount = new Map<string, number>();
  const results: string[] = [];

  for (const name of names) {
    const sanitized = sanitizeFilename(name);
    const count = seenCount.get(sanitized) || 0;
    seenCount.set(sanitized, count + 1);

    if (count === 0) {
      results.push(sanitized);
    } else {
      const lastDot = sanitized.lastIndexOf('.');
      if (lastDot > 0) {
        const base = sanitized.slice(0, lastDot);
        const ext = sanitized.slice(lastDot);
        results.push(`${base}_${count}${ext}`);
      } else {
        results.push(`${sanitized}_${count}`);
      }
    }
  }

  return results;
}

/**
 * Validates external URLs against a strict protocol allowlist (http, https, mailto).
 * Rejects javascript:, data:, vbscript:, etc.
 */
export function isValidExternalLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();

  // Explicitly deny javascript:, vbscript:, data:
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return false;
  }

  try {
    const parsed = new URL(url, 'http://localhost');
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
