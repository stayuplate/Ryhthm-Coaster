/**
 * Generating Component - Rhythm Coaster
 * 
 * Aesthetic: Sacred Celestial Geometry, Astrolabe Oscillation,
 * Mythic Temple Synthesis Ritual, Archival Telemetry.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Activity } from 'lucide-react';

const CHRONICLES = [
  {
    era: "1996 // TOKYO",
    title: "The Dawn of Tactile Rhythm",
    text: "PaRappa the Rapper pioneered the genre by aligning rhymed cadence with prompt precision, proving timing is pure expression."
  },
  {
    era: "1998 // ARCADE ODYSSEY",
    title: "The Kinetic Ground Floor",
    text: "Dance Dance Revolution transformed physical space into an instrument, bringing body, tempo, and arrow geometry into unison."
  },
  {
    era: "1999 // VECTOR MINIMALISM",
    title: "Vib-Ribbon's Infinite Wire",
    text: "NanaOn-Sha's masterpiece allowed players to feed physical audio CDs, generating unique obstacle architecture from raw waveforms."
  },
  {
    era: "2006 // PURE TEMPO REFLEX",
    title: "The Ascetic Rhythm Heaven",
    text: "Stripping away visual scroll bars, Rhythm Heaven demonstrated that the most devastatingly accurate rhythm game relies purely on inner ear cues."
  },
  {
    era: "HERBERT CROWLEY // 1912",
    title: "Temple of Cosmic Vibration",
    text: "Early 20th-century visionary art envisioned temples as acoustic resonators, where symmetrical columns channel celestial harmony."
  },
  {
    era: "2026 // NEURAL LYRIA",
    title: "Autonomous Composition",
    text: "Google's Lyria model constructs intricate structural movements—verse builds, chorus climaxes, and tempo locks—on the fly."
  }
];

export function Generating() {
  const [chronicleIndex, setChronicleIndex] = useState(0);
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setChronicleIndex((prev) => (prev + 1) % CHRONICLES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pulse = setInterval(() => {
      setPulseCount((c) => (c + 1) % 100);
    }, 80);
    return () => clearInterval(pulse);
  }, []);

  const chronicle = CHRONICLES[chronicleIndex];

  return (
    <div className="relative min-h-screen bg-celestial-grid text-[#f5f2eb] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Background Rotating Astrolabe Rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-[500px] h-[500px] rounded-full border border-dashed border-[#e63946] animate-[spin_60s_linear_infinite]" />
        <div className="absolute w-[380px] h-[380px] rounded-full border border-[#f5f2eb]/40 animate-[spin_40s_linear_infinite_reverse]" />
        <div className="absolute w-[260px] h-[260px] rounded-full border border-[#d4a373] animate-[spin_25s_linear_infinite]" />
      </div>

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center">
        {/* Sacred Core Icon */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          {/* Outer diamond frame */}
          <div className="absolute inset-0 border border-[#e63946] rotate-45 animate-pulse" />
          <div className="absolute inset-3 border border-[#f5f2eb]/20" />
          
          {/* Inner rotating seal */}
          <div className="w-16 h-16 rounded-full border-2 border-t-[#e63946] border-r-transparent border-b-[#d4a373] border-l-transparent animate-spin" />
          
          {/* Center Hanko Emblem */}
          <div className="absolute font-mincho font-bold text-lg text-[#e63946]">
            詠
          </div>
        </div>

        {/* Telemetry Header */}
        <div className="flex items-center gap-2 text-xs font-mono tracking-[0.3em] uppercase text-[#d4a373] mb-3">
          <Activity size={14} className="text-[#e63946] animate-pulse" />
          <span>NEURAL HARMONIC SYNTHESIS // ACTIVE</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-syne font-black tracking-tight text-[#f5f2eb] uppercase mb-3">
          Forging Track & Beatmap
        </h2>
        
        <p className="text-sm font-mono text-[#f5f2eb]/60 mb-8 max-w-md">
          Synthesizing musical structure, verse-chorus energy dynamics, and kinetic arrow coordinates via Lyria model...
        </p>

        {/* Archival Chronicle Box */}
        <div className="poster-card w-full p-6 sm:p-8 rounded-sm text-left relative overflow-hidden min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#f5f2eb]/10 pb-3 mb-4">
            <span className="text-[11px] font-mono text-[#e63946] font-bold tracking-wider">
              {chronicle.era}
            </span>
            <span className="text-[10px] font-mono text-[#f5f2eb]/40">
              ARCHIVE // ENTRY {chronicleIndex + 1}/{CHRONICLES.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={chronicleIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="space-y-1.5"
            >
              <h3 className="font-modern font-bold text-base text-[#f5f2eb]">
                {chronicle.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#f5f2eb]/70 leading-relaxed font-light">
                {chronicle.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Bottom pulse bar */}
          <div className="mt-4 pt-3 border-t border-[#f5f2eb]/10 flex items-center justify-between text-[10px] font-mono text-[#f5f2eb]/40">
            <span>FREQUENCY SCAN: 48.0 kHz</span>
            <span className="text-[#d4a373]">SPECTRAL LOCK #{pulseCount}</span>
          </div>
        </div>

        <div className="mt-8 text-xs font-mono text-[#f5f2eb]/40 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e63946] animate-ping" />
          <span>GENERATION MAY TAKE 45 TO 90 SECONDS FOR FULL ORCHESTRATION</span>
        </div>
      </div>
    </div>
  );
}
