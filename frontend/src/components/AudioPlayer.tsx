import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, Sparkles, Mic } from 'lucide-react';

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
  const [duration, setDuration] = useState(180); // mock 3 mins default
  const [activeSpeaker, setActiveSpeaker] = useState<'Alex' | 'Morgan'>('Alex');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animate waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 36;
      const barWidth = 4;
      const gap = 3;
      const totalWidth = barCount * (barWidth + gap);
      const startX = (canvas.width - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        let height = 4;
        if (isPlaying) {
          const wave = Math.sin(step * 0.1 + i * 0.35) * 0.5 + 0.5;
          height = 6 + wave * 22;
        } else {
          height = 6 + (Math.sin(i * 0.5) * 0.5 + 0.5) * 10;
        }

        const x = startX + i * (barWidth + gap);
        const y = (canvas.height - height) / 2;

        ctx.fillStyle = isPlaying 
          ? (i % 2 === 0 ? '#6366f1' : '#06b6d4')
          : '#475569';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }

      if (isPlaying) {
        step++;
        // Toggle speakers occasionally for demonstration
        if (step % 200 === 0) {
          setActiveSpeaker(prev => prev === 'Alex' ? 'Morgan' : 'Alex');
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-panel)',
      border: '1px solid var(--border-default)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mic size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Audio Overview</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{title}</div>
          </div>
        </div>

        {/* Active speaker pill */}
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: activeSpeaker === 'Alex' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
          color: activeSpeaker === 'Alex' ? 'var(--brand-primary)' : 'var(--accent-cyan)',
          border: `1px solid ${activeSpeaker === 'Alex' ? 'var(--brand-primary)' : 'var(--accent-cyan)'}`
        }}>
          🎙️ Host: {activeSpeaker}
        </div>
      </div>

      {/* Waveform Canvas */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <canvas ref={canvasRef} width={280} height={40} style={{ display: 'block' }} />
      </div>

      {/* Timeline slider and times */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
        <span>{formatTime(currentTime)}</span>
        <input 
          type="range" 
          min="0" 
          max={duration} 
          value={currentTime} 
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--brand-primary)', cursor: 'pointer', height: '4px' }} 
        />
        <span>{formatTime(duration)}</span>
      </div>

      {/* Audio Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setCurrentTime(Math.max(0, currentTime - 15))}
            style={{ color: 'var(--text-secondary)', padding: '4px' }}
            title="Rewind 15s"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>

          <button 
            onClick={() => setCurrentTime(Math.min(duration, currentTime + 15))}
            style={{ color: 'var(--text-secondary)', padding: '4px' }}
            title="Forward 15s"
          >
            <RotateCw size={16} />
          </button>
        </div>

        {/* Speed button pills */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0.8, 1.0, 1.2, 1.5].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: playbackSpeed === speed ? 'var(--bg-hover)' : 'transparent',
                color: playbackSpeed === speed ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: playbackSpeed === speed ? 600 : 400
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
