export const CHROMIUM_INSECURE_ORIGIN_FLAG_URL =
  "chrome://flags/#unsafely-treat-insecure-origin-as-secure";

interface MicrophoneSetupEnvironment {
  protocol: string;
  hostname: string;
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
}

export function getCurrentAppOrigin(
  location: Pick<Location, "origin">,
): string {
  return location.origin;
}

export function isLocalhostHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1" ||
    normalizedHostname === "[::1]"
  );
}

export function shouldShowInsecureLanMicSetup(
  environment: MicrophoneSetupEnvironment,
): boolean {
  if (
    environment.protocol !== "http:" ||
    isLocalhostHostname(environment.hostname)
  ) {
    return false;
  }

  return (
    !environment.isSecureContext || !environment.hasGetUserMedia
  );
}
