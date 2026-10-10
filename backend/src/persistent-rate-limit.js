"use strict";

const crypto = require("node:crypto");

function createPersistentRateLimiter({ db, secret, now = Date.now } = {}) {
  if (typeof db !== "function") {
    throw new TypeError("A database query function is required");
  }
  const signingSecret = String(secret || "").trim();
  if (!signingSecret) {
    throw new TypeError("A rate-limit signing secret is required");
  }

  return async function consumeRateLimit({ scope, clientId, limit, windowMs } = {}) {
    const normalizedScope = String(scope || "").trim();
    const normalizedClient = String(clientId || "").trim();
    const maxRequests = Number(limit);
    const durationMs = Number(windowMs);
    const timestamp = Number(now());

    if (
      !normalizedScope ||
      !normalizedClient ||
      !Number.isSafeInteger(maxRequests) ||
      maxRequests < 1 ||
      !Number.isSafeInteger(durationMs) ||
      durationMs < 1 ||
      !Number.isFinite(timestamp)
    ) {
      throw new TypeError("Invalid rate-limit parameters");
    }

    const windowStartMs = Math.floor(timestamp / durationMs) * durationMs;
    const windowEndMs = windowStartMs + durationMs;
    const bucketKey = crypto
      .createHmac("sha256", signingSecret)
      .update(normalizedScope + "\0" + durationMs + "\0" + normalizedClient)
      .digest("hex");

    const result = await db(
      `
      WITH expired AS (
        DELETE FROM rate_limit_counters
        WHERE expires_at <= NOW()
      )
      INSERT INTO rate_limit_counters
        (bucket_key, window_start, request_count, max_count, expires_at)
      VALUES ($1, $2, 1, $4, $3)
      ON CONFLICT (bucket_key, window_start)
      DO UPDATE SET
        request_count = LEAST(rate_limit_counters.request_count + 1, EXCLUDED.max_count + 1),
        max_count = EXCLUDED.max_count,
        expires_at = EXCLUDED.expires_at
      RETURNING request_count
      `,
      [bucketKey, new Date(windowStartMs), new Date(windowEndMs), maxRequests]
    );

    const count = Number(result.rows?.[0]?.request_count);
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new Error("Rate-limit counter did not return a valid count");
    }

    return {
      allowed: count <= maxRequests,
      retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - timestamp) / 1000)),
      requestCount: count
    };
  };
}

module.exports = { createPersistentRateLimiter };
