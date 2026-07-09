import { describe, expect, it } from "vitest";
import {
  getSelectedDeviceFallback,
  hasMicrophoneApiSupport,
  serializeAudioInputDevices,
} from "./microphoneStore";

describe("microphone helpers", () => {
  it("detects unsupported browser APIs", () => {
    expect(hasMicrophoneApiSupport(undefined)).toBe(false);
    expect(
      hasMicrophoneApiSupport({
        getUserMedia: () => undefined,
      }),
    ).toBe(false);
    expect(
      hasMicrophoneApiSupport({
        enumerateDevices: () => undefined,
      }),
    ).toBe(false);
  });

  it("detects supported browser APIs", () => {
    expect(
      hasMicrophoneApiSupport({
        getUserMedia: () => undefined,
        enumerateDevices: () => undefined,
      }),
    ).toBe(true);
  });

  it("filters audio input devices and applies fallback labels", () => {
    const devices = serializeAudioInputDevices([
      {
        kind: "audioinput",
        deviceId: "mic-1",
        label: "",
      },
      {
        kind: "videoinput",
        deviceId: "camera-1",
        label: "Camera",
      },
      {
        kind: "audioinput",
        deviceId: "mic-2",
        label: "USB Mic",
      },
    ]);

    expect(devices).toEqual([
      {
        deviceId: "mic-1",
        label: "Microphone 1",
      },
      {
        deviceId: "mic-2",
        label: "USB Mic",
      },
    ]);
  });

  it("keeps selected device when it still exists", () => {
    expect(
      getSelectedDeviceFallback(
        [
          {
            deviceId: "mic-1",
            label: "Mic 1",
          },
          {
            deviceId: "mic-2",
            label: "Mic 2",
          },
        ],
        "mic-2",
      ),
    ).toBe("mic-2");
  });

  it("falls back when selected device disappears", () => {
    expect(
      getSelectedDeviceFallback(
        [
          {
            deviceId: "mic-1",
            label: "Mic 1",
          },
        ],
        "missing-mic",
      ),
    ).toBe("mic-1");
  });

  it("clears selection when no microphones remain", () => {
    expect(getSelectedDeviceFallback([], "missing-mic")).toBeNull();
  });
});
