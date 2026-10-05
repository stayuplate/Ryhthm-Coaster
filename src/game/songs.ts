import { Note } from '../types';

export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  difficulty: string;
  audioUrl: string;
  beatmapUrl: string;
  coverUrl: string;
  customBeatmap?: Note[];
  isCustom?: boolean;
}

// User-defined or static archive songs (old default demo tracks removed)
export const FEATURED_SONGS: LibrarySong[] = [];
