import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { usePlaybackClockStore } from "../../stores/playbackClockStore";
import { socket } from "../../lib/socket";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const position = useSessionStore((state) => state.position);

  const setPlaybackPosition = usePlaybackClockStore(
    (state) => state.setPosition,
  );
  const localPosition = usePlaybackClockStore(
    (state) => state.position,
  );

  useEffect(() => {
    setAudioError(null);
    setDuration(null);
    setPlaybackPosition(0);

    const audio = audioRef.current;

    if (audio) {
      audio.currentTime = 0;
    }
  }, [currentSong?.id, setPlaybackPosition]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const timeDifference = Math.abs(audio.currentTime - position);

    if (timeDifference > 0.5) {
      audio.currentTime = position;
      setPlaybackPosition(position);
    }

    if (isPlaying) {
      audio.play().catch((error) => {
        console.warn("Audio play was blocked:", error);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, position, currentSong?.id, setPlaybackPosition]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!currentSong || !audio || !isPlaying) {
      return;
    }

    let frameId: number | null = null;
    let isCancelled = false;

    const updatePlaybackClock = () => {
      if (isCancelled) {
        return;
      }

      setPlaybackPosition(audio.currentTime);

      if (!audio.ended && !audio.paused) {
        frameId = requestAnimationFrame(updatePlaybackClock);
      }
    };

    frameId = requestAnimationFrame(updatePlaybackClock);

    return () => {
      isCancelled = true;

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [currentSong?.id, isPlaying, setPlaybackPosition]);

  if (!currentSong) {
    return (
      <section>
        <h2>Player</h2>
        <p>No song selected.</p>
      </section>
    );
  }

  const audioUrl = `http://localhost:3001/media/audio/${currentSong.id}`;
  const isCurrentAudioEvent = (audio: HTMLAudioElement) =>
    audio.currentSrc === audioUrl || audio.currentSrc === "";
  const progressPercent =
    duration && duration > 0
      ? Math.min(100, (localPosition / duration) * 100)
      : null;

  return (
    <section>
      <h2>Player</h2>

      <p>
        Now loaded: {currentSong.artist} - {currentSong.title}
      </p>

      <p>
        State: {isPlaying ? "Playing" : "Paused"}
      </p>

      <p>
        Time: {formatPlaybackTime(localPosition)}
        {duration !== null && ` / ${formatPlaybackTime(duration)}`}
      </p>

      {progressPercent !== null && (
        <p>
          Progress: {progressPercent.toFixed(1)}%
        </p>
      )}

      {audioError && <p>Audio error: {audioError}</p>}

      <audio
        ref={audioRef}
        controls
        src={audioUrl}
        onTimeUpdate={(event) => {
          setPlaybackPosition(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          if (!isCurrentAudioEvent(event.currentTarget)) {
            return;
          }

          setDuration(
            Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : null,
          );
        }}
        onCanPlay={() => {
          const audio = audioRef.current;

          if (!audio || audioError || !isCurrentAudioEvent(audio)) {
            return;
          }

          socket.emit("ready-for-playback", currentSong.id);
        }}
        onError={(event) => {
          if (!isCurrentAudioEvent(event.currentTarget)) {
            return;
          }

          setAudioError("Failed to load audio.");
        }}
        onEnded={() => {
          socket.emit("finish-playback");
        }}
      />
    </section>
  );
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}
