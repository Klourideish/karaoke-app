import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "node:path";
import type { Song } from "shared";

import { scanLibrary } from "./library/scanLibrary";
import {
  addToQueue,
  getSession,
  pause,
  play,
  seek,
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
  console.log("Client connected:", socket.id);

  socket.emit("sync-state", getSession());

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
  const accepted = voteForSong(songId, socket.id);

  if (accepted) {
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
  const libraryPath = path.resolve(process.cwd(), "../music");

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

// ----- START SERVER -----
server.listen(3001, () => {
  console.log("🎤 Karaoke backend running on http://localhost:3001");
});