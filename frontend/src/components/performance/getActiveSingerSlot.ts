import type { SingerSlot } from "../../types/session";

export function getActiveSingerSlot(
  requesterClientId: string | null,
  singerSlots: SingerSlot[],
): string | null {
  if (!requesterClientId) {
    return null;
  }

  return singerSlots.find(
    (slot) => slot.clientId === requesterClientId,
  )?.id ?? null;
}
