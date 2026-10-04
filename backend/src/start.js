"use strict";

require("dotenv").config();

const express = require("express");
const tripoRouter = require("./tripo");
const { app, initDatabase } = require("./server");

const PORT = Number(process.env.PORT || 10000);

/*
 * Production has one Express application only: the app exported by server.js.
 * start.js owns process startup and mounts integrations that are intentionally
 * separate from the core store. This avoids nesting one Express app inside
 * another and removes duplicate body parsers/static/admin routing.
 */

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "ladies-firstv2" });
});

app.use(
  "/api/tripo",
  express.json({ limit: "30mb" }),
  express.urlencoded({ extended: true, limit: "30mb" }),
  tripoRouter
);

async function start() {
  try {
    if (!String(process.env.JWT_SECRET || "").trim()) {
      throw new Error("JWT_SECRET is required in production");
    }
    if (!String(process.env.DATABASE_URL || "").trim()) {
      throw new Error("DATABASE_URL is required in production");
    }

    await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Ladies First production server running on port ${PORT}`);
      console.log(`[TRIPO] ${process.env.TRIPO_API_KEY ? "configured" : "not configured"}`);
    });
  } catch (error) {
    console.error("[SERVER START ERROR]", error);
    process.exit(1);
  }
}

start();
