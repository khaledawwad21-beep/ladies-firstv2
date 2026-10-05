"use strict";

require("dotenv").config();

const express = require("express");
const tripoRouter = require("./tripo");
const { app: storeApp, initDatabase } = require("./server");
const { createRequestPolicyRouter } = require("./request-policy");
const { migrateDatabase } = require("./database-migrations");

const PORT = Number(process.env.PORT || 10000);
const gateway = express();

gateway.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "ladies-firstv2",
    tripoConfigured: Boolean(String(process.env.TRIPO_API_KEY || "").trim())
  });
});

gateway.use(
  "/api/tripo",
  express.json({ limit: "30mb" }),
  express.urlencoded({ extended: true, limit: "30mb" }),
  tripoRouter
);

/* Cross-cutting validation is applied once before the store routes. */
gateway.use(createRequestPolicyRouter());
gateway.use(storeApp);

gateway.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("[GATEWAY ERROR]", error);
  res.status(error.status || 500).json({
    ok: false,
    code: error.code || "INTERNAL_ERROR",
    message: error.message || "حدث خطأ غير متوقع",
    traceId: error.traceId || null
  });
});

async function start() {
  try {
    if (!String(process.env.JWT_SECRET || "").trim()) {
      throw new Error("JWT_SECRET is required in production");
    }
    if (!String(process.env.DATABASE_URL || "").trim()) {
      throw new Error("DATABASE_URL is required in production");
    }

    await initDatabase();
    await migrateDatabase();

    gateway.listen(PORT, "0.0.0.0", () => {
      console.log(`Ladies First production server running on port ${PORT}`);
      console.log(`[TRIPO] ${process.env.TRIPO_API_KEY ? "configured" : "not configured"}`);
    });
  } catch (error) {
    console.error("[SERVER START ERROR]", error);
    process.exit(1);
  }
}

start();
