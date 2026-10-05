/**
 * Beatmap Normalizer & Validator
 * 
 * Safely parses and normalizes beatmap data from various JSON structures,
 * handles millisecond/second conversions, column mappings, and ensures notes are sorted.
 */

import { Note } from '../types';

export function normalizeBeatmap(raw: unknown): Note[] {
  let list: unknown[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.notes)) list = obj.notes;
    else if (Array.isArray(obj.beatmap)) list = obj.beatmap;
    else if (Array.isArray(obj.data)) list = obj.data;
    else if (Array.isArray(obj.events)) list = obj.events;
  }

  if (list.length === 0) {
    return [];
  }

  // Detect if times are in milliseconds (e.g. values > 600 or max value > 1000)
  const numericTimes = list
    .map((item) => {
      const n = item as Record<string, unknown>;
      return Number(n?.time ?? n?.t ?? 0);
    })
    .filter((t) => !isNaN(t) && t > 0);

  const isMilliseconds = numericTimes.some((t) => t > 600);

  const normalized: Note[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const n = item as Record<string, unknown>;

    let t = Number(n.time !== undefined ? n.time : (n.t !== undefined ? n.t : 0));
    if (isNaN(t) || t < 0) continue;
    if (isMilliseconds) {
      t = t / 1000;
    }

    let col = n.column !== undefined ? n.column : (n.col !== undefined ? n.col : 0);
    if (typeof col === 'string') {
      const lower = col.toLowerCase().trim();
      if (lower.includes('left') || lower === '0' || lower === 'l') col = 0;
      else if (lower.includes('up') || lower === '1' || lower === 'u') col = 1;
      else if (lower.includes('down') || lower === '2' || lower === 'd') col = 2;
      else if (lower.includes('right') || lower === '3' || lower === 'r') col = 3;
      else col = parseInt(col, 10) || 0;
    }

    const safeCol = Math.max(0, Math.min(3, Math.floor(Number(col) || 0)));

    normalized.push({
      time: parseFloat(t.toFixed(3)),
      column: safeCol,
      hit: false,
      missed: false,
    });
  }

  // Sort ascending by time
  normalized.sort((a, b) => a.time - b.time);

  return normalized;
}

/**
 * Validates a JSON string or object to see if it contains valid beatmap notes.
 */
export function parseAndValidateBeatmapJson(jsonStr: string): { success: boolean; beatmap?: Note[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const normalized = normalizeBeatmap(parsed);
    if (normalized.length === 0) {
      return {
        success: false,
        error: "JSON did not contain any valid notes. Expected an array of [{ time: number, column: 0-3 }]",
      };
    }
    return {
      success: true,
      beatmap: normalized,
    };
  } catch (err) {
    return {
      success: false,
      error: "Invalid JSON format: " + (err as Error).message,
    };
  }
}
