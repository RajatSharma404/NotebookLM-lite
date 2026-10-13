// ============================================================================
// Text Formatting & Truncation Utilities
// ============================================================================

/**
 * Truncates string in the middle with an ellipsis, preserving the extension.
 */
export function middleEllipsis(str: string, maxLen = 24): string {
  if (!str || str.length <= maxLen) return str;

  const lastDot = str.lastIndexOf('.');
  const ext = lastDot > 0 && str.length - lastDot <= 8 ? str.slice(lastDot) : '';
  const available = maxLen - ext.length - 3; // 3 for '...'

  if (available <= 2) return str.slice(0, maxLen - 3) + '...';

  const half = Math.floor(available / 2);
  const start = str.slice(0, half);
  const end = str.slice(str.length - ext.length - (available - half), str.length - ext.length);

  return `${start}...${end}${ext}`;
}

/**
 * Formats token count with commas
 */
export function formatTokens(tokens: number): string {
  return new Intl.NumberFormat().format(tokens);
}

/**
 * Formats byte size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
