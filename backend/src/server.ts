import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

interface QueueItem {
  title: string;
  artist: string;
  votes: number;
}

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ----- GLOBAL SESSION STATE -----
const session = {
  currentSong: null as string | null,
  isPlaying: false,
  position: 0,
  queue: [] as QueueItem[],
};

// ----- SOCKET LOGIC -----
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send current state immediately
  socket.emit("sync-state", session);

  socket.on("play", () => {
    session.isPlaying = true;
    io.emit("sync-state", session);
  });

  socket.on("pause", () => {
    session.isPlaying = false;
    io.emit("sync-state", session);
  });

  socket.on("seek", (pos: number) => {
    session.position = pos;
    io.emit("sync-state", session);
  });

  socket.on("add-to-queue", (song) => {
    session.queue.push({
      ...song,
      votes: 0,
    });

    io.emit("sync-state", session);
  });

  socket.on("vote", (index: number) => {
    if (session.queue[index]) {
      session.queue[index].votes++;
      session.queue.sort((a, b) => b.votes - a.votes);
    }

    io.emit("sync-state", session);
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

// ----- START SERVER -----
server.listen(3001, () => {
  console.log("🎤 Karaoke backend running on http://localhost:3001");
});