/**
 * Game Component - Rhythm Coaster
 * 
 * Aesthetic: Sacred Celestial Geometry, Japanese Constructivism,
 * High-Contrast Cinnabar & Sumi Ink.
 * 
 * Bulletproof timestamp-based countdown and audio synchronization.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult } from '../types';
import { Volume2, Play } from 'lucide-react';

const TARGET_Y = 120;
const NOTE_SPEED = 480; // pixels per second
const HIT_WINDOW = 0.15; // seconds
const COUNTDOWN_MS = 2400; // 2.4 seconds total countdown (3, 2, 1)

const COLUMNS = 4;
const COLUMN_WIDTH = 76;
const COLUMN_SPACING = 20;

const KEY_MAP = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const COLOR_MAP = [
  '#e63946', // Left: Vermilion / Cinnabar Red
  '#d4a373', // Down: Warm Solar Amber / Gold
  '#2a9d8f', // Up: Jade / Celestial Cyan
  '#f5f2eb', // Right: Bone / Raw Rice Paper White
];

const GLYPH_MAP = ['◂', '▾', '▴', '▸'];
const KANJI_JUDGMENTS = {
  PERFECT: { kanji: '極', label: 'PERFECT', color: '#e63946' },
  GREAT: { kanji: '優', label: 'GREAT', color: '#2a9d8f' },
  GOOD: { kanji: '良', label: 'GOOD', color: '#d4a373' },
  MISS: { kanji: '逸', label: 'MISS', color: '#71717a' },
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
}

interface RingShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
}

export function Game({
  audioUrl,
  beatmap,
  onComplete,
}: {
  audioUrl: string;
  beatmap: Note[];
  onComplete: (result: GameResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [needsUserTap, setNeedsUserTap] = useState(false);

  // Initialize and clone notes safely
  const gameState = useRef({
    notes: (beatmap && beatmap.length > 0
      ? JSON.parse(JSON.stringify(beatmap))
      : []) as Note[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    greats: 0,
    goods: 0,
    misses: 0,
    multiplier: 1,
    keysPressed: [false, false, false, false],
    lastJudgment: null as keyof typeof KANJI_JUDGMENTS | null,
    lastHitTime: 0,
    particles: [] as Particle[],
    shockwaves: [] as RingShockwave[],
    keyFlash: [0, 0, 0, 0],
    startTime: performance.now(),
    audioStarted: false,
  });

  const handleManualStart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.play().then(() => {
        setNeedsUserTap(false);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    gameState.current.startTime = performance.now();
    gameState.current.audioStarted = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        if (!gameState.current.keysPressed[col]) {
          gameState.current.keysPressed[col] = true;
          gameState.current.keyFlash[col] = 1.0;
          if (audio && !audio.paused) {
            handleHit(col, audio.currentTime);
          } else if (needsUserTap) {
            handleManualStart();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        gameState.current.keysPressed[col] = false;
      }
    };

    const activeTouches = new Map<number, { startX: number; startY: number; triggered: boolean }>();

    const handleTouchStart = (e: TouchEvent) => {
      if (needsUserTap) {
        handleManualStart();
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          triggered: false,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!audio || audio.paused) return;

      const SWIPE_THRESHOLD = 26;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchData = activeTouches.get(touch.identifier);

        if (touchData && !touchData.triggered) {
          const deltaX = touch.clientX - touchData.startX;
          const deltaY = touch.clientY - touchData.startY;

          if (Math.abs(deltaX) > SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_THRESHOLD) {
            touchData.triggered = true;
            let col = -1;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              if (deltaX < 0) col = 0; // Left
              else col = 3; // Right
            } else {
              if (deltaY > 0) col = 1; // Down
              else col = 2; // Up
            }

            if (col !== -1) {
              gameState.current.keysPressed[col] = true;
              gameState.current.keyFlash[col] = 1.0;
              setTimeout(() => {
                gameState.current.keysPressed[col] = false;
              }, 120);

              handleHit(col, audio.currentTime);
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.delete(touch.identifier);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const now = performance.now();
      const elapsed = now - gameState.current.startTime;

      // Start audio after countdown
      if (elapsed >= COUNTDOWN_MS && !gameState.current.audioStarted) {
        gameState.current.audioStarted = true;
        audio.play().catch((err) => {
          console.warn("Autoplay policy prevented playback, tap required:", err);
          setNeedsUserTap(true);
        });
      }

      const currentTime = audio.currentTime;
      const totalWidth = COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING;
      const START_X = (canvas.width - totalWidth) / 2;

      // 1. Deep Obsidian & Sumi Ink Background
      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Astrolabe Geometry Background
      const rotAngle = (now / 16000) % (Math.PI * 2);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.45);
      ctx.rotate(rotAngle);
      ctx.strokeStyle = 'rgba(245, 242, 235, 0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 320, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 300, Math.sin(a) * 300);
        ctx.lineTo(Math.cos(a) * 330, Math.sin(a) * 330);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Lateral Architectural Rails & Ticks
      ctx.strokeStyle = 'rgba(245, 242, 235, 0.08)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING) - COLUMN_SPACING / 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        for (let y = 40; y < canvas.height; y += 80) {
          ctx.beginPath();
          ctx.moveTo(x - 3, y);
          ctx.lineTo(x + 3, y);
          ctx.stroke();
        }
      }

      // Column Light Beams & Tones
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const flash = gameState.current.keyFlash[i];

        if (flash > 0.01) {
          const grad = ctx.createLinearGradient(0, TARGET_Y, 0, canvas.height);
          grad.addColorStop(0, `${COLOR_MAP[i]}${Math.floor(flash * 60).toString(16).padStart(2, '0')}`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(x, TARGET_Y, COLUMN_WIDTH, canvas.height - TARGET_Y);
          gameState.current.keyFlash[i] *= 0.92;
        } else {
          ctx.fillStyle = 'rgba(20, 20, 28, 0.4)';
          ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
        }

        ctx.strokeStyle = 'rgba(245, 242, 235, 0.04)';
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.moveTo(x + COLUMN_WIDTH / 2, 0);
        ctx.lineTo(x + COLUMN_WIDTH / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Judgment Target Gate
      ctx.strokeStyle = 'rgba(245, 242, 235, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(START_X - 20, TARGET_Y + COLUMN_WIDTH / 2);
      ctx.lineTo(START_X + totalWidth + 20, TARGET_Y + COLUMN_WIDTH / 2);
      ctx.stroke();

      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const y = TARGET_Y;
        const cx = x + COLUMN_WIDTH / 2;
        const cy = y + COLUMN_WIDTH / 2;
        const isPressed = gameState.current.keysPressed[i];

        ctx.save();
        if (isPressed) {
          ctx.strokeStyle = COLOR_MAP[i];
          ctx.lineWidth = 2.5;
          ctx.fillStyle = 'rgba(230, 57, 70, 0.2)';
          ctx.beginPath();
          ctx.arc(cx, cy, COLUMN_WIDTH / 2 + 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(245, 242, 235, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.fillStyle = 'rgba(16, 16, 22, 0.9)';
          ctx.beginPath();
          ctx.arc(cx, cy, COLUMN_WIDTH / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(245, 242, 235, 0.2)';
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
          ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
          ctx.stroke();
        }

        ctx.fillStyle = isPressed ? '#ffffff' : 'rgba(245, 242, 235, 0.7)';
        ctx.font = 'bold 28px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GLYPH_MAP[i], cx, cy + 1);
        ctx.restore();
      }

      // 4. Notes Rendering
      for (const note of gameState.current.notes) {
        if (note.hit || note.missed) continue;

        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;

        // Auto-miss if passed target window
        if (gameState.current.audioStarted && currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          gameState.current.combo = 0;
          gameState.current.multiplier = 1;
          gameState.current.misses++;
          gameState.current.lastJudgment = 'MISS';
          gameState.current.lastHitTime = performance.now();
          continue;
        }

        if (y > -COLUMN_WIDTH && y < canvas.height) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const cx = x + COLUMN_WIDTH / 2;
          const cy = y + COLUMN_WIDTH / 2;
          const noteColor = COLOR_MAP[note.column];

          ctx.save();
          const r = COLUMN_WIDTH / 2 - 3;
          ctx.fillStyle = '#121218';
          ctx.strokeStyle = noteColor;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = noteColor;
          ctx.beginPath();
          const innerR = r * 0.55;
          ctx.moveTo(cx, cy - innerR);
          ctx.lineTo(cx + innerR, cy);
          ctx.lineTo(cx, cy + innerR);
          ctx.lineTo(cx - innerR, cy);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = note.column === 3 ? '#0b0b0e' : '#ffffff';
          ctx.font = 'bold 22px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(GLYPH_MAP[note.column], cx, cy + 1);
          ctx.restore();
        }
      }

      // 5. Particles Rendering
      const particles = gameState.current.particles;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.rotation += p.vRot;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // 6. Ring Shockwaves
      const shockwaves = gameState.current.shockwaves;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 2.8;
        sw.alpha *= 0.91;

        if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = sw.alpha;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.width;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 7. HUD Telemetry
      const duration = audio.duration || 100;
      const progressRatio = Math.min(1, Math.max(0, currentTime / duration));

      ctx.fillStyle = 'rgba(245, 242, 235, 0.1)';
      ctx.fillRect(40, 24, canvas.width - 80, 2);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(40, 24, (canvas.width - 80) * progressRatio, 2);

      ctx.fillStyle = '#f5f2eb';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE // ${String(gameState.current.score).padStart(7, '0')}`, 40, 52);

      ctx.fillStyle = 'rgba(245, 242, 235, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`TIME // ${formatTime(currentTime)} / ${formatTime(duration)}`, 40, 68);

      ctx.textAlign = 'right';
      ctx.fillStyle = gameState.current.combo > 10 ? '#e63946' : '#f5f2eb';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`COMBO [ ${String(gameState.current.combo).padStart(3, '0')} ]`, canvas.width - 40, 52);

      ctx.fillStyle = '#d4a373';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`OVERDRIVE [ ×${gameState.current.multiplier} ]`, canvas.width - 40, 68);

      // 8. Calligraphic Judgment Feedback
      const lastJudg = gameState.current.lastJudgment;
      if (lastJudg && performance.now() - gameState.current.lastHitTime < 520) {
        const judgData = KANJI_JUDGMENTS[lastJudg];
        const elapsedSinceHit = performance.now() - gameState.current.lastHitTime;
        const scale = 1 + Math.sin(elapsedSinceHit / 80) * 0.08;
        const alpha = Math.max(0, 1 - elapsedSinceHit / 520);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(canvas.width / 2, TARGET_Y + COLUMN_WIDTH + 80);
        ctx.scale(scale, scale);

        ctx.strokeStyle = judgData.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-60, -32, 120, 64);

        ctx.fillStyle = judgData.color;
        ctx.font = 'bold 32px "Shippori Mincho", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(judgData.kanji, 0, -6);

        ctx.fillStyle = '#f5f2eb';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(judgData.label, 0, 18);
        ctx.restore();
      }

      // 9. Countdown Overlay (Only during COUNTDOWN_MS)
      if (elapsed < COUNTDOWN_MS) {
        const countNumber = Math.ceil((COUNTDOWN_MS - elapsed) / 800);
        ctx.fillStyle = 'rgba(11, 11, 14, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((elapsed / 1000) % (Math.PI * 2));
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-70, -70, 140, 140);
        ctx.restore();

        ctx.fillStyle = '#e63946';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('// RESONANCE SYNCHRONIZATION //', canvas.width / 2, canvas.height / 2 - 50);

        ctx.fillStyle = '#f5f2eb';
        ctx.font = 'bold 64px "Syne", sans-serif';
        ctx.fillText(countNumber > 0 ? String(countNumber) : 'READY', canvas.width / 2, canvas.height / 2 + 15);

        ctx.fillStyle = 'rgba(245, 242, 235, 0.6)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('PREPARE KINETIC STRIKES', canvas.width / 2, canvas.height / 2 + 65);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioUrl]);

  const handleHit = (col: number, currentTime: number) => {
    const state = gameState.current;

    let closestNote: Note | null = null;
    let minDiff = HIT_WINDOW;

    for (const note of state.notes) {
      if (note.column === col && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }

    if (closestNote) {
      closestNote.hit = true;
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;

      if (state.combo >= 50) state.multiplier = 4;
      else if (state.combo >= 20) state.multiplier = 3;
      else if (state.combo >= 10) state.multiplier = 2;
      else state.multiplier = 1;

      let points = 0;
      let judgment: keyof typeof KANJI_JUDGMENTS;

      if (minDiff < 0.05) {
        points = 300;
        state.perfects++;
        judgment = 'PERFECT';
      } else if (minDiff < 0.1) {
        points = 100;
        state.greats++;
        judgment = 'GREAT';
      } else {
        points = 50;
        state.goods++;
        judgment = 'GOOD';
      }

      state.score += points * state.multiplier;
      state.lastJudgment = judgment;
      state.lastHitTime = performance.now();

      const canvas = canvasRef.current;
      if (canvas) {
        const totalWidth = COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING;
        const startX = (canvas.width - totalWidth) / 2;
        const cx = startX + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
        const cy = TARGET_Y + COLUMN_WIDTH / 2;

        state.shockwaves.push({
          x: cx,
          y: cy,
          radius: COLUMN_WIDTH / 3,
          maxRadius: COLUMN_WIDTH * 1.5,
          color: COLOR_MAP[col],
          alpha: 0.9,
          width: 2.5,
        });

        const count = judgment === 'PERFECT' ? 16 : 8;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 4.5;
          state.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.3 ? COLOR_MAP[col] : '#ffffff',
            size: 2 + Math.random() * 3,
            alpha: 1.0,
            decay: 0.02 + Math.random() * 0.03,
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.2,
          });
        }
      }
    }
  };

  const handleAudioEnded = () => {
    const state = gameState.current;
    onComplete({
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      perfects: state.perfects,
      greats: state.greats,
      goods: state.goods,
      misses: state.misses,
    });
  };

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div 
      onClick={needsUserTap ? handleManualStart : undefined}
      className="flex flex-col items-center justify-center bg-[#0b0b0e] min-h-screen text-[#f5f2eb] w-full touch-none overflow-hidden select-none p-2 sm:p-4 relative"
    >
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="auto"
        onEnded={handleAudioEnded} 
      />

      {/* Autoplay fallback button if browser blocks audio autoplay */}
      {needsUserTap && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm cursor-pointer">
          <div className="poster-card p-8 rounded-sm text-center border-2 border-[#e63946] shadow-[0_0_40px_rgba(230,57,70,0.5)]">
            <div className="w-16 h-16 rounded-full border border-[#e63946] bg-[#e63946]/20 flex items-center justify-center mx-auto mb-4 text-[#e63946]">
              <Play size={28} className="fill-current ml-1" />
            </div>
            <h2 className="text-xl font-syne font-black text-white uppercase mb-2">
              Commence Sonic Resonance
            </h2>
            <p className="text-xs font-mono text-[#f5f2eb]/70 mb-4">
              Click anywhere to un-mute and start track playback
            </p>
            <span className="px-6 py-2.5 bg-[#e63946] text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm">
              Engage Orbit
            </span>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-[800px] flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={860}
          className="border border-[#f5f2eb]/15 bg-[#0b0b0e] shadow-[0_0_60px_rgba(0,0,0,0.85)] max-w-full h-auto max-h-[92dvh] rounded-sm"
        />

        <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#f5f2eb]/50 mt-3 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2a9d8f] animate-pulse" />
            <span>KINETIC PROTOCOL ACTIVE // {gameState.current.notes.length} NOTES</span>
          </div>
          <div className="text-right">
            <span className="hidden md:inline">CONTROLS: ARROW KEYS [← ↓ ↑ →]</span>
            <span className="md:hidden">TOUCH: SWIPE [LEFT, DOWN, UP, RIGHT]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
