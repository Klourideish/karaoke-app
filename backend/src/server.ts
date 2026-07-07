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
  getSession,
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

app.get("/library", async (_req, res) => {
  const libraryPath = process.env.MUSIC_DIR
  ? path.resolve(process.env.MUSIC_DIR)
  : path.resolve(process.cwd(), "../music");
  console.log("Scanning library path:", libraryPath);

  app.get("/media/audio/:songId", async (req, res) => {
  const libraryPath = process.env.MUSIC_DIR
    ? path.resolve(process.env.MUSIC_DIR)
    : path.resolve(process.cwd(), "../music");

  try {
    const songs = await scanLibrary(libraryPath);

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

  try {
    const songs = await scanLibrary(libraryPath);

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
const CLOCK_INTERVAL_MS = 1000;

setInterval(() => {
  advancePosition(CLOCK_INTERVAL_MS / 1000);
  io.emit("sync-state", getSession());
}, CLOCK_INTERVAL_MS);
// ----- START SERVER -----
server.listen(3001, () => {
  console.log("🎤 Karaoke backend running on http://localhost:3001");
});