import { create } from "zustand";

export type MicrophonePermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied";

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

interface MicrophoneStore {
  isSupported: boolean;
  permissionState: MicrophonePermissionState;
  devices: MicrophoneDevice[];
  selectedDeviceId: string | null;
  isRequestingPermission: boolean;
  isMonitoring: boolean;
  level: number;
  error: string | null;
  checkSupport: () => void;
  requestPermission: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
}

type MediaDevicesLike = {
  getUserMedia?: unknown;
  enumerateDevices?: unknown;
};

type DeviceInfoLike = Pick<
  MediaDeviceInfo,
  "deviceId" | "kind" | "label"
>;

type AudioContextConstructor = new () => AudioContext;

let monitoringStream: MediaStream | null = null;
let monitoringAudioContext: AudioContext | null = null;
let monitoringSourceNode: MediaStreamAudioSourceNode | null = null;
let monitoringAnalyserNode: AnalyserNode | null = null;
let monitoringRafId: number | null = null;
let lastPublishedLevel = 0;
let monitoringStartToken = 0;

export function hasMicrophoneApiSupport(
  mediaDevices: MediaDevicesLike | undefined,
): boolean {
  return (
    typeof mediaDevices?.getUserMedia === "function" &&
    typeof mediaDevices.enumerateDevices === "function"
  );
}

export function serializeAudioInputDevices(
  devices: DeviceInfoLike[],
): MicrophoneDevice[] {
  const audioInputDevices = devices.filter(
    (device) => device.kind === "audioinput",
  );

  return audioInputDevices.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label.trim() || `Microphone ${index + 1}`,
  }));
}

export function getSelectedDeviceFallback(
  devices: MicrophoneDevice[],
  selectedDeviceId: string | null,
): string | null {
  if (devices.length === 0) {
    return null;
  }

  if (
    selectedDeviceId &&
    devices.some((device) => device.deviceId === selectedDeviceId)
  ) {
    return selectedDeviceId;
  }

  return devices[0]?.deviceId ?? null;
}

export function clampNormalizedLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 0;
  }

  return Math.min(1, Math.max(0, level));
}

export function calculateInputLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (const sample of samples) {
    const centeredSample = (sample - 128) / 128;
    sumSquares += centeredSample * centeredSample;
  }

  return clampNormalizedLevel(Math.sqrt(sumSquares / samples.length));
}

export function createMicrophoneConstraints(
  selectedDeviceId: string | null,
): MediaStreamConstraints {
  return selectedDeviceId
    ? {
        audio: {
          deviceId: {
            exact: selectedDeviceId,
          },
        },
      }
    : {
        audio: true,
      };
}

function getMediaDevices(): MediaDevices | undefined {
  return globalThis.navigator?.mediaDevices;
}

function stopPermissionStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function getMicrophoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "SecurityError"
    ) {
      return "Microphone permission was denied or is unavailable in this browser context.";
    }

    if (error.name === "NotFoundError") {
      return "No microphone was found.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to access microphone.";
}

function getAudioContextConstructor():
  | AudioContextConstructor
  | undefined {
  return (
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & {
      webkitAudioContext?: AudioContextConstructor;
    }).webkitAudioContext
  );
}

function stopMonitoringResources(): void {
  monitoringStartToken += 1;

  if (monitoringRafId !== null) {
    cancelAnimationFrame(monitoringRafId);
    monitoringRafId = null;
  }

  monitoringSourceNode?.disconnect();
  monitoringAnalyserNode?.disconnect();
  monitoringSourceNode = null;
  monitoringAnalyserNode = null;

  monitoringStream?.getTracks().forEach((track) => {
    track.stop();
  });
  monitoringStream = null;

  if (monitoringAudioContext) {
    void monitoringAudioContext.close();
    monitoringAudioContext = null;
  }

  lastPublishedLevel = 0;
}

function startMeteringLoop(
  analyserNode: AnalyserNode,
  sampleBuffer: Uint8Array<ArrayBuffer>,
  setLevel: (level: number) => void,
): void {
  const publishThreshold = 0.015;

  const updateLevel = () => {
    analyserNode.getByteTimeDomainData(sampleBuffer);

    const nextLevel = calculateInputLevel(sampleBuffer);
    const hasMeaningfulChange =
      Math.abs(nextLevel - lastPublishedLevel) >= publishThreshold ||
      (lastPublishedLevel > 0 && nextLevel === 0);

    if (hasMeaningfulChange) {
      lastPublishedLevel = nextLevel;
      setLevel(nextLevel);
    }

    monitoringRafId = requestAnimationFrame(updateLevel);
  };

  monitoringRafId = requestAnimationFrame(updateLevel);
}

