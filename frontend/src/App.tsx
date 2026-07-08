import { useEffect } from "react";
import { socket } from "./lib/socket";
import { useSessionStore } from "./stores/sessionStore";
import type { SessionState } from "./types/session";
import { useLibraryStore } from "./stores/libraryStore";
import { SongBrowser } from "./components/library/SongBrowser";
import { QueuePanel } from "./components/queue/QueuePanel";
import { AudioPlayer } from "./components/player/AudioPlayer";
import { LyricDisplay } from "./components/lyrics/LyricDisplay";
import "./App.css";

function App() {
  const socketConnected = useSessionStore((state) => state.socketConnected);
  const currentSong = useSessionStore((state) => state.currentSong);
  const isPlaying = useSessionStore((state) => state.isPlaying);
  const position = useSessionStore((state) => state.position);
  const queue = useSessionStore((state) => state.queue);

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

  return (
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

      <div className="app-layout">
        <aside className="operator-area">
          <SongBrowser />
          <QueuePanel />
        </aside>

        <section className="performance-area">
          <div className="karaoke-display-area">
            <LyricDisplay />
          </div>

          <div className="player-control-area">
            <AudioPlayer />

            <div className="manual-controls">
              <button onClick={handlePlay}>Play</button>
              <button onClick={handlePause}>Pause</button>
              <button onClick={handleSeekForward}>Seek +10s</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
