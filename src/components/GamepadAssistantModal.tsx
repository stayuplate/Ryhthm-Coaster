/**
 * Gamepad Assistant Modal - Rhythm Coaster
 * 
 * Aesthetic: Japanese Modernist Graphic Design with Cyber-Astrolabe Telemetry.
 * Diagnoses environment (Firefox sandbox, iframe permissions, focus, gamepad wake-up),
 * provides platform-specific fixes (Firefox about:config, Ubuntu Snap joystick permissions),
 * displays live controller feedback, and allows button calibration + instant keyboard fallback.
 */

import React, { useEffect, useState } from 'react';
import { 
  Gamepad2, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  X, 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  Info,
  ShieldAlert,
  Flame
} from 'lucide-react';
import {
  GamepadCustomMapping,
  checkGamepadEnvironment,
  getStoredGamepadMapping,
  saveGamepadMapping,
} from '../services/gamepadService';

interface GamepadAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingChange?: (mapping: GamepadCustomMapping) => void;
}

export function GamepadAssistantModal({ isOpen, onClose, onMappingChange }: GamepadAssistantModalProps) {
  const [mapping, setMapping] = useState<GamepadCustomMapping>(getStoredGamepadMapping());
  const [envCheck, setEnvCheck] = useState(checkGamepadEnvironment());
  const [listeningFor, setListeningFor] = useState<'left' | 'top' | 'bottom' | 'right' | null>(null);
  const [rawButtons, setRawButtons] = useState<boolean[]>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSnap, setCopiedSnap] = useState(false);
  const [copiedFlatpak, setCopiedFlatpak] = useState(false);
  
  // Real-time lane activity indicator (triggered by keyboard OR controller)
  const [laneActivity, setLaneActivity] = useState<[boolean, boolean, boolean, boolean]>([false, false, false, false]);

  // Listen to keyboard keys while modal is open for live testing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      let col = -1;
      if (code === 'KeyY' || code === 'KeyZ' || key === 'y' || key === 'z' || code === 'ArrowLeft') col = 0;
      else if (code === 'KeyX' || key === 'x' || code === 'ArrowUp') col = 1;
      else if (code === 'KeyB' || key === 'b' || code === 'ArrowDown') col = 2;
      else if (code === 'KeyA' || key === 'a' || code === 'ArrowRight') col = 3;

      if (col !== -1) {
        setLaneActivity(prev => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[col] = true;
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      let col = -1;
      if (code === 'KeyY' || code === 'KeyZ' || key === 'y' || key === 'z' || code === 'ArrowLeft') col = 0;
      else if (code === 'KeyX' || key === 'x' || code === 'ArrowUp') col = 1;
      else if (code === 'KeyB' || key === 'b' || code === 'ArrowDown') col = 2;
      else if (code === 'KeyA' || key === 'a' || code === 'ArrowRight') col = 3;

      if (col !== -1) {
        setLaneActivity(prev => {
          const next = [...prev] as [boolean, boolean, boolean, boolean];
          next[col] = false;
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // Poll environment and live buttons
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const check = checkGamepadEnvironment();
      setEnvCheck(check);

      // Check all buttons on the first connected gamepad
      if (check.connectedGamepads.length > 0) {
        const gp = check.connectedGamepads[0];
        const states: boolean[] = [];
        let pressedIndex: number | null = null;

        for (let i = 0; i < gp.buttons.length; i++) {
          const b = gp.buttons[i];
          const isPressed = typeof b === 'object' ? Boolean(b.pressed || (typeof b.value === 'number' && b.value > 0.45)) : Number(b) > 0.45;
          states.push(isPressed);
          if (isPressed && pressedIndex === null) {
            pressedIndex = i;
          }
        }
        setRawButtons(states);

        // Update lane activity from gamepad
        const isLeft = states[mapping.leftBtn] || states[14] || (gp.axes && gp.axes[0] < -0.5);
        const isTop = states[mapping.topBtn] || states[12] || (gp.axes && gp.axes[1] < -0.5);
        const isBottom = states[mapping.bottomBtn] || states[13] || (gp.axes && gp.axes[1] > 0.5);
        const isRight = states[mapping.rightBtn] || states[15] || (gp.axes && gp.axes[0] > 0.5);
        setLaneActivity(prev => [
          isLeft || prev[0],
          isTop || prev[1],
          isBottom || prev[2],
          isRight || prev[3],
        ]);

        // Handle active remapping calibration
        if (listeningFor && pressedIndex !== null) {
          const updated = { ...mapping };
          if (listeningFor === 'left') updated.leftBtn = pressedIndex;
          else if (listeningFor === 'top') updated.topBtn = pressedIndex;
          else if (listeningFor === 'bottom') updated.bottomBtn = pressedIndex;
          else if (listeningFor === 'right') updated.rightBtn = pressedIndex;

          setMapping(updated);
          saveGamepadMapping(updated);
          onMappingChange?.(updated);
          setListeningFor(null);
        }
      } else {
        setRawButtons([]);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, listeningFor, mapping, onMappingChange]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    const defaults: GamepadCustomMapping = {
      leftBtn: 2,   // Y
      topBtn: 3,    // X
      bottomBtn: 0, // B
      rightBtn: 1,  // A
    };
    setMapping(defaults);
    saveGamepadMapping(defaults);
    onMappingChange?.(defaults);
  };

  const directUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e0e14] border-2 border-[#e63946] shadow-[0_0_60px_rgba(230,57,70,0.3)] rounded-sm p-5 sm:p-6 text-[#f5f2eb] font-sans flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f5f2eb]/15 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#e63946]/20 border border-[#e63946] flex items-center justify-center text-[#e63946]">
              <Gamepad2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-syne font-black uppercase tracking-wider text-white flex flex-wrap items-center gap-2">
                Gamepad Diagnostic // コントローラー設定
                {envCheck.isFirefox && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center gap-1">
                    <Flame size={11} /> FIREFOX DETECTED
                  </span>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#e63946]/20 text-[#e63946] border border-[#e63946]/40">
                  DIAMOND LAYOUT
                </span>
              </h2>
              <p className="text-xs font-mono text-[#f5f2eb]/60">
                Top: X // Bottom: B // Left: Y // Right: A
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Real-time Lane Tester Bar */}
        <div className="mb-4 p-3 bg-[#14141e] border border-white/10 rounded-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2a9d8f] animate-ping" />
              Live Input Tester (Gamepad or Keyboard)
            </span>
            <span className="text-[10px] font-mono text-[#f5f2eb]/60">
              {envCheck.connectedGamepads.length > 0 ? '🎮 Gamepad Connected' : '⌨️ Keyboard Ready (Y, X, B, A)'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            {/* Col 0: Left / Y */}
            <div className={`p-2 rounded border transition-all ${
              laneActivity[0]
                ? 'bg-[#e63946] border-[#e63946] text-white shadow-[0_0_15px_rgba(230,57,70,0.8)] scale-102'
                : 'bg-[#0b0b0e] border-[#e63946]/30 text-[#e63946]'
            }`}>
              <div className="text-[9px] uppercase font-bold">Left (◂)</div>
              <div className="text-xl font-black font-syne">Y</div>
              <div className="text-[9px] opacity-70">[Btn {mapping.leftBtn} / 'Y']</div>
            </div>

            {/* Col 1: Top / X */}
            <div className={`p-2 rounded border transition-all ${
              laneActivity[1]
                ? 'bg-[#2a9d8f] border-[#2a9d8f] text-white shadow-[0_0_15px_rgba(42,157,143,0.8)] scale-102'
                : 'bg-[#0b0b0e] border-[#2a9d8f]/30 text-[#2a9d8f]'
            }`}>
              <div className="text-[9px] uppercase font-bold">Top (▴)</div>
              <div className="text-xl font-black font-syne">X</div>
              <div className="text-[9px] opacity-70">[Btn {mapping.topBtn} / 'X']</div>
            </div>

            {/* Col 2: Bottom / B */}
            <div className={`p-2 rounded border transition-all ${
              laneActivity[2]
                ? 'bg-[#d4a373] border-[#d4a373] text-black shadow-[0_0_15px_rgba(212,163,115,0.8)] scale-102'
                : 'bg-[#0b0b0e] border-[#d4a373]/30 text-[#d4a373]'
            }`}>
              <div className="text-[9px] uppercase font-bold">Bottom (▾)</div>
              <div className="text-xl font-black font-syne">B</div>
              <div className="text-[9px] opacity-70">[Btn {mapping.bottomBtn} / 'B']</div>
            </div>

            {/* Col 3: Right / A */}
            <div className={`p-2 rounded border transition-all ${
              laneActivity[3]
                ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-102'
                : 'bg-[#0b0b0e] border-white/30 text-[#f5f2eb]'
            }`}>
              <div className="text-[9px] uppercase font-bold">Right (▸)</div>
              <div className="text-xl font-black font-syne">A</div>
              <div className="text-[9px] opacity-70">[Btn {mapping.rightBtn} / 'A']</div>
            </div>
          </div>
        </div>

        {/* FIREFOX SPECIFIC COMPREHENSIVE TROUBLESHOOTING GUIDE */}
        <div className="mb-5 p-4 bg-orange-950/20 border-2 border-orange-500/50 rounded-sm space-y-3">
          <div className="flex items-start gap-3">
            <Flame size={22} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Why Firefox Refuses to Detect Gamepads & Exactly How to Fix It
              </h3>
              <p className="text-xs font-mono text-[#f5f2eb]/80 mt-1 leading-relaxed">
                Firefox has strict security, anti-fingerprinting, and sandboxing rules that prevent controllers from appearing. Here are the 5 known causes and solutions:
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs font-mono text-[#f5f2eb]/90">
            {/* Step 1: Iframe restriction */}
            <div className="p-3 bg-[#0b0b0e] rounded-xs border border-orange-500/30">
              <div className="flex items-center gap-2 text-orange-400 font-bold mb-1">
                <span>1. Iframe Permissions Policy Block (Preview Pane)</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb]/70 leading-relaxed mb-2">
                Since Firefox 82, Firefox <strong>completely disables the Gamepad API</strong> inside any embedded third-party iframe (like this preview) unless granted permission by the parent host. Opening the app directly in a full tab removes this restriction:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                >
                  <ExternalLink size={13} />
                  <span>Open Standalone Tab in Firefox ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(directUrl, setCopiedUrl)}
                  className="px-3 py-1.5 bg-[#161622] hover:bg-white/10 border border-white/20 text-xs rounded-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedUrl ? <Check size={13} className="text-[#2a9d8f]" /> : <Copy size={13} />}
                  <span>{copiedUrl ? 'Copied Link!' : 'Copy Direct URL'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Physical Button Press Required */}
            <div className="p-3 bg-[#0b0b0e] rounded-xs border border-white/10">
              <div className="flex items-center gap-2 text-[#2a9d8f] font-bold mb-1">
                <span>2. Firefox User Gesture Rule: Tap A/B/X/Y on your Controller</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb]/70 leading-relaxed mb-2">
                Unlike other software, Firefox <strong>will never show any connected gamepad</strong> until you physically click a button or nudge a stick on the controller while the Firefox tab is focused.
              </p>
              <button
                type="button"
                onClick={() => window.focus()}
                className="w-full py-1.5 bg-[#2a9d8f]/20 hover:bg-[#2a9d8f]/30 border border-[#2a9d8f] text-[#2a9d8f] font-bold text-xs uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw size={13} />
                Click Here to Focus Tab & Then Press Controller Button
              </button>
            </div>

            {/* Step 3: privacy.resistFingerprinting in about:config */}
            <div className="p-3 bg-[#0b0b0e] rounded-xs border border-white/10">
              <div className="flex items-center gap-2 text-[#e63946] font-bold mb-1">
                <ShieldAlert size={14} />
                <span>3. Firefox about:config — "privacy.resistFingerprinting" Setting</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb]/70 leading-relaxed mb-1.5">
                If you use Firefox privacy hardening (Arkenfox, LibreWolf, or enabled resist fingerprinting): Firefox <strong>purposely disables all gamepad detection</strong> to prevent tracking.
              </p>
              <div className="p-2 bg-black/60 rounded border border-white/10 text-[11px] space-y-1 font-mono">
                <div>• Type <span className="text-orange-400 font-bold">about:config</span> in Firefox address bar and hit Enter.</div>
                <div>• Search for <span className="text-white font-bold">privacy.resistFingerprinting</span> → Set to <span className="text-[#e63946] font-bold">false</span>.</div>
                <div>• Search for <span className="text-white font-bold">dom.gamepad.enabled</span> → Ensure set to <span className="text-[#2a9d8f] font-bold">true</span>.</div>
              </div>
            </div>

            {/* Step 4: Linux Ubuntu Snap / Flatpak Sandboxing */}
            <div className="p-3 bg-[#0b0b0e] rounded-xs border border-white/10">
              <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                <Terminal size={14} />
                <span>4. Linux (Ubuntu Snap / Flatpak) Joystick Permission</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb]/70 leading-relaxed mb-2">
                On Ubuntu Linux, Firefox runs as a Snap sandbox by default which blocks <code className="text-white">/dev/input/js*</code> devices. Run this command in terminal to connect your joystick:
              </p>
              
              <div className="flex items-center justify-between p-2 bg-black/80 rounded border border-cyan-500/30 font-mono text-[11px] text-cyan-300 mb-2">
                <code>sudo snap connect firefox:joystick</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('sudo snap connect firefox:joystick', setCopiedSnap)}
                  className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded cursor-pointer transition-colors"
                >
                  {copiedSnap ? <Check size={12} className="text-[#2a9d8f]" /> : <Copy size={12} />}
                </button>
              </div>

              <p className="text-[10px] text-[#f5f2eb]/50">
                Or for Flatpak Firefox: <code className="text-[#f5f2eb]/80">flatpak override --user --device=all org.mozilla.firefox</code>
              </p>
            </div>

            {/* Step 5: Steam Desktop Mode Conflict */}
            <div className="p-3 bg-[#0b0b0e] rounded-xs border border-white/10">
              <div className="flex items-center gap-2 text-[#d4a373] font-bold mb-1">
                <Info size={14} />
                <span>5. Steam Desktop Controller Layout Conflict</span>
              </div>
              <p className="text-[11px] text-[#f5f2eb]/70 leading-relaxed">
                If the Steam client is open in the background, Steam's "Desktop Configuration" frequently captures your Xbox/PlayStation/Switch controller exclusively and hides it from Firefox. Simply right-click Steam in your system tray and select <strong>Exit Steam</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Live Controller Raw Button Telemetry if detected */}
        {envCheck.connectedGamepads.length > 0 && (
          <div className="bg-[#14141e] border border-[#f5f2eb]/10 p-4 rounded-sm mb-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-1">
              Active Controller: {envCheck.connectedGamepads[0].id}
            </h3>
            <p className="text-[10px] font-mono text-[#f5f2eb]/50 mb-3">
              Press any button on your controller to verify input:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rawButtons.map((isPressed, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 text-[10px] font-mono font-bold rounded-xs border transition-colors ${
                    isPressed 
                      ? 'bg-[#2a9d8f] border-[#2a9d8f] text-black shadow-[0_0_10px_rgba(42,157,143,0.8)]' 
                      : 'bg-[#0b0b0e] border-white/10 text-white/50'
                  }`}
                >
                  B{idx}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Button Mapping & Calibration Grid */}
        <div className="bg-[#14141e] border border-[#f5f2eb]/10 p-4 rounded-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Diamond Button Calibration (Top X, Bottom B, Left Y, Right A)
            </h3>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[10px] font-mono text-[#f5f2eb]/60 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {/* Left / Y */}
            <div className="p-3 bg-[#0b0b0e] border border-[#e63946]/40 rounded-xs text-center flex flex-col items-center">
              <span className="text-[10px] font-mono text-[#e63946] font-bold uppercase">Left (Lane 0)</span>
              <span className="text-2xl font-black font-syne text-white my-1">Y</span>
              <span className="text-[10px] font-mono text-[#f5f2eb]/50 mb-2">Btn [{mapping.leftBtn}] / Key 'Y'</span>
              <button
                type="button"
                onClick={() => setListeningFor('left')}
                className={`w-full py-1 text-[10px] font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                  listeningFor === 'left' ? 'bg-[#e63946] text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-[#f5f2eb]'
                }`}
              >
                {listeningFor === 'left' ? 'Press Button...' : 'Remap'}
              </button>
            </div>

            {/* Top / X */}
            <div className="p-3 bg-[#0b0b0e] border border-[#2a9d8f]/40 rounded-xs text-center flex flex-col items-center">
              <span className="text-[10px] font-mono text-[#2a9d8f] font-bold uppercase">Top (Lane 1)</span>
              <span className="text-2xl font-black font-syne text-white my-1">X</span>
              <span className="text-[10px] font-mono text-[#f5f2eb]/50 mb-2">Btn [{mapping.topBtn}] / Key 'X'</span>
              <button
                type="button"
                onClick={() => setListeningFor('top')}
                className={`w-full py-1 text-[10px] font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                  listeningFor === 'top' ? 'bg-[#2a9d8f] text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-[#f5f2eb]'
                }`}
              >
                {listeningFor === 'top' ? 'Press Button...' : 'Remap'}
              </button>
            </div>

            {/* Bottom / B */}
            <div className="p-3 bg-[#0b0b0e] border border-[#d4a373]/40 rounded-xs text-center flex flex-col items-center">
              <span className="text-[10px] font-mono text-[#d4a373] font-bold uppercase">Bottom (Lane 2)</span>
              <span className="text-2xl font-black font-syne text-white my-1">B</span>
              <span className="text-[10px] font-mono text-[#f5f2eb]/50 mb-2">Btn [{mapping.bottomBtn}] / Key 'B'</span>
              <button
                type="button"
                onClick={() => setListeningFor('bottom')}
                className={`w-full py-1 text-[10px] font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                  listeningFor === 'bottom' ? 'bg-[#d4a373] text-[#0b0b0e] font-black animate-pulse' : 'bg-white/10 hover:bg-white/20 text-[#f5f2eb]'
                }`}
              >
                {listeningFor === 'bottom' ? 'Press Button...' : 'Remap'}
              </button>
            </div>

            {/* Right / A */}
            <div className="p-3 bg-[#0b0b0e] border border-[#f5f2eb]/30 rounded-xs text-center flex flex-col items-center">
              <span className="text-[10px] font-mono text-[#f5f2eb] font-bold uppercase">Right (Lane 3)</span>
              <span className="text-2xl font-black font-syne text-white my-1">A</span>
              <span className="text-[10px] font-mono text-[#f5f2eb]/50 mb-2">Btn [{mapping.rightBtn}] / Key 'A'</span>
              <button
                type="button"
                onClick={() => setListeningFor('right')}
                className={`w-full py-1 text-[10px] font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                  listeningFor === 'right' ? 'bg-white text-black font-black animate-pulse' : 'bg-white/10 hover:bg-white/20 text-[#f5f2eb]'
                }`}
              >
                {listeningFor === 'right' ? 'Press Button...' : 'Remap'}
              </button>
            </div>
          </div>
        </div>

        {/* 100% Reliable Keyboard & Software Mapper Bridge */}
        <div className="p-3.5 bg-[#0b0b0e] border border-[#f5f2eb]/15 rounded-sm text-xs font-mono text-[#f5f2eb]/80 space-y-1.5 mb-4">
          <span className="text-white font-bold block flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#2a9d8f]" />
            Instant Play via Native Diamond Keyboard Keys:
          </span>
          <p className="leading-relaxed text-[11px]">
            If Firefox or your OS driver prevents raw browser controller access, the game is <strong>100% fully playable right now</strong> using the exact Diamond keys on your keyboard:
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] pt-1">
            <span className="px-2 py-0.5 bg-[#e63946]/20 border border-[#e63946]/50 text-[#e63946] font-bold rounded-xs">
              Y / Z = Left (◂)
            </span>
            <span className="px-2 py-0.5 bg-[#2a9d8f]/20 border border-[#2a9d8f]/50 text-[#2a9d8f] font-bold rounded-xs">
              X = Top (▴)
            </span>
            <span className="px-2 py-0.5 bg-[#d4a373]/20 border border-[#d4a373]/50 text-[#d4a373] font-bold rounded-xs">
              B = Bottom (▾)
            </span>
            <span className="px-2 py-0.5 bg-white/20 border border-white/50 text-white font-bold rounded-xs">
              A = Right (▸)
            </span>
          </div>
          <p className="text-[10px] text-[#f5f2eb]/50 pt-1">
            You can also map your physical gamepad buttons directly to keys Y, X, B, A via <strong>AntiMicroX</strong>, <strong>Steam Input</strong>, or <strong>JoyToKey</strong> for zero-lag hardware input regardless of browser restrictions!
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#f5f2eb]/10">
          <div className="text-[11px] font-mono text-[#f5f2eb]/50">
            {envCheck.isFirefox ? 'Firefox WebEngine Active' : 'Web Gamepad Engine'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#e63946] hover:bg-[#d62839] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
          >
            Ready / Done
          </button>
        </div>
      </div>
    </div>
  );
}
