"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");
const { createPersistentRateLimiter } = require("../src/persistent-rate-limit");

const database = new PGlite();
const db = (sql, params) => database.query(sql, params);
let nowMs;

before(async () => {
  await database.exec(`
    CREATE TABLE rate_limit_counters (
      bucket_key TEXT NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      request_count INTEGER NOT NULL CHECK (request_count >= 0),
      max_count INTEGER NOT NULL CHECK (max_count > 0),
      expires_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (bucket_key, window_start)
    );
    CREATE INDEX rate_limit_counters_expires_idx ON rate_limit_counters(expires_at);
  `);
  nowMs = Date.now();
});

after(async () => {
  await database.close();
});

test("separate service instances share one persistent request counter", async () => {
  const options = { db, secret: "test-rate-limit-secret-that-is-long-enough", now: () => nowMs };
  const firstInstance = createPersistentRateLimiter(options);
  const secondInstance = createPersistentRateLimiter(options);
  const request = { scope: "naya-chat", clientId: "203.0.113.42", limit: 2, windowMs: 60000 };

  assert.equal((await firstInstance(request)).allowed, true);
  assert.equal((await secondInstance(request)).allowed, true);
  const blocked = await firstInstance(request);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.equal(blocked.requestCount, 3);
});

test("counters reset at the next shared window boundary", async () => {
  const limiter = createPersistentRateLimiter({
    db,
    secret: "test-rate-limit-secret-that-is-long-enough",
    now: () => nowMs
  });
  const request = { scope: "auth-login", clientId: "203.0.113.17", limit: 1, windowMs: 1000 };

  assert.equal((await limiter(request)).allowed, true);
  assert.equal((await limiter(request)).allowed, false);
  nowMs = (Math.floor(nowMs / 1000) + 1) * 1000 + 1;
  assert.equal((await limiter(request)).allowed, true);
});

test("database stores an HMAC bucket key rather than the client address", async () => {
  const result = await db("SELECT bucket_key FROM rate_limit_counters LIMIT 1");
  assert.equal(result.rows.length, 1);
  assert.match(result.rows[0].bucket_key, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(result.rows[0].bucket_key, /203\.0\.113\./);
});
