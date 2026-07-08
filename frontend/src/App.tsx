import { useEffect, useState } from "react";
import { socket } from "./lib/socket";
import { useSessionStore } from "./stores/sessionStore";
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

function App() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const socketConnected = useSessionStore((state) => state.socketConnected);
  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const position = useSessionStore((state) => state.position);
  const queue = useSessionStore((state) => state.queue);
  const singerSlots = useSessionStore((state) => state.singerSlots);

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

  const handlePlay = () => {
    socket.emit("play");
  };

  const handlePause = () => {
    socket.emit("pause");
  };

  const handleSeekForward = () => {
    socket.emit("seek", position + 10);
  };

  const handleClaimSingerSlot = (slotId: string) => {
    socket.emit("assign-singer-slot", {
      slotId,
      clientName: currentClientName,
    });
  };

  const handleReleaseSingerSlot = (slotId: string) => {
    socket.emit("unassign-singer-slot", slotId);
  };

  return (
    <div className="app-frame">
      <aside
        className={[
          "library-sidebar",
          isLibraryOpen ? "library-sidebar-open" : "library-sidebar-closed",
        ].join(" ")}
      >
        <button
          className="library-sidebar-toggle"
          onClick={() => {
            setIsLibraryOpen((value) => !value);
          }}
        >
          ☰ Library
        </button>

        {isLibraryOpen && (
          <div className="library-sidebar-content">
            <SongBrowser />
          </div>
        )}
      </aside>

      <main className="app-shell">
        <header className="app-status">
          <div>
            <h1>Karaoke System</h1>
            <p>Backend: {socketConnected ? "Connected" : "Disconnected"}</p>
          </div>

          <div className="status-details">
            <p>
              Current song:{" "}
              {currentSong
                ? `${currentSong.artist} - ${currentSong.title}`
                : "No song selected"}
            </p>
            <p>Playback: {isPlaying ? "Playing" : "Paused"}</p>
            <p>Position: {position} seconds</p>
            <p>Queue size: {queue.length}</p>
          </div>
        </header>

        <section className="performance-area">
          <section className="singer-slots-area">
            <h2>Singers</h2>

            <ul>
              {singerSlots.map((slot) => {
                const isAssigned = slot.clientId !== null;
                const isOwnedByCurrentClient =
                  slot.clientId === currentClientId;

                return (
                  <li key={slot.id}>
                    <span>
                      {slot.name} -{" "}
                      {isAssigned ? "Assigned" : "Unassigned"}
                      {isOwnedByCurrentClient && " (you)"}
                    </span>
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

          <div className="player-control-area">
            <AudioPlayer />

            <div className="manual-controls">
              <button onClick={handlePlay}>Play</button>
              <button onClick={handlePause}>Pause</button>
              <button onClick={handleSeekForward}>Seek +10s</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
