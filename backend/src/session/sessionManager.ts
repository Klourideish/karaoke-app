import type { Song } from "shared";

interface InternalQueueItem {
  song: Song;
  requestedOrder: number;
  voterIds: Set<string>;
}

export interface QueueItem {
  song: Song;
  votes: number;
}

export interface SessionState {
  currentSong: Song | null;
  isPlaying: boolean;
  playbackReady: boolean;
  position: number;
  queue: QueueItem[];
}

const internalQueue: InternalQueueItem[] = [];

const session = {
  currentSong: null as Song | null,
  isPlaying: false,
  playbackReady: false,
  position: 0,
};

let nextRequestedOrder = 0;

function getPublicQueue(): QueueItem[] {
  return [...internalQueue]
    .sort((a, b) => {
      const voteDifference = b.voterIds.size - a.voterIds.size;

      if (voteDifference !== 0) {
        return voteDifference;
      }

      return a.requestedOrder - b.requestedOrder;
    })
    .map((item) => ({
      song: item.song,
      votes: item.voterIds.size,
    }));
}

export function getSession(): SessionState {
  return {
    currentSong: session.currentSong,
    isPlaying: session.isPlaying,
    playbackReady: session.playbackReady,
    position: session.position,
    queue: getPublicQueue(),
  };
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

export function markPlaybackReady(): void {
  session.playbackReady = true;
}

export function selectNextQueuedSong(): boolean {
  const [nextItem] = getPublicQueue();

  if (!nextItem) {
    return false;
  }

  return selectSong(nextItem.song.id);
}

export function finishPlayback(): void {
  session.isPlaying = false;
  session.playbackReady = false;
  session.position = 0;
  selectNextQueuedSong();
}

export function addToQueue(song: Song): boolean {
  const alreadyQueued = internalQueue.some(
    (item) => item.song.id === song.id,
  );

  if (alreadyQueued) {
    return false;
  }

  internalQueue.push({
    song,
    requestedOrder: nextRequestedOrder,
    voterIds: new Set(),
  });

  nextRequestedOrder += 1;

  return true;
}

export function voteForSong(
  songId: string,
  voterId: string,
): boolean {
  const queueItem = internalQueue.find(
    (item) => item.song.id === songId,
  );

  if (!queueItem) {
    return false;
  }

  if (queueItem.voterIds.has(voterId)) {
    return false;
  }

  queueItem.voterIds.add(voterId);

  return true;
}

export function advancePosition(seconds: number): void {
  if (!session.isPlaying) {
    return;
  }

  session.position += seconds;
}

export function selectSong(songId: string): boolean {
  const queueItemIndex = internalQueue.findIndex(
    (item) => item.song.id === songId,
  );

  if (queueItemIndex === -1) {
    return false;
  }

  const [selectedItem] = internalQueue.splice(
    queueItemIndex,
    1,
  );

  if (!selectedItem) {
    return false;
  }

  session.currentSong = selectedItem.song;
  session.position = 0;
  session.isPlaying = false;
  session.playbackReady = false;

  return true;
}

export function resetSessionForTests(): void {
  session.currentSong = null;
  session.isPlaying = false;
  session.playbackReady = false;
  session.position = 0;

  internalQueue.length = 0;
  nextRequestedOrder = 0;
}
