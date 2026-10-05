/**
 * Song Storage Service
 * 
 * Uses IndexedDB to persist user-imported audio blobs, beatmaps, and cover art.
 * Enables custom songs to persist seamlessly across sessions.
 */

import { Note } from '../types';
import { LibrarySong } from '../game/songs';

const DB_NAME = 'RhythmCoasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_songs';

export interface StoredCustomSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  difficulty: string;
  audioBlob: Blob;
  beatmap: Note[];
  coverDataUrl: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a user-imported custom song to IndexedDB.
 */
export async function saveCustomSong(song: StoredCustomSong): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(song);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all stored custom songs and returns them formatted as LibrarySong instances with object URLs.
 */
export async function getAllCustomSongs(): Promise<LibrarySong[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawSongs: StoredCustomSong[] = request.result || [];
        // Map to LibrarySong
        const librarySongs: LibrarySong[] = rawSongs.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          duration: s.duration,
          difficulty: s.difficulty,
          audioUrl: URL.createObjectURL(s.audioBlob),
          beatmapUrl: '', // provided directly via customBeatmap
          coverUrl: s.coverDataUrl,
          customBeatmap: s.beatmap,
          isCustom: true,
        }));
        resolve(librarySongs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Could not load custom songs from IndexedDB:", err);
    return [];
  }
}

/**
 * Removes a custom song from IndexedDB by ID.
 */
export async function deleteCustomSong(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to delete custom song:", err);
  }
}
