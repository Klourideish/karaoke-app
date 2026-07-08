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
      previousLine: null,
      currentLine: null,
      nextLine: null,
      previousIndex: null,
      currentIndex: null,
      nextIndex: null,
      phase: "empty",
    });
  });

  it("handles before first line", () => {
    expect(getLyricDisplayState(lines, 5)).toEqual({
      previousLine: null,
      currentLine: null,
      nextLine: lines[0],
      previousIndex: null,
      currentIndex: null,
      nextIndex: 0,
      phase: "before-first-line",
    });
  });

  it("handles active line", () => {
    expect(getLyricDisplayState(lines, 11)).toEqual({
      previousLine: null,
      currentLine: lines[0],
      nextLine: lines[1],
      previousIndex: null,
      currentIndex: 0,
      nextIndex: 1,
      phase: "active-line",
    });
  });

  it("handles between lines", () => {
    expect(getLyricDisplayState(lines, 13)).toEqual({
      previousLine: lines[0],
      currentLine: null,
      nextLine: lines[1],
      previousIndex: 0,
      currentIndex: null,
      nextIndex: 1,
      phase: "between-lines",
    });
  });

  it("handles after final line", () => {
    expect(getLyricDisplayState(lines, 20)).toEqual({
      previousLine: lines[1],
      currentLine: null,
      nextLine: null,
      previousIndex: 1,
      currentIndex: null,
      nextIndex: null,
      phase: "after-final-line",
    });
  });

  it("treats exact line start as active", () => {
    expect(getLyricDisplayState(lines, 14)).toEqual({
      previousLine: lines[0],
      currentLine: lines[1],
      nextLine: null,
      previousIndex: 0,
      currentIndex: 1,
      nextIndex: null,
      phase: "active-line",
    });
  });

  it("treats exact line end as completed", () => {
    expect(getLyricDisplayState(lines, 12)).toEqual({
      previousLine: lines[0],
      currentLine: null,
      nextLine: lines[1],
      previousIndex: 0,
      currentIndex: null,
      nextIndex: 1,
      phase: "between-lines",
    });
  });
});
