/**
 * Song Importer Modal - Rhythm Coaster
 * 
 * Allows users to drop an MP3/WAV file and optionally a Beatmap .JSON file.
 * Automatically analyzes audio transients, calculates BPM, and synthesizes a synchronized
 * beatmap, or uses the user-provided .JSON beatmap directly.
 */

import React, { useState, useRef } from 'react';
import { Note, Difficulty } from '../types';
import { LibrarySong } from '../game/songs';
import { analyzeAudioAndGenerateBeatmap, AnalysisResult } from '../services/audioAnalysis';
import { parseAndValidateBeatmapJson, normalizeBeatmap } from '../services/beatmapNormalizer';
import { generateProceduralCover } from '../services/coverGenerator';
import { saveCustomSong } from '../services/songStorage';
import { Upload, Music, Sparkles, X, Check, RefreshCw, Play, Archive, Image as ImageIcon, FileCode, Download, AlertCircle } from 'lucide-react';

interface SongImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: LibrarySong) => void;
  onSongSaved: (newSong: LibrarySong) => void;
}

export function SongImporterModal({ isOpen, onClose, onPlaySong, onSongSaved }: SongImporterModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('Unknown Transmission');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [bpm, setBpm] = useState<number>(128);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [beatmap, setBeatmap] = useState<Note[]>([]);
  const [beatmapSource, setBeatmapSource] = useState<'auto' | string>('auto');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>('');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleJsonFile = async (jsonFile: File) => {
    setJsonError(null);
    try {
      const text = await jsonFile.text();
      const res = parseAndValidateBeatmapJson(text);
      if (!res.success || !res.beatmap || res.beatmap.length === 0) {
        setJsonError(res.error || "No valid notes found in JSON file.");
        return;
      }
      setBeatmap(res.beatmap);
      setBeatmapSource(jsonFile.name);
    } catch (err) {
      setJsonError("Failed to parse JSON file: " + (err as Error).message);
    }
  };

  const handleAudioFile = async (file: File, attachedJson?: File) => {
    if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
      alert("Please upload a valid audio file (.mp3, .wav, .ogg, or .m4a)");
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setJsonError(null);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const cleanTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      setTitle(cleanTitle);

      const analysis: AnalysisResult = await analyzeAudioAndGenerateBeatmap(file, difficulty);
      setDurationSec(analysis.duration);
      setBpm(analysis.bpm);

      // If user provided a JSON beatmap file alongside, use that instead of auto-generation
      if (attachedJson) {
        await handleJsonFile(attachedJson);
      } else {
        setBeatmap(analysis.beatmap);
        setBeatmapSource('auto');
      }

      // Procedural cover art generation
      const proceduralArt = generateProceduralCover({
        title: cleanTitle,
        artist: 'Unknown Transmission',
        bpm: analysis.bpm,
        durationFormatted: formatSec(analysis.duration),
      });
      setCoverUrl(proceduralArt);
    } catch (err) {
      console.error("Audio processing failed:", err);
      alert("Failed to analyze audio file: " + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDropFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let audioFile: File | null = null;
    let jsonFile: File | null = null;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.endsWith('.json')) {
        jsonFile = f;
      } else if (f.type.includes('audio') || f.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
        audioFile = f;
      }
    }

    if (audioFile) {
      handleAudioFile(audioFile, jsonFile || undefined);
    } else if (jsonFile) {
      handleJsonFile(jsonFile);
    } else {
      alert("Please drop an audio file (.mp3, .wav) or a beatmap (.json) file.");
    }
  };

  const handleDifficultyChange = async (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    // If the user already loaded a custom JSON file, don't overwrite it unless they want auto-generation
    if (beatmapSource !== 'auto' || !selectedFile) return;

    setIsProcessing(true);
    try {
      const analysis = await analyzeAudioAndGenerateBeatmap(selectedFile, newDiff);
      setBeatmap(analysis.beatmap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateCover = () => {
    if (!selectedFile) return;
    const newCover = generateProceduralCover({
      title: title || 'Untitled',
      artist: artist || 'Unknown',
      bpm: bpm,
      durationFormatted: formatSec(durationSec),
    });
    setCoverUrl(newCover);
  };

  const handleCustomCoverUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setCoverUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadBeatmapJson = () => {
    if (beatmap.length === 0) return;
    const jsonStr = JSON.stringify(beatmap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'beatmap'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const constructLibrarySong = (): LibrarySong | null => {
    if (!selectedFile || beatmap.length === 0) return null;
    const songId = `custom_${Date.now()}`;
    const audioUrl = URL.createObjectURL(selectedFile);

    return {
      id: songId,
      title: title.trim() || 'Custom Transmission',
      artist: artist.trim() || 'Unknown Transmission',
      duration: formatSec(durationSec),
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      audioUrl: audioUrl,
      beatmapUrl: '',
      coverUrl: coverUrl,
      customBeatmap: beatmap,
      isCustom: true,
    };
  };

  const handleSaveAndClose = async () => {
    const song = constructLibrarySong();
    if (!song || !selectedFile) return;

    try {
      await saveCustomSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        difficulty: song.difficulty,
        audioBlob: selectedFile,
        beatmap: song.customBeatmap || [],
        coverDataUrl: coverUrl,
        createdAt: Date.now(),
      });
      onSongSaved(song);
      onClose();
    } catch (e) {
      console.error("Save failed:", e);
      alert("Could not save to local archive: " + (e as Error).message);
    }
  };

  const handlePlayNow = async () => {
    const song = constructLibrarySong();
    if (!song || !selectedFile) return;

    try {
      await saveCustomSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        difficulty: song.difficulty,
        audioBlob: selectedFile,
        beatmap: song.customBeatmap || [],
        coverDataUrl: coverUrl,
        createdAt: Date.now(),
      });
      onSongSaved(song);
    } catch (e) {
      console.warn("Auto-save warn:", e);
    }

    onPlaySong(song);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative max-w-2xl w-full poster-card p-6 sm:p-8 rounded-sm border border-[#f5f2eb]/20 text-[#f5f2eb] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f5f2eb]/15 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#e63946]" />
            <h2 className="text-xl font-syne font-bold uppercase tracking-wider text-[#f5f2eb]">
              Import Sonic Transmission <span className="text-xs font-mono text-[#d4a373] ml-2">[独自音源]</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-[#e63946] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload Drop Zone if no file loaded */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleDropFiles(e.dataTransfer.files);
            }}
            onClick={() => audioInputRef.current?.click()}
            className={`border-2 border-dashed rounded-sm p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[280px] ${
              isDragging
                ? 'border-[#e63946] bg-[#e63946]/10'
                : 'border-[#f5f2eb]/20 hover:border-[#f5f2eb]/50 bg-[#12121a]/60'
            }`}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleAudioFile(e.target.files[0]);
              }}
            />

            <div className="w-16 h-16 rounded-full border border-[#e63946] bg-[#e63946]/10 flex items-center justify-center text-[#e63946] mb-4">
              <Upload size={28} />
            </div>

            <h3 className="font-modern font-bold text-lg text-[#f5f2eb] mb-1">
              Drop MP3 Audio (and optional .JSON Beatmap)
            </h3>
            <p className="text-xs font-mono text-[#f5f2eb]/60 max-w-md mb-5 leading-relaxed">
              Drop an .mp3, .wav, or .ogg. If you don't have a .json beatmap, one will be automatically synthesized from audio peaks!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-2 bg-[#f5f2eb] text-[#0b0b0e] text-xs font-mono font-bold uppercase tracking-wider rounded-sm">
                Select Audio File
              </span>
            </div>
          </div>
        ) : (
          /* Processed Transmission Details */
          <div className="space-y-6">
            {isProcessing ? (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-14 h-14 rounded-full border-2 border-t-[#e63946] border-r-transparent border-b-[#d4a373] border-l-transparent animate-spin mb-4" />
                <span className="text-xs font-mono tracking-widest text-[#d4a373] uppercase mb-1">
                  [ ANALYZING AUDIO FREQUENCIES ]
                </span>
                <h3 className="font-modern font-bold text-base text-[#f5f2eb]">
                  Calculating Tempo & Generating Beatmap...
                </h3>
              </div>
            ) : (
              <>
                {/* Track Preview Banner */}
                <div className="flex flex-col sm:flex-row gap-5 bg-[#0b0b0e] p-4 rounded-sm border border-[#f5f2eb]/10">
                  {/* Generated Cover */}
                  <div className="relative w-36 h-36 shrink-0 bg-[#161622] rounded-sm overflow-hidden border border-[#f5f2eb]/20 group">
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                      <button
                        type="button"
                        onClick={handleRegenerateCover}
                        className="p-1.5 bg-[#e63946] text-white rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                        title="Regenerate Procedural Artwork"
                      >
                        <RefreshCw size={11} /> Regen Art
                      </button>
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="p-1.5 bg-[#f5f2eb] text-[#0b0b0e] rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                        title="Upload Custom Image"
                      >
                        <ImageIcon size={11} /> Upload Art
                      </button>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleCustomCoverUpload(e.target.files[0]);
                        }}
                      />
                    </div>
                  </div>

                  {/* Metadata Input Fields */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-[#f5f2eb]/50 uppercase mb-1">
                        Track Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#14141d] border border-[#f5f2eb]/20 rounded-sm text-sm font-modern text-[#f5f2eb] focus:outline-none focus:border-[#e63946]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-[#f5f2eb]/50 uppercase mb-1">
                        Artist / Origin
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#14141d] border border-[#f5f2eb]/20 rounded-sm text-sm font-modern text-[#f5f2eb] focus:outline-none focus:border-[#d4a373]"
                      />
                    </div>

                    {/* Acoustic Telemetry Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      <span className="px-2 py-0.5 bg-[#1a1a26] border border-[#f5f2eb]/15 text-[#d4a373]">
                        {bpm} BPM
                      </span>
                      <span className="px-2 py-0.5 bg-[#1a1a26] border border-[#f5f2eb]/15 text-[#f5f2eb]">
                        {formatSec(durationSec)}
                      </span>
                      <span className="px-2 py-0.5 bg-[#1a1a26] border border-[#f5f2eb]/15 text-[#2a9d8f]">
                        {beatmap.length} NOTES
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beatmap JSON Status & Management Section */}
                <div className="bg-[#12121a] p-4 rounded-sm border border-[#f5f2eb]/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode size={16} className="text-[#e63946]" />
                      <span className="text-xs font-mono font-bold uppercase text-[#f5f2eb]">
                        Beatmap Specification (.JSON)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jsonInputRef.current?.click()}
                        className="px-2.5 py-1 bg-[#1a1a28] hover:bg-[#e63946] border border-[#f5f2eb]/20 hover:border-transparent text-[11px] font-mono text-[#f5f2eb] rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload size={12} />
                        <span>Upload .JSON</span>
                      </button>
                      <input
                        ref={jsonInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleJsonFile(e.target.files[0]);
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleDownloadBeatmapJson}
                        className="px-2.5 py-1 bg-[#1a1a28] hover:bg-[#2a9d8f] border border-[#f5f2eb]/20 hover:border-transparent text-[11px] font-mono text-[#f5f2eb] rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>Export .JSON</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#f5f2eb]/60">
                      Source: {beatmapSource === 'auto' ? 'Auto-Synthesized from Audio Transients' : `Custom File (${beatmapSource})`}
                    </span>
                    <span className="text-[#2a9d8f] font-bold">
                      {beatmap.length} Valid Notes Loaded
                    </span>
                  </div>

                  {jsonError && (
                    <div className="p-2.5 bg-[#e63946]/15 border border-[#e63946]/50 rounded-sm text-xs font-mono text-[#e63946] flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{jsonError}</span>
                    </div>
                  )}
                </div>

                {/* Difficulty Re-Calibration */}
                <div>
                  <label className="block text-xs font-mono text-[#f5f2eb]/60 uppercase mb-2">
                    Difficulty Density Tuning {beatmapSource !== 'auto' && '(Applies to Auto-Generated maps)'}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDifficultyChange(d)}
                        className={`py-2 px-3 text-xs font-mono uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                          difficulty === d
                            ? 'border-[#e63946] bg-[#e63946]/15 text-white font-bold'
                            : 'border-[#f5f2eb]/15 bg-[#12121a] text-[#f5f2eb]/60 hover:border-[#f5f2eb]/30'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Replace File Button */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setBeatmap([]); setBeatmapSource('auto'); }}
                    className="text-[11px] font-mono text-[#f5f2eb]/40 hover:text-[#e63946] underline cursor-pointer"
                  >
                    Load different audio file
                  </button>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#f5f2eb]/15">
              <button
                type="button"
                onClick={handlePlayNow}
                disabled={isProcessing || beatmap.length === 0}
                className="w-full sm:flex-1 py-3.5 px-5 bg-[#f5f2eb] text-[#0b0b0e] font-modern font-black text-sm uppercase tracking-wider rounded-sm hover:bg-[#e63946] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={16} className="fill-current" />
                <span>Play Now</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndClose}
                disabled={isProcessing || beatmap.length === 0}
                className="w-full sm:flex-1 py-3.5 px-5 bg-[#161622] text-[#f5f2eb] border border-[#f5f2eb]/25 font-modern font-bold text-sm uppercase tracking-wider rounded-sm hover:border-[#d4a373] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Archive size={16} />
                <span>Add to Archive</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
