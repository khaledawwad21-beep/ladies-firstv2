"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { normalizeStatus } = require("../src/waitlist");

test("waitlist status accepts only supported states", () => {
  assert.equal(normalizeStatus("waiting"), "waiting");
  assert.equal(normalizeStatus("NOTIFIED"), "notified");
  assert.equal(normalizeStatus(" closed "), "closed");
  assert.equal(normalizeStatus("deleted"), null);
  assert.equal(normalizeStatus(""), null);
});

test("server initializes and registers persistent waitlist", () => {
  const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  assert.match(server, /require\(['"]\.\/waitlist['"]\)\.initWaitlist\(db\)/);
  assert.match(server, /registerWaitlistRoutes\(app/);
});

test("storefront waitlist uses backend API instead of local-only storage", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
  const start = app.indexOf("async function joinWaitlist");
  const end = app.indexOf("function openPolicy", start);
  assert.ok(start >= 0 && end > start, "joinWaitlist function must exist");
  const source = app.slice(start, end);
  assert.match(source, /lfFetch\(['"]\/api\/waitlist['"]/);
  assert.doesNotMatch(source, /lf_waitlist/);
});
