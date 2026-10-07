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

    const firstCheckout = await api("/api/orders", {
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
    const firstOrderId = Number(firstCheckout.orderId || firstCheckout.order?.id);
    assert.ok(firstOrderId > 0);

    const afterFirstCheckout = await api("/api/products/" + productId);
    const roseAfterFirst = afterFirstCheckout.product.variants.find(v => Number(v.id) === Number(rose.id));
    const blackAfterFirst = afterFirstCheckout.product.variants.find(v => Number(v.id) === Number(black.id));
    assert.equal(Number(roseAfterFirst.stock), 1);
    assert.equal(Number(blackAfterFirst.stock), 3);

    let limitedError = null;
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
            quantity: 2
          }]
        })
      });
    } catch (error) {
      limitedError = error;
    }
    assert.equal(limitedError?.status, 409);
    assert.equal(limitedError?.body?.code, "OUT_OF_STOCK");
    assert.equal(
      limitedError?.body?.message,
      "💕 عذرًا سيدتي، المتوفر حاليًا 1 قطع … يمكنك إضافة عدد القطع المتاحة 1 قطع كحد أقصى."
    );

    const secondCheckout = await api("/api/orders", {
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
    const secondOrderId = Number(secondCheckout.orderId || secondCheckout.order?.id);
    assert.ok(secondOrderId > 0);

    const afterSecondCheckout = await api("/api/products/" + productId);
    const roseAfterSecond = afterSecondCheckout.product.variants.find(v => Number(v.id) === Number(rose.id));
    const blackAfterSecond = afterSecondCheckout.product.variants.find(v => Number(v.id) === Number(black.id));
    assert.equal(Number(roseAfterSecond.stock), 0);
    assert.equal(Number(blackAfterSecond.stock), 3);

    let soldOutError = null;
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
      soldOutError = error;
    }
    assert.equal(soldOutError?.status, 409);
    assert.equal(soldOutError?.body?.code, "OUT_OF_STOCK");
    assert.equal(soldOutError?.body?.message, "💕 عذرًا سيدتي، خلصت الكمية🌸");

    for (const orderId of [firstOrderId, secondOrderId]) {
      await api("/api/admin/orders/" + orderId + "/status", {
        method: "PATCH",
        headers: ownerHeaders,
        body: JSON.stringify({ status: "cancelled" })
      });
    }

    const afterCancel = await api("/api/products/" + productId);
    const roseRestored = afterCancel.product.variants.find(v => Number(v.id) === Number(rose.id));
    const blackRestored = afterCancel.product.variants.find(v => Number(v.id) === Number(black.id));
    assert.equal(Number(roseRestored.stock), 2);
    assert.equal(Number(blackRestored.stock), 3);
  });
}
