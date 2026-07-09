import { useEffect, useState } from "react";
import { socket } from "./lib/socket";
import { useSessionStore } from "./stores/sessionStore";
import { usePlaybackClockStore } from "./stores/playbackClockStore";
import type { SessionState } from "./types/session";
import { useLibraryStore } from "./stores/libraryStore";
import { SongBrowser } from "./components/library/SongBrowser";
import { QueuePanel } from "./components/queue/QueuePanel";
import { AudioPlayer } from "./components/player/AudioPlayer";
import { PerformanceStage } from "./components/performance/PerformanceStage";
import { SongContextPanel } from "./components/performance/SongContextPanel";
import { getClientId, getClientName } from "./lib/clientIdentity";
import "./App.css";

const currentClientId = getClientId();
const currentClientName = getClientName();
type SidebarTab = "library" | "player";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("library");
  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const queue = useSessionStore((state) => state.queue);
  const singerSlots = useSessionStore((state) => state.singerSlots);
  const playbackPosition = usePlaybackClockStore(
    (state) => state.position,
  );

  const setSocketConnected = useSessionStore(
    (state) => state.setSocketConnected,
  );

  const setSession = useSessionStore((state) => state.setSession);
  const fetchLibrary = useLibraryStore((state) => state.fetchLibrary);

  useEffect(() => {
    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleSyncState = (session: SessionState) => {
      setSession(session);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("sync-state", handleSyncState);

    if (socket.connected) {
      setSocketConnected(true);
    }

    // Fetch the song library when App loads
    fetchLibrary();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("sync-state", handleSyncState);
    };
  }, [setSession, setSocketConnected]);

  const handleClaimSingerSlot = (slotId: string) => {
    socket.emit("assign-singer-slot", {
      slotId,
      clientName: currentClientName,
    });
  };

  const handleReleaseSingerSlot = (slotId: string) => {
    socket.emit("unassign-singer-slot", slotId);
  };

  const handleTogglePlayback = () => {
    socket.emit(isPlaying ? "pause" : "play");
  };

  return (
    <div className="app-frame">
      <aside
        className={[
          "app-sidebar",
          isSidebarOpen ? "app-sidebar-open" : "app-sidebar-closed",
        ].join(" ")}
      >
        <div className="sidebar-tabs">
          <button
            className={
              activeSidebarTab === "library" ? "sidebar-tab-active" : ""
            }
            onClick={() => {
              setActiveSidebarTab("library");
              setIsSidebarOpen(true);
            }}
          >
            Library
          </button>
          <button
            className={
              activeSidebarTab === "player" ? "sidebar-tab-active" : ""
            }
            onClick={() => {
              setActiveSidebarTab("player");
              setIsSidebarOpen(true);
            }}
          >
            Player
          </button>
          <button
            onClick={() => {
              setIsSidebarOpen((value) => !value);
            }}
          >
            {isSidebarOpen ? "Close" : "Open"}
          </button>
        </div>

        <div className="sidebar-content">
          <div
            className={[
              "sidebar-panel",
              activeSidebarTab === "library"
                ? "sidebar-panel-active"
                : "sidebar-panel-hidden",
            ].join(" ")}
          >
            <SongBrowser />
          </div>

          <div
            className={[
              "sidebar-panel",
              activeSidebarTab === "player"
                ? "sidebar-panel-active"
                : "sidebar-panel-hidden",
            ].join(" ")}
          >
            <AudioPlayer />
          </div>
        </div>
      </aside>

      <main className="app-shell">
        <header className="app-status">
          <div>
            <h1>Karaoke System</h1>
          </div>

          <div className="host-status-panel">
            <span>
              Current:{" "}
              {currentSong
                ? `${currentSong.artist} - ${currentSong.title}`
                : "No song selected"}
            </span>
            <span className="host-status-separator">|</span>
            <span>{formatPlaybackTime(playbackPosition)}</span>
            <span className="host-status-separator">|</span>
            <span>Queue: {queue.length}</span>
            <span className="host-status-separator">|</span>
            <button onClick={handleTogglePlayback}>
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </header>

        <section className="performance-area">
          <section className="singer-slots-area">
            <h2>Singers</h2>

            <ul className="singer-slot-list">
              {singerSlots.map((slot) => {
                const isAssigned = slot.clientId !== null;
                const isOwnedByCurrentClient =
                  slot.clientId === currentClientId;

                return (
                  <li key={slot.id}>
                    <strong>{slot.name}</strong>
                    <span>
                      {isAssigned ? "Assigned" : "Unassigned"}
                    </span>
                    {isOwnedByCurrentClient && <span>(you)</span>}
                    {!isAssigned && (
                      <button
                        onClick={() => {
                          handleClaimSingerSlot(slot.id);
                        }}
                      >
                        Claim
                      </button>
                    )}
                    {isOwnedByCurrentClient && (
                      <button
                        onClick={() => {
                          handleReleaseSingerSlot(slot.id);
                        }}
                      >
                        Release
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="context-and-queue-area">
            <SongContextPanel />
            <QueuePanel />
          </div>

          <PerformanceStage />
        </section>
      </main>
    </div>
  );
}

export default App;

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}
