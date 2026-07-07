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

const session: SessionState = {
  currentSong: null,
  isPlaying: false,
  position: 0,
  queue: [],
};

export function getSession(): SessionState {
  return session;
}

export function play(): void {
  session.isPlaying = true;
}

export function pause(): void {
  session.isPlaying = false;
}

export function seek(position: number): void {
  session.position = position;
}

 export function resetSessionForTests(): void {
  session.currentSong = null;
  session.isPlaying = false;
  session.position = 0;
  session.queue = [];
}

export function addToQueue(song: Song): boolean {
  const alreadyQueued = session.queue.some(
    (item) => item.song.id === song.id,
  );

  if (alreadyQueued) {
    return false;
  }

  session.queue.push({
    song,
    votes: 0,
  });


  return true;
}