export const useMicrophoneStore = create<MicrophoneStore>((set, get) => ({
  isSupported: false,
  permissionState: "unknown",
  devices: [],
  selectedDeviceId: null,
  isRequestingPermission: false,
  isMonitoring: false,
  level: 0,
  error: null,

  checkSupport: () => {
    const isSupported = hasMicrophoneApiSupport(getMediaDevices());

    set({
      isSupported,
      permissionState: isSupported ? "prompt" : "unknown",
      error: isSupported
        ? null
        : "Microphone APIs are not available in this browser context.",
    });
  },

  requestPermission: async () => {
    const mediaDevices = getMediaDevices();

    if (!mediaDevices || !hasMicrophoneApiSupport(mediaDevices)) {
      set({
        isSupported: false,
        permissionState: "unknown",
        error: "Microphone APIs are not available in this browser context.",
      });
      return;
    }

    const supportedMediaDevices: MediaDevices = mediaDevices;

    set({
      isRequestingPermission: true,
      error: null,
    });

    try {
      const stream = await supportedMediaDevices.getUserMedia({
        audio: true,
      });

      stopPermissionStream(stream);

      set({
        permissionState: "granted",
        isRequestingPermission: false,
      });

      await get().refreshDevices();
    } catch (error) {
      set({
        permissionState:
          error instanceof DOMException &&
          (error.name === "NotAllowedError" ||
            error.name === "SecurityError")
            ? "denied"
            : get().permissionState,
        isRequestingPermission: false,
        error: getMicrophoneErrorMessage(error),
      });
    }
  },

  refreshDevices: async () => {
    const mediaDevices = getMediaDevices();

    if (!mediaDevices || !hasMicrophoneApiSupport(mediaDevices)) {
      set({
        isSupported: false,
        devices: [],
        selectedDeviceId: null,
        error: "Microphone APIs are not available in this browser context.",
      });
      return;
    }

    const supportedMediaDevices: MediaDevices = mediaDevices;

    try {
      const devices = serializeAudioInputDevices(
        await supportedMediaDevices.enumerateDevices(),
      );
      const previousSelectedDeviceId = get().selectedDeviceId;
      const nextSelectedDeviceId = getSelectedDeviceFallback(
        devices,
        previousSelectedDeviceId,
      );
      const shouldRestartMonitoring =
        get().isMonitoring &&
        previousSelectedDeviceId !== nextSelectedDeviceId;

      set({
        isSupported: true,
        devices,
        selectedDeviceId: nextSelectedDeviceId,
        error: null,
      });

      if (shouldRestartMonitoring) {
        stopMonitoringResources();
        set({
          isMonitoring: false,
          level: 0,
          error: nextSelectedDeviceId
            ? null
            : "Selected microphone is no longer available.",
        });

        if (nextSelectedDeviceId) {
          void get().startMonitoring();
        }
      }
    } catch (error) {
      set({
        error: getMicrophoneErrorMessage(error),
      });
    }
  },

  selectDevice: (deviceId: string) => {
    const exists = get().devices.some(
      (device) => device.deviceId === deviceId,
    );

    if (!exists) {
      set({
        error: "Selected microphone is no longer available.",
      });
      return;
    }

    set({
      selectedDeviceId: deviceId,
      error: null,
    });

    if (get().isMonitoring) {
      stopMonitoringResources();
      set({
        isMonitoring: false,
        level: 0,
      });
      void get().startMonitoring();
    }
  },

  startMonitoring: async () => {
    const mediaDevices = getMediaDevices();

    if (get().isMonitoring) {
      return;
    }

    if (!mediaDevices || !hasMicrophoneApiSupport(mediaDevices)) {
      stopMonitoringResources();
      set({
        isSupported: false,
        isMonitoring: false,
        level: 0,
        error: "Microphone APIs are not available in this browser context.",
      });
      return;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      stopMonitoringResources();
      set({
        isMonitoring: false,
        level: 0,
        error: "Web Audio is not available in this browser context.",
      });
      return;
    }

    set({
      isMonitoring: true,
      level: 0,
      error: null,
    });

    const startToken = monitoringStartToken + 1;
    monitoringStartToken = startToken;

    try {
      const stream = await mediaDevices.getUserMedia(
        createMicrophoneConstraints(get().selectedDeviceId),
      );

      if (monitoringStartToken !== startToken || !get().isMonitoring) {
        stopPermissionStream(stream);
        return;
      }

      monitoringStream = stream;

      const audioContext = new AudioContextConstructor();
      const analyserNode = audioContext.createAnalyser();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const sampleBuffer = new Uint8Array(analyserNode.fftSize);

      if (monitoringStartToken !== startToken || !get().isMonitoring) {
        sourceNode.disconnect();
        analyserNode.disconnect();
        void audioContext.close();
        stopPermissionStream(stream);
        monitoringStream = null;
        return;
      }

      sourceNode.connect(analyserNode);

      monitoringAudioContext = audioContext;
      monitoringSourceNode = sourceNode;
      monitoringAnalyserNode = analyserNode;
      lastPublishedLevel = 0;

      startMeteringLoop(analyserNode, sampleBuffer, (level) => {
        set({ level });
      });

      set({
        permissionState: "granted",
        isMonitoring: true,
        level: 0,
        error: null,
      });
    } catch (error) {
      stopMonitoringResources();
      set({
        permissionState:
          error instanceof DOMException &&
          (error.name === "NotAllowedError" ||
            error.name === "SecurityError")
            ? "denied"
            : get().permissionState,
        isMonitoring: false,
        level: 0,
        error: getMicrophoneErrorMessage(error),
      });
    }
  },

  stopMonitoring: () => {
    stopMonitoringResources();
    set({
      isMonitoring: false,
      level: 0,
    });
  },
}));
