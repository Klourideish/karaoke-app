import { afterEach, describe, expect, it } from "vitest";
import {
  applyLyricOffset,
  clampLyricOffsetSeconds,
  useLocalPlaybackSettingsStore,
} from "./localPlaybackSettingsStore";

describe("local playback settings helpers", () => {
  afterEach(() => {
    useLocalPlaybackSettingsStore.setState({
      lyricOffsetSeconds: 0,
    });
  });

  it("clamps lyric offset range", () => {
    expect(clampLyricOffsetSeconds(-10)).toBe(-5);
    expect(clampLyricOffsetSeconds(1.5)).toBe(1.5);
    expect(clampLyricOffsetSeconds(10)).toBe(5);
  });

  it("uses zero lyric offset for invalid values", () => {
    expect(clampLyricOffsetSeconds(Number.NaN)).toBe(0);
  });

  it("applies lyric offset and clamps effective position to zero", () => {
    expect(applyLyricOffset(10, 0.5)).toBe(10.5);
    expect(applyLyricOffset(10, -0.5)).toBe(9.5);
    expect(applyLyricOffset(0.25, -0.5)).toBe(0);
  });

  it("changes lyric offset in quarter-second increments", () => {
    useLocalPlaybackSettingsStore.setState({
      lyricOffsetSeconds: 0,
    });

    useLocalPlaybackSettingsStore.getState().increaseLyricOffset();
    expect(
      useLocalPlaybackSettingsStore.getState().lyricOffsetSeconds,
    ).toBe(0.25);

    useLocalPlaybackSettingsStore.getState().increaseLyricOffset();
    expect(
      useLocalPlaybackSettingsStore.getState().lyricOffsetSeconds,
    ).toBe(0.5);

    useLocalPlaybackSettingsStore.getState().decreaseLyricOffset();
    expect(
      useLocalPlaybackSettingsStore.getState().lyricOffsetSeconds,
    ).toBe(0.25);

    useLocalPlaybackSettingsStore.getState().resetLyricOffset();
    expect(
      useLocalPlaybackSettingsStore.getState().lyricOffsetSeconds,
    ).toBe(0);
  });
});
