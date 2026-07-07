import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { parseTtml, type LyricLine } from "../../lyrics/parseTtml";
import { usePlaybackClockStore } from "../../stores/playbackClockStore";

export function LyricDisplay() {
  const currentSong = useSessionStore(
    (state) => state.currentSong,
  );
  const position = usePlaybackClockStore(
    (state) => state.position,
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
          `http://localhost:3001/media/lyrics/${songId}`,
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

  const lyricState = useMemo(() => {
    const currentIndex = lines.findIndex(
      (line) => position >= line.start && position < line.end,
    );

    if (currentIndex === -1) {
      const nextLine = lines.find(
        (line) => line.start > position,
      );

      return {
        currentLine: null,
        nextLine: nextLine ?? null,
      };
    }

    return {
      currentLine: lines[currentIndex] ?? null,
      nextLine: lines[currentIndex + 1] ?? null,
    };
  }, [lines, position]);

  const { currentLine, nextLine } = lyricState;

  if (!currentSong) {
    return null;
  }

  return (
    <section>
      <h2>Lyrics</h2>

      {error && <p>Lyrics error: {error}</p>}

      {!error && !currentLine && !nextLine && (
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
              position >= word.start &&
              position < word.end;

            const isCompleted = position >= word.end;

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
