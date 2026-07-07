import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { Song } from "shared";
import { parseSongFilename } from "./parseSongFilename";

export async function scanLibrary(
  libraryPath: string,
): Promise<Song[]> {
  const entries = await readdir(libraryPath, {
    withFileTypes: true,
  });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const fileLookup = new Map(
    files.map((fileName) => [
      fileName.toLowerCase(),
      fileName,
    ]),
  );

  const songs: Song[] = [];

  for (const fileName of files) {
    if (path.extname(fileName).toLowerCase() !== ".opus") {
      continue;
    }

    const fileStem = path.basename(
      fileName,
      path.extname(fileName),
    );

    const parsed = parseSongFilename(fileStem);

    if (!parsed) {
      continue;
    }

    const expectedLyricName = `${fileStem}.ttml`;

    const actualLyricName = fileLookup.get(
      expectedLyricName.toLowerCase(),
    );

    if (!actualLyricName) {
      continue;
    }

    const audioPath = path.join(libraryPath, fileName);
    const lyricPath = path.join(
      libraryPath,
      actualLyricName,
    );

    const id = createHash("sha256")
      .update(audioPath.toLowerCase())
      .digest("hex")
      .slice(0, 16);

    songs.push({
      id,
      fileStem,
      artist: parsed.artist,
      title: parsed.title,
      audioPath,
      lyricPath,
    });
  }

  return songs.sort((a, b) =>
    a.artist.localeCompare(b.artist) ||
    a.title.localeCompare(b.title),
  );
}