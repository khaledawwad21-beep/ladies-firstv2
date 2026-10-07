"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("variant inventory e2e requires isolated postgres", { skip: true }, () => {});
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

  test("variant checkout isolates color stock, blocks overselling and cancellation restores it", async () => {
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

    const created = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Variant Inventory Product",
        description: "Variant inventory isolation",
        price: 75,
        cost_price: 30,
        images: ["https://example.com/ci-variant-inventory.jpg"],
        category: "CI Variant Category",
        brand: "CI Variant Brand",
        variants: [
          { name: "Rose", stock: 2 },
          { name: "Black", stock: 3 }
        ],
        active: true
      })
    });

    const productId = Number(created.product.id);
    const rose = created.product.variants.find(v => v.name === "Rose" || v.color === "Rose");
    const black = created.product.variants.find(v => v.name === "Black" || v.color === "Black");
    assert.ok(rose?.id);
    assert.ok(black?.id);
    assert.equal(Number(rose.stock), 2);
    assert.equal(Number(black.stock), 3);

    const customer = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Variant Customer",
        email: "variant-customer-e2e@example.test",
        password: "variant-pass-123",
        gender: "female",
        age: 25
      })
    });
    const customerHeaders = { Authorization: "Bearer " + customer.token };

    const checkout = await api("/api/orders", {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        customerName: "CI Variant Customer",
        customerPhone: "+970599000020",
        shippingAddress: "Nablus - variant CI",
        shippingRegion: "westbank",
        paymentMethod: "cash",
        items: [{
          productId,
          variantId: Number(rose.id),
          variantName: "Rose",
          quantity: 2
        }]
      })
    });
    const orderId = Number(checkout.orderId || checkout.order?.id);
    assert.ok(orderId > 0);

    const afterCheckout = await api("/api/products/" + productId);
    const roseAfter = afterCheckout.product.variants.find(v => Number(v.id) === Number(rose.id));
    const blackAfter = afterCheckout.product.variants.find(v => Number(v.id) === Number(black.id));
    assert.equal(Number(roseAfter.stock), 0);
    assert.equal(Number(blackAfter.stock), 3);

    let oversellError = null;
    try {
      await api("/api/orders", {
        method: "POST",
        headers: customerHeaders,
        body: JSON.stringify({
          customerName: "CI Variant Customer",
          customerPhone: "+970599000020",
          shippingAddress: "Nablus - variant CI",
          shippingRegion: "westbank",
          paymentMethod: "cash",
          items: [{
            productId,
            variantId: Number(rose.id),
            variantName: "Rose",
            quantity: 1
          }]
        })
      });
    } catch (error) {
      oversellError = error;
    }
    assert.equal(oversellError?.status, 409);
    assert.equal(oversellError?.body?.code, "OUT_OF_STOCK");

    await api("/api/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "cancelled" })
    });

    const afterCancel = await api("/api/products/" + productId);
    const roseRestored = afterCancel.product.variants.find(v => Number(v.id) === Number(rose.id));
    const blackRestored = afterCancel.product.variants.find(v => Number(v.id) === Number(black.id));
    assert.equal(Number(roseRestored.stock), 2);
    assert.equal(Number(blackRestored.stock), 3);
  });
}
