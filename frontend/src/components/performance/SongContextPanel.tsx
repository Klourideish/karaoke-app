import { useSessionStore } from "../../stores/sessionStore";

export function SongContextPanel() {
  const currentSong = useSessionStore((state) => state.currentSong);
  const currentSongRequestedByName = useSessionStore(
    (state) => state.currentSongRequestedByName,
  );
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const nextQueueItem = useSessionStore((state) => state.queue[0]);

  return (
    <section className="song-context-panel">
      <div>
        <h2>Current</h2>
        {currentSong ? (
          <>
            <p>
              {currentSong.artist} - {currentSong.title}
            </p>
            {currentSongRequestedByName && (
              <p>Requested by {currentSongRequestedByName}</p>
            )}
            <p>{isPlaying ? "Playing" : "Paused"}</p>
          </>
        ) : (
          <p>No song selected.</p>
        )}
      </div>

      <div>
        <h2>Next</h2>
        {nextQueueItem ? (
          <>
            <p>
              {nextQueueItem.song.artist} - {nextQueueItem.song.title}
            </p>
            {nextQueueItem.requestedByName && (
              <p>Requested by {nextQueueItem.requestedByName}</p>
            )}
            <p>{nextQueueItem.votes} votes</p>
          </>
        ) : (
          <p>No queued song.</p>
        )}
      </div>
    </section>
  );
}
