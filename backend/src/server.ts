import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "node:path";
import type { Song } from "shared";

import { scanLibrary } from "./library/scanLibrary";
import {
  addToQueue,
  advancePosition,
  clearAutoStartPending,
  finishPlayback,
  getSession,
  markPlaybackReady,
  pause,
  play,
  seek,
  selectSong,
  voteForSong,
} from "./session/sessionManager";

const app = express();
const server = http.createServer(app);


app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

let runtimeLibraryPath: string | null = null;

function getLibrarySource() {
  if (runtimeLibraryPath) {
    return {
      path: runtimeLibraryPath,
      source: "runtime" as const,
    };
  }

  if (process.env.MUSIC_DIR) {
    return {
      path: path.resolve(process.env.MUSIC_DIR),
      source: "MUSIC_DIR" as const,
    };
  }

  return {
    path: path.resolve(process.cwd(), "../music"),
    source: "fallback" as const,
  };
}

async function scanActiveLibrary() {
  const librarySource = getLibrarySource();
  const songs = await scanLibrary(librarySource.path);

  return {
    ...librarySource,
    songs,
  };
}

// ----- SOCKET LOGIC -----
io.on("connection", (socket) => {
  const clientId =
    typeof socket.handshake.auth.clientId === "string"
      ? socket.handshake.auth.clientId
      : socket.id;

  console.log("Client connected:", socket.id);

  socket.emit("sync-state", getSession());

  // rest of handlers...

  socket.on("play", () => {
    play();
    io.emit("sync-state", getSession());
  });

  socket.on("pause", () => {
    pause();
    io.emit("sync-state", getSession());
  });

  socket.on("seek", (position: number) => {
    seek(position);
    io.emit("sync-state", getSession());
  });

  socket.on("finish-playback", () => {
    finishPlayback();
    io.emit("sync-state", getSession());
  });

  socket.on("ready-for-playback", (songId: string) => {
    const session = getSession();

    if (songId !== session.currentSong?.id) {
      return;
    }

    markPlaybackReady();

    if (session.autoStartPending) {
      play();
      clearAutoStartPending();
    }

    io.emit("sync-state", getSession());
  });

  socket.on("add-to-queue", (song: Song) => {
    const added = addToQueue(song);

    if (added) {
      io.emit("sync-state", getSession());
    }
  });

  socket.on("vote", (songId: string) => {
  const accepted = voteForSong(songId, clientId);

  if (accepted) {
    io.emit("sync-state", getSession());
  }
});

socket.on("select-song", (songId: string) => {
  const selected = selectSong(songId);

  if (selected) {
    io.emit("sync-state", getSession());
  }
});

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ----- EXPRESS ROUTES -----
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "karaoke-backend",
  });
});

app.get("/library/source", (_req, res) => {
  const librarySource = getLibrarySource();

  res.json({
    path: librarySource.path,
    source: librarySource.source,
  });
});

app.post("/library/source", async (req, res) => {
  const requestedPath =
    typeof req.body?.path === "string" ? req.body.path : "";

  if (!requestedPath.trim()) {
    res.status(400).json({
      error: "Library path is required",
    });
    return;
  }

  const resolvedPath = path.resolve(requestedPath);

  try {
    const songs = await scanLibrary(resolvedPath);
    runtimeLibraryPath = resolvedPath;

    res.json({
      path: resolvedPath,
      source: "runtime",
      songs,
      count: songs.length,
    });
  } catch (error) {
    console.error("Failed to set library source:", error);

    res.status(400).json({
      error: "Failed to scan requested library path",
    });
  }
});

app.get("/library", async (_req, res) => {
  const librarySource = getLibrarySource();
  console.log("Scanning library path:", librarySource.path);

  try {
    const songs = await scanLibrary(librarySource.path);

    res.json({
      songs,
    });
  } catch (error) {
    console.error("Failed to scan library:", error);

    res.status(500).json({
      error: "Failed to scan library",
    });
  }
});

app.post("/library/rescan", async (_req, res) => {
  try {
    const library = await scanActiveLibrary();

    res.json({
      path: library.path,
      source: library.source,
      songs: library.songs,
      count: library.songs.length,
    });
  } catch (error) {
    console.error("Failed to rescan library:", error);

    res.status(500).json({
      error: "Failed to rescan library",
    });
  }
});

app.get("/media/audio/:songId", async (req, res) => {
  const librarySource = getLibrarySource();

  try {
    const songs = await scanLibrary(librarySource.path);

    const song = songs.find(
      (item) => item.id === req.params.songId,
    );

    if (!song) {
      res.status(404).json({
        error: "Song not found",
      });
      return;
    }

    res.sendFile(song.audioPath);
  } catch (error) {
    console.error("Failed to serve audio:", error);

    res.status(500).json({
      error: "Failed to serve audio",
    });
  }
});

app.get("/media/lyrics/:songId", async (req, res) => {
  const librarySource = getLibrarySource();

  try {
    const songs = await scanLibrary(librarySource.path);

    const song = songs.find(
      (item) => item.id === req.params.songId,
    );

    if (!song) {
      res.status(404).json({
        error: "Song not found",
      });
      return;
    }

    res.type("application/ttml+xml");
    res.sendFile(song.lyricPath);
  } catch (error) {
    console.error("Failed to serve lyrics:", error);

    res.status(500).json({
      error: "Failed to serve lyrics",
    });
  }
});
const CLOCK_INTERVAL_MS = 1000;

setInterval(() => {
  advancePosition(CLOCK_INTERVAL_MS / 1000);
  io.emit("sync-state", getSession());
}, CLOCK_INTERVAL_MS);
// ----- START SERVER -----
server.listen(3001, () => {
  console.log("🎤 Karaoke backend running on http://localhost:3001");
});
