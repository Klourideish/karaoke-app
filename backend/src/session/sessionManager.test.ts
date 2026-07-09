import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

const defaultSingerSlots = [
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
  {
    id: "singer-3",
    name: "Singer 3",
    clientId: null,
  },
  {
    id: "singer-4",
    name: "Singer 4",
    clientId: null,
  },
];

describe("sessionManager", () => {
  beforeEach(() => {
    resetSessionForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts paused at position zero with an empty queue", () => {
    expect(getSession()).toMatchObject({
      currentSong: null,
      currentSongRequestedByClientId: null,
      currentSongRequestedByName: null,
      autoStartPending: false,
      isPlaying: false,
      playbackReady: false,
      position: 0,
      startedAtServerTime: null,
      positionAtStart: 0,
      queue: [],
      singerSlots: defaultSingerSlots,
    });
  });

  it("starts with default singer slots", () => {
    expect(getSession().singerSlots).toEqual(defaultSingerSlots);
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
    expect(getSession().singerSlots).toEqual(defaultSingerSlots);
  });

  it("assigning a known singer slot stores clientId and name", () => {
    const assigned = assignSingerSlotClient(
      "singer-1",
      "client-1",
      "Alice",
    );

    expect(assigned).toBe(true);
    expect(getSession().singerSlots[0]?.clientId).toBe(
      "client-1",
    );
    expect(getSession().singerSlots[0]?.name).toBe("Alice");
  });

  it("unassigning a known singer slot clears clientId and resets name", () => {
    assignSingerSlotClient("singer-1", "client-1", "Alice");

    const unassigned = assignSingerSlotClient("singer-1", null);

    expect(unassigned).toBe(true);
    expect(getSession().singerSlots[0]?.clientId).toBeNull();
    expect(getSession().singerSlots[0]?.name).toBe("Singer 1");
  });

  it("assigns and releases Singer 3 and Singer 4", () => {
    expect(
      assignSingerSlotClient("singer-3", "client-3", "Carol"),
    ).toBe(true);
    expect(
      assignSingerSlotClient("singer-4", "client-4", "Dana"),
    ).toBe(true);

    expect(getSession().singerSlots[2]).toMatchObject({
      id: "singer-3",
      name: "Carol",
      clientId: "client-3",
    });
    expect(getSession().singerSlots[3]).toMatchObject({
      id: "singer-4",
      name: "Dana",
      clientId: "client-4",
    });

    expect(assignSingerSlotClient("singer-3", null)).toBe(true);
    expect(assignSingerSlotClient("singer-4", null)).toBe(true);

    expect(getSession().singerSlots[2]).toMatchObject({
      id: "singer-3",
      name: "Singer 3",
      clientId: null,
    });
    expect(getSession().singerSlots[3]).toMatchObject({
      id: "singer-4",
      name: "Singer 4",
      clientId: null,
    });
  });

  it("unknown singer slot assignment is rejected", () => {
    const assigned = assignSingerSlotClient(
      "missing-singer",
      "client-1",
    );

    expect(assigned).toBe(false);
    expect(getSession().singerSlots).toEqual(defaultSingerSlots);
  });

  it("can play and pause", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    play();

    expect(getSession().isPlaying).toBe(true);
    expect(getSession()).toMatchObject({
      startedAtServerTime: 1000,
      positionAtStart: 0,
    });

    pause();

    expect(getSession().isPlaying).toBe(false);
    expect(getSession().startedAtServerTime).toBeNull();
  });

  it("records position and server time when playback starts", () => {
    seek(42);
    vi.spyOn(Date, "now").mockReturnValue(2000);

    play();

    expect(getSession()).toMatchObject({
      isPlaying: true,
      startedAtServerTime: 2000,
      positionAtStart: 42,
    });
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
      requestedByClientId: null,
      requestedByName: null,
      votes: 0,
    });
  });

  it("adds a queue item with no requester", () => {
    expect(addToQueue(testSong)).toBe(true);

    expect(getSession().queue[0]).toMatchObject({
      song: testSong,
      requestedByClientId: null,
      requestedByName: null,
    });
  });

  it("adds a queue item with requester metadata", () => {
    expect(addToQueue(testSong, "client-1", "Alice")).toBe(true);

    expect(getSession().queue[0]).toMatchObject({
      song: testSong,
      requestedByClientId: "client-1",
      requestedByName: "Alice",
    });
  });

  it("rejects duplicate queued songs", () => {
    expect(addToQueue(testSong)).toBe(true);
    expect(addToQueue(testSong)).toBe(false);

    expect(getSession().queue).toHaveLength(1);
  });

  it("rejects duplicate queued songs even if requester differs", () => {
    expect(addToQueue(testSong, "client-1", "Alice")).toBe(true);
    expect(addToQueue(testSong, "client-2", "Bob")).toBe(false);

    expect(getSession().queue).toHaveLength(1);
    expect(getSession().queue[0]?.requestedByClientId).toBe(
      "client-1",
    );
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

  it("refreshes position from timestamp while playing without double-counting", () => {
    const nowSpy = vi.spyOn(Date, "now");

    seek(10);
    nowSpy.mockReturnValue(1000);
    play();

    nowSpy.mockReturnValue(2500);
    advancePosition(1);
    advancePosition(1);

    expect(getSession().position).toBe(11.5);
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

  it("queued manual select copies requester metadata to current song", () => {
    addToQueue(testSong, "client-1", "Alice");

    selectSong(testSong.id);

    expect(getSession()).toMatchObject({
      currentSong: testSong,
      currentSongRequestedByClientId: "client-1",
      currentSongRequestedByName: "Alice",
      autoStartPending: false,
    });
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

  it("automatic next queued song copies requester metadata", () => {
    addToQueue(testSong, "client-1", "Alice");

    selectNextQueuedSong();

    expect(getSession()).toMatchObject({
      currentSong: testSong,
      currentSongRequestedByClientId: "client-1",
      currentSongRequestedByName: "Alice",
      autoStartPending: true,
    });
  });

  it("reset clears requester metadata", () => {
    addToQueue(testSong, "client-1", "Alice");
    selectSong(testSong.id);

    resetSessionForTests();

    expect(getSession()).toMatchObject({
      currentSong: null,
      currentSongRequestedByClientId: null,
      currentSongRequestedByName: null,
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
