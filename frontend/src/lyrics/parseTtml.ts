export interface LyricWord {
  start: number;
  end: number;
  text: string;
}
export interface LyricLine {
  start: number;
  end: number;
  text: string;
  words: LyricWord[];
  }

function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(":");

  if (parts.length !== 3) {
    throw new Error(`Invalid TTML timestamp: ${timestamp}`);
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const seconds = Number(parts[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    throw new Error(`Invalid TTML timestamp: ${timestamp}`);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export function parseTtml(ttml: string): LyricLine[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    ttml,
    "application/xml",
  );

  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("Invalid TTML document");
  }

  const paragraphs = Array.from(
    document.querySelectorAll("p"),
  );

  return paragraphs
    .map((paragraph): LyricLine | null => {
      const begin = paragraph.getAttribute("begin");
      const end = paragraph.getAttribute("end");

      if (!begin || !end) {
        return null;
      }

      const words = Array.from(
  paragraph.querySelectorAll("span"),
)
  .map((span): LyricWord | null => {
    const begin = span.getAttribute("begin");
    const end = span.getAttribute("end");

    if (!begin || !end) {
      return null;
    }

    return {
      start: parseTimestamp(begin),
      end: parseTimestamp(end),
      text: span.textContent ?? "",
    };
  })
  .filter((word): word is LyricWord => word !== null);

const text = words
  .map((word) => word.text)
  .join("")
  .trim();

if (!text) {
  return null;
}

return {
  start: parseTimestamp(begin),
  end: parseTimestamp(end),
  text,
  words,
};
    })
    .filter((line): line is LyricLine => line !== null);
}