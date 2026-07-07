import { useLibraryStore } from "../../stores/libraryStore";
import { socket } from "../../lib/socket";

export function SongBrowser() {
  const songs = useLibraryStore((state) => state.songs);
  const isLoading = useLibraryStore((state) => state.isLoading);
  const error = useLibraryStore((state) => state.error);

  return (
    <section>
      <h2>Library</h2>

      {isLoading && <p>Loading library...</p>}

      {error && <p>Library error: {error}</p>}

      {!isLoading && !error && songs.length === 0 && (
        <p>No songs found.</p>
      )}

      <ul>
        {songs.map((song) => (
         <li key={song.id}>
         {song.artist} - {song.title}

        <button onClick={() => socket.emit("add-to-queue", song)}>
         Request
        </button>
      </li>
        ))}
      </ul>
    </section>
  );
}