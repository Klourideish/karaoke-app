import type { Song } from "shared";

interface InternalQueueItem {
  song: Song;
  requestedByClientId: string | null;
  requestedByName: string | null;
  requestedOrder: number;
  voterIds: Set<string>;
}

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
  currentSongRequestedByClientId: string | null;
  currentSongRequestedByName: string | null;
  autoStartPending: boolean;
  isPlaying: boolean;
  playbackReady: boolean;
  position: number;
  startedAtServerTime: number | null;
  positionAtStart: number;
  queue: QueueItem[];
  singerSlots: SingerSlot[];
}

const internalQueue: InternalQueueItem[] = [];

const session = {
  currentSong: null as Song | null,
  currentSongRequestedByClientId: null as string | null,
  currentSongRequestedByName: null as string | null,
  autoStartPending: false,
  isPlaying: false,
  playbackReady: false,
  position: 0,
  startedAtServerTime: null as number | null,
  positionAtStart: 0,
  singerSlots: createDefaultSingerSlots(),
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
      requestedByClientId: item.requestedByClientId,
      requestedByName: item.requestedByName,
      votes: item.voterIds.size,
    }));
}

function createDefaultSingerSlots(): SingerSlot[] {
  return [
    {
      id: "singer-1",
      name: "Singer 1",
      clientId: null,
    },
    {
      id: "singer-2",
      name: "Singer 2",
      clientId: null,
    },
  ];
}

function getDefaultSingerSlotName(slotId: string): string | null {
  return createDefaultSingerSlots().find(
    (slot) => slot.id === slotId,
  )?.name ?? null;
}

export function getSession(): SessionState {
  return {
    currentSong: session.currentSong,
    currentSongRequestedByClientId:
      session.currentSongRequestedByClientId,
    currentSongRequestedByName:
      session.currentSongRequestedByName,
    autoStartPending: session.autoStartPending,
    isPlaying: session.isPlaying,
    playbackReady: session.playbackReady,
    position: session.position,
    startedAtServerTime: session.startedAtServerTime,
    positionAtStart: session.positionAtStart,
    queue: getPublicQueue(),
    singerSlots: session.singerSlots.map((slot) => ({
      ...slot,
    })),
  };
}

export function play(): void {
  session.startedAtServerTime = Date.now();
  session.positionAtStart = session.position;
  session.isPlaying = true;
}

export function pause(): void {
  if (session.isPlaying && session.startedAtServerTime !== null) {
    session.position = getEstimatedPosition();
  }

  session.isPlaying = false;
  session.startedAtServerTime = null;
  session.positionAtStart = session.position;
}

export function seek(position: number): void {
  session.position = position;
  session.positionAtStart = position;

  if (session.isPlaying) {
    session.startedAtServerTime = Date.now();
  }
}

export function markPlaybackReady(): void {
  session.playbackReady = true;
}

export function clearAutoStartPending(): void {
  session.autoStartPending = false;
}

export function updateSingerSlotName(
  slotId: string,
  name: string,
): boolean {
  const slot = session.singerSlots.find(
    (item) => item.id === slotId,
  );

  if (!slot) {
    return false;
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return false;
  }

  slot.name = trimmedName;

  return true;
}

export function assignSingerSlotClient(
  slotId: string,
  clientId: string | null,
  clientName?: string,
): boolean {
  const slot = session.singerSlots.find(
    (item) => item.id === slotId,
  );

  if (!slot) {
    return false;
  }

  slot.clientId = clientId;

  if (clientId === null) {
    slot.name = getDefaultSingerSlotName(slotId) ?? slot.name;
    return true;
  }

  const trimmedName = clientName?.trim();

  if (trimmedName) {
    slot.name = trimmedName;
  }

  return true;
}

export function selectNextQueuedSong(): boolean {
  const [nextItem] = getPublicQueue();

  if (!nextItem) {
    return false;
  }

  return selectQueuedSong(nextItem.song.id, true);
}

export function finishPlayback(): void {
  session.isPlaying = false;
  session.playbackReady = false;
  session.autoStartPending = false;
  session.position = 0;
  session.startedAtServerTime = null;
  session.positionAtStart = 0;
  selectNextQueuedSong();
}

export function addToQueue(
  song: Song,
  requestedByClientId: string | null = null,
  requestedByName: string | null = null,
): boolean {
  const alreadyQueued = internalQueue.some(
    (item) => item.song.id === song.id,
  );

  if (alreadyQueued) {
    return false;
  }

  internalQueue.push({
    song,
    requestedByClientId,
    requestedByName,
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

  if (session.startedAtServerTime !== null) {
    session.position = getEstimatedPosition();
    return;
  }

  session.position += seconds;
}

function getEstimatedPosition(): number {
  if (!session.isPlaying || session.startedAtServerTime === null) {
    return session.position;
  }

  return (
    session.positionAtStart +
    (Date.now() - session.startedAtServerTime) / 1000
  );
}

export function selectSong(songId: string): boolean {
  return selectQueuedSong(songId, false);
}

function selectQueuedSong(
  songId: string,
  autoStartPending: boolean,
): boolean {
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
  session.currentSongRequestedByClientId =
    selectedItem.requestedByClientId;
  session.currentSongRequestedByName = selectedItem.requestedByName;
  session.autoStartPending = autoStartPending;
  session.position = 0;
  session.isPlaying = false;
  session.playbackReady = false;
  session.startedAtServerTime = null;
  session.positionAtStart = 0;

  return true;
}

export function resetSessionForTests(): void {
  session.currentSong = null;
  session.currentSongRequestedByClientId = null;
  session.currentSongRequestedByName = null;
  session.autoStartPending = false;
  session.isPlaying = false;
  session.playbackReady = false;
  session.position = 0;
  session.startedAtServerTime = null;
  session.positionAtStart = 0;
  session.singerSlots = createDefaultSingerSlots();

  internalQueue.length = 0;
  nextRequestedOrder = 0;
}
