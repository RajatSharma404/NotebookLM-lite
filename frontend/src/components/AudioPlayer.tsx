import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Sparkles, Volume2, Loader2 } from 'lucide-react';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180); // Default placeholder duration
  const [activeSpeaker, setActiveSpeaker] = useState<'Alex' | 'Morgan'>('Alex');
  const [isScrubbing, setIsScrubbing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stepRef = useRef<number>(0);

  // Format MM:SS with tabular mono
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
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

  // Real Audio Hookups
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [isScrubbing, audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

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
    const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

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

  // Waveform Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform();
      return;
    }

    const loop = () => {
      stepRef.current += 1;
      if (stepRef.current % 160 === 0) {
        setActiveSpeaker(prev => (prev === 'Alex' ? 'Morgan' : 'Alex'));
      }
      drawWaveform();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, drawWaveform]);

  // Play / Pause Toggle
  const togglePlay = () => {
    const audio = audioRef.current;
    if (audioUrl && audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(e => console.warn("Audio playback error:", e));
      }
    } else {
      // In simulated preview mode
      setIsPlaying(!isPlaying);
    }
  };

  // Handle Scrubbing on Canvas
  const handleSeek = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const target = pct * duration;
    setCurrentTime(target);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = target;
    }
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

  const handleSkip = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(target);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = target;
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
      {/* Hidden real HTML5 audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}

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
          {audioUrl ? "DEEP DIVE CONVERSATION" : "AUDIO OVERVIEW (PODCAST)"}
        </div>

        {/* Host Avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            title="Host Alex (Analyst)"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: isPlaying && activeSpeaker === 'Alex' ? 'var(--signal)' : 'var(--bg-1)',
              color: isPlaying && activeSpeaker === 'Alex' ? '#ffffff' : 'var(--text-3)',
              border: `1px solid ${isPlaying && activeSpeaker === 'Alex' ? 'var(--signal)' : 'var(--line)'}`,
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
            title="Host Morgan (Curious Co-host)"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: isPlaying && activeSpeaker === 'Morgan' ? 'var(--signal)' : 'var(--bg-1)',
              color: isPlaying && activeSpeaker === 'Morgan' ? '#ffffff' : 'var(--text-3)',
              border: `1px solid ${isPlaying && activeSpeaker === 'Morgan' ? 'var(--signal)' : 'var(--line)'}`,
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
        </div>
      </div>

      {/* Title */}
      <h3
        className="serif"
        style={{
          fontSize: '18px',
          fontWeight: 400,
          color: 'var(--text-1)',
          marginBottom: '12px',
          lineHeight: 1.2
        }}
      >
        {title}
      </h3>

      {/* Generate Audio CTA if not yet generated */}
      {!audioUrl && onGenerate && (
        <div style={{ marginBottom: '14px' }}>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontFamily: 'var(--font-ui)',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity var(--duration-fast) var(--ease-out)'
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spin-animate" />
                <span>Synthesizing Two-Host Podcast Dialogue...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Deep Dive Audio Overview</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Waveform Scrubber Surface */}
      <div style={{ position: 'relative', height: '48px', marginBottom: '8px' }}>
        <canvas
          ref={canvasRef}
          width={320}
          height={48}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'ew-resize',
            display: 'block'
          }}
          title="Click or drag waveform to scrub"
        />
      </div>

      {/* Time Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px'
      }}>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
          {formatTime(currentTime)}
        </span>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Primary Transport Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Playback Skip Buttons + Signal Play Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleSkip(-10)}
            style={{
              color: 'var(--text-2)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--duration-fast) var(--ease-out)',
              cursor: 'pointer'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            title="Rewind 10s"
          >
            <RotateCcw size={16} />
          </button>

          {/* 46px Signal Play Button */}
          <button
            onClick={togglePlay}
            disabled={isGenerating}
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
              cursor: isGenerating ? 'not-allowed' : 'pointer'
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? (
              <Pause size={20} fill="#ffffff" />
            ) : (
              <Play size={20} fill="#ffffff" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button
            onClick={() => handleSkip(10)}
            style={{
              color: 'var(--text-2)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--duration-fast) var(--ease-out)',
              cursor: 'pointer'
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
          {[0.8, 1.0, 1.25, 1.5, 2.0].map((speed) => (
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
                transition: 'all var(--duration-fast) var(--ease-out)',
                cursor: 'pointer'
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
