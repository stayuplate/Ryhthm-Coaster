/**
 * Game Component - Rhythm Coaster
 * 
 * Aesthetic: Sacred Celestial Geometry, Japanese Constructivism,
 * High-Contrast Cinnabar & Sumi Ink.
 * 
 * Visual Enhancements:
 * - Hypnotic 3D Perspective Track Highway with dynamic lateral light rails and depth warping.
 * - Radiant Comet Energy Tails trailing behind approaching notes.
 * - Real-time Bilateral Audio Frequency Equalizer dancing to live track spectrum.
 * - Calligraphic Judgment Popups with Millisecond Early / Late Timing Telemetry (e.g. +14ms EARLY, -10ms LATE).
 * - Multi-Tier Combo Fever & Overdrive State Progression with fiery embers and edge aura.
 * - Tactile Interactive Receptor Gate with spring physics and mechanical astrolabe rings.
 * - Vertical Cyber-Japanese Groove / Mastery Gauge with Rank Seal Stamps (破 / 急 / 極).
 * - Multi-tiered arcade hit shockwaves, lane laser flares, and screen micro-shake on Perfect hits.
 * - Visual Spectacle Toggle: ARCADE (Full FX) vs MINIMAL (Tournament Focus).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Note, GameResult } from '../types';
import { Volume2, Sparkles, Gamepad2, Settings2, ExternalLink, Eye, Flame } from 'lucide-react';
import { AcousticModulator, IntensityMode, StrikeVolumeMode } from '../services/soundEffects';
import {
  GamepadCustomMapping,
  getStoredGamepadMapping,
  pollGamepadLanes,
} from '../services/gamepadService';
import { GamepadAssistantModal } from './GamepadAssistantModal';

const TARGET_Y = 130;
const NOTE_SPEED = 490; // pixels per second
const HIT_WINDOW = 0.15; // seconds
const COUNTDOWN_MS = 2400; // 2.4 seconds total countdown

const COLUMNS = 4;
const COLUMN_WIDTH = 76;
const COLUMN_SPACING = 20;

// Order: Left (0), Up (1), Down (2), Right (3)
const COLOR_MAP = [
  '#e63946', // Left (0): Vermilion / Cinnabar Red
  '#2a9d8f', // Up (1): Jade / Celestial Cyan / Green
  '#d4a373', // Down (2): Warm Solar Amber / Gold
  '#f5f2eb', // Right (3): Bone / Raw Rice Paper White
];

// User Requested Gamepad Diamond Layout:
// Left: Y (Col 0), Top: X (Col 1), Bottom: B (Col 2), Right: A (Col 3)
const GAMEPAD_LABELS = ['Y', 'X', 'B', 'A'];

const DIRECTION_NAMES = [
  { dir: 'LEFT', inst: 'Taiko Wood', glyph: '◂', btn: 'Y' },
  { dir: 'UP', inst: 'Bamboo Chime', glyph: '▴', btn: 'X' },
  { dir: 'DOWN', inst: 'Bronze Bell', glyph: '▾', btn: 'B' },
  { dir: 'RIGHT', inst: 'Suikin Drop', glyph: '▸', btn: 'A' },
];

const GLYPH_MAP = ['◂', '▴', '▾', '▸'];

const KANJI_JUDGMENTS = {
  PERFECT: { kanji: '極', label: 'PERFECT', color: '#e63946', badgeColor: '#e63946' },
  GREAT: { kanji: '優', label: 'GREAT', color: '#2a9d8f', badgeColor: '#2a9d8f' },
  GOOD: { kanji: '良', label: 'GOOD', color: '#d4a373', badgeColor: '#d4a373' },
  MISS: { kanji: '逸', label: 'MISS', color: '#71717a', badgeColor: '#71717a' },
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
  isSpark?: boolean;
}

interface RingShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
  isSpikeRing?: boolean;
}

interface AmbientEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  pulsePhase: number;
}

export type VisualMode = 'ARCADE' | 'MINIMAL';

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
  const [visualMode, setVisualMode] = useState<VisualMode>('ARCADE');
  const [testQuality, setTestQuality] = useState<'PERFECT' | 'GREAT'>('PERFECT');
  const [gamepadActiveName, setGamepadActiveName] = useState<string | null>(null);
  const [isGamepadModalOpen, setIsGamepadModalOpen] = useState(false);

  // Gamepad mapping ref
  const mappingRef = useRef<GamepadCustomMapping>(getStoredGamepadMapping());
  const gamepadPrevState = useRef<[boolean, boolean, boolean, boolean]>([false, false, false, false]);

  // Visual ref states that change every animation frame without re-rendering JSX
  const visualModeRef = useRef<VisualMode>(visualMode);
  visualModeRef.current = visualMode;

  // Initialize and clone notes safely
  const gameState = useRef({
    notes: (beatmap && beatmap.length > 0
      ? JSON.parse(JSON.stringify(beatmap))
      : []) as Note[],
    score: 0,
    displayedScore: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    greats: 0,
    goods: 0,
    misses: 0,
    multiplier: 1,
    keysPressed: [false, false, false, false],
    lastJudgment: null as keyof typeof KANJI_JUDGMENTS | null,
    lastTimingOffset: 0, // In ms: negative = early, positive = late
    lastHitCol: 0,
    lastHitTime: 0,
    screenShake: 0,
    grooveGauge: 50, // 0 to 100%
    lanePressScale: [1, 1, 1, 1], // Spring physics for button depression
    particles: [] as Particle[],
    shockwaves: [] as RingShockwave[],
    keyFlash: [0, 0, 0, 0],
    ambientEmbers: [] as AmbientEmber[],
    startTime: performance.now(),
    audioStarted: false,
  });

  // Seed ambient embers
  if (gameState.current.ambientEmbers.length === 0) {
    for (let i = 0; i < 48; i++) {
      gameState.current.ambientEmbers.push({
        x: Math.random() * 800,
        y: Math.random() * 860,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.2 - Math.random() * 0.65,
        size: 1.2 + Math.random() * 2.8,
        alpha: 0.15 + Math.random() * 0.35,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

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

    const modulator = new AcousticModulator();
    modulator.intensity = intensityMode;
    modulator.strikeVolume = strikeVolumeMode;
    modulator.init(audio);
    modulatorRef.current = modulator;

    gameState.current.startTime = performance.now();
    gameState.current.audioStarted = false;

    // Gamepad Connection Listeners
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.info("Gamepad detected:", e.gamepad.id);
      setGamepadActiveName(e.gamepad.id);
    };

    const handleGamepadDisconnected = () => {
      setGamepadActiveName(null);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Initial check for already connected gamepads safely
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      try {
        const existing = navigator.getGamepads();
        for (let i = 0; i < existing.length; i++) {
          if (existing[i]) {
            setGamepadActiveName(existing[i]!.id);
            break;
          }
        }
      } catch {
        // Safe catch if iframe permissions block getGamepads
      }
    }

    // Resolves column from keyboard event:
    // Supports Arrow keys AND requested Diamond Gamepad keys (Y, X, B, A)
    // with QWERTY and QWERTZ resilience
    const getColumnFromKey = (e: KeyboardEvent): number => {
      const code = e.code;
      const key = e.key.toLowerCase();

      // 1. Direct Arrow Keys
      if (code === 'ArrowLeft' || key === 'arrowleft') return 0;
      if (code === 'ArrowUp' || key === 'arrowup') return 1;
      if (code === 'ArrowDown' || key === 'arrowdown') return 2;
      if (code === 'ArrowRight' || key === 'arrowright') return 3;

      // 2. Diamond Gamepad Keys (Left = Y, Top = X, Bottom = B, Right = A)
      // Supports both QWERTY and QWERTZ (Y/Z swap)
      if (code === 'KeyY' || code === 'KeyZ' || key === 'y' || key === 'z') return 0; // Left (Y)
      if (code === 'KeyX' || key === 'x') return 1; // Top / Up (X)
      if (code === 'KeyB' || key === 'b') return 2; // Bottom / Down (B)
      if (code === 'KeyA' || key === 'a') return 3; // Right (A)

      // 3. Alternate Gamer Home Row (J, I, K, L)
      if (code === 'KeyJ' || key === 'j') return 0; // Left
      if (code === 'KeyI' || key === 'i') return 1; // Up
      if (code === 'KeyK' || key === 'k') return 2; // Down
      if (code === 'KeyL' || key === 'l') return 3; // Right

      return -1;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if ((e.code === 'Space' || e.code === 'Enter') && needsUserTap) {
        e.preventDefault();
        handleManualStart();
        return;
      }

      const col = getColumnFromKey(e);
      if (col !== -1) {
        e.preventDefault();
        modulatorRef.current?.resume();
        if (!gameState.current.keysPressed[col]) {
          gameState.current.keysPressed[col] = true;
          gameState.current.keyFlash[col] = 1.0;
          gameState.current.lanePressScale[col] = 0.86;
          if (audio && !audio.paused) {
            handleHit(col, audio.currentTime);
          } else if (needsUserTap) {
            handleManualStart();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const col = getColumnFromKey(e);
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
              if (deltaY < 0) col = 1; // Up
              else col = 2; // Down
            }

            if (col !== -1) {
              modulatorRef.current?.resume();
              gameState.current.keysPressed[col] = true;
              gameState.current.keyFlash[col] = 1.0;
              gameState.current.lanePressScale[col] = 0.86;
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

      // Poll Gamepads for Input safely inside try/catch
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        try {
          const gamepads = navigator.getGamepads();
          for (let g = 0; g < gamepads.length; g++) {
            const gp = gamepads[g];
            if (!gp) continue;

            if (!gamepadActiveName && gp.id) {
              setGamepadActiveName(gp.id);
            }

            const gpCurrent = pollGamepadLanes(gp, mappingRef.current);

            for (let col = 0; col < 4; col++) {
              const isPressed = gpCurrent[col];
              const wasPressed = gamepadPrevState.current[col];

              if (isPressed && !wasPressed) {
                // Edge Trigger: Pressed this frame
                modulatorRef.current?.resume();
                gameState.current.keysPressed[col] = true;
                gameState.current.keyFlash[col] = 1.0;
                gameState.current.lanePressScale[col] = 0.86;
                if (audio && !audio.paused) {
                  handleHit(col, audio.currentTime);
                } else if (needsUserTap) {
                  handleManualStart();
                }
              } else if (!isPressed && wasPressed) {
                // Released
                gameState.current.keysPressed[col] = false;
              }

              gamepadPrevState.current[col] = isPressed;
            }

            // Start / Pause button (Standard button 9)
            if (gp.buttons && gp.buttons[9]?.pressed && needsUserTap) {
              handleManualStart();
            }
          }
        } catch {
          // Ignore sandboxed iframe restriction silently in render loop
        }
      }

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
      const isArcade = visualModeRef.current === 'ARCADE';

      // Smooth score interpolation
      gameState.current.displayedScore += (gameState.current.score - gameState.current.displayedScore) * 0.16;

      // Decay spring scale on receptor gates
      for (let c = 0; c < 4; c++) {
        gameState.current.lanePressScale[c] += (1.0 - gameState.current.lanePressScale[c]) * 0.22;
      }

      // Sonic resonance level
      const resLevel = modulatorRef.current?.getResonanceLevel() || 0;
      if (modulatorRef.current) {
        modulatorRef.current.decayResonance(0.016);
      }

      const totalWidth = COLUMNS * COLUMN_WIDTH + (COLUMNS - 1) * COLUMN_SPACING;
      const START_X = (canvas.width - totalWidth) / 2;

      // 0. Screen Micro-Shake on Heavy Hits
      ctx.save();
      if (isArcade && gameState.current.screenShake > 0.05) {
        const shake = gameState.current.screenShake;
        const ox = (Math.random() - 0.5) * shake * 2.2;
        const oy = (Math.random() - 0.5) * shake * 2.2;
        ctx.translate(ox, oy);
        gameState.current.screenShake *= 0.82;
      }

      // 1. Deep Obsidian Cosmic Canvas
      ctx.fillStyle = '#07070a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle Vertical Gradient for atmospheric depth
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#09090e');
      bgGrad.addColorStop(0.5, '#0b0b12');
      bgGrad.addColorStop(1, '#111019');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Ambient Floating Sacred Embers (Atmospheric Starfield)
      if (isArcade) {
        const combo = gameState.current.combo;
        const isFever = combo >= 25;
        const emberColor = isFever ? '#e63946' : '#f5f2eb';

        for (let i = 0; i < gameState.current.ambientEmbers.length; i++) {
          const emb = gameState.current.ambientEmbers[i];
          emb.x += emb.vx + Math.sin(now / 1000 + emb.pulsePhase) * 0.15;
          emb.y += emb.vy;

          if (emb.y < -10) {
            emb.y = canvas.height + 10;
            emb.x = Math.random() * canvas.width;
          }
          if (emb.x < 0) emb.x = canvas.width;
          if (emb.x > canvas.width) emb.x = 0;

          const pAlpha = emb.alpha * (0.6 + Math.sin(now / 600 + emb.pulsePhase) * 0.4);
          ctx.save();
          ctx.globalAlpha = pAlpha;
          ctx.fillStyle = isFever && Math.random() > 0.5 ? '#d4a373' : emberColor;
          ctx.beginPath();
          ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. Central Sacred Astrolabe Geometry Background
      const rotAngle = (now / 18000) % (Math.PI * 2);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.48);
      ctx.rotate(rotAngle);
      
      const astrolabeGlow = resLevel > 0.6 || gameState.current.combo >= 25;
      ctx.strokeStyle = astrolabeGlow ? 'rgba(230, 57, 70, 0.14)' : 'rgba(245, 242, 235, 0.035)';
      ctx.lineWidth = astrolabeGlow ? 1.5 : 1.0;
      
      ctx.beginPath();
      ctx.arc(0, 0, 310, 0, Math.PI * 2);
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 235, Math.sin(a) * 235);
        ctx.lineTo(Math.cos(a) * 315, Math.sin(a) * 315);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Bilateral Audio Frequency Equalizer Ribbons (Left & Right Flanks)
      if (isArcade && modulatorRef.current) {
        const freqData = modulatorRef.current.getAudioFrequencyData();
        if (freqData && freqData.length > 0) {
          const barCount = 14;
          const maxBarH = 110;

          // Left Flank Visualizer
          ctx.save();
          for (let i = 0; i < barCount; i++) {
            const val = (freqData[i] || 0) / 255;
            const h = Math.max(3, val * maxBarH);
            const y = canvas.height * 0.65 - (i * 12);
            const x = 50 - (i * 2);
            
            ctx.fillStyle = resLevel > 0.5 
              ? `rgba(230, 57, 70, ${0.2 + val * 0.65})` 
              : `rgba(42, 157, 143, ${0.15 + val * 0.55})`;
            ctx.fillRect(x, y, h * 0.45, 4);
          }

          // Right Flank Visualizer
          for (let i = 0; i < barCount; i++) {
            const val = (freqData[i] || 0) / 255;
            const h = Math.max(3, val * maxBarH);
            const y = canvas.height * 0.65 - (i * 12);
            const x = canvas.width - 50 + (i * 2);
            
            ctx.fillStyle = resLevel > 0.5 
              ? `rgba(212, 163, 115, ${0.2 + val * 0.65})` 
              : `rgba(245, 242, 235, ${0.15 + val * 0.45})`;
            ctx.fillRect(x - h * 0.45, y, h * 0.45, 4);
          }
          ctx.restore();
        }
      }

      // 5. Cyber-Japanese Groove / Mastery Gauge (Vertical Left Rail)
      ctx.save();
      const gaugeX = 28;
      const gaugeY = 160;
      const gaugeH = 340;
      const gaugeW = 10;
      const gaugeRatio = Math.min(1, Math.max(0, gameState.current.grooveGauge / 100));

      // Background trough
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

      // Filled gauge segments
      const segmentCount = 20;
      const filledSegments = Math.round(gaugeRatio * segmentCount);
      const segH = (gaugeH - (segmentCount - 1) * 2) / segmentCount;

      for (let s = 0; s < segmentCount; s++) {
        const segIndexFromBottom = segmentCount - 1 - s;
        const sy = gaugeY + s * (segH + 2);
        const isLit = segIndexFromBottom < filledSegments;

        if (isLit) {
          const ratio = segIndexFromBottom / segmentCount;
          ctx.fillStyle = ratio > 0.75 
            ? '#e63946' 
            : ratio > 0.4 
            ? '#2a9d8f' 
            : '#d4a373';
          ctx.fillRect(gaugeX, sy, gaugeW, segH);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(gaugeX, sy, gaugeW, segH);
        }
      }

      // Rank Stamp at Top of Gauge
      ctx.fillStyle = gaugeRatio >= 0.75 ? '#e63946' : gaugeRatio >= 0.4 ? '#2a9d8f' : '#d4a373';
      ctx.font = 'bold 15px "Shippori Mincho", serif';
      ctx.textAlign = 'center';
      const rankKanji = gaugeRatio >= 0.75 ? '極' : gaugeRatio >= 0.4 ? '急' : '破';
      ctx.fillText(rankKanji, gaugeX + gaugeW / 2, gaugeY - 12);
      ctx.restore();

      // 6. Perspective Highway Track Rails & Lane Light Beams
      const TOP_Y = 0;
      const BOT_Y = canvas.height;
      const topScale = 0.92;
      const botScale = 1.04;

      // Draw Rails
      for (let i = 0; i <= COLUMNS; i++) {
        const colRel = i - COLUMNS / 2;
        const xTop = canvas.width / 2 + colRel * (COLUMN_WIDTH + COLUMN_SPACING) * topScale;
        const xBot = canvas.width / 2 + colRel * (COLUMN_WIDTH + COLUMN_SPACING) * botScale;

        ctx.strokeStyle = (i === 0 || i === COLUMNS) 
          ? 'rgba(245, 242, 235, 0.18)' 
          : 'rgba(245, 242, 235, 0.08)';
        ctx.lineWidth = (i === 0 || i === COLUMNS) ? 1.8 : 1.0;

        ctx.beginPath();
        ctx.moveTo(xTop, TOP_Y);
        ctx.lineTo(xBot, BOT_Y);
        ctx.stroke();

        // Longitudinal Highway Ticks
        for (let y = 60; y < canvas.height; y += 75) {
          const p = y / canvas.height;
          const currX = xTop + (xBot - xTop) * p;
          ctx.beginPath();
          ctx.moveTo(currX - 3, y);
          ctx.lineTo(currX + 3, y);
          ctx.stroke();
        }
      }

      // Column Light Beams & Laser Flares on Hit
      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const flash = gameState.current.keyFlash[i];

        if (flash > 0.01) {
          const grad = ctx.createLinearGradient(0, TARGET_Y, 0, canvas.height);
          grad.addColorStop(0, `${COLOR_MAP[i]}${Math.floor(flash * 85).toString(16).padStart(2, '0')}`);
          grad.addColorStop(0.3, `${COLOR_MAP[i]}${Math.floor(flash * 35).toString(16).padStart(2, '0')}`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(x, TARGET_Y, COLUMN_WIDTH, canvas.height - TARGET_Y);
          gameState.current.keyFlash[i] *= 0.88;
        } else {
          ctx.fillStyle = 'rgba(18, 18, 26, 0.35)';
          ctx.fillRect(x, 0, COLUMN_WIDTH, canvas.height);
        }

        // Dotted Center Lane Guideline
        ctx.strokeStyle = 'rgba(245, 242, 235, 0.05)';
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.moveTo(x + COLUMN_WIDTH / 2, 0);
        ctx.lineTo(x + COLUMN_WIDTH / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Resonance Ambient Bar over Target Gate
      if (resLevel > 0.05) {
        ctx.save();
        const glowColor = resLevel > 0.7 ? 'rgba(230, 57, 70,' : 'rgba(42, 157, 143,';
        ctx.strokeStyle = `${glowColor} ${resLevel * 0.7})`;
        ctx.lineWidth = 6 * resLevel;
        ctx.beginPath();
        ctx.moveTo(START_X - 60, TARGET_Y + COLUMN_WIDTH / 2);
        ctx.lineTo(START_X + totalWidth + 60, TARGET_Y + COLUMN_WIDTH / 2);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Tactile Interactive Receptor Gates (The Focal Point)
      // Line across receptor centers
      ctx.strokeStyle = 'rgba(245, 242, 235, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(START_X - 30, TARGET_Y + COLUMN_WIDTH / 2);
      ctx.lineTo(START_X + totalWidth + 30, TARGET_Y + COLUMN_WIDTH / 2);
      ctx.stroke();

      for (let i = 0; i < COLUMNS; i++) {
        const x = START_X + i * (COLUMN_WIDTH + COLUMN_SPACING);
        const y = TARGET_Y;
        const cx = x + COLUMN_WIDTH / 2;
        const cy = y + COLUMN_WIDTH / 2;
        const isPressed = gameState.current.keysPressed[i];
        const scale = gameState.current.lanePressScale[i];

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        if (isPressed) {
          // Struck Active State
          ctx.strokeStyle = COLOR_MAP[i];
          ctx.lineWidth = 3.5;
          ctx.fillStyle = `${COLOR_MAP[i]}33`;
          ctx.beginPath();
          ctx.arc(0, 0, COLUMN_WIDTH / 2 + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Outer Radiant Halo
          ctx.strokeStyle = `${COLOR_MAP[i]}66`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, COLUMN_WIDTH / 2 + 10, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Idle State
          ctx.strokeStyle = 'rgba(245, 242, 235, 0.35)';
          ctx.lineWidth = 1.6;
          ctx.fillStyle = 'rgba(12, 12, 18, 0.94)';
          ctx.beginPath();
          ctx.arc(0, 0, COLUMN_WIDTH / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Concentric Mechanical Tick Marks
          ctx.strokeStyle = 'rgba(245, 242, 235, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, COLUMN_WIDTH / 2 - 7, 0, Math.PI * 2);
          ctx.stroke();

          // Crosshairs
          ctx.beginPath();
          ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
          ctx.moveTo(0, -7); ctx.lineTo(0, 7);
          ctx.stroke();
        }

        // Direction Arrow Glyph
        ctx.fillStyle = isPressed ? '#ffffff' : 'rgba(245, 242, 235, 0.85)';
        ctx.font = 'bold 28px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GLYPH_MAP[i], 0, -2);

        // Gamepad Button Badge [ Y ] [ X ] [ B ] [ A ]
        ctx.fillStyle = isPressed ? COLOR_MAP[i] : 'rgba(245, 242, 235, 0.55)';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(`[ ${GAMEPAD_LABELS[i]} ]`, 0, COLUMN_WIDTH / 2 + 16);

        ctx.restore();
      }

      // 8. Notes Rendering with Dynamic Radiant Comet Trails
      for (const note of gameState.current.notes) {
        if (note.hit || note.missed) continue;

        // Note y calculation: travels from bottom towards TARGET_Y
        const y = TARGET_Y + (note.time - currentTime) * NOTE_SPEED;

        // Auto-miss if passed target window
        if (gameState.current.audioStarted && currentTime - note.time > HIT_WINDOW) {
          note.missed = true;
          gameState.current.combo = 0;
          gameState.current.multiplier = 1;
          gameState.current.misses++;
          gameState.current.lastJudgment = 'MISS';
          gameState.current.lastTimingOffset = Math.round((currentTime - note.time) * 1000);
          gameState.current.lastHitCol = note.column;
          gameState.current.lastHitTime = performance.now();
          gameState.current.grooveGauge = Math.max(0, gameState.current.grooveGauge - 8.0);
          
          modulatorRef.current?.triggerImpact('MISS', note.column);
          continue;
        }

        if (y > -COLUMN_WIDTH && y < canvas.height + 60) {
          const x = START_X + note.column * (COLUMN_WIDTH + COLUMN_SPACING);
          const cx = x + COLUMN_WIDTH / 2;
          const cy = y + COLUMN_WIDTH / 2;
          const noteColor = COLOR_MAP[note.column];

          // Proximity intensity: flares up as it approaches receptor gate
          const distToGate = Math.abs(cy - (TARGET_Y + COLUMN_WIDTH / 2));
          const proximityGlow = Math.max(0, 1 - distToGate / 220);

          // A. Dynamic Radiant Comet Tail (Extending downwards behind note)
          if (isArcade) {
            ctx.save();
            const tailLen = Math.min(105, distToGate * 0.8 + 35);
            const tailGrad = ctx.createLinearGradient(cx, cy, cx, cy + tailLen);
            tailGrad.addColorStop(0, `${noteColor}${Math.floor(80 + proximityGlow * 120).toString(16).padStart(2, '0')}`);
            tailGrad.addColorStop(1, 'transparent');

            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy);
            ctx.lineTo(cx + 18, cy);
            ctx.lineTo(cx, cy + tailLen);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // B. Note Diamond Body
          ctx.save();
          const r = COLUMN_WIDTH / 2 - 3;

          // Proximity Pulse Halo
          if (proximityGlow > 0.1) {
            ctx.strokeStyle = `${noteColor}${Math.floor(proximityGlow * 160).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#101016';
          ctx.strokeStyle = noteColor;
          ctx.lineWidth = 2.8;

          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r, cy);
          ctx.lineTo(cx, cy + r);
          ctx.lineTo(cx - r, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // C. Inner Sacred Japanese Geometric Crest (Asanoha facet)
          ctx.fillStyle = noteColor;
          ctx.beginPath();
          const innerR = r * 0.58;
          ctx.moveTo(cx, cy - innerR);
          ctx.lineTo(cx + innerR, cy);
          ctx.lineTo(cx, cy + innerR);
          ctx.lineTo(cx - innerR, cy);
          ctx.closePath();
          ctx.fill();

          // Central Radiant White Core
          ctx.fillStyle = note.column === 3 ? '#0b0b0e' : '#ffffff';
          ctx.font = 'bold 22px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(GLYPH_MAP[note.column], cx, cy + 1);
          ctx.restore();
        }
      }

      // 9. Particle Spark & Calligraphic Shards
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

        if (p.isSpark) {
          // Sharp Calligraphic Shard
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 2);
          ctx.lineTo(p.size * 0.6, 0);
          ctx.lineTo(0, p.size * 2);
          ctx.lineTo(-p.size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // 10. Expanding Ring Shockwaves with Radial Tick Spikes
      const shockwaves = gameState.current.shockwaves;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 3.8;
        sw.alpha *= 0.88;

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

        // Optional Astrolabe Spikes on Perfect
        if (sw.isSpikeRing) {
          ctx.setLineDash([4, 10]);
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius * 0.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // 11. Center Dynamic Combo Counter & Overdrive Flame
      const currentCombo = gameState.current.combo;
      if (currentCombo >= 2) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const comboY = TARGET_Y + COLUMN_WIDTH + 85;
        const comboColor = currentCombo >= 50 
          ? '#e63946' 
          : currentCombo >= 25 
          ? '#d4a373' 
          : '#f5f2eb';

        ctx.fillStyle = 'rgba(245, 242, 235, 0.5)';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText('STREAK // COMBO', canvas.width / 2, comboY - 24);

        ctx.fillStyle = comboColor;
        ctx.font = 'bold 50px "Syne", sans-serif';
        ctx.fillText(String(currentCombo), canvas.width / 2, comboY + 8);

        // Overdrive Tier Badge
        if (currentCombo >= 10) {
          const tierText = currentCombo >= 50 
            ? '★ OVERDRIVE MAX ×4' 
            : currentCombo >= 25 
            ? '✦ MASTER SURGE ×3' 
            : 'ADEPT RHYTHM ×2';
          ctx.fillStyle = comboColor;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(tierText, canvas.width / 2, comboY + 38);
        }
        ctx.restore();
      }

      // 12. Calligraphic Judgment & Early / Late Timing Telemetry
      const lastJudg = gameState.current.lastJudgment;
      if (lastJudg && performance.now() - gameState.current.lastHitTime < 560) {
        const judgData = KANJI_JUDGMENTS[lastJudg];
        const elapsedSinceHit = performance.now() - gameState.current.lastHitTime;
        const scale = 1 + Math.sin(elapsedSinceHit / 80) * 0.14;
        const alpha = Math.max(0, 1 - elapsedSinceHit / 560);
        const offset = gameState.current.lastTimingOffset;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(canvas.width / 2, TARGET_Y + COLUMN_WIDTH + 175);
        ctx.scale(scale, scale);

        // Card Frame
        ctx.strokeStyle = judgData.color;
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-72, -34, 144, 68);

        // Kanji
        ctx.fillStyle = judgData.color;
        ctx.font = 'bold 36px "Shippori Mincho", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(judgData.kanji, 0, -8);

        // Judgment Title
        ctx.fillStyle = '#f5f2eb';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(judgData.label, 0, 18);

        // Precise Early / Late Timing Badge
        if (lastJudg !== 'MISS') {
          let timingText = `±${Math.abs(offset)}ms PERFECT`;
          let timingColor = '#ffffff';

          if (offset < -12) {
            timingText = `${offset}ms EARLY`;
            timingColor = '#2a9d8f';
          } else if (offset > 12) {
            timingText = `+${offset}ms LATE`;
            timingColor = '#d4a373';
          }

          ctx.fillStyle = timingColor;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(timingText, 0, 44);
        }
        ctx.restore();
      }

      // 13. HUD Telemetry & Progress
      const duration = audio.duration || 100;
      const progressRatio = Math.min(1, Math.max(0, currentTime / duration));

      // Progress bar at very top
      ctx.fillStyle = 'rgba(245, 242, 235, 0.12)';
      ctx.fillRect(40, 24, canvas.width - 80, 2);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(40, 24, (canvas.width - 80) * progressRatio, 2);

      // Left HUD: Score & Time
      ctx.fillStyle = '#f5f2eb';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE // ${String(Math.round(gameState.current.displayedScore)).padStart(7, '0')}`, 40, 52);

      ctx.fillStyle = 'rgba(245, 242, 235, 0.55)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`TIME // ${formatTime(currentTime)} / ${formatTime(duration)}`, 40, 68);

      // Center HUD: Acoustic Resonance Telemetry
      ctx.save();
      ctx.textAlign = 'center';
      const barsCount = 10;
      const filledBars = Math.round(resLevel * barsCount);
      let resColor = 'rgba(245, 242, 235, 0.45)';
      if (resLevel > 0.7) resColor = '#e63946';
      else if (resLevel > 0.3) resColor = '#2a9d8f';
      else if (resLevel > 0.05) resColor = '#d4a373';

      ctx.fillStyle = resColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      const barStr = '▮'.repeat(filledBars) + '▯'.repeat(barsCount - filledBars);
      ctx.fillText(`SONIC RESONANCE [ ${barStr} ]`, canvas.width / 2, 52);

      ctx.fillStyle = 'rgba(245, 242, 235, 0.65)';
      ctx.font = '8px "JetBrains Mono", monospace';
      const statusText = resLevel > 0.7 
        ? '★ HARMONIC BLOOM // +65% MUSIC SURGE & SUB PUNCH' 
        : resLevel > 0.3 
        ? '✦ ACOUSTIC SWELL // +35% MUSIC LIFT & RESONANT SWEEP' 
        : 'Y: TAIKO  •  X: BAMBOO  •  B: KIN BELL  •  A: SUIKIN DROP';
      ctx.fillText(statusText, canvas.width / 2, 66);
      ctx.restore();

      // Right HUD: Acc & Gauge
      ctx.textAlign = 'right';
      const totalNotesPlayed = gameState.current.perfects + gameState.current.greats + gameState.current.goods + gameState.current.misses;
      const acc = totalNotesPlayed > 0 
        ? Math.round(((gameState.current.perfects + gameState.current.greats * 0.7 + gameState.current.goods * 0.4) / totalNotesPlayed) * 100) 
        : 100;

      ctx.fillStyle = '#f5f2eb';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`ACCURACY // ${acc}%`, canvas.width - 40, 52);

      ctx.fillStyle = '#d4a373';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`GAUGE // ${Math.round(gameState.current.grooveGauge)}%`, canvas.width - 40, 68);

      // 14. Countdown Overlay (Only during COUNTDOWN_MS)
      if (elapsed < COUNTDOWN_MS) {
        const countNumber = Math.ceil((COUNTDOWN_MS - elapsed) / 800);
        ctx.fillStyle = 'rgba(7, 7, 10, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((elapsed / 1000) % (Math.PI * 2));
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-72, -72, 144, 144);
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

      ctx.restore(); // Screen shake restore

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
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

      gameState.current.lanePressScale[col] = 0.86;
      gameState.current.keyFlash[col] = 1.0;
      gameState.current.screenShake = judgment === 'PERFECT' ? 3.0 : 1.5;

      gameState.current.shockwaves.push({
        x: cx,
        y: cy,
        radius: COLUMN_WIDTH / 3,
        maxRadius: judgment === 'PERFECT' ? COLUMN_WIDTH * 2.2 : COLUMN_WIDTH * 1.6,
        color: COLOR_MAP[col],
        alpha: 1.0,
        width: judgment === 'PERFECT' ? 3.8 : 2.4,
        isSpikeRing: judgment === 'PERFECT',
      });

      gameState.current.lastJudgment = judgment;
      gameState.current.lastTimingOffset = judgment === 'PERFECT' ? 2 : judgment === 'GREAT' ? -14 : 28;
      gameState.current.lastHitCol = col;
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
      else if (state.combo >= 25) state.multiplier = 3;
      else if (state.combo >= 10) state.multiplier = 2;
      else state.multiplier = 1;

      let points = 0;
      let judgment: keyof typeof KANJI_JUDGMENTS;

      const rawOffsetMs = Math.round((currentTime - closestNote.time) * 1000);

      if (minDiff < 0.05) {
        points = 300;
        state.perfects++;
        judgment = 'PERFECT';
        state.grooveGauge = Math.min(100, state.grooveGauge + 3.5);
        state.screenShake = 2.8;
      } else if (minDiff < 0.1) {
        points = 100;
        state.greats++;
        judgment = 'GREAT';
        state.grooveGauge = Math.min(100, state.grooveGauge + 1.8);
        state.screenShake = 1.4;
      } else {
        points = 50;
        state.goods++;
        judgment = 'GOOD';
        state.grooveGauge = Math.min(100, state.grooveGauge + 0.6);
        state.screenShake = 0.8;
      }

      state.score += points * state.multiplier;
      state.lastJudgment = judgment;
      state.lastTimingOffset = rawOffsetMs;
      state.lastHitCol = col;
      state.lastHitTime = performance.now();

      // Bold dynamic DSP track modulation:
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
          maxRadius: judgment === 'PERFECT' ? COLUMN_WIDTH * 2.2 : COLUMN_WIDTH * 1.6,
          color: COLOR_MAP[col],
          alpha: judgment === 'PERFECT' ? 1.0 : 0.85,
          width: judgment === 'PERFECT' ? 3.8 : 2.4,
          isSpikeRing: judgment === 'PERFECT',
        });

        // Spawn Rich Directional Spark Particles
        const count = judgment === 'PERFECT' ? 24 : 12;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (judgment === 'PERFECT' ? 3.5 : 2.0) + Math.random() * 5.5;
          state.particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.35 ? COLOR_MAP[col] : '#ffffff',
            size: 2 + Math.random() * 4.0,
            alpha: 1.0,
            decay: 0.02 + Math.random() * 0.03,
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.25,
            isSpark: Math.random() > 0.4,
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

  const directUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div 
      onClick={needsUserTap ? handleManualStart : undefined}
      className="flex flex-col items-center justify-center bg-[#07070a] min-h-screen text-[#f5f2eb] w-full touch-none overflow-hidden select-none p-2 sm:p-4 relative"
    >
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        crossOrigin="anonymous"
        preload="auto"
        onEnded={handleAudioEnded} 
      />

      {/* Manual Tap Overlay if browser autoplay policies prevent instant playback */}
      {needsUserTap && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in">
          <div className="border border-[#e63946] bg-[#14141e]/90 p-8 rounded-sm max-w-md flex flex-col items-center shadow-[0_0_50px_rgba(230,57,70,0.4)]">
            <div className="w-16 h-16 rounded-full border border-[#e63946] bg-[#e63946]/20 flex items-center justify-center text-[#e63946] mb-4 animate-pulse">
              <Flame size={32} />
            </div>
            <h2 className="text-xl font-syne font-black text-white uppercase mb-2">
              Commence Sonic Resonance
            </h2>
            <p className="text-xs font-mono text-[#f5f2eb]/70 mb-4">
              Click anywhere or press any Gamepad button (or keyboard Y, X, B, A / Space) to begin
            </p>
            <span className="px-6 py-2.5 bg-[#e63946] text-white text-xs font-mono font-bold uppercase tracking-widest rounded-sm">
              Engage Orbit
            </span>
          </div>
        </div>
      )}

      {/* Gamepad Setup / Diagnostic Assistant Modal */}
      <GamepadAssistantModal
        isOpen={isGamepadModalOpen}
        onClose={() => setIsGamepadModalOpen(false)}
        onMappingChange={(newMap) => {
          mappingRef.current = newMap;
        }}
      />

      <div className="relative w-full max-w-[800px] flex flex-col items-center">
        {/* Top Acoustic Telemetry & Controls Bar */}
        <div className="w-full flex flex-wrap items-center justify-between text-[11px] font-mono text-[#f5f2eb]/80 mb-2 px-1 gap-2">
          {/* Controls: Visual Mode, Strike Volume, DSP Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setVisualMode(v => v === 'ARCADE' ? 'MINIMAL' : 'ARCADE')}
              title="Click to toggle visual presentation: ARCADE (Full Comet Trails & Equalizer) vs MINIMAL (Clean Focus)"
              className="px-2.5 py-1 rounded bg-[#161622] hover:bg-white/10 border border-[#f5f2eb]/20 hover:border-white text-[#f5f2eb] font-bold text-[10px] tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye size={12} className={visualMode === 'ARCADE' ? 'text-[#e63946]' : 'text-zinc-400'} />
              <span>VISUALS: <span className={visualMode === 'ARCADE' ? 'text-[#e63946]' : 'text-zinc-400'}>{visualMode}</span></span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (modulatorRef.current) {
                  const next = modulatorRef.current.cycleStrikeVolume();
                  setStrikeVolumeMode(next);
                }
              }}
              title="Click to toggle strike volume: BALANCED, SOFT, CRISP, or MUTED"
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
                title={`Click to preview ${d.inst} (${d.dir}) [Gamepad: ${d.btn}]`}
              >
                <span style={{ color: COLOR_MAP[col] }}>{d.glyph}</span>
                <span className="font-bold text-[#f5f2eb]">{d.btn}:</span>
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
          className="border border-[#f5f2eb]/15 bg-[#07070a] shadow-[0_0_70px_rgba(0,0,0,0.9)] max-w-full h-auto max-h-[88dvh] rounded-sm"
        />

        {/* Footer Bar with Gamepad Status & Controls Layout */}
        <div className="w-full flex flex-wrap items-center justify-between text-[11px] font-mono text-[#f5f2eb]/60 mt-2 px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2a9d8f] animate-pulse" />
            <span>KINETIC PROTOCOL ACTIVE</span>
            <button
              type="button"
              onClick={() => setIsGamepadModalOpen(true)}
              className={`flex items-center gap-1.5 font-bold ml-1 px-2.5 py-0.5 rounded-xs border transition-colors cursor-pointer ${
                gamepadActiveName 
                  ? 'bg-[#2a9d8f]/15 border-[#2a9d8f]/50 text-[#2a9d8f] hover:bg-[#2a9d8f]/25' 
                  : 'bg-[#161622] border-[#f5f2eb]/20 text-[#f5f2eb]/70 hover:border-white hover:text-white'
              }`}
              title="Click to open Gamepad Assistant / Diagnoser / Button Calibrator"
            >
              <Gamepad2 size={13} />
              <span>{gamepadActiveName ? 'GAMEPAD CONNECTED' : 'GAMEPAD SETUP'}</span>
              <Settings2 size={11} className="opacity-60 ml-0.5" />
            </button>

            {/* Direct Tab Link if running inside an iframe */}
            {typeof window !== 'undefined' && window.self !== window.top && (
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-[10px] text-[#e63946] hover:underline ml-1 font-bold"
                title="Open in a direct browser tab (bypasses iframe Permissions Policy in Firefox & Chromium)"
              >
                <ExternalLink size={11} />
                <span>Open in Direct Tab ↗</span>
              </a>
            )}
          </div>
          <div className="text-right flex items-center gap-3 font-mono">
            <button
              type="button"
              onClick={() => setIsGamepadModalOpen(true)}
              className="text-[#f5f2eb]/90 font-bold bg-[#161622] hover:bg-[#e63946]/20 px-2 py-0.5 rounded border border-[#f5f2eb]/20 hover:border-[#e63946] transition-colors cursor-pointer"
              title="Click to view or calibrate button layout"
            >
              GAMEPAD: [ Y: ◂ | X: ▴ | B: ▾ | A: ▸ ]
            </button>
            <span className="hidden md:inline text-[#f5f2eb]/60">KEYS [← ↑ ↓ → / Y X B A]</span>
            <span className="md:hidden text-[#f5f2eb]/60">SWIPE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
