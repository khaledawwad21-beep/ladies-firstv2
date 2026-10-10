"use strict";

require("dotenv").config();

/* Legacy route modules use this shared factory. Define it before server.js is loaded. */
global.createHttpError = function createHttpError(status, code, message) {
  const error = new Error(message || "حدث خطأ غير متوقع");
  error.status = Number(status) || 500;
  error.code = code || "INTERNAL_ERROR";
  return error;
};

const fs = require("fs");
const path = require("path");
const express = require("express");
const tripoRouter = require("./tripo");
const { app: storeApp, initDatabase } = require("./server");
const { createRequestPolicyRouter } = require("./request-policy");
const { migrateDatabase } = require("./database-migrations");
const { db, getDatabaseStatus } = require("./db");
const { startWhatsAppAutomation } = require("./whatsapp-automation");

const PORT = Number(process.env.PORT || 10000);
const gateway = express();
gateway.set("trust proxy", 1);
gateway.use(require("./security-policy").createSecurityPolicy({ db }));
const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

/*
 * Keep the browser-side account policy aligned with the production API.
 * app.js is an old bundled storefront file, so this compatibility route is
 * intentionally owned by the gateway until that bundle is split into modules.
 */
gateway.get("/app.js", (req, res, next) => {
  try {
    const filename = path.join(FRONTEND_DIR, "app.js");
    let source = fs.readFileSync(filename, "utf8");
    source = source
      .replace('minlength="4" placeholder="كلمة المرور"', 'minlength="12" placeholder="كلمة المرور — 12 خانة على الأقل"')
      .replace("if(password.length<8)return alert('كلمة المرور يجب أن تكون 8 أحرف/أرقام على الأقل');", "if(password.length<12)return alert('كلمة المرور يجب أن تكون 12 خانة على الأقل');");
    res.type("application/javascript; charset=utf-8");
    res.set("Cache-Control", "no-cache");
    return res.send(source);
  } catch (error) {
    return next(error);
  }
});

gateway.get(
  "/api/health",
  require("./health-handler").createHealthHandler({ getDatabaseStatus })
);

gateway.use(
  "/api/tripo",
  express.json({ limit: "30mb" }),
  express.urlencoded({ extended: true, limit: "30mb" }),
  tripoRouter
);

gateway.use(createRequestPolicyRouter());
gateway.use(storeApp);

gateway.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("[GATEWAY ERROR]", error);
  res.status(error.status || 500).json({
    ok: false,
    code: error.code || "INTERNAL_ERROR",
    message: (error.status && error.status < 500) ? error.message : "حدث خطأ غير متوقع",
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
    startWhatsAppAutomation(db);

    gateway.listen(PORT, "0.0.0.0", () => {
      console.log(`Ladies First production server running on port ${PORT}`);
      console.log(`[TRIPO] ${process.env.TRIPO_API_KEY ? "configured" : "not configured"}`);
    });
  } catch (error) {
    console.error("[SERVER START ERROR]", error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { gateway, start };
