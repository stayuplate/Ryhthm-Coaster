/**
 * Main Application Component
 * 
 * This file orchestrates the different states of the Lyria Rhythm game.
 * It handles the transitions between the main menu, the song library, 
 * the generation loading screen, the active gameplay, and the results screen.
 * 
 * Use Cases:
 * - Start a new game (quick or full duration).
 * - Select a pre-generated song from the library.
 * - View game results and restart.
 */

import React, { useState } from 'react';
import { Menu } from './components/Menu';
import { Generating } from './components/Generating';
import { Game } from './components/Game';
import { Result } from './components/Result';
import { generateSong } from './services/audioService';
import { generateBeatmap, generatePrompt, getStructure } from './game/beatmap';
import { Note, GameResult, DurationMode, GenerationOptions } from './types';
import { LibrarySong } from './game/songs';
import { normalizeBeatmap } from './services/beatmapNormalizer';

type AppState = 'menu' | 'generating' | 'loading' | 'playing' | 'result';

/**
 * The root App component that manages the global state of the game.
 */
export default function App() {
  const [appState, setAppState] = useState<AppState>('menu');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [beatmap, setBeatmap] = useState<Note[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasKey(has);
        } catch (e) {
          console.error("Failed to check API key", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Failed to open select key dialog", e);
      }
    }
  };

  /**
   * Starts the generation process for a new song.
   * 
   * @param options - The selected generation options.
   */
  const handleStart = async (options: GenerationOptions) => {
    console.info("handleStart called", { options });
    setErrorMsg(null);

    setAppState('generating');
    
    try {
      const structure = getStructure(options);
      const prompt = generatePrompt(structure, options);
      const { url, blob } = await generateSong(prompt, options.mode, (text) => {
        // We no longer update UI with raw text, but we keep the callback for debugging/logging
        console.debug("Generation progress:", text);
      });
      
      const map = generateBeatmap(structure, options);
      
      setAudioUrl(url);
      setAudioBlob(blob);
      setBeatmap(map);
      setAppState('playing');
    } catch (error) {
      console.error("Error generating song:", error);
      const err = error as Error;
      if (err.message.includes("Requested entity was not found") || err.message.includes("PERMISSION_DENIED") || err.message.includes("403")) {
        setHasKey(false);
      }
      setErrorMsg('Failed to generate song: ' + err.message);
      setAppState('menu');
    }
  };

  /**
   * Selects a pre-generated song from the library to play immediately.
   * 
   * @param song - The selected library song object.
   */
  const handleSelectLibrarySong = async (song: LibrarySong) => {
    console.info("handleSelectLibrarySong called", { songId: song.id, songTitle: song.title });
    setAppState('loading');
    setErrorMsg(null);

    try {
      let beatmapData: Note[] = [];
      if (song.customBeatmap && song.customBeatmap.length > 0) {
        beatmapData = normalizeBeatmap(song.customBeatmap);
      } else if (song.beatmapUrl) {
        const response = await fetch(song.beatmapUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch beatmap: ${response.statusText}`);
        }
        const rawJson = await response.json();
        beatmapData = normalizeBeatmap(rawJson);
      }

      if (beatmapData.length === 0) {
        throw new Error("This track's beatmap contains 0 notes. Please verify the .json file.");
      }
      
      // Ensure notes start after 1.5 seconds so player has preparation time
      let filteredBeatmap = beatmapData.filter(n => n.time >= 1.5);
      if (filteredBeatmap.length === 0) {
        // If all notes were under 1.5s, keep original notes
        filteredBeatmap = beatmapData;
      }
      
      setAudioUrl(song.audioUrl);
      setAudioBlob(null);
      setBeatmap(filteredBeatmap);
      setAppState('playing');
    } catch (error) {
      console.error("Error loading library song:", error);
      setErrorMsg('Failed to load song: ' + (error as Error).message);
      setAppState('menu');
    }
  };

  /**
   * Handles the completion of the game and displays the results.
   * 
   * @param result - The final game statistics (score, combo, accuracy).
   */
  const handleGameComplete = (result: GameResult) => {
    console.info("handleGameComplete called", { result });
    setGameResult({
      ...result,
      audioBlob: audioBlob || undefined,
      beatmap: beatmap
    });
    setAppState('result');
  };

  /**
   * Replays the current track.
   */
  const handleReplay = () => {
    console.info("handleReplay called");
    // Reset the beatmap notes' hit/missed states
    const resetBeatmap = beatmap.map(note => ({ ...note, hit: false, missed: false }));
    setBeatmap(resetBeatmap);
    setGameResult(null);
    setAppState('playing');
  };

  /**
   * Resets the game state to return to the main menu.
   */
  const handleRestart = () => {
    console.info("handleRestart called");
    setAppState('menu');
    setAudioUrl(null);
    setAudioBlob(null);
    setBeatmap([]);
    setGameResult(null);
  };

  return (
    <>
      {appState === 'menu' && <Menu onStart={handleStart} onSelectLibrarySong={handleSelectLibrarySong} errorMsg={errorMsg} hasKey={hasKey} onSelectKey={handleSelectKey} />}
      {appState === 'generating' && <Generating />}
      {appState === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-celestial-grid text-[#f5f2eb] p-8 select-none">
          <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 border border-[#e63946] rotate-45 animate-pulse" />
            <div className="w-12 h-12 rounded-full border-2 border-t-[#e63946] border-r-transparent border-b-[#d4a373] border-l-transparent animate-spin" />
            <span className="absolute font-mincho text-xs text-[#d4a373]">律</span>
          </div>
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#d4a373] mb-2">
            [ ARCHIVAL TRANSMISSION ]
          </div>
          <h2 className="text-2xl font-syne font-bold uppercase tracking-wider text-[#f5f2eb]">
            Calibrating Sonic Rail...
          </h2>
          <p className="mt-2 text-xs font-mono text-[#f5f2eb]/50">Fetching audio waveform & celestial coordinates</p>
        </div>
      )}
      {appState === 'playing' && audioUrl && <Game audioUrl={audioUrl} beatmap={beatmap} onComplete={handleGameComplete} />}
      {appState === 'result' && gameResult && <Result result={gameResult} onReplay={handleReplay} onMenu={handleRestart} />}
    </>
  );
}
