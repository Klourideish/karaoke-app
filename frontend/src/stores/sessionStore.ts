import { create } from "zustand";
import type { SessionState } from "../types/session";

interface SessionStore extends SessionState {
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;
  setSession: (session: SessionState) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  currentSong: null,
  currentSongRequestedByClientId: null,
  currentSongRequestedByName: null,
  isPlaying: false,
  position: 0,
  startedAtServerTime: null,
  positionAtStart: 0,
  queue: [],
  singerSlots: [
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
  ],
  socketConnected: false,

  setSocketConnected: (connected) => {
    set({ socketConnected: connected });
  },

  setSession: (session) => {
    set({
      currentSong: session.currentSong,
      currentSongRequestedByClientId:
        session.currentSongRequestedByClientId,
      currentSongRequestedByName:
        session.currentSongRequestedByName,
      isPlaying: session.isPlaying,
      position: session.position,
      startedAtServerTime: session.startedAtServerTime,
      positionAtStart: session.positionAtStart,
      queue: session.queue,
      singerSlots: session.singerSlots,
    });
  },
}));
