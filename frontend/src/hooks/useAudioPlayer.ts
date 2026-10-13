// ============================================================================
// useAudioPlayer Hook
// Follows: fixing-motion-performance, react-patterns
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseAudioPlayerOptions {
  audioUrl?: string;
  defaultDuration?: number;
}

export function useAudioPlayer({ audioUrl, defaultDuration = 180 }: UseAudioPlayerOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(defaultDuration);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Sync refs
  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;

  // Initialize Audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update src when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioUrl, playbackRate]);

  // Document visibility change listener (pauses animation loop when tab is hidden)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && isPlayingRef.current) {
        // Pauses when tab is hidden to save battery & CPU
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // requestAnimationFrame playback tick loop (runs ONLY while playing)
  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;
    let lastTimestamp = performance.now();

    function tick(now: number) {
      if (document.hidden) {
        lastTimestamp = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (audioRef.current && audioUrl) {
        setCurrentTime(audioRef.current.currentTime);
      } else {
        // Synthesized clock progression when using mock audio
        setCurrentTime((prev) => {
          const next = prev + deltaSec * playbackRate;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, audioUrl, duration, playbackRate]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current && audioUrl) {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const seek = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(duration, seconds));
      if (audioRef.current && audioUrl) {
        audioRef.current.currentTime = clamped;
      }
      setCurrentTime(clamped);
    },
    [duration, audioUrl]
  );

  const jump = useCallback(
    (offsetSec: number) => {
      seek(currentTimeRef.current + offsetSec);
    },
    [seek]
  );

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    seek,
    jump,
    setRate
  };
}
