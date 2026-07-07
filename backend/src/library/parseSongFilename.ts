export interface ParsedSongFilename {
  artist: string;
  title: string;
}

export function parseSongFilename(
  fileStem: string,
): ParsedSongFilename | null {
  const separatorIndex = fileStem.indexOf(" - ");

  if (separatorIndex === -1) {
    return null;
  }

  const artist = fileStem.slice(0, separatorIndex).trim();
  const title = fileStem
    .slice(separatorIndex + 3)
    .trim();

  if (!artist || !title) {
    return null;
  }

  return {
    artist,
    title,
  };
}