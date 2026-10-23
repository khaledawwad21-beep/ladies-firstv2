"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");
const { initStaffMessages, registerStaffMessageRoutes } = require("../src/staff-messages");

function createRouter() {
  const routes = new Map();
  return {
    routes,
    get(path, ...handlers) { routes.set(`GET ${path}`, handlers.at(-1)); },
    post(path, ...handlers) { routes.set(`POST ${path}`, handlers.at(-1)); },
    patch(path, ...handlers) { routes.set(`PATCH ${path}`, handlers.at(-1)); }
  };
}

async function call(router, method, path, user, body = {}) {
  const handler = router.routes.get(`${method} ${path}`);
  assert.ok(handler, `Missing ${method} ${path}`);
  let statusCode = 200;
  let payload;
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; }
  };
  await handler({ user, body }, res);
  return { statusCode, payload };
}

test("staff messages persist read receipts and remain available in history", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const db = (sql, params = []) => pg.query(sql, params);
  await db(`CREATE TABLE users (
    id BIGINT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await db("INSERT INTO users(id,name,role) VALUES(1,'Owner','owner'),(2,'Employee','staff')");
  // The production initializer creates the settings table after this module runs.
  await initStaffMessages(db);
  await db(`CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`);

  const app = createRouter();
  registerStaffMessageRoutes(app, { db, requireAdmin: (_req, _res, next) => next() });
  const owner = { id: 1, role: "owner" };
  const employee = { id: 2, role: "staff" };

  const first = await call(app, "POST", "/api/admin/settings/staff-message", owner, {
    message: "تذكير للموظفين",
    targetRoles: ["staff"]
  });
  assert.equal(first.statusCode, 201);
  const firstVersion = first.payload.message.version;

  let inbox = await call(app, "GET", "/api/staff-message", employee);
  assert.equal(inbox.payload.shouldShow, true);
  const ack = await call(app, "POST", "/api/staff-message/read", employee, { version: firstVersion });
  assert.equal(ack.statusCode, 200);

  inbox = await call(app, "GET", "/api/staff-message", employee);
  assert.equal(inbox.payload.shouldShow, false);
  assert.equal(inbox.payload.isRead, true);

  const adminView = await call(app, "GET", "/api/admin/settings/staff-message", owner);
  assert.equal(adminView.payload.history.length, 1);
  assert.equal(adminView.payload.history[0].readCount, 1);
  assert.equal(adminView.payload.seen, 1);

  const second = await call(app, "POST", "/api/admin/settings/staff-message", owner, {
    message: "إعلان جديد",
    targetRoles: ["staff"]
  });
  assert.equal(second.statusCode, 201);
  inbox = await call(app, "GET", "/api/staff-message", employee);
  assert.equal(inbox.payload.shouldShow, true);

  const history = await call(app, "GET", "/api/admin/settings/staff-message", owner);
  assert.equal(history.payload.history.length, 2);
  assert.equal(history.payload.history[1].readCount, 1);
  assert.equal(history.payload.history[1].active, false);
  assert.equal(history.payload.history[0].active, true);
});
