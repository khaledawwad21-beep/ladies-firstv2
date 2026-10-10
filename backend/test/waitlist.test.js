"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { normalizeStatus } = require("../src/waitlist");
const { registerWaitlistRoutes } = require("../src/waitlist");

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


test("customer account exposes authenticated waitlist history with clickable product cards", () => {
  const waitlist = fs.readFileSync(path.join(__dirname, "../src/waitlist.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
  assert.match(waitlist, /\/api\/waitlist\/mine/);
  assert.match(waitlist, /requireAuth/);
  assert.match(waitlist, /productImage/);
  assert.match(app, /function lfLoadMyWaitlist\(/);
  assert.match(app, /accountWaitlistHistory/);
  assert.match(app, /waitlistHistoryCard/);
  assert.match(app, /openAccountWaitlistProduct/);
});

test("storefront has one authoritative waitlist implementation", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
  const declarations = app.match(/async function joinWaitlist\s*\(/g) || [];
  assert.equal(declarations.length, 1, "joinWaitlist should be defined exactly once");
  assert.doesNotMatch(app, /lfOldJoinWaitlist/);
  assert.doesNotMatch(app, /joinWaitlist\s*=\s*async function/);
});


test("CI executes isolated waitlist restock PostgreSQL E2E", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "../../.github/workflows/production-regression.yml"),
    "utf8"
  );
  assert.match(workflow, /Run isolated waitlist restock E2E/);
  assert.match(workflow, /waitlist-e2e\.integration\.test\.js/);
});

test("duplicate waitlist response does not disclose the existing customer's identity", async () => {
  const routes = new Map();
  const app = {
    post: (route, ...handlers) => routes.set(`POST ${route}`, handlers),
    get: (route, ...handlers) => routes.set(`GET ${route}`, handlers)
  };
  const queries = [];
  const db = async (sql) => {
    queries.push(sql);
    if (sql.includes("FROM products")) {
      return { rows: [{ id: 7, name: "عطر", image_url: null, is_active: true }] };
    }
    if (sql.includes("INSERT INTO waitlist_requests")) {
      return { rows: [] };
    }
    throw new Error("Unexpected database query");
  };
  const pass = (_req, _res, next) => next();
  registerWaitlistRoutes(app, {
    db,
    requireAdmin: pass,
    requireAuth: pass,
    optionalAuth: pass,
    normalizePhone: (value) => String(value || "")
  });

  const handlers = routes.get("POST /api/waitlist");
  const handler = handlers[handlers.length - 1];
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await handler({
    body: { productId: 7, name: "مهاجمة", phone: "+972599999999", variant: "" },
    user: null
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.alreadyWaiting, true);
  assert.equal(res.body.request, null);
  assert.doesNotMatch(JSON.stringify(res.body), /مهاجمة|\+972599999999/);
  assert.equal(queries.filter(sql => sql.includes("FROM waitlist_requests")).length, 0);
});
