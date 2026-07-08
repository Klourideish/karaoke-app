import type { LyricLine } from "./parseTtml";

export type LyricDisplayPhase =
  | "empty"
  | "before-first-line"
  | "active-line"
  | "between-lines"
  | "after-final-line";

export interface LyricDisplayState {
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  currentIndex: number | null;
  nextIndex: number | null;
  phase: LyricDisplayPhase;
}

export function getLyricDisplayState(
  lines: LyricLine[],
  position: number,
): LyricDisplayState {
  if (lines.length === 0) {
    return {
      currentLine: null,
      nextLine: null,
      currentIndex: null,
      nextIndex: null,
      phase: "empty",
    };
  }

  const currentIndex = lines.findIndex(
    (line) => position >= line.start && position < line.end,
  );

  if (currentIndex !== -1) {
    return {
      currentLine: lines[currentIndex] ?? null,
      nextLine: lines[currentIndex + 1] ?? null,
      currentIndex,
      nextIndex:
        currentIndex + 1 < lines.length
          ? currentIndex + 1
          : null,
      phase: "active-line",
    };
  }

  const nextIndex = lines.findIndex(
    (line) => line.start > position,
  );

  if (nextIndex === -1) {
    return {
      currentLine: null,
      nextLine: null,
      currentIndex: null,
      nextIndex: null,
      phase: "after-final-line",
    };
  }

  return {
    currentLine: null,
    nextLine: lines[nextIndex] ?? null,
    currentIndex: null,
    nextIndex,
    phase:
      nextIndex === 0 ? "before-first-line" : "between-lines",
  };
}
