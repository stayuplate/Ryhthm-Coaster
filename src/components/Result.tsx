/**
 * Result Component - Rhythm Coaster
 * 
 * Aesthetic: Japanese Modernist Poster / Ritual Clearance Certificate,
 * Cinnabar Hanko Stamp Rank, High-Contrast Editorial Performance Grid.
 */

import React from 'react';
import { GameResult } from '../types';
import { Download, RotateCcw, ArrowRight, Award, Compass, Music } from 'lucide-react';

export function Result({
  result,
  onReplay,
  onMenu,
}: {
  result: GameResult;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const totalNotes = result.perfects + result.greats + result.goods + result.misses;
  const rawAcc = totalNotes > 0
    ? (result.perfects + result.greats * 0.8 + result.goods * 0.5) / totalNotes * 100
    : 0;
  const accuracy = rawAcc.toFixed(2);

  // Compute Rank & Hanko Seal
  let rank = 'C';
  let rankKanji = '修練';
  let rankLabel = 'APPRENTICE';
  let rankBorder = 'border-[#71717a] text-[#71717a]';

  if (rawAcc >= 98 && result.misses === 0) {
    rank = 'SS';
    rankKanji = '神技';
    rankLabel = 'DIVINE RESONANCE';
    rankBorder = 'border-[#e63946] text-[#e63946] shadow-[0_0_24px_rgba(230,57,70,0.35)]';
  } else if (rawAcc >= 93) {
    rank = 'S';
    rankKanji = '極等';
    rankLabel = 'MASTER TRANSMISSION';
    rankBorder = 'border-[#e63946] text-[#e63946] shadow-[0_0_18px_rgba(230,57,70,0.25)]';
  } else if (rawAcc >= 85) {
    rank = 'A';
    rankKanji = '優位';
    rankLabel = 'HIGH HARMONY';
    rankBorder = 'border-[#d4a373] text-[#d4a373] shadow-[0_0_16px_rgba(212,163,115,0.2)]';
  } else if (rawAcc >= 75) {
    rank = 'B';
    rankKanji = '良品';
    rankLabel = 'ADEPT PERFORMANCE';
    rankBorder = 'border-[#2a9d8f] text-[#2a9d8f]';
  }

  const downloadAudio = () => {
    if (!result.audioBlob) return;
    const url = URL.createObjectURL(result.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rhythm-coaster-track.wav';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBeatmap = () => {
    if (!result.beatmap) return;
    const data = JSON.stringify(result.beatmap, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rhythm-coaster-beatmap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-celestial-grid text-[#f5f2eb] flex flex-col items-center justify-center p-4 sm:p-8 select-none">
      {/* Background Celestial Rings */}
      <div className="pointer-events-none fixed inset-0 opacity-15 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-[#f5f2eb]/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border border-dashed border-[#e63946]/40" />
      </div>

      <div className="relative z-10 max-w-2xl w-full poster-card p-8 sm:p-12 rounded-sm border border-[#f5f2eb]/20">
        {/* Certificate Header */}
        <div className="flex items-center justify-between border-b border-[#f5f2eb]/15 pb-4 mb-8 text-xs font-mono text-[#f5f2eb]/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e63946]" />
            <span className="text-[#f5f2eb] font-bold uppercase">TEMPLE CLEARANCE // PROTOCOL RC-26</span>
          </div>
          <span>JUDGMENT CERTIFIED</span>
        </div>

        {/* Title & Rank Stamp Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-8 text-center sm:text-left">
          <div>
            <div className="text-xs font-mono tracking-[0.25em] text-[#d4a373] uppercase mb-1">
              軌道完了 // STAGE CLEARED
            </div>
            <h1 className="text-4xl sm:text-5xl font-syne font-black text-[#f5f2eb] uppercase tracking-tight">
              Trial Concluded
            </h1>
            <p className="text-xs font-mono text-[#f5f2eb]/50 mt-1 uppercase">
              RANKING: {rankLabel}
            </p>
          </div>

          {/* Hanko Seal of Rank */}
          <div className={`w-24 h-24 border-2 ${rankBorder} rounded-sm flex flex-col items-center justify-center font-mincho p-2 shrink-0`}>
            <span className="text-4xl font-syne font-black leading-none">{rank}</span>
            <span className="text-[11px] font-bold tracking-widest mt-1">{rankKanji}</span>
          </div>
        </div>

        {/* Giant Typographic Score */}
        <div className="bg-[#0b0b0e] border border-[#f5f2eb]/10 p-6 rounded-sm mb-8 text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#f5f2eb]/40 mb-2">
            AGGREGATE HARMONIC SCORE
          </div>
          <div className="text-5xl sm:text-6xl font-syne font-black tracking-tight text-[#f5f2eb]">
            {result.score.toLocaleString()}
          </div>
        </div>

        {/* Telemetry Breakdown Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Left: General Stats */}
          <div className="space-y-3 bg-[#12121a]/80 p-5 rounded-sm border border-[#f5f2eb]/10 text-xs font-mono">
            <div className="flex justify-between items-center border-b border-[#f5f2eb]/10 pb-2">
              <span className="text-[#f5f2eb]/60 uppercase">Max Combo</span>
              <span className="text-base font-bold text-[#f5f2eb]">{result.maxCombo}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#f5f2eb]/10 pb-2">
              <span className="text-[#f5f2eb]/60 uppercase">Accuracy</span>
              <span className="text-base font-bold text-[#d4a373]">{accuracy}%</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[#f5f2eb]/60 uppercase">Total Notes</span>
              <span className="text-sm font-bold text-[#f5f2eb]">{totalNotes}</span>
            </div>
          </div>

          {/* Right: Judgment Counts */}
          <div className="space-y-2 bg-[#12121a]/80 p-5 rounded-sm border border-[#f5f2eb]/10 text-xs font-mono">
            <div className="flex justify-between items-center text-[#e63946]">
              <span className="flex items-center gap-1.5">
                <span className="font-mincho font-bold">極</span> PERFECT
              </span>
              <span className="font-bold text-sm">{result.perfects}</span>
            </div>
            <div className="flex justify-between items-center text-[#2a9d8f]">
              <span className="flex items-center gap-1.5">
                <span className="font-mincho font-bold">優</span> GREAT
              </span>
              <span className="font-bold text-sm">{result.greats}</span>
            </div>
            <div className="flex justify-between items-center text-[#d4a373]">
              <span className="flex items-center gap-1.5">
                <span className="font-mincho font-bold">良</span> GOOD
              </span>
              <span className="font-bold text-sm">{result.goods}</span>
            </div>
            <div className="flex justify-between items-center text-[#71717a]">
              <span className="flex items-center gap-1.5">
                <span className="font-mincho font-bold">逸</span> MISS
              </span>
              <span className="font-bold text-sm">{result.misses}</span>
            </div>
          </div>
        </div>

        {/* Export Artifacts */}
        {(result.audioBlob || result.beatmap) && (
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8 pb-6 border-b border-[#f5f2eb]/10">
            {result.audioBlob && (
              <button
                type="button"
                onClick={downloadAudio}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#14141d] hover:bg-[#1a1a26] border border-[#f5f2eb]/20 text-xs font-mono text-[#f5f2eb] rounded-sm transition-colors cursor-pointer"
              >
                <Music size={14} className="text-[#d4a373]" />
                <span>Export Master Audio (.wav)</span>
              </button>
            )}
            {result.beatmap && (
              <button
                type="button"
                onClick={downloadBeatmap}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#14141d] hover:bg-[#1a1a26] border border-[#f5f2eb]/20 text-xs font-mono text-[#f5f2eb] rounded-sm transition-colors cursor-pointer"
              >
                <Download size={14} className="text-[#2a9d8f]" />
                <span>Export Beatmap JSON</span>
              </button>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={onReplay}
            className="w-full sm:flex-1 py-4 px-6 bg-[#f5f2eb] text-[#0b0b0e] font-modern font-black text-sm uppercase tracking-wider rounded-sm hover:bg-[#e63946] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Re-Engage Orbit</span>
          </button>
          
          <button
            type="button"
            onClick={onMenu}
            className="w-full sm:flex-1 py-4 px-6 bg-[#161622] text-[#f5f2eb] border border-[#f5f2eb]/20 font-modern font-bold text-sm uppercase tracking-wider rounded-sm hover:border-[#e63946] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Return to Temple</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
