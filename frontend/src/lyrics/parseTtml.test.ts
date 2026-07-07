import { describe, expect, it } from "vitest";
import { parseTtml } from "./parseTtml";

describe("parseTtml", () => {
  it("parses TTML paragraph timing and span text", () => {
    const ttml = `<?xml version="1.0" encoding="UTF-8"?>
<tt>
  <body>
    <div>
      <p begin="00:00:18.455" end="00:00:21.742">
        <span begin="00:00:18.455" end="00:00:18.555">I </span>
        <span begin="00:00:18.555" end="00:00:19.142">must've </span>
        <span begin="00:00:19.142" end="00:00:19.567">dreamed </span>
        <span begin="00:00:19.567" end="00:00:19.667">a </span>
        <span begin="00:00:19.667" end="00:00:20.690">thousand </span>
        <span begin="00:00:20.690" end="00:00:21.742">dreams</span>
      </p>
    </div>
  </body>
</tt>`;

    const lines = parseTtml(ttml);

    expect(lines).toEqual([
  {
    start: 18.455,
    end: 21.742,
    text: "I must've dreamed a thousand dreams",
    words: [
      {
        start: 18.455,
        end: 18.555,
        text: "I ",
      },
      {
        start: 18.555,
        end: 19.142,
        text: "must've ",
      },
      {
        start: 19.142,
        end: 19.567,
        text: "dreamed ",
      },
      {
        start: 19.567,
        end: 19.667,
        text: "a ",
      },
      {
        start: 19.667,
        end: 20.69,
        text: "thousand ",
      },
      {
        start: 20.69,
        end: 21.742,
        text: "dreams",
      },
    ],
  },
]);
  });

  it("skips untimed paragraphs", () => {
    const ttml = `
<tt>
  <body>
    <div>
      <p>
        <span>No timing</span>
      </p>
    </div>
  </body>
</tt>`;

    expect(parseTtml(ttml)).toEqual([]);
  });
});