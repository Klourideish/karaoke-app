import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import type { Song } from "shared";

import { libraryCache } from "./library/libraryCache";
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
  assignSingerSlotClient,
  selectSong,
  updateSingerSlotName,
  voteForSong,
} from "./session/sessionManager";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://localhost:5173",
  "http://192.168.1.78:5173",
  ...(process.env.FRONTEND_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

  socket.on(
    "clock-sync",
    (
      clientSentAt: number,
      respond?: (payload: {
        clientSentAt: number;
        serverTime: number;
      }) => void,
    ) => {
      respond?.({
        clientSentAt,
        serverTime: Date.now(),
      });
    },
  );

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

  socket.on(
    "add-to-queue",
    (
      payload:
        | Song
        | {
            song: Song;
            requesterName?: string | null;
          },
    ) => {
      const song =
        "song" in payload ? payload.song : payload;
      const requesterName =
        "song" in payload ? payload.requesterName ?? null : null;

      const added = addToQueue(
        song,
        "song" in payload ? clientId : null,
        requesterName,
      );

      if (added) {
        io.emit("sync-state", getSession());
      }
    },
  );

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

  socket.on(
    "update-singer-slot-name",
    (payload: { slotId: string; name: string }) => {
      const updated = updateSingerSlotName(
        payload.slotId,
        payload.name,
      );

      if (updated) {
        io.emit("sync-state", getSession());
      }
    },
  );

  socket.on(
    "assign-singer-slot",
    (payload: string | { slotId: string; clientName?: string }) => {
      const slotId =
        typeof payload === "string" ? payload : payload.slotId;
      const clientName =
        typeof payload === "string" ? undefined : payload.clientName;
      const assigned = assignSingerSlotClient(
        slotId,
        clientId,
        clientName,
      );

      if (assigned) {
        io.emit("sync-state", getSession());
      }
    },
  );

  socket.on("unassign-singer-slot", (slotId: string) => {
    const slot = getSession().singerSlots.find(
      (item) => item.id === slotId,
    );

    if (slot?.clientId !== clientId) {
      return;
    }

    const unassigned = assignSingerSlotClient(slotId, null);

    if (unassigned) {
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
  const librarySource = libraryCache.getSource();

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

  try {
    const library = await libraryCache.setRuntimeSource(requestedPath);

    res.json({
      path: library.path,
      source: library.source,
      songs: library.songs,
      count: library.songs.length,
    });
  } catch (error) {
    console.error("Failed to set library source:", error);

    res.status(400).json({
      error: "Failed to scan requested library path",
    });
  }
});

app.get("/library", async (_req, res) => {
  try {
    const library = await libraryCache.getLibrary();

    res.json({
      songs: library.songs,
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
    const library = await libraryCache.rescan();

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
  try {
    const song = await libraryCache.getSongById(req.params.songId);

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
  try {
    const song = await libraryCache.getSongById(req.params.songId);

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
server.listen(3001, "0.0.0.0", () => {
  console.log("🎤 Karaoke backend running on http://0.0.0.0:3001");
});
