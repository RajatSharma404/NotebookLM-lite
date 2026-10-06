import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Sparkles, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title = "Deep Dive Conversation",
  isGenerating = false,
  onGenerate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(42); // Seeded default for preview
  const [duration, setDuration] = useState(180); // 3:00 default
  const [activeSpeaker, setActiveSpeaker] = useState<'Alex' | 'Morgan'>('Alex');
  const [isScrubbing, setIsScrubbing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stepRef = useRef<number>(0);

  // Format MM:SS with tabular mono
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Seeding static waveform bar profiles
  const barHeights = useRef<number[]>(
    Array.from({ length: 52 }, (_, i) => {
      const base = Math.sin(i * 0.28) * 0.4 + 0.6;
      const noise = Math.cos(i * 0.85) * 0.3;
      return Math.max(0.18, Math.min(1.0, (base + noise) * 0.8));
    })
  ).current;

  // Waveform drawing
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const totalBars = barHeights.length;
    const gap = 3;
    const totalGap = (totalBars - 1) * gap;
    const barWidth = Math.max(2, (width - totalGap) / totalBars);
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < totalBars; i++) {
      const barProg = i / totalBars;
      let hMultiplier = barHeights[i];

      if (isPlaying) {
        const osc = Math.sin(stepRef.current * 0.12 + i * 0.4) * 0.25;
        hMultiplier = Math.max(0.15, Math.min(1.0, hMultiplier + osc));
      }

      const barH = Math.max(4, hMultiplier * (height - 6));
      const x = i * (barWidth + gap);
      const y = (height - barH) / 2;

      // Color: Signal for played bars, subtle line-strong/text-3 for unplayed
      if (barProg <= progress) {
        ctx.fillStyle = '#FF5A36'; // var(--signal)
      } else {
        ctx.fillStyle = 'rgba(140, 140, 140, 0.3)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1.5);
      ctx.fill();
    }
  }, [barHeights, currentTime, duration, isPlaying]);

  // Animation Loop for live playback
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform();
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.25 * playbackSpeed;
      });
    }, 250);

    const loop = () => {
      stepRef.current += 1;
      if (stepRef.current % 160 === 0) {
        setActiveSpeaker(prev => prev === 'Alex' ? 'Morgan' : 'Alex');
      }
      drawWaveform();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      clearInterval(interval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, duration, drawWaveform]);

  // Handle Scrubbing on Canvas
  const handleSeek = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(pct * duration);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handleSeek(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isScrubbing) {
      handleSeek(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isScrubbing) {
      setIsScrubbing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-raised)',
      position: 'relative'
    }}>
      {/* Eyebrow & Live Speaker Monogram */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div
          className="mono"
          style={{
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: 'var(--text-3)',
            textTransform: 'uppercase'
          }}
        >
          DEEP DIVE CONVERSATION
        </div>

        {/* Host Avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            title="Host Alex"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: activeSpeaker === 'Alex' ? 'var(--signal)' : 'var(--bg-1)',
              color: activeSpeaker === 'Alex' ? '#ffffff' : 'var(--text-3)',
              border: `1px solid ${activeSpeaker === 'Alex' ? 'var(--signal)' : 'var(--line)'}`,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--duration-fast) var(--ease-out)'
            }}
          >
            A
          </div>
          <div
            title="Host Morgan"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: activeSpeaker === 'Morgan' ? 'var(--signal)' : 'var(--bg-1)',
              color: activeSpeaker === 'Morgan' ? '#ffffff' : 'var(--text-3)',
              border: `1px solid ${activeSpeaker === 'Morgan' ? 'var(--signal)' : 'var(--line)'}`,
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--duration-fast) var(--ease-out)'
            }}
          >
            M
          </div>
          <span
            className="mono"
            style={{
              fontSize: '11px',
              color: isPlaying ? 'var(--signal)' : 'var(--text-3)',
              marginLeft: '4px',
              fontWeight: 500
            }}
          >
            {activeSpeaker}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3
        className="serif"
        style={{
          fontSize: '20px',
          fontWeight: 400,
          color: 'var(--text-1)',
          lineHeight: 1.25,
          marginBottom: '16px'
        }}
      >
        {title}
      </h3>

      {/* The Waveform IS the Scrubber (Interactive canvas) */}
      <div style={{
        position: 'relative',
        width: '100%',
        margin: '12px 0 8px',
        cursor: 'ew-resize'
      }}>
        <canvas
          ref={canvasRef}
          width={340}
          height={46}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: '46px',
            touchAction: 'none'
          }}
        />
      </div>

      {/* Time Readout: Mono Tabular-Nums */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-3)',
        marginBottom: '16px'
      }}>
        <span style={{ color: 'var(--text-2)' }}>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Main Controls Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Playback & Skip Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
            style={{
              color: 'var(--text-2)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--duration-fast) var(--ease-out)'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            title="Rewind 10s"
          >
            <RotateCcw size={16} />
          </button>

          {/* 48px Signal Play Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause conversation" : "Play conversation"}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'var(--signal)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 90, 54, 0.35)',
              transition: 'transform var(--duration-fast) var(--ease-out)',
              cursor: 'pointer'
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
            style={{
              color: 'var(--text-2)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--duration-fast) var(--ease-out)'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            title="Forward 10s"
          >
            <RotateCw size={16} />
          </button>
        </div>

        {/* Speed Pills: Segmented Mono Control */}
        <div style={{
          display: 'flex',
          gap: '3px',
          backgroundColor: 'var(--bg-1)',
          padding: '2px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--line)'
        }}>
          {[0.8, 1.0, 1.2, 1.5].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className="mono"
              style={{
                fontSize: '10px',
                padding: '3px 6px',
                borderRadius: '3px',
                backgroundColor: playbackSpeed === speed ? 'var(--bg-0)' : 'transparent',
                color: playbackSpeed === speed ? 'var(--text-1)' : 'var(--text-3)',
                border: playbackSpeed === speed ? '1px solid var(--line-strong)' : '1px solid transparent',
                fontWeight: playbackSpeed === speed ? 600 : 400,
                transition: 'all var(--duration-fast) var(--ease-out)'
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
