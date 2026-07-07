import { describe, expect, it } from "vitest";
import { parseSongFilename } from "./parseSongFilename";

describe("parseSongFilename", () => {
  it("parses Artist - Title", () => {
    expect(parseSongFilename("LE SSERAFIM - Celebrate")).toEqual({
      artist: "LE SSERAFIM",
      title: "Celebrate",
    });
  });

  it("keeps extra separators inside the title", () => {
    expect(parseSongFilename("Artist - Song - Live Version")).toEqual({
      artist: "Artist",
      title: "Song - Live Version",
    });
  });

  it("rejects stems without artist/title separator", () => {
    expect(parseSongFilename("Celebrate")).toBeNull();
  });

  it("rejects missing artist", () => {
    expect(parseSongFilename(" - Celebrate")).toBeNull();
  });

  it("rejects missing title", () => {
    expect(parseSongFilename("LE SSERAFIM - ")).toBeNull();
  });
});