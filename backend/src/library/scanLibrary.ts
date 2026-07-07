import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { Song } from "shared";
import { parseSongFilename } from "./parseSongFilename";

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function scanLibrary(
  libraryPath: string,
): Promise<Song[]> {
  const filePaths = await collectFiles(libraryPath);

  const fileLookup = new Map(
    filePaths.map((filePath) => [
      filePath.toLowerCase(),
      filePath,
    ]),
  );

  const songs: Song[] = [];

  for (const audioPath of filePaths) {
    if (path.extname(audioPath).toLowerCase() !== ".opus") {
      continue;
    }

    const fileName = path.basename(audioPath);
    const fileStem = path.basename(
      fileName,
      path.extname(fileName),
    );

    const parsed = parseSongFilename(fileStem);

    if (!parsed) {
      continue;
    }

    const lyricPath = path.join(
      path.dirname(audioPath),
      `${fileStem}.ttml`,
    );

    const actualLyricPath = fileLookup.get(
      lyricPath.toLowerCase(),
    );

    if (!actualLyricPath) {
      continue;
    }

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
      lyricPath: actualLyricPath,
    });
  }

  return songs.sort((a, b) =>
    a.artist.localeCompare(b.artist) ||
    a.title.localeCompare(b.title),
  );
}