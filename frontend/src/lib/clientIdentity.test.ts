import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientId } from "./clientIdentity";

describe("getClientId", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reuses an existing stored ID", () => {
    localStorage.setItem("karaoke-client-id", "stored-client-id");

    expect(getClientId()).toBe("stored-client-id");
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-client-id"),
    });

    expect(getClientId()).toBe("uuid-client-id");
    expect(localStorage.getItem("karaoke-client-id")).toBe(
      "uuid-client-id",
    );
  });

  it("creates and persists a fallback ID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    vi.spyOn(Date, "now").mockReturnValue(123456789);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const clientId = getClientId();

    expect(clientId).toMatch(/^client-/);
    expect(localStorage.getItem("karaoke-client-id")).toBe(
      clientId,
    );
  });
});
