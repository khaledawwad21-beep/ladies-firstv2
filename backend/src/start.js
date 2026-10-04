"use strict";

require("dotenv").config();

const { app, initDatabase } = require("./server");

const PORT = Number(process.env.PORT || 10000);

/*
 * Single production entrypoint.
 * All middleware and routes are owned by server.js so integrations are mounted
 * before the SPA fallback, 404 handler and global error handler.
 */
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
