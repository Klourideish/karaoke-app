export interface QueueItem {
  title: string;
  artist: string;
  votes: number;
}

export interface SessionState {
  currentSong: string | null;
  isPlaying: boolean;
  position: number;
  queue: QueueItem[];
}