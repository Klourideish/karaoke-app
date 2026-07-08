import type { LyricLine } from "./parseTtml";

export type LyricDisplayPhase =
  | "empty"
  | "before-first-line"
  | "active-line"
  | "between-lines"
  | "after-final-line";

export interface LyricDisplayState {
  previousLine: LyricLine | null;
  currentLine: LyricLine | null;
  nextLine: LyricLine | null;
  previousIndex: number | null;
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
      previousLine: null,
      currentLine: null,
      nextLine: null,
      previousIndex: null,
      currentIndex: null,
      nextIndex: null,
      phase: "empty",
    };
  }

  const currentIndex = lines.findIndex(
    (line) => position >= line.start && position < line.end,
  );

  if (currentIndex !== -1) {
    const previousIndex =
      currentIndex > 0 ? currentIndex - 1 : null;

    return {
      previousLine:
        previousIndex === null ? null : lines[previousIndex] ?? null,
      currentLine: lines[currentIndex] ?? null,
      nextLine: lines[currentIndex + 1] ?? null,
      previousIndex,
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
    const previousIndex = lines.length - 1;

    return {
      previousLine: lines[previousIndex] ?? null,
      currentLine: null,
      nextLine: null,
      previousIndex,
      currentIndex: null,
      nextIndex: null,
      phase: "after-final-line",
    };
  }

  const previousIndex = nextIndex > 0 ? nextIndex - 1 : null;

  return {
    previousLine:
      previousIndex === null ? null : lines[previousIndex] ?? null,
    currentLine: null,
    nextLine: lines[nextIndex] ?? null,
    previousIndex,
    currentIndex: null,
    nextIndex,
    phase:
      nextIndex === 0 ? "before-first-line" : "between-lines",
  };
}
