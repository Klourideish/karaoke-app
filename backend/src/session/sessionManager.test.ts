import { beforeEach, describe, expect, it } from "vitest";
import type { Song } from "shared";

import {
  addToQueue,
  getSession,
  pause,
  play,
  resetSessionForTests,
  seek,
  selectSong,
  voteForSong,
  advancePosition,
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

  it("allows a user to vote for a queued song", () => {
    addToQueue(testSong);

    const accepted = voteForSong(
      testSong.id,
      "user-1",
    );

    expect(accepted).toBe(true);
    expect(getSession().queue[0]?.votes).toBe(1);
  });

  it("advances position while playing", () => {
  play();

  advancePosition(1);

  expect(getSession().position).toBe(1);
});

it("does not advance position while paused", () => {
  advancePosition(1);

  expect(getSession().position).toBe(0);
});

  it(
    "rejects repeat votes from the same user for the same song",
    () => {
      addToQueue(testSong);

      expect(
        voteForSong(testSong.id, "user-1"),
      ).toBe(true);

      expect(
        voteForSong(testSong.id, "user-1"),
      ).toBe(false);

      expect(getSession().queue[0]?.votes).toBe(1);
    },
  );

  it("rejects votes for songs that are not queued", () => {
    const accepted = voteForSong(
      "missing-song",
      "user-1",
    );

    expect(accepted).toBe(false);
  });

  it("orders queued songs by votes descending", () => {
    const songA: Song = {
      ...testSong,
      id: "song-a",
      fileStem: "Artist - A",
      title: "A",
    };

    const songB: Song = {
      ...testSong,
      id: "song-b",
      fileStem: "Artist - B",
      title: "B",
    };

    addToQueue(songA);
    addToQueue(songB);

    voteForSong(songB.id, "user-1");

    expect(
      getSession().queue.map((item) => item.song.id),
    ).toEqual([
      "song-b",
      "song-a",
    ]);
  });

  it(
    "preserves request order when vote counts are equal",
    () => {
      const songA: Song = {
        ...testSong,
        id: "song-a",
        fileStem: "Artist - A",
        title: "A",
      };

      const songB: Song = {
        ...testSong,
        id: "song-b",
        fileStem: "Artist - B",
        title: "B",
      };

      addToQueue(songA);
      addToQueue(songB);

      voteForSong(songA.id, "user-1");
      voteForSong(songB.id, "user-2");

      expect(
        getSession().queue.map((item) => item.song.id),
      ).toEqual([
        "song-a",
        "song-b",
      ]);
    },
  );

  it("selects a queued song as the current song", () => {
  addToQueue(testSong);

  const selected = selectSong(testSong.id);

  expect(selected).toBe(true);
  expect(getSession().currentSong).toEqual(testSong);
  expect(getSession().queue).toEqual([]);
});

it("rejects selection of a song that is not queued", () => {
  const selected = selectSong("missing-song");

  expect(selected).toBe(false);
  expect(getSession().currentSong).toBeNull();
});

it("resets playback state when selecting a song", () => {
  addToQueue(testSong);

  play();
  seek(42);

  selectSong(testSong.id);

  expect(getSession()).toMatchObject({
    currentSong: testSong,
    isPlaying: false,
    position: 0,
  });
});
});