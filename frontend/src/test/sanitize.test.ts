// ============================================================================
// Sanitization & Security Unit Tests
// Follows: vitest-skill, frontend-security-coder
// ============================================================================

import { describe, it, expect } from 'vitest';
import { sanitizeFilename, dedupeFilenames, isValidExternalLink } from '../utils/sanitize';

describe('sanitizeFilename', () => {
  it('strips directory traversal sequences', () => {
    expect(sanitizeFilename('../../secret.txt')).toBe('secret.txt');
    expect(sanitizeFilename('..\\..\\passwords.csv')).toBe('passwords.csv');
  });

  it('strips control characters and null bytes', () => {
    expect(sanitizeFilename('file\x00name\x1F.pdf')).toBe('filename.pdf');
  });

  it('strips illegal filename characters', () => {
    expect(sanitizeFilename('my<invalid>:file"name?.md')).toBe('my_invalid_file_name_.md');
  });

  it('caps length while preserving extension', () => {
    const longName = 'a'.repeat(200) + '.pdf';
    const sanitized = sanitizeFilename(longName, 50);
    expect(sanitized.length).toBeLessThanOrEqual(50);
    expect(sanitized.endsWith('.pdf')).toBe(true);
  });

  it('provides safe fallback for empty or whitespace-only names', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename('   ')).toBe('untitled');
    expect(sanitizeFilename('...')).toBe('untitled');
  });
});

describe('dedupeFilenames', () => {
  it('deduplicates collisions with sequential counters', () => {
    const inputs = ['notes.md', 'notes.md', 'summary.txt', 'notes.md'];
    const results = dedupeFilenames(inputs);
    expect(results).toEqual(['notes.md', 'notes_1.md', 'summary.txt', 'notes_2.md']);
  });
});

describe('isValidExternalLink', () => {
  it('allows safe protocols', () => {
    expect(isValidExternalLink('https://arxiv.org/abs/1706.03762')).toBe(true);
    expect(isValidExternalLink('http://example.com')).toBe(true);
    expect(isValidExternalLink('mailto:researcher@lab.org')).toBe(true);
  });

  it('blocks dangerous XSS protocols', () => {
    expect(isValidExternalLink('javascript:alert(1)')).toBe(false);
    expect(isValidExternalLink('JAVASCRIPT:void(0)')).toBe(false);
    expect(isValidExternalLink('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidExternalLink('vbscript:msgbox(1)')).toBe(false);
  });
});
