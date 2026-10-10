"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHealthHandler } = require("../src/health-handler");

async function invoke(getDatabaseStatus) {
  const handler = createHealthHandler({
    getDatabaseStatus,
    env: {
      RENDER_GIT_COMMIT: "abc123",
      RENDER_GIT_BRANCH: "main",
      TRIPO_API_KEY: "configured"
    }
  });
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler({}, res);
  return res;
}

test("health handler reports healthy only when the database is configured and connected", async () => {
  const response = await invoke(async () => ({
    configured: true,
    connected: true,
    serverTime: "2026-10-10T00:00:00.000Z"
  }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.database, true);
  assert.equal(response.body.gitCommit, "abc123");
  assert.equal(response.body.tripoConfigured, true);
});

test("health handler returns 503 when the database is unavailable", async () => {
  const response = await invoke(async () => ({
    configured: true,
    connected: false,
    serverTime: null
  }));
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.database, false);
});

test("health handler safely reports database status failures", async () => {
  const response = await invoke(async () => {
    throw new Error("database offline");
  });
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.databaseConfigured, false);
});
