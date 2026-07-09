import { create } from "zustand";
import type { Song } from "shared";
import { buildApiUrl } from "../lib/backendUrl";

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
  changeLibraryPath: (libraryPath: string) => Promise<void>;
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
      const response = await fetch(buildApiUrl("/library"));

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
        buildApiUrl("/library/source"),
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
        buildApiUrl("/library/rescan"),
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
        librarySource: data.source,
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

  changeLibraryPath: async (libraryPath: string) => {
    set({
      isLoading: true,
      error: null,
      rescanMessage: null,
    });

    try {
      const response = await fetch(
        buildApiUrl("/library/source"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: libraryPath }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to change library path");
      }

      const data = await response.json();

      set({
        songs: data.songs,
        libraryPath: data.path,
        librarySource: data.source,
        rescanMessage: `Library changed: ${data.count} songs found.`,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      });
    }
  },
}));
