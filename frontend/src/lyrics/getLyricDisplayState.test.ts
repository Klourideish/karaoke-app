import { describe, expect, it } from "vitest";
import type { LyricLine } from "./parseTtml";
import { getLyricDisplayState } from "./getLyricDisplayState";

const lines: LyricLine[] = [
  {
    start: 10,
    end: 12,
    text: "First line",
    words: [],
  },
  {
    start: 14,
    end: 16,
    text: "Second line",
    words: [],
  },
];

describe("getLyricDisplayState", () => {
  it("handles no lines", () => {
    expect(getLyricDisplayState([], 10)).toEqual({
      currentLine: null,
      nextLine: null,
      currentIndex: null,
      nextIndex: null,
      phase: "empty",
    });
  });

  it("handles before first line", () => {
    expect(getLyricDisplayState(lines, 5)).toEqual({
      currentLine: null,
      nextLine: lines[0],
      currentIndex: null,
      nextIndex: 0,
      phase: "before-first-line",
    });
  });

  it("handles active line", () => {
    expect(getLyricDisplayState(lines, 11)).toEqual({
      currentLine: lines[0],
      nextLine: lines[1],
      currentIndex: 0,
      nextIndex: 1,
      phase: "active-line",
    });
  });

  it("handles between lines", () => {
    expect(getLyricDisplayState(lines, 13)).toEqual({
      currentLine: null,
      nextLine: lines[1],
      currentIndex: null,
      nextIndex: 1,
      phase: "between-lines",
    });
  });

  it("handles after final line", () => {
    expect(getLyricDisplayState(lines, 20)).toEqual({
      currentLine: null,
      nextLine: null,
      currentIndex: null,
      nextIndex: null,
      phase: "after-final-line",
    });
  });
});
