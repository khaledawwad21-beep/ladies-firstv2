"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("guest checkout e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { closeDatabase } = require("../src/db");

  let server;
  let baseUrl;

  async function api(path, options = {}) {
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(body.message || ("HTTP_" + response.status));
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  test.before(async () => {
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

  test("guest can checkout without an account while account history remains protected", async () => {
    let owner;
    try {
      owner = await api("/api/auth/bootstrap-owner", {
        method: "POST",
        body: JSON.stringify({
          name: "CI Owner",
          email: "owner-e2e@example.test",
          password: "owner-password-123",
          gender: "male",
          age: 30
        })
      });
    } catch (error) {
      assert.equal(error.status, 409);
      owner = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          contact: "owner-e2e@example.test",
          password: "owner-password-123"
        })
      });
    }
    const ownerHeaders = { Authorization: "Bearer " + owner.token };

    const product = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Guest Checkout Product",
        description: "Guest checkout isolation",
        price: 90,
        cost_price: 35,
        stock: 4,
        images: ["https://example.com/ci-guest-checkout.jpg"],
        category: "CI Guest Category",
        brand: "CI Guest Brand",
        active: true
      })
    });
    const productId = Number(product.product.id);

    const checkout = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "CI Guest Customer",
        customerPhone: "+970599000040",
        shippingAddress: "Nablus - guest CI",
        shippingRegion: "westbank",
        paymentMethod: "cash",
        pointsToRedeem: 999,
        items: [{ productId, quantity: 1 }]
      })
    });

    const orderId = Number(checkout.orderId || checkout.order?.id);
    assert.ok(orderId > 0);
    assert.equal(checkout.order.user_id, null);
    assert.equal(Number(checkout.order.points_redeemed), 0);
    assert.equal(Number(checkout.order.loyalty_discount), 0);
    assert.equal(Number(checkout.order.loyalty_points_awarded), 0);
    assert.equal(Number(checkout.loyaltyPoints), 0);

    const afterCheckout = await api("/api/products/" + productId);
    assert.equal(Number(afterCheckout.product.stock), 3);

    const adminOrder = await api("/api/admin/orders/" + orderId, {
      headers: ownerHeaders
    });
    assert.equal(adminOrder.order.user_id, null);
    assert.equal(adminOrder.order.customer_name, "CI Guest Customer");
    assert.equal(adminOrder.order.customer_phone, "+970599000040");
    assert.equal(adminOrder.items.length, 1);

    let historyError = null;
    try {
      await api("/api/orders");
    } catch (error) {
      historyError = error;
    }
    assert.equal(historyError?.status, 401);

    await api("/api/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "cancelled", cancellationSource: "admin" })
    });

    const afterCancel = await api("/api/products/" + productId);
    assert.equal(Number(afterCancel.product.stock), 4);
  });
}
