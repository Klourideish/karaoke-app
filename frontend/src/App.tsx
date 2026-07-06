import { useEffect } from "react";
import { socket } from "./lib/socket";
import { useSessionStore } from "./stores/sessionStore";
import type { SessionState } from "./types/session";

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
    <main>
      <h1>Karaoke System</h1>

      <p>Backend: {socketConnected ? "Connected" : "Disconnected"}</p>
      <p>Current song: {currentSong ?? "No song selected"}</p>
      <p>Playback: {isPlaying ? "Playing" : "Paused"}</p>
      <p>Position: {position} seconds</p>
      <p>Queue size: {queue.length}</p>

      <button onClick={handlePlay}>Play</button>
      <button onClick={handlePause}>Pause</button>
      <button onClick={handleSeekForward}>Seek +10s</button>
    </main>
  );
}

export default App;