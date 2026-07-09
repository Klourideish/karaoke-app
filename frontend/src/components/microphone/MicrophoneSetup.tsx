import { useEffect } from "react";
import { useMicrophoneStore } from "../../stores/microphoneStore";

export function MicrophoneSetup() {
  const isSupported = useMicrophoneStore((state) => state.isSupported);
  const permissionState = useMicrophoneStore(
    (state) => state.permissionState,
  );
  const devices = useMicrophoneStore((state) => state.devices);
  const selectedDeviceId = useMicrophoneStore(
    (state) => state.selectedDeviceId,
  );
  const isRequestingPermission = useMicrophoneStore(
    (state) => state.isRequestingPermission,
  );
  const error = useMicrophoneStore((state) => state.error);
  const checkSupport = useMicrophoneStore((state) => state.checkSupport);
  const requestPermission = useMicrophoneStore(
    (state) => state.requestPermission,
  );
  const refreshDevices = useMicrophoneStore(
    (state) => state.refreshDevices,
  );
  const selectDevice = useMicrophoneStore(
    (state) => state.selectDevice,
  );

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) {
      return;
    }

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices.addEventListener(
      "devicechange",
      handleDeviceChange,
    );

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [refreshDevices]);

  return (
    <section className="microphone-setup">
      <h2>Mic</h2>

      {!isSupported && (
        <p>
          Microphone access is not available in this browser context.
        </p>
      )}

      <p>Permission: {permissionState}</p>

      {error && <p>Microphone error: {error}</p>}

      <button
        disabled={!isSupported || isRequestingPermission}
        onClick={() => {
          void requestPermission();
        }}
      >
        {isRequestingPermission
          ? "Requesting..."
          : "Enable microphone"}
      </button>

      <button
        disabled={!isSupported || permissionState !== "granted"}
        onClick={() => {
          void refreshDevices();
        }}
      >
        Refresh devices
      </button>

      {permissionState === "granted" && devices.length === 0 && (
        <p>No microphones found.</p>
      )}

      {devices.length > 0 && (
        <label>
          Microphone
          <select
            value={selectedDeviceId ?? ""}
            onChange={(event) => {
              selectDevice(event.target.value);
            }}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
