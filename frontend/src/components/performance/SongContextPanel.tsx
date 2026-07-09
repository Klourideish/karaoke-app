import { useSessionStore } from "../../stores/sessionStore";

export function SongContextPanel() {
  const currentSong = useSessionStore((state) => state.currentSong);
  const nextQueueItem = useSessionStore((state) => state.queue[0]);

  return (
    <section className="song-context-panel">
      <div className="song-context-section">
        <h2>Current</h2>
        {currentSong ? (
          <p>
            {currentSong.artist} - {currentSong.title}
          </p>
        ) : (
          <p>No song selected.</p>
        )}
      </div>

      <div className="song-context-divider" />

      <div className="song-context-section">
        <h2>Next</h2>
        {nextQueueItem ? (
          <p>
            {nextQueueItem.song.artist} - {nextQueueItem.song.title}
          </p>
        ) : (
          <p>No queued song.</p>
        )}
      </div>
    </section>
  );
}
