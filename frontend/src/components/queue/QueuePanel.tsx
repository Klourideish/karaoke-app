import { useSessionStore } from "../../stores/sessionStore";

export function QueuePanel() {
  const queue = useSessionStore((state) => state.queue);

  return (
    <section>
      <h2>Queue</h2>

      {queue.length === 0 && <p>No songs queued.</p>}

      <ol>
        {queue.map((item, index) => (
          <li key={`${item.song.id}-${index}`}>
            {item.song.artist} - {item.song.title} ({item.votes} votes)
          </li>
        ))}
      </ol>
    </section>
  );
}