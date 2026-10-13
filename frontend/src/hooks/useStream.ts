// ============================================================================
// useStream Hook (requestAnimationFrame Token Buffer Flush)
// Follows: react-component-performance, fixing-motion-performance
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseStreamOptions {
  onFlush?: (content: string) => void;
}

export function useStream({ onFlush }: UseStreamOptions = {}) {
  const [content, setContent] = useState('');
  const bufferRef = useRef('');
  const rafIdRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (bufferRef.current) {
      const buffered = bufferRef.current;
      setContent((prev) => {
        const next = prev + buffered;
        onFlush?.(next);
        return next;
      });
      bufferRef.current = '';
    }
    rafIdRef.current = null;
  }, [onFlush]);

  const appendToken = useCallback(
    (token: string) => {
      bufferRef.current += token;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  const reset = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    bufferRef.current = '';
    setContent('');
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    content,
    appendToken,
    reset,
    flushNow: flush
  };
}
