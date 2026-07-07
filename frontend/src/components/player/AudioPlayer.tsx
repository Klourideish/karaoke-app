import { useEffect, useRef } from "react";
import { useSessionStore } from "../../stores/sessionStore";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const position = useSessionStore((state) => state.position);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const timeDifference = Math.abs(audio.currentTime - position);

    if (timeDifference > 0.5) {
      audio.currentTime = position;
    }

    if (isPlaying) {
      audio.play().catch((error) => {
        console.warn("Audio play was blocked:", error);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, position, currentSong?.id]);

  if (!currentSong) {
    return (
      <section>
        <h2>Player</h2>
        <p>No song selected.</p>
      </section>
    );
  }

  const audioUrl = `http://localhost:3001/media/audio/${currentSong.id}`;

  return (
    <section>
      <h2>Player</h2>

      <p>
        Now loaded: {currentSong.artist} - {currentSong.title}
      </p>

      <audio
        ref={audioRef}
        controls
        src={audioUrl}
      />
    </section>
  );
}