import { useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { usePlaybackClockStore } from "../../stores/playbackClockStore";
import { socket } from "../../lib/socket";
import { buildApiUrl } from "../../lib/backendUrl";

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingRef = useRef(false);
  const previousSongIdRef = useRef<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);

  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const position = useSessionStore((state) => state.position);
  const startedAtServerTime = useSessionStore(
    (state) => state.startedAtServerTime,
  );
  const positionAtStart = useSessionStore(
    (state) => state.positionAtStart,
  );

  const setPlaybackPosition = usePlaybackClockStore(
    (state) => state.setPosition,
  );
  const localPosition = usePlaybackClockStore(
    (state) => state.position,
  );

  useEffect(() => {
    const clientSentAt = Date.now();

    socket.emit(
      "clock-sync",
      clientSentAt,
      (payload: {
        clientSentAt: number;
        serverTime: number;
      }) => {
        const clientReceivedAt = Date.now();
        const roundTripMs = clientReceivedAt - payload.clientSentAt;
        const estimatedServerNow =
          payload.serverTime + roundTripMs / 2;

        setServerClockOffsetMs(
          estimatedServerNow - clientReceivedAt,
        );
      },
    );
  }, []);

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

    const authoritativePosition = estimateAuthoritativePosition(
      position,
      startedAtServerTime,
      positionAtStart,
      serverClockOffsetMs,
      isPlaying,
    );
    const songChanged =
      previousSongIdRef.current !== currentSong?.id;
    const playbackJustStarted =
      isPlaying && (!wasPlayingRef.current || songChanged);

    if (playbackJustStarted) {
      audio.currentTime = authoritativePosition;
      setPlaybackPosition(authoritativePosition);
    }

    const timeDifference = Math.abs(
      audio.currentTime - authoritativePosition,
    );
    const correctionThreshold = isPlaying ? 2.0 : 0.5;

    if (!playbackJustStarted && timeDifference > correctionThreshold) {
      audio.currentTime = authoritativePosition;
      setPlaybackPosition(authoritativePosition);
    }

    if (isPlaying) {
      audio.play().catch((error) => {
        console.warn("Audio play was blocked:", error);
      });
    } else {
      audio.pause();
    }

    wasPlayingRef.current = isPlaying;
    previousSongIdRef.current = currentSong?.id ?? null;
  }, [
    isPlaying,
    position,
    startedAtServerTime,
    positionAtStart,
    serverClockOffsetMs,
    currentSong?.id,
    setPlaybackPosition,
  ]);

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

  const audioUrl = buildApiUrl(`/media/audio/${currentSong.id}`);
  const isCurrentAudioEvent = (audio: HTMLAudioElement) =>
    audio.currentSrc === audioUrl || audio.currentSrc === "";
  const progressPercent =
    duration && duration > 0
      ? Math.min(100, (localPosition / duration) * 100)
      : null;
  const handlePlay = () => {
    socket.emit("play");
  };

  const handlePause = () => {
    socket.emit("pause");
  };

  const handleSeekForward = () => {
    socket.emit("seek", position + 10);
  };

  return (
    <section className="audio-player">
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

      <div className="manual-controls">
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause}>Pause</button>
        <button onClick={handleSeekForward}>Seek +10s</button>
      </div>
    </section>
  );
}

function estimateAuthoritativePosition(
  position: number,
  startedAtServerTime: number | null,
  positionAtStart: number,
  serverClockOffsetMs: number,
  isPlaying: boolean,
): number {
  if (!isPlaying || startedAtServerTime === null) {
    return position;
  }

  const estimatedServerNow = Date.now() + serverClockOffsetMs;

  return (
    positionAtStart +
    (estimatedServerNow - startedAtServerTime) / 1000
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
