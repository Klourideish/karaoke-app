import { useEffect, useMemo, useState } from "react";
import { useMicrophoneStore } from "../../stores/microphoneStore";
import { MicSetupModal } from "./MicSetupModal";
import {
  getCurrentAppOrigin,
  shouldShowInsecureLanMicSetup,
} from "./micSetupGuidance";

export function MicrophoneSetup() {
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
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
  const isMonitoring = useMicrophoneStore(
    (state) => state.isMonitoring,
  );
  const level = useMicrophoneStore((state) => state.level);
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
  const startMonitoring = useMicrophoneStore(
    (state) => state.startMonitoring,
  );
  const stopMonitoring = useMicrophoneStore(
    (state) => state.stopMonitoring,
  );
  const selectedDevice = devices.find(
    (device) => device.deviceId === selectedDeviceId,
  );
  const appOrigin = getCurrentAppOrigin(window.location);
  const shouldOfferLanSetup = useMemo(
    () =>
      shouldShowInsecureLanMicSetup({
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        isSecureContext: window.isSecureContext,
        hasGetUserMedia:
          typeof navigator.mediaDevices?.getUserMedia === "function",
      }),
    [],
  );

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  useEffect(() => {
    if (shouldOfferLanSetup && !isSupported) {
      setIsSetupModalOpen(true);
      return;
    }

    if (!shouldOfferLanSetup || isSupported) {
      setIsSetupModalOpen(false);
    }
  }, [isSupported, shouldOfferLanSetup]);

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

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return (
    <section className="microphone-setup">
      <h2>Mic</h2>

      {!isSupported && (
        <>
          <p>
            Microphone access is not available in this browser context.
          </p>
          {shouldOfferLanSetup && (
            <button
              onClick={() => {
                setIsSetupModalOpen(true);
              }}
            >
              Microphone setup help
            </button>
          )}
        </>
      )}

      <p>Permission: {permissionState}</p>
      <p>Monitoring: {isMonitoring ? "active" : "stopped"}</p>

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

      <p>
        Selected microphone:{" "}
        {selectedDevice?.label ?? "No microphone selected"}
      </p>

      {!isMonitoring ? (
        <button
          disabled={
            !isSupported ||
            permissionState !== "granted" ||
            !selectedDeviceId
          }
          onClick={() => {
            void startMonitoring();
          }}
        >
          Start monitoring
        </button>
      ) : (
        <button
          onClick={() => {
            stopMonitoring();
          }}
        >
          Stop monitoring
        </button>
      )}

      <div
        aria-label="Microphone input level"
        aria-valuemax={1}
        aria-valuemin={0}
        aria-valuenow={level}
        className="microphone-level-meter"
        role="meter"
      >
        <div
          className="microphone-level-meter-fill"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>

      <MicSetupModal
        appOrigin={appOrigin}
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
        }}
        onRecheckSupport={() => {
          checkSupport();
          return useMicrophoneStore.getState().isSupported;
        }}
      />
    </section>
  );
}
