"use strict";

require("dotenv").config();

const express = require("express");
const tripoRouter = require("./tripo");
const { app: ladiesFirstApp, initDatabase } = require("./server");

const app = express();
const PORT = Number(process.env.PORT || 10000);

// Render health check is intentionally independent of auth/database/Tripo.
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "ladies-firstv2" });
});

// Canonical admin entry: users always see the login/session check first.
// After successful verification admin-login.html opens the actual panel with
// ?panel=1, which is then served by the existing Ladies First application.
app.get(["/admin", "/admin/", "/admin.html"], (req, res, next) => {
  if (String(req.query.panel || "") === "1") return next();
  return res.redirect(302, "/admin-login.html");
});

// Multi-view may contain four images. Tripo accepts up to 20MB per image and
// base64 adds ~33%, so the previous 30MB request limit could reject a valid
// multi-view request before it ever reached the Tripo router.
app.use(express.json({ limit: "110mb" }));
app.use(express.urlencoded({ extended: true, limit: "110mb" }));

// Credit-consuming Tripo endpoints are protected by requireAdmin in tripo.js.
app.use("/api/tripo", tripoRouter);

// Existing Ladies First API + static frontend.
app.use(ladiesFirstApp);

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Ladies First + Tripo v2/openapi running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[SERVER START ERROR]", error);
    process.exit(1);
  }
}

start();
