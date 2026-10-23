"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

// Independent in-process PostgreSQL. This test must never access live Render.
const { PGlite } = require(process.env.PGLITE_PATH || "@electric-sql/pglite");
const database = new PGlite();
process.env.JWT_SECRET = "isolated-coupon-lifecycle-tests";

async function query(sql, params) {
  const result = await database.query(sql, params);
  return { ...result, rowCount: result.rows.length || result.affectedRows || 0 };
}
require.cache[require.resolve("../src/db")] = {
  exports: {
    db: query,
    transaction: cb => database.transaction(tx => cb({
      query: async (sql, params) => {
        const result = await tx.query(sql, params);
        return { ...result, rowCount: result.rows.length || result.affectedRows || 0 };
      }
    })),
    getDatabaseStatus: async () => ({ configured: true, connected: true }),
    closeDatabase: async () => {}
  }
};

const { app, initDatabase } = require("../src/server");
let server, baseUrl, ownerToken;

async function request(path, method = "GET", body, token = ownerToken) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let data = {};
  try { data = await response.json(); } catch {}
  return { status: response.status, data };
}
async function ok(path, method = "GET", body, token) {
  const r = await request(path, method, body, token);
  assert.ok(r.status >= 200 && r.status < 300,
    method + " " + path + " failed with " + r.status + " " + JSON.stringify(r.data));
  return r.data;
}

before(async () => {
  await initDatabase();
  await require("../src/database-migrations").migrateDatabase();
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
  const owner = await ok("/api/auth/bootstrap-owner", "POST", {
    name: "CI Coupon Owner", email: "coupon-owner@example.test",
    password: "coupon-owner-pass-123", gender: "male", age: 30
  }, null);
  ownerToken = owner.token;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await database.close();
});

test("coupon edits enforce 100% limit and used codes keep invoice history", async () => {
  const created = await ok("/api/admin/coupons", "POST", {
    code: "CIHISTORY50", discountType: "percent", discountValue: 10, maxUses: 2
  });
  const id = Number(created.coupon.id);
  assert.ok(id > 0);

  const invalidValue = await request("/api/admin/coupons/" + id, "PATCH", {
    discount_value: 150
  });
  assert.equal(invalidValue.status, 400);
  assert.equal(invalidValue.data.code, "INVALID_COUPON_VALUE");

  // Fixed amounts over 100 are legal; switching to percent without lowering
  // that amount must be rejected by the backend even with a forged request.
  await ok("/api/admin/coupons/" + id, "PATCH", {
    discount_type: "fixed", discount_value: 150
  });
  const invalidType = await request("/api/admin/coupons/" + id, "PATCH", {
    discount_type: "percent"
  });
  assert.equal(invalidType.status, 400);
  assert.equal(invalidType.data.code, "INVALID_COUPON_VALUE");

  const validEdit = await ok("/api/admin/coupons/" + id, "PATCH", {
    discount_type: "percent", discount_value: 50
  });
  assert.equal(validEdit.coupon.discount_type, "percent");
  assert.equal(Number(validEdit.coupon.discount_value), 50);

  const product = await ok("/api/admin/products", "POST", {
    name: "CI Coupon History Product", description: "Safeguard history",
    price: 200, cost_price: 60, stock: 3,
    images: ["https://example.com/ci-coupon-product.jpg"],
    category: "CI Coupon Tests", brand: "CI Coupon Tests", active: true
  });
  const productId = Number(product.product.id);

  const checkout = await ok("/api/orders", "POST", {
    customerName: "CI Coupon Guest",
    customerPhone: "+970599000069",
    shippingAddress: "Isolated checkout address",
    shippingRegion: "westbank",
    paymentMethod: "cash",
    couponCode: "CIHISTORY50",
    items: [{ productId, quantity: 1 }]
  }, null);
  const orderId = Number(checkout.orderId || checkout.order?.id);
  assert.ok(orderId > 0);
  const detail = await ok("/api/admin/orders/" + orderId);
  assert.equal(Number(detail.order.coupon_discount), 100);
  assert.equal(detail.order.coupon_code, "CIHISTORY50");

  const usedDelete = await request("/api/admin/coupons/" + id, "DELETE");
  assert.equal(usedDelete.status, 409);
  assert.equal(usedDelete.data.code, "COUPON_HAS_ORDERS");

  // A cancelled order releases quota but its financial history must survive.
  await ok("/api/admin/orders/" + orderId + "/status", "PATCH", {
    status: "cancelled", cancelSource: "admin"
  });
  const cancelledDelete = await request("/api/admin/coupons/" + id, "DELETE");
  assert.equal(cancelledDelete.status, 409);
  assert.equal(cancelledDelete.data.code, "COUPON_HAS_ORDERS");

  const disabled = await ok("/api/admin/coupons/" + id, "PATCH", { is_active: false });
  assert.equal(disabled.coupon.is_active, false);

  const unused = await ok("/api/admin/coupons", "POST", {
    code: "CIUNUSED20", discountType: "percent", discountValue: 20
  });
  const deletedUnused = await ok("/api/admin/coupons/" + unused.coupon.id, "DELETE");
  assert.equal(deletedUnused.coupon.code, "CIUNUSED20");

  const coupons = await ok("/api/admin/coupons");
  assert.ok(coupons.coupons.some(c => c.id === id || Number(c.id) === id));
  assert.ok(!coupons.coupons.some(c => c.code === "CIUNUSED20"));
});
