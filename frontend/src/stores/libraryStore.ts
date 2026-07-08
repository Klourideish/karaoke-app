import { create } from "zustand";
import type { Song } from "shared";

interface LibraryStore {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
  libraryPath: string | null;
  librarySource: string | null;
  isRescanning: boolean;
  rescanMessage: string | null;
  fetchLibrary: () => Promise<void>;
  fetchLibrarySource: () => Promise<void>;
  rescanLibrary: () => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  songs: [],
  isLoading: false,
  error: null,
  libraryPath: null,
  librarySource: null,
  isRescanning: false,
  rescanMessage: null,

  fetchLibrary: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("http://localhost:3001/library");

      if (!response.ok) {
        throw new Error("Failed to fetch library");
      }

      const data = await response.json();

      set({
        songs: data.songs,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  fetchLibrarySource: async () => {
    set({ error: null });

    try {
      const response = await fetch(
        "http://localhost:3001/library/source",
      );

      if (!response.ok) {
        throw new Error("Failed to fetch library source");
      }

      const data = await response.json();

      set({
        libraryPath: data.path,
        librarySource: data.source,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  rescanLibrary: async () => {
    set({
      isRescanning: true,
      error: null,
      rescanMessage: null,
    });

    try {
      const response = await fetch(
        "http://localhost:3001/library/rescan",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to rescan library");
      }

      const data = await response.json();

      set({
        songs: data.songs,
        libraryPath: data.path,
        rescanMessage: `Rescan complete: ${data.count} songs found.`,
        isRescanning: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isRescanning: false,
      });
    }
  },
}));
