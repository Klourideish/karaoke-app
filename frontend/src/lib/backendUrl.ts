const BACKEND_PORT = "3001";

export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
