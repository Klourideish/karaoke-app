import { describe, expect, it } from "vitest";
import {
  getCurrentAppOrigin,
  isLocalhostHostname,
  shouldShowInsecureLanMicSetup,
} from "./micSetupGuidance";

describe("mic setup guidance", () => {
  it("detects insecure LAN HTTP contexts", () => {
    expect(
      shouldShowInsecureLanMicSetup({
        protocol: "http:",
        hostname: "192.168.1.78",
        origin: "http://192.168.1.78:5173",
        isSecureContext: false,
        hasGetUserMedia: false,
      }),
    ).toBe(true);
  });

  it("detects insecure LAN HTTP even when getUserMedia exists", () => {
    expect(
      shouldShowInsecureLanMicSetup({
        protocol: "http:",
        hostname: "192.168.1.78",
        origin: "http://192.168.1.78:5173",
        isSecureContext: false,
        hasGetUserMedia: true,
      }),
    ).toBe(true);
  });

  it("does not show setup guidance for localhost HTTP", () => {
    expect(isLocalhostHostname("localhost")).toBe(true);
    expect(isLocalhostHostname("127.0.0.1")).toBe(true);
    expect(isLocalhostHostname("[::1]")).toBe(true);
    expect(
      shouldShowInsecureLanMicSetup({
        protocol: "http:",
        hostname: "localhost",
        origin: "http://localhost:5173",
        isSecureContext: false,
        hasGetUserMedia: false,
      }),
    ).toBe(false);
  });

  it("does not show setup guidance for secure contexts", () => {
    expect(
      shouldShowInsecureLanMicSetup({
        protocol: "https:",
        hostname: "192.168.1.78",
        origin: "https://192.168.1.78:5173",
        isSecureContext: true,
        hasGetUserMedia: false,
      }),
    ).toBe(false);
  });

  it("returns the exact current app origin", () => {
    expect(
      getCurrentAppOrigin({
        origin: "http://192.168.1.78:5173",
      }),
    ).toBe("http://192.168.1.78:5173");
  });
});
