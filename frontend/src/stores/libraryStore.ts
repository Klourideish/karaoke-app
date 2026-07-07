import { create } from "zustand";
import type { Song } from "shared";

interface LibraryStore {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
  fetchLibrary: () => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  songs: [],
  isLoading: false,
  error: null,

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
}));