import { beforeEach, describe, expect, it } from "vitest";
import type { Song } from "shared";

import {
  addToQueue,
  getSession,
  pause,
  play,
  resetSessionForTests,
  seek,
} from "./sessionManager";

const testSong: Song = {
  id: "song-1",
  fileStem: "Artist - Song",
  artist: "Artist",
  title: "Song",
  audioPath: "/music/Artist - Song.opus",
  lyricPath: "/music/Artist - Song.ttml",
};

describe("sessionManager", () => {
  beforeEach(() => {
    resetSessionForTests();
  });

  it("starts paused at position zero with an empty queue", () => {
    expect(getSession()).toMatchObject({
      currentSong: null,
      isPlaying: false,
      position: 0,
      queue: [],
    });
  });

  it("can play and pause", () => {
    play();

    expect(getSession().isPlaying).toBe(true);

    pause();

    expect(getSession().isPlaying).toBe(false);
  });

  it("can seek to a playback position", () => {
    seek(42);

    expect(getSession().position).toBe(42);
  });

  it("adds a song to the queue", () => {
    const added = addToQueue(testSong);

    expect(added).toBe(true);
    expect(getSession().queue).toHaveLength(1);
    expect(getSession().queue[0]).toEqual({
      song: testSong,
      votes: 0,
    });
  });

  it("rejects duplicate queued songs", () => {
    expect(addToQueue(testSong)).toBe(true);
    expect(addToQueue(testSong)).toBe(false);

    expect(getSession().queue).toHaveLength(1);
  });
});