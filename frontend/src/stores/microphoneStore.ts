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
  error: string | null;
  checkSupport: () => void;
  requestPermission: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => void;
}

type MediaDevicesLike = {
  getUserMedia?: unknown;
  enumerateDevices?: unknown;
};

type DeviceInfoLike = Pick<
  MediaDeviceInfo,
  "deviceId" | "kind" | "label"
>;

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

export const useMicrophoneStore = create<MicrophoneStore>((set, get) => ({
  isSupported: false,
  permissionState: "unknown",
  devices: [],
  selectedDeviceId: null,
  isRequestingPermission: false,
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

      set({
        isSupported: true,
        devices,
        selectedDeviceId: getSelectedDeviceFallback(
          devices,
          get().selectedDeviceId,
        ),
        error: null,
      });
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
  },
}));
