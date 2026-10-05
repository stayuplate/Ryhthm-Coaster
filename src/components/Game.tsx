/**
 * Game Component - Rhythm Coaster
 * 
 * Aesthetic: Sacred Celestial Geometry, Japanese Constructivism,
 * High-Contrast Cinnabar & Sumi Ink.
 * 
 * Featuring 4-Direction Acoustic Engine:
 * - Left (0, Vermilion): Taiko Wood Strike (warm, deep organic membrane thump).
 * - Up (1, Jade Green): Bamboo Wind Chime / Hyōshigi (airy, resonant bamboo strike).
 * - Down (2, Solar Gold): Bronze Singing Bowl / Kin Bell (sacred metallic warmth).
 * - Right (3, Bone White): Suikinkutsu Water Droplet (pristine crystal droplet ping).
 * 
 * - Seamless DSP music modulation (dynamic volume swell, sub kick, and resonant filter sweep).
 * - Balanced, non-intrusive strike volume levels with customizable strike volume toggle (BALANCED / SOFT / CRISP / MUTED).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult } from '../types';
import { Play, Volume2, Sparkles } from 'lucide-react';
import { AcousticModulator, IntensityMode, StrikeVolumeMode } from '../services/soundEffects';

const TARGET_Y = 120;
const NOTE_SPEED = 480; // pixels per second
const HIT_WINDOW = 0.15; // seconds
const COUNTDOWN_MS = 2400; // 2.4 seconds total countdown (3, 2, 1)

const COLUMNS = 4;
const COLUMN_WIDTH = 76;
const COLUMN_SPACING = 20;

// Order: Left (1st), Up (2nd), Down (3rd), Right (4th)
const KEY_MAP = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
const COLOR_MAP = [
  '#e63946', // Left (1st): Vermilion / Cinnabar Red
  '#2a9d8f', // Up (2nd): Jade / Celestial Cyan / Green
  '#d4a373', // Down (3rd): Warm Solar Amber / Yellow / Gold
  '#f5f2eb', // Right (4th): Bone / Raw Rice Paper White
];

const DIRECTION_NAMES = [
  { dir: 'LEFT', inst: 'Taiko Wood', glyph: '◂' },
  { dir: 'UP', inst: 'Bamboo Chime', glyph: '▴' },
  { dir: 'DOWN', inst: 'Bronze Bell', glyph: '▾' },
  { dir: 'RIGHT', inst: 'Suikin Drop', glyph: '▸' },
];

const GLYPH_MAP = ['◂', '▴', '▾', '▸'];
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
  const modulatorRef = useRef<AcousticModulator | null>(null);

  const [needsUserTap, setNeedsUserTap] = useState(false);
  const [intensityMode, setIntensityMode] = useState<IntensityMode>('VIVID');
  const [strikeVolumeMode, setStrikeVolumeMode] = useState<StrikeVolumeMode>('BALANCED');
  const [testQuality, setTestQuality] = useState<'PERFECT' | 'GREAT'>('PERFECT');

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
      modulatorRef.current?.resume();
      audio.play().then(() => {
        setNeedsUserTap(false);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Attach acoustic modulator to dynamically influence the playing track
    const modulator = new AcousticModulator();
    modulator.intensity = intensityMode;
    modulator.strikeVolume = strikeVolumeMode;
    modulator.init(audio);
    modulatorRef.current = modulator;

    gameState.current.startTime = performance.now();
    gameState.current.audioStarted = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const col = KEY_MAP.indexOf(e.code);
      if (col !== -1) {
        e.preventDefault();
        modulatorRef.current?.resume();
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
      modulatorRef.current?.resume();
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
              if (deltaY < 0) col = 1; // Up (deltaY < 0 is swipe up)
              else col = 2; // Down (deltaY > 0 is swipe down)
            }

            if (col !== -1) {
              modulatorRef.current?.resume();
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
        modulatorRef.current?.resume();
        audio.play().catch((err) => {
          console.warn("Autoplay policy prevented playback, tap required:", err);
          setNeedsUserTap(true);
        });
      }

      const currentTime = audio.currentTime;
      const totalWidth = COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING;
      const START_X = (canvas.width - totalWidth) / 2;

      // Get and decay current sonic resonance level for visual feedback
      const resLevel = modulatorRef.current?.getResonanceLevel() || 0;
      if (modulatorRef.current) {
        modulatorRef.current.decayResonance(0.016);
      }

      // 1. Deep Obsidian & Sumi Ink Background
      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Astrolabe Geometry Background
      const rotAngle = (now / 16000) % (Math.PI * 2);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.45);
      ctx.rotate(rotAngle);
      ctx.strokeStyle = resLevel > 0.5 ? 'rgba(230, 57, 70, 0.12)' : 'rgba(245, 242, 235, 0.035)';
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

      // Dynamic Resonance Glow around Target Gate
      if (resLevel > 0.05) {
        ctx.save();
        const glowColor = resLevel > 0.7 ? 'rgba(230, 57, 70,' : 'rgba(42, 157, 143,';
        ctx.strokeStyle = `${glowColor} ${resLevel * 0.65})`;
        ctx.lineWidth = 5 * resLevel;
        ctx.beginPath();
        ctx.moveTo(START_X - 50, TARGET_Y + COLUMN_WIDTH / 2);
        ctx.lineTo(START_X + totalWidth + 50, TARGET_Y + COLUMN_WIDTH / 2);
        ctx.stroke();
        ctx.restore();
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
          // Muffle track briefly on missed note (underwater effect)
          modulatorRef.current?.triggerImpact('MISS', note.column);
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
        sw.radius += 3.2;
        sw.alpha *= 0.89;

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

      // Left HUD: Score & Time
      ctx.fillStyle = '#f5f2eb';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE // ${String(gameState.current.score).padStart(7, '0')}`, 40, 52);

      ctx.fillStyle = 'rgba(245, 242, 235, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`TIME // ${formatTime(currentTime)} / ${formatTime(duration)}`, 40, 68);

      // Center HUD: Acoustic Dynamic Resonance Meter & 4-Direction Indicator
      ctx.save();
      ctx.textAlign = 'center';
      const barsCount = 10;
      const filledBars = Math.round(resLevel * barsCount);
      let resColor = 'rgba(245, 242, 235, 0.4)';
      if (resLevel > 0.7) resColor = '#e63946'; // Perfect
      else if (resLevel > 0.3) resColor = '#2a9d8f'; // Great
      else if (resLevel > 0.05) resColor = '#d4a373'; // Good

      ctx.fillStyle = resColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      const barStr = '▮'.repeat(filledBars) + '▯'.repeat(barsCount - filledBars);
      ctx.fillText(`SONIC RESONANCE [ ${barStr} ] // 4-DIR ACOUSTIC`, canvas.width / 2, 52);

      ctx.fillStyle = 'rgba(245, 242, 235, 0.6)';
      ctx.font = '8px "JetBrains Mono", monospace';
      const statusText = resLevel > 0.7 
        ? '★ HARMONIC BLOOM // +65% MUSIC SURGE & SUB PUNCH' 
        : resLevel > 0.3 
        ? '✦ ACOUSTIC SWELL // +34% MUSIC LIFT & RESONANT SWEEP' 
        : '◂ TAIKO  •  ▴ BAMBOO  •  ▾ KIN BELL  •  ▸ SUIKIN DROP';
      ctx.fillText(statusText, canvas.width / 2, 66);
      ctx.restore();

      // Right HUD: Combo & Overdrive
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
        const scale = 1 + Math.sin(elapsedSinceHit / 80) * 0.12;
        const alpha = Math.max(0, 1 - elapsedSinceHit / 520);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(canvas.width / 2, TARGET_Y + COLUMN_WIDTH + 80);
        ctx.scale(scale, scale);

        ctx.strokeStyle = judgData.color;
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-64, -34, 128, 68);

        ctx.fillStyle = judgData.color;
        ctx.font = 'bold 34px "Shippori Mincho", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(judgData.kanji, 0, -6);

        ctx.fillStyle = '#f5f2eb';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(judgData.label, 0, 20);
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
      modulator.dispose();
    };
  }, [audioUrl, intensityMode, strikeVolumeMode]);

  const triggerManualTest = (judgment: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS', col: number = 0) => {
    modulatorRef.current?.resume();
    modulatorRef.current?.triggerImpact(judgment, col);

    // Also trigger shockwave and particle visuals on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const totalWidth = COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING;
      const startX = (canvas.width - totalWidth) / 2;
      const cx = startX + col * (COLUMN_WIDTH + COLUMN_SPACING) + COLUMN_WIDTH / 2;
      const cy = TARGET_Y + COLUMN_WIDTH / 2;

      gameState.current.shockwaves.push({
        x: cx,
        y: cy,
        radius: COLUMN_WIDTH / 3,
        maxRadius: judgment === 'PERFECT' ? COLUMN_WIDTH * 2.0 : COLUMN_WIDTH * 1.5,
        color: COLOR_MAP[col],
        alpha: 1.0,
        width: judgment === 'PERFECT' ? 3.5 : 2.2,
      });

      gameState.current.lastJudgment = judgment;
      gameState.current.lastHitTime = performance.now();
    }
  };

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

      // Bold dynamic DSP track modulation:
      // Plays direction-specific organic instrument (Taiko, Bamboo, Kin Bell, or Suikinkutsu)
      // modulated smoothly with the song's dynamic filter swell
      modulatorRef.current?.triggerImpact(judgment, col);

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
          maxRadius: judgment === 'PERFECT' ? COLUMN_WIDTH * 2.0 : COLUMN_WIDTH * 1.5,
          color: COLOR_MAP[col],
          alpha: judgment === 'PERFECT' ? 1.0 : 0.85,
          width: judgment === 'PERFECT' ? 3.5 : 2.2,
        });

        const count = judgment === 'PERFECT' ? 22 : 10;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (judgment === 'PERFECT' ? 3.0 : 1.8) + Math.random() * 5.0;
          state.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.3 ? COLOR_MAP[col] : '#ffffff',
            size: 2 + Math.random() * 3.5,
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
        crossOrigin="anonymous"
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
        {/* Top Acoustic Telemetry & Multi-Timbre Directional Audition Bar */}
        <div className="w-full flex flex-wrap items-center justify-between text-[11px] font-mono text-[#f5f2eb]/80 mb-2 px-1 gap-2">
          {/* Controls: Effect & Strike Volume Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (modulatorRef.current) {
                  const next = modulatorRef.current.cycleStrikeVolume();
                  setStrikeVolumeMode(next);
                }
              }}
              title="Click to toggle strike volume: BALANCED (pleasant), SOFT (gentle), CRISP (punchy), or MUTED (music DSP only)"
              className="px-2.5 py-1 rounded bg-[#161622] hover:bg-white/10 border border-[#f5f2eb]/20 hover:border-[#f5f2eb]/50 text-[#f5f2eb] font-bold text-[10px] tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Volume2 size={12} className={strikeVolumeMode === 'MUTED' ? 'text-zinc-500' : 'text-[#2a9d8f]'} />
              <span>STRIKES: <span className={strikeVolumeMode === 'MUTED' ? 'text-zinc-400' : strikeVolumeMode === 'CRISP' ? 'text-[#e63946]' : 'text-[#2a9d8f]'}>{strikeVolumeMode}</span></span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (modulatorRef.current) {
                  const next = modulatorRef.current.cycleIntensity();
                  setIntensityMode(next);
                }
              }}
              title="Click to toggle music filter modulation strength: VIVID (100%), ULTRA (150%), or SUBTLE (50%)"
              className="px-2.5 py-1 rounded bg-[#161622] hover:bg-[#e63946]/20 border border-[#f5f2eb]/20 hover:border-[#e63946] text-[#f5f2eb] font-bold text-[10px] tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={11} className={intensityMode === 'ULTRA' ? 'text-[#e63946]' : 'text-[#d4a373]'} />
              <span>DSP: <span className={intensityMode === 'ULTRA' ? 'text-[#e63946]' : intensityMode === 'VIVID' ? 'text-[#2a9d8f]' : 'text-[#d4a373]'}>{intensityMode}</span></span>
            </button>
          </div>

          {/* Directional Instrument Audition */}
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setTestQuality(q => q === 'PERFECT' ? 'GREAT' : 'PERFECT')}
              className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                testQuality === 'PERFECT' 
                  ? 'bg-[#e63946]/20 border-[#e63946] text-[#e63946]' 
                  : 'bg-[#2a9d8f]/20 border-[#2a9d8f] text-[#2a9d8f]'
              }`}
              title="Click to toggle audition between Perfect and Great quality"
            >
              {testQuality === 'PERFECT' ? '★ Perfect' : '✦ Good'}
            </button>

            {DIRECTION_NAMES.map((d, col) => (
              <button
                key={d.dir}
                type="button"
                onClick={() => triggerManualTest(testQuality, col)}
                className="px-2 py-0.5 rounded bg-[#161622] hover:bg-white/10 border border-[#f5f2eb]/20 hover:border-white text-[#f5f2eb] transition-all cursor-pointer flex items-center gap-1"
                style={{ borderColor: `${COLOR_MAP[col]}60` }}
                title={`Click to preview ${d.inst} (${d.dir})`}
              >
                <span style={{ color: COLOR_MAP[col] }}>{d.glyph}</span>
                <span className="hidden sm:inline text-[#f5f2eb]/80">{d.inst}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => triggerManualTest('MISS', 0)}
              className="px-2 py-0.5 rounded bg-[#161622] hover:bg-white/10 border border-white/20 text-white/50 hover:text-white transition-colors cursor-pointer text-[9px]"
              title="Preview missed note muffle"
            >
              Miss
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={860}
          className="border border-[#f5f2eb]/15 bg-[#0b0b0e] shadow-[0_0_60px_rgba(0,0,0,0.85)] max-w-full h-auto max-h-[90dvh] rounded-sm"
        />

        <div className="w-full flex items-center justify-between text-[11px] font-mono text-[#f5f2eb]/50 mt-3 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2a9d8f] animate-pulse" />
            <span>KINETIC PROTOCOL ACTIVE // 4-TIMBRE ACOUSTIC MATRIX // DYNAMIC RESONANCE DSP</span>
          </div>
          <div className="text-right">
            <span className="hidden md:inline">CONTROLS: ARROW KEYS [← ↑ ↓ →]</span>
            <span className="md:hidden">TOUCH: SWIPE [LEFT, UP, DOWN, RIGHT]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
