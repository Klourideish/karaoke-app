import { afterEach, describe, expect, it } from "vitest";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { scanLibrary } from "./scanLibrary";

const temporaryDirectories: string[] = [];

async function createTestLibrary(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "karaoke-library-test-"),
  );

  temporaryDirectories.push(directory);

  return directory;
}

async function createFile(
  directory: string,
  fileName: string,
): Promise<void> {
  await writeFile(path.join(directory, fileName), "");
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );

  temporaryDirectories.length = 0;
});

describe("scanLibrary", () => {
  it("includes a valid OPUS and TTML pair", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "LE SSERAFIM - Celebrate.opus");
    await createFile(libraryPath, "LE SSERAFIM - Celebrate.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toHaveLength(1);
    expect(songs[0]).toMatchObject({
      fileStem: "LE SSERAFIM - Celebrate",
      artist: "LE SSERAFIM",
      title: "Celebrate",
    });
  });

  it("skips OPUS files without matching TTML lyrics", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "Artist - Missing Lyrics.opus");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toEqual([]);
  });

  it("ignores orphan TTML files", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "Artist - Orphan Lyrics.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toEqual([]);
  });

  it("skips incorrectly named file pairs", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "BadFilename.opus");
    await createFile(libraryPath, "BadFilename.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toEqual([]);
  });

  it("matches companion filenames case-insensitively", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "Artist - Song.OPUS");
    await createFile(libraryPath, "Artist - Song.TTML");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toHaveLength(1);
    expect(songs[0]).toMatchObject({
      artist: "Artist",
      title: "Song",
    });
  });

  it("returns songs sorted by artist and then title", async () => {
    const libraryPath = await createTestLibrary();

    await createFile(libraryPath, "Beta - First.opus");
    await createFile(libraryPath, "Beta - First.ttml");

    await createFile(libraryPath, "Alpha - Second.opus");
    await createFile(libraryPath, "Alpha - Second.ttml");

    await createFile(libraryPath, "Alpha - First.opus");
    await createFile(libraryPath, "Alpha - First.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(
      songs.map((song) => `${song.artist} - ${song.title}`),
    ).toEqual([
      "Alpha - First",
      "Alpha - Second",
      "Beta - First",
    ]);
  });

  it("finds valid song pairs inside nested subdirectories", async () => {
    const libraryPath = await createTestLibrary();

    const nestedPath = path.join(libraryPath, "Pop", "2020s");

    await mkdir(nestedPath, {
      recursive: true,
    });

    await createFile(nestedPath, "Artist - Nested Song.opus");
    await createFile(nestedPath, "Artist - Nested Song.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toHaveLength(1);
    expect(songs[0]).toMatchObject({
      fileStem: "Artist - Nested Song",
      artist: "Artist",
      title: "Nested Song",
    });
  });

  it("does not match lyrics from a different subdirectory", async () => {
    const libraryPath = await createTestLibrary();

    const audioDirectory = path.join(libraryPath, "Audio");
    const lyricDirectory = path.join(libraryPath, "Lyrics");

    await mkdir(audioDirectory, {
      recursive: true,
    });

    await mkdir(lyricDirectory, {
      recursive: true,
    });

    await createFile(audioDirectory, "Artist - Song.opus");
    await createFile(lyricDirectory, "Artist - Song.ttml");

    const songs = await scanLibrary(libraryPath);

    expect(songs).toEqual([]);
  });
});