const CLIENT_ID_STORAGE_KEY = "karaoke-client-id";
const CLIENT_NAME_STORAGE_KEY = "karaoke-client-name";

export function getClientId(): string {
  const existingClientId = localStorage.getItem(
    CLIENT_ID_STORAGE_KEY,
  );

  if (existingClientId) {
    return existingClientId;
  }

  const newClientId = crypto.randomUUID();

  localStorage.setItem(
    CLIENT_ID_STORAGE_KEY,
    newClientId,
  );

  return newClientId;
}

export function getClientName(): string {
  const existingClientName = localStorage.getItem(
    CLIENT_NAME_STORAGE_KEY,
  );

  if (existingClientName) {
    return existingClientName;
  }

  const promptedName = window.prompt("Enter your display name");
  const clientName = promptedName?.trim() || "Guest";

  setClientName(clientName);

  return clientName;
}

export function setClientName(clientName: string): void {
  localStorage.setItem(
    CLIENT_NAME_STORAGE_KEY,
    clientName,
  );
}
