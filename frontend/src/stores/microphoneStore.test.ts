import { describe, expect, it, vi } from "vitest";
import {
  calculateInputLevel,
  clampNormalizedLevel,
  createMicrophoneConstraints,
  getSelectedDeviceFallback,
  hasMicrophoneApiSupport,
  serializeAudioInputDevices,
  useMicrophoneStore,
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

  it("checks support without requesting microphone permission", () => {
    const previousMediaDevices = navigator.mediaDevices;
    const getUserMedia = vi.fn();
    const enumerateDevices = vi.fn();

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices,
      },
    });

    useMicrophoneStore.getState().checkSupport();

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(enumerateDevices).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: previousMediaDevices,
    });
  });

  it("filters audio input devices and applies fallback labels", () => {
    const devices = serializeAudioInputDevices([
      {
        kind: "videoinput",
        deviceId: "camera-1",
        label: "Camera",
      },
      {
        kind: "audioinput",
        deviceId: "mic-1",
        label: "",
      },
      {
        kind: "audiooutput",
        deviceId: "speaker-1",
        label: "Speakers",
      },
      {
        kind: "audioinput",
        deviceId: "mic-2",
        label: "",
      },
    ]);

    expect(devices).toEqual([
      {
        deviceId: "mic-1",
        label: "Microphone 1",
      },
      {
        deviceId: "mic-2",
        label: "Microphone 2",
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

  it("creates default audio constraints without a selected device", () => {
    expect(createMicrophoneConstraints(null)).toEqual({
      audio: true,
    });
  });

  it("creates exact device constraints for the selected device", () => {
    expect(createMicrophoneConstraints("mic-1")).toEqual({
      audio: {
        deviceId: {
          exact: "mic-1",
        },
      },
    });
  });

  it("clamps normalized levels", () => {
    expect(clampNormalizedLevel(-0.5)).toBe(0);
    expect(clampNormalizedLevel(0.25)).toBe(0.25);
    expect(clampNormalizedLevel(1.5)).toBe(1);
    expect(clampNormalizedLevel(Number.NaN)).toBe(0);
  });

  it("calculates silence from centered time-domain samples", () => {
    expect(calculateInputLevel(new Uint8Array([128, 128, 128]))).toBe(0);
  });

  it("calculates a normalized RMS input level", () => {
    expect(calculateInputLevel(new Uint8Array([0, 128, 255]))).toBeCloseTo(
      0.813,
      3,
    );
  });
});
