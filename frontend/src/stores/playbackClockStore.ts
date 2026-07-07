import { create } from "zustand";

interface PlaybackClockStore {
  position: number;
  setPosition: (position: number) => void;
}

export const usePlaybackClockStore =
  create<PlaybackClockStore>((set) => ({
    position: 0,

    setPosition: (position) => {
      set({ position });
    },
  }));