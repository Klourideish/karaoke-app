import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { parseTtml, type LyricLine } from "../../lyrics/parseTtml";
import { getLyricDisplayState } from "../../lyrics/getLyricDisplayState";
import { usePlaybackClockStore } from "../../stores/playbackClockStore";
import {
  applyLyricOffset,
  useLocalPlaybackSettingsStore,
} from "../../stores/localPlaybackSettingsStore";
import { buildApiUrl } from "../../lib/backendUrl";

export function LyricDisplay() {
  const currentSong = useSessionStore(
    (state) => state.currentSong,
  );
  const position = usePlaybackClockStore(
    (state) => state.position,
  );
  const lyricOffsetSeconds = useLocalPlaybackSettingsStore(
    (state) => state.lyricOffsetSeconds,
  );

  const [lines, setLines] = useState<LyricLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLines([]);
    setError(null);

    if (!currentSong) {
      return;
    }

    let cancelled = false;
    const songId = currentSong.id;

    async function loadLyrics() {
      try {
        const response = await fetch(
          buildApiUrl(`/media/lyrics/${songId}`),
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load lyrics (${response.status})`,
          );
        }

        const ttml = await response.text();
        const parsedLines = parseTtml(ttml);

        if (!cancelled) {
          setLines(parsedLines);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unknown lyrics error",
          );

          setLines([]);
        }
      }
    }

    void loadLyrics();

    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  const effectivePosition = applyLyricOffset(
    position,
    lyricOffsetSeconds,
  );

  const lyricState = useMemo(
    () => getLyricDisplayState(lines, effectivePosition),
    [effectivePosition, lines],
  );

  const { previousLine, currentLine, nextLine } = lyricState;

  if (!currentSong) {
    return null;
  }

  return (
    <section className="lyric-display">
      <h2>Lyrics</h2>

      {error && <p>Lyrics error: {error}</p>}

      {!error && !previousLine && !currentLine && !nextLine && (
        <p>...</p>
      )}

      {currentLine && (
        <p
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
          }}
        >
          {currentLine.words.map((word, index) => {
            const isActive =
              effectivePosition >= word.start &&
              effectivePosition < word.end;

            const isCompleted = effectivePosition >= word.end;

            return (
              <span
                key={`${word.start}-${index}`}
                style={{
                  opacity:
                    isActive || isCompleted
                      ? 1
                      : 0.4,
                }}
              >
                {word.text}
              </span>
            );
          })}
        </p>
      )}

      {!currentLine && previousLine && (
        <p
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
          }}
        >
          {previousLine.text}
        </p>
      )}

      {nextLine && (
        <p
          style={{
            fontSize: "1.25rem",
            opacity: 0.6,
          }}
        >
          {nextLine.text}
        </p>
      )}
    </section>
  );
}
