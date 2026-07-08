import { useEffect } from "react";
import { useLibraryStore } from "../../stores/libraryStore";
import { socket } from "../../lib/socket";
import { getClientName } from "../../lib/clientIdentity";

export function SongBrowser() {
  const songs = useLibraryStore((state) => state.songs);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const error = useLibraryStore((state) => state.error);
  const libraryPath = useLibraryStore((state) => state.libraryPath);
  const librarySource = useLibraryStore((state) => state.librarySource);
  const isRescanning = useLibraryStore((state) => state.isRescanning);
  const rescanMessage = useLibraryStore(
    (state) => state.rescanMessage,
  );
  const fetchLibrarySource = useLibraryStore(
    (state) => state.fetchLibrarySource,
  );
  const rescanLibrary = useLibraryStore(
    (state) => state.rescanLibrary,
  );
  const changeLibraryPath = useLibraryStore(
    (state) => state.changeLibraryPath,
  );

  useEffect(() => {
    void fetchLibrarySource();
  }, [fetchLibrarySource]);

  return (
    <section>
      <h2>Library</h2>

      {libraryPath && librarySource && (
        <p>
          Source: {librarySource} - {libraryPath}
        </p>
      )}

      <button
        disabled={isLoading || isRescanning}
        onClick={() => {
          void rescanLibrary();
        }}
      >
        {isRescanning ? "Rescanning..." : "Rescan library"}
      </button>

      <button
        disabled={isLoading || isRescanning}
        onClick={() => {
          const nextPath = window.prompt(
            "Enter library path",
            libraryPath ?? "",
          );

          if (!nextPath) {
            return;
          }

          void changeLibraryPath(nextPath);
        }}
      >
        Change library path
      </button>

      {isLoading && <p>Loading library...</p>}

      {error && <p>Library error: {error}</p>}

      {rescanMessage && <p>{rescanMessage}</p>}

      {!isLoading && !error && songs.length === 0 && (
        <p>No songs found.</p>
      )}

      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            {song.artist} - {song.title}

            <button
              onClick={() =>
                socket.emit("add-to-queue", {
                  song,
                  requesterName: getClientName(),
                })
              }
            >
              Request
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
