import { useSessionStore } from "../../stores/sessionStore";
import { socket } from "../../lib/socket";

export function QueuePanel() {
  const queue = useSessionStore((state) => state.queue);

  return (
    <section className="queue-panel">
      <h2>Queue</h2>

      {queue.length === 0 && <p>No songs queued.</p>}

      <ol className="queue-list">
        {queue.map((item) => (
          <li key={item.song.id} className="queue-item">
            <div className="queue-item-main">
              <strong>
                {item.song.artist} - {item.song.title}
              </strong>
              <span>{item.votes} votes</span>
              {item.requestedByName && (
                <span>Requested by {item.requestedByName}</span>
              )}
            </div>

            <div className="queue-item-actions">
              <button
                onClick={() => socket.emit("vote", item.song.id)}
              >
                Vote
              </button>
              <button
                onClick={() =>
                  socket.emit("select-song", item.song.id)
                }
              >
                Select
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
