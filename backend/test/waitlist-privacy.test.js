"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { registerWaitlistRoutes } = require("../src/waitlist");

test("duplicate waitlist response keeps request metadata but hides name and phone", async () => {
  const routes = new Map();
  const app = {
    post: (route, ...handlers) => routes.set("POST " + route, handlers),
    get: (route, ...handlers) => routes.set("GET " + route, handlers),
    patch: (route, ...handlers) => routes.set("PATCH " + route, handlers)
  };
  const queries = [];
  const db = async (sql) => {
    queries.push(sql);
    if (sql.includes("FROM products")) {
      return { rows: [{ id: 7, name: "عطر", image_url: null, is_active: true }] };
    }
    if (sql.includes("INSERT INTO waitlist_requests")) return { rows: [] };
    if (sql.includes("FROM waitlist_requests")) {
      return { rows: [{ id: 12, productId: 7, variant: "وردي", status: "waiting", createdAt: "2026-10-10T00:00:00.000Z" }] };
    }
    throw new Error("Unexpected database query");
  };
  const pass = (_req, _res, next) => next();
  registerWaitlistRoutes(app, { db, requireAdmin: pass, requireAuth: pass, optionalAuth: pass, normalizePhone: value => String(value || "") });
  const handlers = routes.get("POST /api/waitlist");
  const handler = handlers[handlers.length - 1];
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ body: { productId: 7, name: "Victim Name", phone: "+972599999999", variant: "وردي" }, user: null }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.alreadyWaiting, true);
  assert.equal(Number(res.body.request.id), 12);
  assert.equal(res.body.request.status, "waiting");
  const response = JSON.stringify(res.body);
  assert.equal(response.includes("Victim Name"), false);
  assert.equal(response.includes("+972599999999"), false);
  const lookup = queries.find(sql => sql.includes("FROM waitlist_requests"));
  assert.ok(lookup);
  assert.equal(lookup.includes("customer_name"), false);
  assert.equal(lookup.includes("\n            phone,"), false);
});
