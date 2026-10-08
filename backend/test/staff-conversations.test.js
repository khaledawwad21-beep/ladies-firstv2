"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");
const { initStaffConversations, registerStaffConversationRoutes } = require("../src/staff-conversations");

function createRouter() {
  const routes = [];
  return {
    routes,
    get(path, ...handlers) { routes.push({ method: "GET", path, handler: handlers.at(-1) }); },
    post(path, ...handlers) { routes.push({ method: "POST", path, handler: handlers.at(-1) }); }
  };
}

async function call(router, method, path, user, body = {}) {
  let selected;
  let params = {};
  for (const route of router.routes.filter((item) => item.method === method)) {
    const names = [];
    const pattern = new RegExp(`^${route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([^/]+)/g, (_m, name) => { names.push(name); return "([^/]+)"; })}$`);
    const match = path.match(pattern);
    if (match) { selected = route; params = Object.fromEntries(names.map((name, i) => [name, match[i + 1]])); break; }
  }
  assert.ok(selected, `Missing ${method} ${path}`);
  let statusCode = 200;
  let payload;
  const res = { status(code) { statusCode = code; return this; }, json(value) { payload = value; return this; } };
  await selected.handler({ user, body, params }, res);
  return { statusCode, payload };
}

test("employees can chat and attach a conversation to an order, with unread tracking and participant checks", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  const db = (sql, params = []) => pg.query(sql, params);
  await db(`CREATE TABLE users (
    id BIGINT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, permissions JSONB NOT NULL DEFAULT '[]'::jsonb
  )`);
  await db("CREATE TABLE products (id BIGINT PRIMARY KEY, name TEXT NOT NULL)");
  await db("CREATE TABLE orders (id BIGINT PRIMARY KEY, customer_name TEXT)");
  await db(`INSERT INTO users(id,name,role,permissions) VALUES
    (1,'Owner','owner','[]'),(2,'Amin','staff','[\"staff\",\"orders\",\"products\"]'),
    (3,'Sara','staff','[\"staff\",\"orders\",\"products\"]'),(4,'Unauthorized','staff','[\"staff\"]')`);
  await db("INSERT INTO orders(id,customer_name) VALUES(501,'Customer')");
  await db("INSERT INTO products(id,name) VALUES(77,'Perfume')");
  await initStaffConversations(db);

  const app = createRouter();
  registerStaffConversationRoutes(app, { db, requireAdmin: (_req, _res, next) => next() });
  const amin = { id: 2, role: "staff", permissions: ["staff", "orders", "products"] };
  const sara = { id: 3, role: "staff", permissions: ["staff", "orders", "products"] };
  const unauthorized = { id: 4, role: "staff", permissions: ["staff"] };

  const contacts = await call(app, "GET", "/api/staff-conversations/contacts", amin);
  assert.deepEqual(contacts.payload.contacts.map((contact) => contact.id), [1, 3, 4]);

  const created = await call(app, "POST", "/api/staff-conversations", amin, {
    recipientId: 3, contextType: "order", contextId: 501, message: "تأكدي من عنوان الطلب"
  });
  assert.equal(created.statusCode, 201);
  const conversationId = created.payload.conversationId;

  const list = await call(app, "GET", "/api/staff-conversations", sara);
  assert.equal(list.payload.conversations.length, 1);
  assert.equal(Number(list.payload.conversations[0].unread_count), 1);
  assert.equal(list.payload.conversations[0].context_label, "طلب #501");

  const detail = await call(app, "GET", `/api/staff-conversations/${conversationId}`, sara);
  assert.equal(detail.payload.messages.length, 1);
  assert.equal(detail.payload.messages[0].body, "تأكدي من عنوان الطلب");

  const readList = await call(app, "GET", "/api/staff-conversations", sara);
  assert.equal(Number(readList.payload.conversations[0].unread_count), 0);

  const reply = await call(app, "POST", `/api/staff-conversations/${conversationId}/messages`, sara, { message: "تم التحقق من العنوان" });
  assert.equal(reply.statusCode, 201);
  const updated = await call(app, "GET", `/api/staff-conversations/${conversationId}`, amin);
  assert.equal(updated.payload.messages.length, 2);

  const productThread = await call(app, "POST", "/api/staff-conversations", amin, {
    recipientId: 3, contextType: "product", contextId: 77, message: "راجعي وصف العطر"
  });
  assert.equal(productThread.statusCode, 201);
  const productList = await call(app, "GET", "/api/staff-conversations", sara);
  assert.equal(productList.payload.conversations.length, 2);
  assert.equal(productList.payload.conversations.find((thread) => thread.kind === "product").context_label, "Perfume");

  const forbidden = await call(app, "GET", `/api/staff-conversations/${conversationId}`, unauthorized);
  assert.equal(forbidden.statusCode, 404);
  const noPermission = await call(app, "POST", "/api/staff-conversations", unauthorized, {
    recipientId: 3, contextType: "order", contextId: 501, message: "ملاحظة"
  });
  assert.equal(noPermission.statusCode, 403);
});
