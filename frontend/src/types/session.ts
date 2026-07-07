import type { Song } from "shared";

export interface QueueItem {
  song: Song;
  votes: number;
}

export interface SessionState {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  queue: QueueItem[];
}