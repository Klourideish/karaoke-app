import path from "node:path";
import type { Song } from "shared";
import { scanLibrary } from "./scanLibrary";

export type LibrarySourceName = "runtime" | "MUSIC_DIR" | "fallback";

export interface LibrarySource {
  path: string;
  source: LibrarySourceName;
}

interface CachedLibrary extends LibrarySource {
  songs: Song[];
}

type ScanLibrary = (libraryPath: string) => Promise<Song[]>;

export class LibraryCache {
  private runtimeLibraryPath: string | null = null;
  private cachedLibrary: CachedLibrary | null = null;
  private songLookup = new Map<string, Song>();

  constructor(private readonly scan: ScanLibrary = scanLibrary) {}

  getSource(): LibrarySource {
    if (this.cachedLibrary) {
      return {
        path: this.cachedLibrary.path,
        source: this.cachedLibrary.source,
      };
    }

    return this.resolveActiveSource();
  }

  async getLibrary(): Promise<CachedLibrary> {
    if (this.cachedLibrary) {
      return this.cachedLibrary;
    }

    return this.scanAndCache(this.resolveActiveSource());
  }

  async rescan(): Promise<CachedLibrary> {
    return this.scanAndCache(this.resolveActiveSource());
  }

  async setRuntimeSource(requestedPath: string): Promise<CachedLibrary> {
    const nextSource: LibrarySource = {
      path: path.resolve(requestedPath),
      source: "runtime",
    };

    const songs = await this.scan(nextSource.path);

    this.runtimeLibraryPath = nextSource.path;
    this.setCache({
      ...nextSource,
      songs,
    });

    return {
      ...nextSource,
      songs,
    };
  }

  async getSongById(songId: string): Promise<Song | null> {
    await this.getLibrary();

    return this.songLookup.get(songId) ?? null;
  }

  private resolveActiveSource(): LibrarySource {
    if (this.runtimeLibraryPath) {
      return {
        path: this.runtimeLibraryPath,
        source: "runtime",
      };
    }

    if (process.env.MUSIC_DIR) {
      return {
        path: path.resolve(process.env.MUSIC_DIR),
        source: "MUSIC_DIR",
      };
    }

    return {
      path: path.resolve(process.cwd(), "../music"),
      source: "fallback",
    };
  }

  private async scanAndCache(
    source: LibrarySource,
  ): Promise<CachedLibrary> {
    const songs = await this.scan(source.path);

    const library = {
      ...source,
      songs,
    };

    this.setCache(library);

    return library;
  }

  private setCache(library: CachedLibrary): void {
    this.cachedLibrary = library;
    this.songLookup = new Map(
      library.songs.map((song) => [song.id, song]),
    );
  }
}

export const libraryCache = new LibraryCache();
