import { create } from "zustand";

const MIN_LYRIC_OFFSET_SECONDS = -5;
const MAX_LYRIC_OFFSET_SECONDS = 5;
const LYRIC_OFFSET_STEP_SECONDS = 0.25;

interface LocalPlaybackSettingsStore {
  lyricOffsetSeconds: number;
  increaseLyricOffset: () => void;
  decreaseLyricOffset: () => void;
  resetLyricOffset: () => void;
}

export function clampLyricOffsetSeconds(offset: number): number {
  if (!Number.isFinite(offset)) {
    return 0;
  }

  return Math.min(
    MAX_LYRIC_OFFSET_SECONDS,
    Math.max(MIN_LYRIC_OFFSET_SECONDS, offset),
  );
}

export function applyLyricOffset(
  position: number,
  offsetSeconds: number,
): number {
  return Math.max(0, position + offsetSeconds);
}

export const useLocalPlaybackSettingsStore =
  create<LocalPlaybackSettingsStore>((set, get) => ({
    lyricOffsetSeconds: 0,

    increaseLyricOffset: () => {
      set({
        lyricOffsetSeconds: clampLyricOffsetSeconds(
          get().lyricOffsetSeconds + LYRIC_OFFSET_STEP_SECONDS,
        ),
      });
    },

    decreaseLyricOffset: () => {
      set({
        lyricOffsetSeconds: clampLyricOffsetSeconds(
          get().lyricOffsetSeconds - LYRIC_OFFSET_STEP_SECONDS,
        ),
      });
    },

    resetLyricOffset: () => {
      set({
        lyricOffsetSeconds: 0,
      });
    },
  }));
