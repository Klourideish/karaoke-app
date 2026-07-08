import { LyricDisplay } from "../lyrics/LyricDisplay";
import { getClientId } from "../../lib/clientIdentity";
import { useSessionStore } from "../../stores/sessionStore";
import type { SingerSlot } from "../../types/session";

const currentClientId = getClientId();

export function PerformanceStage() {
  const singerSlots = useSessionStore((state) => state.singerSlots);
  const currentSongRequestedByName = useSessionStore(
    (state) => state.currentSongRequestedByName,
  );

  const singerOne = singerSlots.find(
    (slot) => slot.id === "singer-1",
  );
  const singerTwo = singerSlots.find(
    (slot) => slot.id === "singer-2",
  );

  return (
    <section className="performance-stage">
      <PerformerPanel
        slot={singerOne}
        fallbackName="Singer 1"
        side="left"
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
      />
    </section>
  );
}

interface PerformerPanelProps {
  slot: SingerSlot | undefined;
  fallbackName: string;
  side: "left" | "right";
}

function PerformerPanel({
  slot,
  fallbackName,
  side,
}: PerformerPanelProps) {
  const isAssigned = slot?.clientId !== null && slot?.clientId !== undefined;
  const isCurrentClient = slot?.clientId === currentClientId;

  return (
    <aside
      className={[
        "performer-panel",
        `performer-panel-${side}`,
        isAssigned ? "performer-panel-assigned" : "",
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
