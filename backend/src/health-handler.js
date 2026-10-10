"use strict";

function createHealthHandler({ getDatabaseStatus, env = process.env }) {
  if (typeof getDatabaseStatus !== "function") {
    throw new TypeError("getDatabaseStatus must be a function");
  }

  return async function healthHandler(_req, res) {
    let status = null;
    try {
      status = await getDatabaseStatus();
    } catch {
      status = null;
    }

    const databaseConfigured = status?.configured === true;
    const databaseConnected = status?.connected === true;
    const healthy = databaseConfigured && databaseConnected;

    return res.status(healthy ? 200 : 503).json({
      ok: healthy,
      service: "ladies-firstv2",
      server: true,
      database: databaseConnected,
      databaseConfigured,
      serverTime: status?.serverTime || null,
      gitCommit: String(env.RENDER_GIT_COMMIT || "").trim() || null,
      gitBranch: String(env.RENDER_GIT_BRANCH || "").trim() || null,
      tripoConfigured: Boolean(String(env.TRIPO_API_KEY || "").trim())
    });
  };
}

module.exports = { createHealthHandler };
