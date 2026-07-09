import { LyricDisplay } from "../lyrics/LyricDisplay";
import { getClientId } from "../../lib/clientIdentity";
import { useSessionStore } from "../../stores/sessionStore";
import type { SingerSlot } from "../../types/session";
import { getActiveSingerSlot } from "./getActiveSingerSlot";

const currentClientId = getClientId();

export function PerformanceStage() {
  const singerSlots = useSessionStore((state) => state.singerSlots);
  const currentSongRequestedByClientId = useSessionStore(
    (state) => state.currentSongRequestedByClientId,
  );
  const currentSongRequestedByName = useSessionStore(
    (state) => state.currentSongRequestedByName,
  );

  const singerOne = singerSlots.find(
    (slot) => slot.id === "singer-1",
  );
  const singerTwo = singerSlots.find(
    (slot) => slot.id === "singer-2",
  );
  const activeSingerSlotId = getActiveSingerSlot(
    currentSongRequestedByClientId,
    singerSlots,
  );

  return (
    <section className="performance-stage">
      <PerformerPanel
        slot={singerOne}
        fallbackName="Singer 1"
        side="left"
        isActive={activeSingerSlotId === "singer-1"}
      />

      <div className="performance-lyrics">
        {currentSongRequestedByName && (
          <p className="performance-requester">
            Requested by {currentSongRequestedByName}
          </p>
        )}
        <LyricDisplay />
      </div>

      <PerformerPanel
        slot={singerTwo}
        fallbackName="Singer 2"
        side="right"
        isActive={activeSingerSlotId === "singer-2"}
      />
    </section>
  );
}

interface PerformerPanelProps {
  slot: SingerSlot | undefined;
  fallbackName: string;
  side: "left" | "right";
  isActive: boolean;
}

function PerformerPanel({
  slot,
  fallbackName,
  side,
  isActive,
}: PerformerPanelProps) {
  const isAssigned = slot?.clientId !== null && slot?.clientId !== undefined;
  const isCurrentClient = slot?.clientId === currentClientId;

  return (
    <aside
      className={[
        "performer-panel",
        `performer-panel-${side}`,
        isAssigned ? "performer-panel-assigned" : "",
        isActive ? "performer-panel-active" : "",
      ].join(" ")}
    >
      <h2>{slot?.name ?? fallbackName}</h2>
      <p>
        {isAssigned ? "Assigned" : "Unassigned"}
        {isCurrentClient && " (you)"}
      </p>
    </aside>
  );
}
