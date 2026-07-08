import { useSessionStore } from "../../stores/sessionStore";
import { socket } from "../../lib/socket";

export function QueuePanel() {
  const queue = useSessionStore((state) => state.queue);

  return (
    <section className="queue-panel">
      <h2>Queue</h2>

      {queue.length === 0 && <p>No songs queued.</p>}
        
      <ol>
  {queue.map((item) => (
    <li key={item.song.id}>
      {item.song.artist} - {item.song.title} ({item.votes} votes)
      {item.requestedByName && (
        <>
          {" "}Requested by {item.requestedByName}
        </>
      )}
    
      <button
        onClick={() => socket.emit("vote", item.song.id)}
      >
        Vote
      </button>
      <button
       onClick={() => socket.emit("select-song", item.song.id)}
      >
      Select
</button>
    </li>
  ))}
</ol>
    </section>
  );
}
