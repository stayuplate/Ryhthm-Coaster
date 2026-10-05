/**
 * Menu Component - Rhythm Coaster
 * 
 * Aesthetic: Japanese Modernist Poster Graphic Design fused with
 * Atmospheric Mythic / Esoteric Temple Architecture.
 * High contrast, sumi ink, cinnabar red, gold ochre, precision typography.
 */

import React, { useState, useEffect } from 'react';
import { DurationMode, Style, Difficulty, GenerationOptions } from '../types';
import { Disc3, Sparkles, Compass, Radio, Activity, ArrowRight, Play, Volume2, ShieldAlert, Upload, Trash2, Plus } from 'lucide-react';
import { FEATURED_SONGS, LibrarySong } from '../game/songs';
import { SongImporterModal } from './SongImporterModal';
import { getAllCustomSongs, deleteCustomSong } from '../services/songStorage';

interface MenuProps {
  onStart: (options: GenerationOptions) => void;
  onSelectLibrarySong: (song: LibrarySong) => void;
  errorMsg?: string | null;
  hasKey: boolean;
  onSelectKey: () => void;
}

export function Menu({ onStart, onSelectLibrarySong, errorMsg, hasKey, onSelectKey }: MenuProps) {
  const [mode, setMode] = useState<DurationMode>('full');
  const [style, setStyle] = useState<Style>('electronic');
  const [customStyle, setCustomStyle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const [customSongs, setCustomSongs] = useState<LibrarySong[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  useEffect(() => {
    getAllCustomSongs().then((songs) => {
      setCustomSongs(songs);
    });
  }, []);

  const handleCustomSongSaved = (newSong: LibrarySong) => {
    setCustomSongs((prev) => [newSong, ...prev.filter((s) => s.id !== newSong.id)]);
  };

  const handleDeleteCustomSong = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this transmission from your archive?")) return;
    await deleteCustomSong(id);
    setCustomSongs((prev) => prev.filter((s) => s.id !== id));
  };

  const STYLES: { value: Style; label: string; kanji: string; desc: string }[] = [
    { value: 'electronic', label: 'Electronic', kanji: '電子音響', desc: 'Synthesizers & driving pulses' },
    { value: 'rock', label: 'Rock', kanji: '激動重音', desc: 'Overdriven guitars & fierce rhythm' },
    { value: 'pop', label: 'Pop', kanji: '流動華調', desc: 'Melodic hooks & infectious grooves' },
    { value: 'hiphop', label: 'Hip Hop', kanji: '律動韻律', desc: 'Deep basslines & syncopated cuts' },
    { value: 'jazz', label: 'Jazz', kanji: '即興夜曲', desc: 'Complex polyrhythms & brass solos' },
    { value: 'custom', label: 'Custom', kanji: '自在調律', desc: 'Define your sonic coordinates' },
  ];

  const DIFFICULTIES: { value: Difficulty; label: string; kanji: string; bpm: number; color: string }[] = [
    { value: 'easy', label: 'Apprentice', kanji: '初心', bpm: 90, color: '#2a9d8f' },
    { value: 'normal', label: 'Adept', kanji: '正律', bpm: 128, color: '#d4a373' },
    { value: 'hard', label: 'Master', kanji: '極限', bpm: 150, color: '#e63946' },
  ];

  return (
    <div className="relative min-h-screen bg-celestial-grid text-[#f5f2eb] px-4 py-8 md:p-12 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none fixed inset-0 opacity-15 overflow-hidden">
        {/* Sacred Geometry Orbit Rings */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border border-dashed border-[#e63946]/40 animate-[spin_120s_linear_infinite]" />
        <div className="absolute -top-16 -right-16 w-[480px] h-[480px] rounded-full border border-[#f5f2eb]/20" />
        <div className="absolute top-1/2 -left-48 w-[500px] h-[500px] rounded-full border border-[#d4a373]/30 animate-[spin_90s_linear_infinite_reverse]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header Telemetry Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f5f2eb]/15 pb-4 mb-10 text-xs font-mono tracking-wider text-[#f5f2eb]/60">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#e63946] animate-pulse" />
            <span className="text-[#f5f2eb] font-bold">RHYTHM COASTER</span>
            <span className="text-[#f5f2eb]/30">|</span>
            <span>SONIC TEMPLE // PROTOCOL RC-26</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">LAT 35°41′N // LONG 139°46′E</span>
            <span className="px-2 py-0.5 border border-[#e63946]/40 text-[#e63946] font-semibold text-[10px] tracking-widest uppercase">
              LYRIA NEURAL ENGINE
            </span>
          </div>
        </header>

        {/* Hero Title Section */}
        <div className="relative mb-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-2 border-[#e63946] pl-6 py-2">
            <div>
              <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-[0.3em] text-[#d4a373] mb-2">
                <span>軌道律動神殿</span>
                <span>•</span>
                <span>NEURAL ACOUSTIC ODYSSEY</span>
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-syne font-black tracking-tight text-[#f5f2eb] uppercase leading-none">
                Rhythm <span className="text-[#e63946]">Coaster</span>
              </h1>
              <p className="mt-4 text-base md:text-lg text-[#f5f2eb]/70 max-w-2xl font-light leading-relaxed">
                Step into a mythic soundscape where high-fidelity tracks and kinetic beatmaps 
                are synthesized in real-time by Google's Lyria AI, or drop your own audio files to auto-generate customized stages.
              </p>
            </div>

            {/* Hanko Seal Stamp */}
            <div className="shrink-0 flex items-center md:flex-col justify-center gap-2">
              <div className="w-16 h-16 md:w-20 md:h-20 hanko-stamp rounded-md flex flex-col items-center justify-center font-mincho font-bold text-center leading-tight">
                <span className="text-base md:text-xl">極音</span>
                <span className="text-[10px] md:text-xs tracking-widest">律動</span>
              </div>
              <span className="text-[10px] font-mono text-[#e63946]/80 tracking-widest uppercase text-center">
                SEAL OF RHYTHM
              </span>
            </div>
          </div>
        </div>

        {/* Archived Transmissions (Featured + Custom User Songs) */}
        <section className="mb-14">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-[#f5f2eb]/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#e63946]" />
              <h2 className="text-xl md:text-2xl font-modern font-bold uppercase tracking-wider text-[#f5f2eb]">
                Archived Transmissions <span className="text-xs font-mono text-[#d4a373] ml-2">[{FEATURED_SONGS.length + customSongs.length}]</span>
              </h2>
            </div>
            
            {/* Import Custom Song Button */}
            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#e63946] hover:bg-[#d90429] text-white text-xs font-mono font-bold tracking-wider uppercase rounded-sm transition-all cursor-pointer shadow-[0_0_16px_rgba(230,57,70,0.3)]"
            >
              <Upload size={14} />
              <span>Import Audio (.MP3)</span>
            </button>
          </div>

          {customSongs.length === 0 ? (
            <div
              onClick={() => setIsImporterOpen(true)}
              className="border-2 border-dashed border-[#f5f2eb]/20 hover:border-[#e63946] bg-[#12121a]/60 hover:bg-[#e63946]/5 rounded-sm p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[200px]"
            >
              <div className="w-14 h-14 rounded-full border border-[#e63946] bg-[#e63946]/10 flex items-center justify-center text-[#e63946] mb-4 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <h3 className="font-modern font-bold text-lg text-[#f5f2eb] group-hover:text-[#e63946] transition-colors mb-1">
                Archive Is Empty // 記録なし
              </h3>
              <p className="text-xs font-mono text-[#f5f2eb]/60 max-w-sm mb-4">
                Drop your own .mp3 / audio tracks here to generate instant synchronized beatmaps and procedural artwork.
              </p>
              <span className="px-5 py-2.5 bg-[#e63946] hover:bg-[#d90429] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm shadow-[0_0_20px_rgba(230,57,70,0.35)]">
                + Import Song (.MP3)
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {/* Custom User-Imported Songs */}
              {customSongs.map((song) => (
                <div 
                  key={song.id}
                  onClick={() => onSelectLibrarySong(song)}
                  className="poster-card group cursor-pointer p-4 rounded-sm flex flex-col justify-between border-[#e63946]/40 relative"
                >
                  {/* Delete button for user songs */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustomSong(song.id, e)}
                    className="absolute top-2 right-2 z-20 p-1.5 bg-[#0b0b0e]/80 hover:bg-[#e63946] text-[#f5f2eb]/60 hover:text-white rounded-sm transition-colors cursor-pointer border border-[#f5f2eb]/10"
                    title="Remove track from archive"
                  >
                    <Trash2 size={13} />
                  </button>

                  <div className="relative aspect-[4/3] bg-[#14141c] overflow-hidden mb-4 border border-[#f5f2eb]/10">
                    {song.coverUrl ? (
                      <img 
                        src={song.coverUrl} 
                        alt={song.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#15151e] text-[#f5f2eb]/40">
                        <Disc3 size={44} className="group-hover:rotate-180 transition-transform duration-700" />
                      </div>
                    )}

                    {/* Modernist overlay badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#e63946] text-[10px] font-mono text-white font-bold tracking-wider">
                      CUSTOM // 独自
                    </div>

                    {/* Hover Play Emblem */}
                    <div className="absolute inset-0 bg-[#0b0b0e]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-[#e63946] bg-[#e63946]/20 flex items-center justify-center text-[#f5f2eb] transform group-hover:scale-110 transition-transform">
                        <Play size={20} className="fill-[#f5f2eb] ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h3 className="font-modern font-bold text-lg text-[#f5f2eb] group-hover:text-[#e63946] transition-colors truncate">
                        {song.title}
                      </h3>
                      <span className="font-mono text-xs text-[#d4a373] shrink-0">{song.duration}</span>
                    </div>
                    <p className="text-xs font-mono text-[#f5f2eb]/50 mb-3 truncate">ARTIST // {song.artist}</p>
                    
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#f5f2eb]/10 pt-2 text-[#f5f2eb]/60">
                      <span className="uppercase">LEVEL: {song.difficulty}</span>
                      <span className="flex items-center gap-1 text-[#e63946] group-hover:translate-x-1 transition-transform">
                        LAUNCH <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick Add Another Card */}
              <div
                onClick={() => setIsImporterOpen(true)}
                className="border border-dashed border-[#f5f2eb]/25 hover:border-[#e63946] bg-[#12121a]/40 hover:bg-[#e63946]/5 rounded-sm p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[220px]"
              >
                <div className="w-12 h-12 rounded-full border border-[#f5f2eb]/30 group-hover:border-[#e63946] flex items-center justify-center text-[#f5f2eb]/60 group-hover:text-[#e63946] mb-3 transition-colors">
                  <Plus size={22} />
                </div>
                <h3 className="font-modern font-bold text-sm text-[#f5f2eb] group-hover:text-[#e63946] transition-colors mb-1">
                  Import Another Track
                </h3>
                <p className="text-[11px] font-mono text-[#f5f2eb]/50 max-w-[180px]">
                  Drop any .mp3 or audio file to add to your archive
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Neural Track Synthesis Studio */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6 border-b border-[#f5f2eb]/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#d4a373]" />
              <h2 className="text-xl md:text-2xl font-modern font-bold uppercase tracking-wider text-[#f5f2eb]">
                Neural Composition Forge <span className="text-xs font-mono text-[#e63946] ml-2">[SYNTHESIS]</span>
              </h2>
            </div>
            <span className="text-xs font-mono text-[#f5f2eb]/50">GENERATIVE LYRIA MODEL</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Duration Mode */}
            <div className="poster-card p-6 rounded-sm">
              <div className="flex items-center justify-between border-b border-[#f5f2eb]/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-[#d4a373]" />
                  <span className="font-modern font-bold text-sm uppercase tracking-wider">01 // Duration</span>
                </div>
                <span className="text-[10px] font-mono text-[#f5f2eb]/50">時限</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('quick')}
                  className={`p-3.5 text-left border rounded-sm transition-all cursor-pointer ${
                    mode === 'quick'
                      ? 'border-[#e63946] bg-[#e63946]/10 text-white'
                      : 'border-[#f5f2eb]/15 bg-[#14141b]/60 text-[#f5f2eb]/70 hover:border-[#f5f2eb]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-modern font-bold text-sm">Quick Transmission</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-[#0b0b0e] border border-[#f5f2eb]/20 text-[#d4a373]">
                      30 SEC
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#f5f2eb]/50">Intro → Chorus → Outro. Rapid reflexive trial.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('full')}
                  className={`p-3.5 text-left border rounded-sm transition-all cursor-pointer ${
                    mode === 'full'
                      ? 'border-[#e63946] bg-[#e63946]/10 text-white'
                      : 'border-[#f5f2eb]/15 bg-[#14141b]/60 text-[#f5f2eb]/70 hover:border-[#f5f2eb]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-modern font-bold text-sm">Complete Ritual</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-[#0b0b0e] border border-[#f5f2eb]/20 text-[#e63946]">
                      100 SEC
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#f5f2eb]/50">6-stage dynamic movement with climax choruses.</p>
                </button>
              </div>
            </div>

            {/* Sonic Style */}
            <div className="poster-card p-6 rounded-sm">
              <div className="flex items-center justify-between border-b border-[#f5f2eb]/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-[#d4a373]" />
                  <span className="font-modern font-bold text-sm uppercase tracking-wider">02 // Sonic Genre</span>
                </div>
                <span className="text-[10px] font-mono text-[#f5f2eb]/50">調律</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    className={`p-2.5 text-left border rounded-sm transition-all cursor-pointer ${
                      style === s.value
                        ? 'border-[#d4a373] bg-[#d4a373]/15 text-[#f5f2eb]'
                        : 'border-[#f5f2eb]/15 bg-[#14141b]/60 text-[#f5f2eb]/60 hover:border-[#f5f2eb]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold font-modern">
                      <span>{s.label}</span>
                      <span className="text-[10px] font-mincho text-[#d4a373]">{s.kanji}</span>
                    </div>
                  </button>
                ))}
              </div>

              {style === 'custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="e.g. Dark synthwave, taiko metal..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0b0b0e] border border-[#d4a373]/50 rounded-sm text-xs font-mono text-[#f5f2eb] focus:outline-none focus:border-[#e63946]"
                  />
                </div>
              )}
            </div>

            {/* Difficulty Calibration */}
            <div className="poster-card p-6 rounded-sm">
              <div className="flex items-center justify-between border-b border-[#f5f2eb]/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-[#d4a373]" />
                  <span className="font-modern font-bold text-sm uppercase tracking-wider">03 // Tempo & Rail</span>
                </div>
                <span className="text-[10px] font-mono text-[#f5f2eb]/50">難度</span>
              </div>

              <div className="flex flex-col gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`p-3 text-left border rounded-sm transition-all cursor-pointer flex items-center justify-between ${
                      difficulty === d.value
                        ? 'border-[#e63946] bg-[#e63946]/10 text-white'
                        : 'border-[#f5f2eb]/15 bg-[#14141b]/60 text-[#f5f2eb]/70 hover:border-[#f5f2eb]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-modern font-bold text-sm">{d.label}</span>
                        <span className="text-xs font-mincho text-[#e63946]">{d.kanji}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#f5f2eb]/50">TEMPO LOCK: {d.bpm} BPM</span>
                    </div>
                    <span 
                      className="w-3 h-3 rounded-full border" 
                      style={{ 
                        backgroundColor: difficulty === d.value ? d.color : 'transparent',
                        borderColor: d.color 
                      }} 
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Energy Architecture Diagram & Controls */}
        <section className="mb-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="poster-card p-6 rounded-sm">
            <h3 className="font-modern font-bold text-sm uppercase tracking-wider text-[#d4a373] mb-4 flex items-center gap-2">
              <Volume2 size={16} /> Movement Progression // {mode.toUpperCase()} MODE
            </h3>
            
            {mode === 'full' ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center py-1 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:00 - 0:10 // PRELUDE</span>
                  <span className="text-[#2a9d8f]">ENERGY [3/10]</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:10 - 0:30 // VERSE I</span>
                  <span className="text-[#d4a373]">ENERGY [5/10]</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:30 - 0:50 // CHORUS I (SURGE)</span>
                  <span className="text-[#e63946]">ENERGY [8/10]</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:50 - 1:10 // VERSE II</span>
                  <span className="text-[#d4a373]">ENERGY [4/10]</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">1:10 - 1:30 // CHORUS II (CLIMAX)</span>
                  <span className="text-[#e63946] font-bold">ENERGY [10/10]</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#f5f2eb]/60">1:30 - 1:40 // OUTRO</span>
                  <span className="text-[#2a9d8f]">ENERGY [3/10]</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center py-1.5 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:00 - 0:10 // PRELUDE</span>
                  <span className="text-[#2a9d8f]">ENERGY [3/10]</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#f5f2eb]/10">
                  <span className="text-[#f5f2eb]/60">0:10 - 0:20 // HIGH RESONANCE</span>
                  <span className="text-[#e63946] font-bold">ENERGY [9/10]</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[#f5f2eb]/60">0:20 - 0:30 // DISSOLUTION</span>
                  <span className="text-[#2a9d8f]">ENERGY [3/10]</span>
                </div>
              </div>
            )}
          </div>

          <div className="poster-card p-6 rounded-sm flex flex-col justify-between">
            <div>
              <h3 className="font-modern font-bold text-sm uppercase tracking-wider text-[#d4a373] mb-4 flex items-center gap-2">
                <Sparkles size={16} /> Kinetic Input Coordinates
              </h3>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-[#0b0b0e] border border-[#f5f2eb]/20 p-3 text-center rounded-sm">
                  <span className="block text-xl font-bold font-mono text-[#e63946]">←</span>
                  <span className="text-[10px] font-mono text-[#f5f2eb]/50">LEFT</span>
                </div>
                <div className="bg-[#0b0b0e] border border-[#f5f2eb]/20 p-3 text-center rounded-sm">
                  <span className="block text-xl font-bold font-mono text-[#2a9d8f]">↑</span>
                  <span className="text-[10px] font-mono text-[#f5f2eb]/50">UP</span>
                </div>
                <div className="bg-[#0b0b0e] border border-[#f5f2eb]/20 p-3 text-center rounded-sm">
                  <span className="block text-xl font-bold font-mono text-[#d4a373]">↓</span>
                  <span className="text-[10px] font-mono text-[#f5f2eb]/50">DOWN</span>
                </div>
                <div className="bg-[#0b0b0e] border border-[#f5f2eb]/20 p-3 text-center rounded-sm">
                  <span className="block text-xl font-bold font-mono text-[#f5f2eb]">→</span>
                  <span className="text-[10px] font-mono text-[#f5f2eb]/50">RIGHT</span>
                </div>
              </div>
              
              <p className="text-xs font-mono text-[#f5f2eb]/60 leading-relaxed">
                Strike notes precisely as they align with the celestial target reticles.
                Mobile users can swipe in matching directions on screen.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f5f2eb]/10 flex items-center justify-between text-[11px] font-mono text-[#f5f2eb]/50">
              <span>JUDGMENTS: 極 PERFECT (300)</span>
              <span>優 GREAT (100)</span>
              <span>良 GOOD (50)</span>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-[#e63946]/10 border-l-4 border-[#e63946] text-[#f5f2eb] text-xs font-mono flex items-start gap-3">
            <ShieldAlert size={18} className="text-[#e63946] shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[#e63946] uppercase font-bold tracking-wider mb-1">Transmission Fault:</strong>
              <span className="break-words opacity-90">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-[#f5f2eb]/15">
          {!hasKey ? (
            <button
              type="button"
              onClick={onSelectKey}
              className="group relative px-10 py-5 bg-[#e63946] text-white font-modern font-bold text-base uppercase tracking-widest rounded-sm hover:bg-[#d90429] transition-all cursor-pointer shadow-[0_0_30px_rgba(230,57,70,0.35)] flex items-center gap-3"
            >
              <span>Authorize API Key</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const finalStyle = style === 'custom' && customStyle.trim() !== '' ? customStyle.trim() : style;
                console.info("Menu: Starting game generation", { mode, style: finalStyle, difficulty });
                onStart({ mode, style: finalStyle, difficulty, theme: '' });
              }}
              className="group relative px-12 py-5 bg-[#f5f2eb] text-[#0b0b0e] font-modern font-black text-lg uppercase tracking-widest rounded-sm hover:bg-[#e63946] hover:text-white transition-all cursor-pointer shadow-[0_0_40px_rgba(245,242,235,0.2)] flex items-center gap-4"
            >
              <span>Commence Generation</span>
              <span className="text-xs font-mincho opacity-75 font-normal tracking-normal border-l border-current pl-3">
                詠唱開始
              </span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Footer Archive Stamp */}
        <footer className="mt-16 pt-8 border-t border-[#f5f2eb]/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#f5f2eb]/40 gap-4">
          <div className="flex items-center gap-2">
            <span>TEMPLE ARCHIVE RC-2026</span>
            <span>//</span>
            <span>POWERED BY GOOGLE LYRIA</span>
          </div>
          <div>IN HOMAGE TO JAPANESE MODERNIST DESIGN & SACRED KINETICS</div>
        </footer>
      </div>

      {/* Song Importer Modal */}
      <SongImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onPlaySong={onSelectLibrarySong}
        onSongSaved={handleCustomSongSaved}
      />
    </div>
  );
}
