"use strict";

require("dotenv").config();

const express = require("express");
const tripoRouter = require("./tripo");
const { app: ladiesFirstApp, initDatabase } = require("./server");

const app = express();
const PORT = Number(process.env.PORT || 10000);

// Tripo routes are mounted on the parent app before the existing Ladies First
// application. This avoids modifying the large production server.js file.
app.use(express.json({ limit: "5mb" }));
app.use("/api/tripo", tripoRouter);
app.use(ladiesFirstApp);

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Ladies First + Tripo v3 running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[SERVER START ERROR]", error);
    process.exit(1);
  }
}

start();
