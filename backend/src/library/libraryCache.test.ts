import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import type { Song } from "shared";
import { LibraryCache } from "./libraryCache";

const originalMusicDir = process.env.MUSIC_DIR;

function createSong(id: string): Song {
  return {
    id,
    fileStem: `Artist - ${id}`,
    artist: "Artist",
    title: id,
    audioPath: `/music/Artist - ${id}.opus`,
    lyricPath: `/music/Artist - ${id}.ttml`,
  };
}

afterEach(() => {
  if (originalMusicDir === undefined) {
    delete process.env.MUSIC_DIR;
  } else {
    process.env.MUSIC_DIR = originalMusicDir;
  }

  vi.restoreAllMocks();
});

describe("LibraryCache", () => {
  it("scans on first library access", async () => {
    const songs = [createSong("song-1")];
    const scan = vi.fn(async () => songs);
    const cache = new LibraryCache(scan);

    const library = await cache.getLibrary();

    expect(scan).toHaveBeenCalledTimes(1);
    expect(library.songs).toEqual(songs);
  });

  it("cached lookup avoids repeated scans", async () => {
    const song = createSong("song-1");
    const scan = vi.fn(async () => [song]);
    const cache = new LibraryCache(scan);

    expect(await cache.getSongById(song.id)).toEqual(song);
    expect(await cache.getSongById(song.id)).toEqual(song);

    expect(scan).toHaveBeenCalledTimes(1);
  });

  it("rescan refreshes songs", async () => {
    const firstSong = createSong("song-1");
    const secondSong = createSong("song-2");
    const scan = vi
      .fn()
      .mockResolvedValueOnce([firstSong])
      .mockResolvedValueOnce([secondSong]);
    const cache = new LibraryCache(scan);

    expect((await cache.getLibrary()).songs).toEqual([firstSong]);
    expect((await cache.rescan()).songs).toEqual([secondSong]);
    expect(await cache.getSongById(firstSong.id)).toBeNull();
    expect(await cache.getSongById(secondSong.id)).toEqual(secondSong);
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it("source change success updates cache and source", async () => {
    const firstSong = createSong("song-1");
    const runtimeSong = createSong("song-2");
    const scan = vi
      .fn()
      .mockResolvedValueOnce([firstSong])
      .mockResolvedValueOnce([runtimeSong]);
    const cache = new LibraryCache(scan);

    await cache.getLibrary();
    const library = await cache.setRuntimeSource("runtime-music");

    expect(library).toMatchObject({
      path: path.resolve("runtime-music"),
      source: "runtime",
      songs: [runtimeSong],
    });
    expect(cache.getSource()).toEqual({
      path: path.resolve("runtime-music"),
      source: "runtime",
    });
    expect(await cache.getSongById(runtimeSong.id)).toEqual(runtimeSong);
  });

  it("source change failure keeps previous cache and source", async () => {
    const firstSong = createSong("song-1");
    const scan = vi
      .fn()
      .mockResolvedValueOnce([firstSong])
      .mockRejectedValueOnce(new Error("scan failed"));
    const cache = new LibraryCache(scan);

    const originalLibrary = await cache.getLibrary();

    await expect(
      cache.setRuntimeSource("broken-music"),
    ).rejects.toThrow("scan failed");

    expect(cache.getSource()).toEqual({
      path: originalLibrary.path,
      source: originalLibrary.source,
    });
    expect((await cache.getLibrary()).songs).toEqual([firstSong]);
    expect(await cache.getSongById(firstSong.id)).toEqual(firstSong);
  });

  it("unknown song ID returns no cached song", async () => {
    const scan = vi.fn(async () => [createSong("song-1")]);
    const cache = new LibraryCache(scan);

    expect(await cache.getSongById("missing-song")).toBeNull();
  });
});
