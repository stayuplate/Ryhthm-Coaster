/**
 * Audio Analysis & Beatmap Generator
 * 
 * Uses Web Audio API to decode audio files, detect tempo/BPM,
 * analyze energy onset transients, and synthesize a synchronized beatmap.
 */

import { Note, Difficulty } from '../types';

export interface AnalysisResult {
  duration: number;
  bpm: number;
  beatmap: Note[];
  onsetCount: number;
}

/**
 * Decodes an audio file and generates a rhythm beatmap based on acoustic transients and estimated BPM.
 */
export async function analyzeAudioAndGenerateBeatmap(
  file: File,
  difficulty: Difficulty = 'normal'
): Promise<AnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Create offline context or standard audio context for decoding
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Left channel

  // 1. Energy Analysis & Onset Detection
  // Downsample into 20ms frames
  const frameSize = Math.floor(sampleRate * 0.02); // ~882 samples at 44.1kHz
  const hopSize = Math.floor(frameSize / 2);
  const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const energies: number[] = new Float32Array(totalFrames) as unknown as number[];
  for (let i = 0; i < totalFrames; i++) {
    const start = i * hopSize;
    let sum = 0;
    for (let j = 0; j < frameSize; j += 4) { // stride 4 for speed
      const val = channelData[start + j];
      sum += val * val;
    }
    energies[i] = Math.sqrt(sum / (frameSize / 4));
  }

  // Moving average threshold filter (approx 0.6 second window)
  const windowHalf = Math.floor((sampleRate * 0.3) / hopSize);
  const onsets: number[] = [];
  const minPeakDistance = Math.floor((sampleRate * 0.12) / hopSize); // minimum 120ms between peaks
  let lastPeakIndex = -minPeakDistance;

  for (let i = windowHalf; i < totalFrames - windowHalf; i++) {
    let localSum = 0;
    for (let w = -windowHalf; w <= windowHalf; w++) {
      localSum += energies[i + w];
    }
    const localAvg = localSum / (windowHalf * 2 + 1);
    const threshold = localAvg * 1.35 + 0.015;

    if (energies[i] > threshold && i - lastPeakIndex >= minPeakDistance) {
      // Check if it's a local maximum
      if (energies[i] >= energies[i - 1] && energies[i] >= energies[i + 1]) {
        const timeSec = (i * hopSize) / sampleRate;
        onsets.push(timeSec);
        lastPeakIndex = i;
      }
    }
  }

  // 2. Tempo / BPM Estimation from onset intervals
  let estimatedBpm = 128;
  if (onsets.length >= 8) {
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      const diff = onsets[i] - onsets[i - 1];
      if (diff >= 0.25 && diff <= 1.0) { // between 60 and 240 BPM
        intervals.push(diff);
      }
    }

    if (intervals.length >= 6) {
      // Bucket into BPM histogram
      const bpmBuckets = new Map<number, number>();
      for (const dt of intervals) {
        let rawBpm = Math.round(60 / dt);
        // Normalize into reasonable rhythm range (80-165 BPM)
        while (rawBpm < 85) rawBpm *= 2;
        while (rawBpm > 175) rawBpm = Math.round(rawBpm / 2);
        
        // Group by 2 BPM bins
        const bin = Math.round(rawBpm / 2) * 2;
        bpmBuckets.set(bin, (bpmBuckets.get(bin) || 0) + 1);
      }

      let maxCount = 0;
      let bestBpm = 128;
      bpmBuckets.forEach((count, bpm) => {
        if (count > maxCount) {
          maxCount = count;
          bestBpm = bpm;
        }
      });
      estimatedBpm = bestBpm;
    }
  }

  // 3. Beatmap Synthesis based on Difficulty and Detected Onsets
  const beatmap: Note[] = [];
  const beatInterval = 60 / estimatedBpm;
  const startOffset = 3.0; // 3 seconds grace period for player to prepare

  // Configuration per difficulty
  let minNoteGap = beatInterval * 0.5; // default 8th note
  let densityChance = 0.75;
  if (difficulty === 'easy') {
    minNoteGap = beatInterval * 0.95; // quarter notes
    densityChance = 0.45;
  } else if (difficulty === 'hard') {
    minNoteGap = beatInterval * 0.25; // 16th notes allowed for peaks
    densityChance = 0.95;
  }

  // Filter onsets after startOffset
  const validOnsets = onsets.filter(t => t >= startOffset && t <= duration - 1.0);

  let lastNoteTime = 0;
  let lastColumn = 1;

  // If there are good onsets, align beatmap with onsets + grid
  if (validOnsets.length >= 10) {
    for (const onset of validOnsets) {
      if (onset - lastNoteTime < minNoteGap) continue;

      // Select column with intelligent pattern variety (avoid 3 same columns in a row)
      let nextColumn: number;
      const r = Math.random();
      if (r < 0.35) {
        nextColumn = (lastColumn + 1) % 4;
      } else if (r < 0.7) {
        nextColumn = (lastColumn + 3) % 4; // wrap around reverse
      } else if (r < 0.85) {
        nextColumn = 3 - lastColumn; // mirror across track
      } else {
        nextColumn = Math.floor(Math.random() * 4);
      }

      beatmap.push({
        time: parseFloat(onset.toFixed(3)),
        column: nextColumn,
        hit: false,
        missed: false,
      });

      lastNoteTime = onset;
      lastColumn = nextColumn;
    }
  }

  // If the song is quiet or few onsets detected, fall back to BPM grid synthesis
  if (beatmap.length < 15) {
    let currentTime = startOffset;
    while (currentTime < duration - 1.5) {
      if (Math.random() < densityChance) {
        const nextColumn = (lastColumn + 1 + Math.floor(Math.random() * 3)) % 4;
        beatmap.push({
          time: parseFloat(currentTime.toFixed(3)),
          column: nextColumn,
          hit: false,
          missed: false,
        });
        lastColumn = nextColumn;
      }
      currentTime += minNoteGap;
    }
  }

  return {
    duration,
    bpm: estimatedBpm,
    beatmap,
    onsetCount: onsets.length,
  };
}
