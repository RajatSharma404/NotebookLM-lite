// ============================================================================
// Audio Waveform & Scrubber Pure Mathematical Functions
// Follows: fixing-motion-performance, typescript-pro
// ============================================================================

/**
 * Calculates seek time in seconds from pointer coordinate.
 * Clamps result between 0 and duration.
 */
export function seekFromPointer(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  duration: number
): number {
  if (rectWidth <= 0 || duration <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, (clientX - rectLeft) / rectWidth));
  return ratio * duration;
}

/**
 * Formats seconds into MM:SS tabular format
 */
export function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const m = String(mins).padStart(2, '0');
  const s = String(secs).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Generates a deterministic 52-bar waveform envelope
 * Normalized heights between 0.15 and 1.0.
 */
export function generateDeterministicBars(count = 52, seedStr = 'notebooklm'): number[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Trigonometric envelope with pseudo-random harmonics
    const progress = i / count;
    const wave = Math.sin(progress * Math.PI) * 0.6;
    const harmonic1 = Math.sin(i * 0.4 + seed) * 0.25;
    const harmonic2 = Math.cos(i * 0.7 - seed) * 0.15;
    const height = Math.max(0.15, Math.min(1.0, wave + harmonic1 + harmonic2 + 0.35));
    bars.push(parseFloat(height.toFixed(3)));
  }

  return bars;
}
