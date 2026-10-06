"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("order e2e requires isolated postgres", { skip: true }, () => {});
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
      const error = new Error(body.message || `HTTP_${response.status}`);
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
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  });

  test("customer order completes the real HTTP + PostgreSQL + admin lifecycle", async () => {
    const owner = await api("/api/auth/bootstrap-owner", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Owner",
        email: "owner-e2e@example.test",
        password: "owner-password-123",
        gender: "male",
        age: 30
      })
    });
    assert.ok(owner.token);

    const ownerHeaders = { Authorization: "Bearer " + owner.token };

    const createdProduct = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Checkout Product",
        description: "Isolated checkout integration product",
        price: 100,
        cost_price: 40,
        stock: 5,
        images: ["https://example.com/ci-checkout-product.jpg"],
        category: "CI Category",
        brand: "CI Brand",
        active: true
      })
    });
    assert.equal(createdProduct.product.stock, 5);
    const productId = Number(createdProduct.product.id);
    assert.ok(productId > 0);

    const customer = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Customer",
        email: "customer-e2e@example.test",
        password: "customer-pass-123",
        gender: "female",
        age: 26
      })
    });
    assert.ok(customer.token);

    const customerHeaders = { Authorization: "Bearer " + customer.token };

    const checkout = await api("/api/orders", {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        customerName: "CI Customer",
        customerPhone: "+970599000001",
        shippingAddress: "Nablus - CI isolated checkout",
        shippingRegion: "westbank",
        paymentMethod: "cash",
        items: [{ productId, quantity: 2 }]
      })
    });

    const orderId = Number(checkout.orderId || checkout.order?.id);
    assert.ok(orderId > 0, "checkout must return the created order id");

    const customerOrders = await api("/api/orders", { headers: customerHeaders });
    const customerOrder = customerOrders.orders.find(order => Number(order.id) === orderId);
    assert.ok(customerOrder, "created order must appear in customer order history");
    assert.equal(String(customerOrder.status).toLowerCase(), "pending");

    const adminOrder = await api(`/api/admin/orders/${orderId}`, { headers: ownerHeaders });
    assert.equal(Number(adminOrder.order.id), orderId);
    assert.equal(adminOrder.items.length, 1);
    assert.equal(Number(adminOrder.items[0].quantity), 2);
    assert.equal(Number(adminOrder.items[0].product_id), productId);

    const publicLink = await api(`/api/admin/orders/${orderId}/public-link`, { headers: ownerHeaders });
    assert.match(String(publicLink.path || ""), /\/order\//);

    const salesReport = await api("/api/admin/reports/sales", { headers: ownerHeaders });
    assert.equal(salesReport.ok, true);

    const stockAfterCheckout = await api(`/api/products/${productId}`);
    assert.equal(Number(stockAfterCheckout.product.stock), 3);

    const cancelled = await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "cancelled" })
    });
    assert.equal(String(cancelled.order.status).toLowerCase(), "cancelled");

    const stockAfterCancel = await api(`/api/products/${productId}`);
    assert.equal(Number(stockAfterCancel.product.stock), 5);

    const customerOrdersAfterCancel = await api("/api/orders", { headers: customerHeaders });
    const cancelledCustomerOrder = customerOrdersAfterCancel.orders.find(order => Number(order.id) === orderId);
    assert.equal(String(cancelledCustomerOrder.status).toLowerCase(), "cancelled");
  });
}
