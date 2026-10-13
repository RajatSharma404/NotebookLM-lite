// ============================================================================
// AudioPlayer Component (Raised Surface 2 of 2)
// Follows: notebooklm-design-system, fixing-motion-performance, emil-design-eng
// ============================================================================

import React, { useRef, useEffect, useState, useCallback, KeyboardEvent } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import {
  seekFromPointer,
  formatAudioTime,
  generateDeterministicBars
} from '../utils/audioMath';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';

export interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
  subtitle?: string;
  hostName?: string;
  duration?: number;
}

const SPEED_OPTIONS = [0.8, 1.0, 1.2, 1.5];

export function AudioPlayer({
  audioUrl,
  title = 'Audio Overview: Deep Dive',
  subtitle = 'Two-Host Grounded Discussion',
  hostName = 'Alex & Morgan',
  duration = 210
}: AudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration: actualDuration,
    playbackRate,
    togglePlay,
    seek,
    jump,
    setRate
  } = useAudioPlayer({ audioUrl, defaultDuration: duration });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // 52 Normalized Waveform Bars (pure mathematical generation)
  const bars = useRef(generateDeterministicBars(52, title)).current;

  // Render Waveform Canvas with devicePixelRatio calibration
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const barCount = bars.length;
    const gap = 2;
    const totalGap = (barCount - 1) * gap;
    const barWidth = Math.max(2, (width - totalGap) / barCount);
    const progressRatio = actualDuration > 0 ? currentTime / actualDuration : 0;
    const playedBarIndex = Math.floor(progressRatio * barCount);

    // Read colors once outside loop
    const style = getComputedStyle(canvas);
    const accentColor = style.getPropertyValue('--accent').trim() || '#D6FF3F';
    const unplayedColor = style.getPropertyValue('--line-strong').trim() || 'rgba(242, 238, 226, 0.22)';

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.max(4, bars[i] * (height - 8));
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = i <= playedBarIndex ? accentColor : unplayedColor;
      // Rounded bar cap
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 1.5) : ctx.rect(x, y, barWidth, barHeight);
      ctx.fill();
    }

    ctx.restore();
  }, [bars, currentTime, actualDuration]);

  // Redraw when time changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Pointer Scrubbing Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const rect = canvas.getBoundingClientRect();
    const newTime = seekFromPointer(e.clientX, rect.left, rect.width, actualDuration);
    seek(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const targetTime = seekFromPointer(e.clientX, rect.left, rect.width, actualDuration);

    setHoverTime(targetTime);
    setHoverX(e.clientX - rect.left);

    if (isDragging) {
      seek(targetTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverTime(null);
      setHoverX(null);
    }
  };

  // Keyboard navigation on scrubber slider
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      jump(-5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      jump(5);
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Audio Overview Player"
      style={{
        backgroundColor: 'var(--bg-2)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-2)',
        boxShadow: 'var(--shadow-raised)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        userSelect: 'none'
      }}
    >
      {/* Title & Host Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 400,
              color: 'var(--text-1)',
              lineHeight: 1.2
            }}
          >
            {title}
          </h4>
          <span
            className="font-mono"
            style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              letterSpacing: '0.02em'
            }}
          >
            {subtitle}
          </span>
        </div>

        {/* Monogram Avatar with Pulsing Ring while playing */}
        <div
          title={`Host: ${hostName}`}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line-strong)',
            color: 'var(--text-1)',
            fontSize: '11px',
            fontWeight: 600
          }}
          className="font-mono"
        >
          {/* Pulsing ring while playing */}
          {isPlaying && (
            <span
              style={{
                position: 'absolute',
                inset: '-3px',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--accent)',
                animation: 'pulse 1.2s infinite var(--ease-out)'
              }}
              aria-hidden="true"
            />
          )}
          <span>{hostName.slice(0, 2).toUpperCase()}</span>
        </div>
      </div>

      {/* 52-Bar Waveform Scrubber with Hover Time Tooltip */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        tabIndex={0}
        role="slider"
        aria-label="Audio Playhead Scrubber"
        aria-valuemin={0}
        aria-valuemax={Math.round(actualDuration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(actualDuration)}`}
        onKeyDown={handleKeyDown}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{
            width: '100%',
            height: '100%',
            touchAction: 'none'
          }}
        />

        {/* Hover Time Tooltip */}
        {hoverTime !== null && hoverX !== null && (
          <div
            className="font-mono"
            style={{
              position: 'absolute',
              top: '-20px',
              left: `${hoverX}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--bg-0)',
              color: 'var(--text-1)',
              border: '1px solid var(--line)',
              borderRadius: '3px',
              padding: '1px 5px',
              fontSize: '10px',
              pointerEvents: 'none',
              zIndex: 10
            }}
          >
            {formatAudioTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Time Labels Row in Tabular-Nums */}
      <div
        className="font-mono"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-3)',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(actualDuration)}</span>
      </div>

      {/* Controls Row: Back 10, 52px Play/Pause Circle, Forward 10, Speed */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'var(--space-1)'
        }}
      >
        {/* Playback Transport Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Back 10 Seconds */}
          <button
            type="button"
            aria-label="Rewind 10 seconds"
            onClick={() => jump(-10)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
          >
            <RotateCcw size={16} />
          </button>

          {/* 52px Accent Play/Pause Circle */}
          <button
            type="button"
            aria-label={isPlaying ? 'Pause audio overview' : 'Play audio overview'}
            onClick={togglePlay}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-raised)',
              transition: 'transform var(--dur-1) var(--ease-out), background-color var(--dur-1) var(--ease-out)'
            }}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={18} fill="currentColor" strokeWidth={0} style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Forward 10 Seconds */}
          <button
            type="button"
            aria-label="Skip forward 10 seconds"
            onClick={() => jump(10)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
          >
            <RotateCw size={16} />
          </button>
        </div>

        {/* Speed Segmented Control */}
        <div
          role="radiogroup"
          aria-label="Playback speed"
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-1)',
            padding: '2px'
          }}
        >
          {SPEED_OPTIONS.map((rate) => {
            const isSelected = playbackRate === rate;
            return (
              <button
                key={rate}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setRate(rate)}
                className="font-mono"
                style={{
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected ? 'var(--bg-2)' : 'transparent',
                  color: isSelected ? 'var(--accent-text)' : 'var(--text-3)',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'background-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out)'
                }}
              >
                {rate}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
