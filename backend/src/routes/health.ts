import { Express } from "express";

export function registerHealthRoute(app: Express) {
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "karaoke-backend"
    });
  });
}