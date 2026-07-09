import { describe, expect, it } from "vitest";
import type { SingerSlot } from "../../types/session";
import { getActiveSingerSlot } from "./getActiveSingerSlot";

const singerSlots: SingerSlot[] = [
  {
    id: "singer-1",
    name: "Singer 1",
    clientId: "client-1",
  },
  {
    id: "singer-2",
    name: "Singer 2",
    clientId: "client-2",
  },
];

describe("getActiveSingerSlot", () => {
  it("matches singer 1", () => {
    expect(getActiveSingerSlot("client-1", singerSlots)).toBe(
      "singer-1",
    );
  });

  it("matches singer 2", () => {
    expect(getActiveSingerSlot("client-2", singerSlots)).toBe(
      "singer-2",
    );
  });

  it("returns null when requester matches no slot", () => {
    expect(getActiveSingerSlot("client-3", singerSlots)).toBeNull();
  });

  it("returns null for null requester", () => {
    expect(getActiveSingerSlot(null, singerSlots)).toBeNull();
  });

  it("returns null for unassigned slots", () => {
    expect(
      getActiveSingerSlot("client-1", [
        {
          id: "singer-1",
          name: "Singer 1",
          clientId: null,
        },
      ]),
    ).toBeNull();
  });
});
