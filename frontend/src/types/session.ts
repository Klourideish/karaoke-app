import type { Song } from "shared";

export interface QueueItem {
  song: Song;
  requestedByClientId: string | null;
  requestedByName: string | null;
  votes: number;
}

export interface SingerSlot {
  id: string;
  name: string;
  clientId: string | null;
}

export interface SessionState {
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  queue: QueueItem[];
  singerSlots: SingerSlot[];
}
