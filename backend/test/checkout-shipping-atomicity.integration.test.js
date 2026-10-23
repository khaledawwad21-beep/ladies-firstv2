"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

/*
 * These requests run against a temporary PostgreSQL service in GitHub Actions.
 * Never aim this test at the live Render database.
 */
if (process.env.RUN_DB_E2E !== "1") {
  test("shipping and checkout atomicity require isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { closeDatabase } = require("../src/db");

  let server;
  let baseUrl;

  async function request(path, options = {}) {
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    return { status: response.status, ok: response.ok, body };
  }

  async function expectSuccess(path, options = {}) {
    const result = await request(path, options);
    assert.equal(result.ok, true,
      `${options.method || "GET"} ${path} returned ${result.status}: ${JSON.stringify(result.body)}`);
    return result.body;
  }

  test.before(async () => {
    assert.ok(process.env.DATABASE_URL, "isolated DATABASE_URL must be provided");
    assert.match(process.env.DATABASE_URL, /127\.0\.0\.1|localhost/,
      "refusing to exercise order writes outside a local isolated database");
    await initDatabase();
    await migrateDatabase();
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    baseUrl = "http://127.0.0.1:" + server.address().port;
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  });

  test("all three delivery regions charge correctly, reject forged waivers and roll back rejected carts", async () => {
    const owner = await expectSuccess("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ contact: "owner-e2e@example.test", password: "owner-password-123" })
    });
    const authHeaders = { Authorization: "Bearer " + owner.token };

    await expectSuccess("/api/admin/settings", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        shipping_fees: { westbank: 20, jerusalem: 35, inside: 70 },
        shipping_discount_percentages: { westbank: 0, jerusalem: 0, inside: 0 }
      })
    });

    const created = await expectSuccess("/api/admin/products", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "CI Three Delivery Regions Product",
        description: "Isolated checkout and rollback test",
        price: 100,
        cost_price: 40,
        stock: 6,
        images: ["https://example.com/ci-delivery-regions.jpg"],
        category: "CI Delivery Tests",
        brand: "CI Delivery Tests",
        active: true
      })
    });
    const productId = Number(created.product.id);
    assert.ok(productId > 0);

    const stock = async () => {
      const result = await expectSuccess("/api/products/" + productId);
      return Number(result.product.stock);
    };

    const orderIds = [];
    const makeBody = (shippingRegion, items = [{ productId, quantity: 1 }]) => ({
      customerName: "CI Shipping Guest",
      customerPhone: "+970599000062",
      shippingAddress: "CI isolated delivery address",
      shippingRegion,
      paymentMethod: "cash",
      shippingWaived: true, // a guest must not be allowed to remove the delivery charge
      items
    });

    for (const [index, region, fee] of [
      [0, "westbank", 20],
      [1, "jerusalem", 35],
      [2, "inside", 70]
    ]) {
      const checkedOut = await expectSuccess("/api/orders", {
        method: "POST",
        body: JSON.stringify(makeBody(region))
      });
      const id = Number(checkedOut.orderId || checkedOut.order?.id);
      assert.ok(id > 0);
      orderIds.push(id);

      const detail = await expectSuccess("/api/admin/orders/" + id, { headers: authHeaders });
      assert.equal(detail.order.shipping_region, region);
      assert.equal(Number(detail.order.shipping_waived), 0);
      assert.equal(Number(detail.order.subtotal), 100);
      assert.equal(Number(detail.order.shipping_base_cost), fee);
      assert.equal(Number(detail.order.shipping_cost), fee);
      assert.equal(Number(detail.order.total), 100 + fee);
      assert.equal(detail.items.length, 1);
      assert.equal(Number(detail.items[0].quantity), 1);
      assert.equal(await stock(), 5 - index);
    }

    const beforeRejections = await stock();
    assert.equal(beforeRejections, 3);
    const rejected = [
      {
        title: "unknown shipping destination",
        body: makeBody("not-a-region"),
        code: "BAD_SHIPPING_REGION",
        status: 400
      },
      {
        title: "duplicate cart line",
        body: makeBody("westbank", [
          { productId, quantity: 1 },
          { productId, quantity: 1 }
        ]),
        code: "DUPLICATE_CART_LINE",
        status: 400
      },
      {
        title: "stale or forged client price",
        body: makeBody("westbank", [{ productId, quantity: 1, unitPrice: 1 }]),
        code: "PRICE_CHANGED",
        status: 409
      },
      {
        title: "invalid packaging choice",
        body: makeBody("westbank", [{ productId, quantity: 1, packagingId: "not-an-option" }]),
        code: "BAD_PACKAGING",
        status: 400
      }
    ];

    for (const scenario of rejected) {
      const result = await request("/api/orders", {
        method: "POST",
        body: JSON.stringify(scenario.body)
      });
      assert.equal(result.status, scenario.status, scenario.title);
      assert.equal(result.body.code, scenario.code, scenario.title);
      assert.equal(await stock(), beforeRejections,
        `${scenario.title}: rejected checkout must roll back deducted inventory`);
    }

    for (const id of orderIds) {
      await expectSuccess("/api/admin/orders/" + id + "/status", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "cancelled", cancelSource: "admin" })
      });
    }
    assert.equal(await stock(), 6, "cancelling all three orders must restore every unit");
  });
}
