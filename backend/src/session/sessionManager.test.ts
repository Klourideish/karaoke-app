import { beforeEach, describe, expect, it } from "vitest";
import type { Song } from "shared";

import {
  addToQueue,
  assignSingerSlotClient,
  clearAutoStartPending,
  getSession,
  markPlaybackReady,
  pause,
  play,
  resetSessionForTests,
  seek,
  selectNextQueuedSong,
  selectSong,
  advancePosition,
  finishPlayback,
  updateSingerSlotName,
  voteForSong,
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
      autoStartPending: false,
      isPlaying: false,
      playbackReady: false,
      position: 0,
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
    });
  });

  it("starts with default singer slots", () => {
    expect(getSession().singerSlots).toEqual([
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
    ]);
  });

  it("updates a singer slot name", () => {
    const updated = updateSingerSlotName(
      "singer-1",
      "Lead Singer",
    );

    expect(updated).toBe(true);
    expect(getSession().singerSlots[0]?.name).toBe(
      "Lead Singer",
    );
  });

  it("trims singer slot names", () => {
    const updated = updateSingerSlotName(
      "singer-1",
      "  Lead Singer  ",
    );

    expect(updated).toBe(true);
    expect(getSession().singerSlots[0]?.name).toBe(
      "Lead Singer",
    );
  });

  it("rejects blank singer slot names", () => {
    const updated = updateSingerSlotName(
      "singer-1",
      "   ",
    );

    expect(updated).toBe(false);
    expect(getSession().singerSlots[0]?.name).toBe("Singer 1");
  });

  it("rejects unknown singer slot IDs", () => {
    const updated = updateSingerSlotName(
      "missing-singer",
      "Nope",
    );

    expect(updated).toBe(false);
    expect(getSession().singerSlots).toEqual([
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
    ]);
  });

  it("assigning a known singer slot stores clientId", () => {
    const assigned = assignSingerSlotClient(
      "singer-1",
      "client-1",
    );

    expect(assigned).toBe(true);
    expect(getSession().singerSlots[0]?.clientId).toBe(
      "client-1",
    );
  });

  it("unassigning a known singer slot clears clientId", () => {
    assignSingerSlotClient("singer-1", "client-1");

    const unassigned = assignSingerSlotClient("singer-1", null);

    expect(unassigned).toBe(true);
    expect(getSession().singerSlots[0]?.clientId).toBeNull();
  });

  it("unknown singer slot assignment is rejected", () => {
    const assigned = assignSingerSlotClient(
      "missing-singer",
      "client-1",
    );

    expect(assigned).toBe(false);
    expect(getSession().singerSlots).toEqual([
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
    ]);
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
      autoStartPending: false,
      isPlaying: false,
      playbackReady: false,
      position: 0,
    });
  });

  it("manual select does not set autoStartPending", () => {
    addToQueue(testSong);

    selectSong(testSong.id);

    expect(getSession()).toMatchObject({
      currentSong: testSong,
      autoStartPending: false,
      isPlaying: false,
      playbackReady: false,
      position: 0,
    });
  });

  it("selecting a song resets playbackReady to false", () => {
    addToQueue(testSong);
    markPlaybackReady();

    selectSong(testSong.id);

    expect(getSession()).toMatchObject({
      currentSong: testSong,
      autoStartPending: false,
      playbackReady: false,
    });
  });

  it("markPlaybackReady sets playbackReady to true", () => {
    markPlaybackReady();

    expect(getSession()).toMatchObject({
      isPlaying: false,
      playbackReady: true,
    });
  });

  it("readiness alone does not start manual selections", () => {
    addToQueue(testSong);
    selectSong(testSong.id);

    markPlaybackReady();

    expect(getSession()).toMatchObject({
      autoStartPending: false,
      isPlaying: false,
      playbackReady: true,
    });
  });

  it("selecting another song resets playbackReady back to false", () => {
    const songA: Song = {
      ...testSong,
      id: "song-a",
      title: "A",
    };

    const songB: Song = {
      ...testSong,
      id: "song-b",
      title: "B",
    };

    addToQueue(songA);
    selectSong(songA.id);
    markPlaybackReady();
    addToQueue(songB);

    selectSong(songB.id);

    expect(getSession()).toMatchObject({
      currentSong: songB,
      autoStartPending: false,
      playbackReady: false,
    });
  });

  it("automatic queue advancement sets autoStartPending", () => {
    addToQueue(testSong);

    selectNextQueuedSong();

    expect(getSession()).toMatchObject({
      currentSong: testSong,
      autoStartPending: true,
      isPlaying: false,
      playbackReady: false,
      position: 0,
    });
  });

  it("auto-start clears autoStartPending after playback begins", () => {
    addToQueue(testSong);
    selectNextQueuedSong();
    markPlaybackReady();

    if (getSession().autoStartPending) {
      play();
      clearAutoStartPending();
    }

    expect(getSession()).toMatchObject({
      autoStartPending: false,
      isPlaying: true,
      playbackReady: true,
    });
  });

  it(
    "finishPlayback selects the highest-voted queued song after current song finishes",
    () => {
      const currentSong: Song = {
        ...testSong,
        id: "current-song",
        title: "Current Song",
      };

      const songA: Song = {
        ...testSong,
        id: "song-a",
        title: "A",
      };

      const songB: Song = {
        ...testSong,
        id: "song-b",
        title: "B",
      };

      addToQueue(currentSong);
      selectSong(currentSong.id);
      addToQueue(songA);
      addToQueue(songB);
      voteForSong(songB.id, "user-1");

      finishPlayback();

      expect(getSession()).toMatchObject({
        currentSong: songB,
        autoStartPending: true,
        isPlaying: false,
        playbackReady: false,
        position: 0,
      });
      expect(
        getSession().queue.map((item) => item.song.id),
      ).toEqual(["song-a"]);
    },
  );

  it("finishPlayback preserves paused state", () => {
    addToQueue(testSong);
    selectSong(testSong.id);

    finishPlayback();

    expect(getSession().isPlaying).toBe(false);
  });

  it("finishPlayback resets position", () => {
    addToQueue(testSong);
    selectSong(testSong.id);

    play();
    seek(42);

    finishPlayback();

    expect(getSession().position).toBe(0);
  });

  it("finishPlayback does not crash with empty queue", () => {
    addToQueue(testSong);
    selectSong(testSong.id);

    expect(() => finishPlayback()).not.toThrow();
    expect(getSession().currentSong).toEqual(testSong);
  });
});
