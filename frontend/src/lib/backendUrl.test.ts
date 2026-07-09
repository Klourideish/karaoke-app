import { describe, expect, it } from "vitest";
import {
  getApiBaseUrl,
  getSocketBaseUrl,
  shouldUseBackendProxy,
} from "./backendUrl";

const lanLocation = {
  protocol: "http:",
  hostname: "192.168.1.78",
  origin: "http://192.168.1.78:5173",
};

const httpsLocation = {
  protocol: "https:",
  hostname: "192.168.1.78",
  origin: "https://192.168.1.78:5173",
};

describe("backendUrl", () => {
  it("uses direct backend URL by default", () => {
    expect(getApiBaseUrl(lanLocation, {})).toBe(
      "http://192.168.1.78:3001",
    );
    expect(getSocketBaseUrl(lanLocation, {})).toBe(
      "http://192.168.1.78:3001",
    );
  });

  it("uses same-origin URL only when proxy mode is explicit", () => {
    expect(
      shouldUseBackendProxy({
        VITE_USE_BACKEND_PROXY: "true",
      }),
    ).toBe(true);
    expect(
      getApiBaseUrl(httpsLocation, {
        VITE_USE_BACKEND_PROXY: "true",
      }),
    ).toBe("https://192.168.1.78:5173");
    expect(
      getSocketBaseUrl(httpsLocation, {
        VITE_USE_BACKEND_PROXY: "true",
      }),
    ).toBeUndefined();
  });

  it("does not use proxy mode for non-true values", () => {
    expect(
      shouldUseBackendProxy({
        VITE_USE_BACKEND_PROXY: "false",
      }),
    ).toBe(false);
  });
});
