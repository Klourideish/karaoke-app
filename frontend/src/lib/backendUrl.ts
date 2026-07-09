const BACKEND_PORT = "3001";

type BackendUrlEnvironment = Record<string, string | undefined>;

interface BackendUrlLocation {
  protocol: string;
  hostname: string;
  origin: string;
}

export function shouldUseBackendProxy(
  environment: BackendUrlEnvironment,
): boolean {
  return environment.VITE_USE_BACKEND_PROXY === "true";
}

export function getApiBaseUrl(
  location: BackendUrlLocation,
  environment: BackendUrlEnvironment,
): string {
  if (shouldUseBackendProxy(environment)) {
    return location.origin;
  }

  return `${location.protocol}//${location.hostname}:${BACKEND_PORT}`;
}

export function getSocketBaseUrl(
  location: BackendUrlLocation,
  environment: BackendUrlEnvironment,
): string | undefined {
  if (shouldUseBackendProxy(environment)) {
    return undefined;
  }

  return getApiBaseUrl(location, environment);
}

export const API_BASE_URL = getApiBaseUrl(
  window.location,
  import.meta.env as BackendUrlEnvironment,
);

export const SOCKET_BASE_URL = getSocketBaseUrl(
  window.location,
  import.meta.env as BackendUrlEnvironment,
);

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
