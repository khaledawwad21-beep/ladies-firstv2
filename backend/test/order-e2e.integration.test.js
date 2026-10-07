"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("order e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { closeDatabase, db } = require("../src/db");
  const { hashRecoveryCode } = require("../src/password-recovery");

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

    const publicPageUrl = new URL(publicLink.path, baseUrl);
    const publicOrder = await api(
      `/api/public/orders/${orderId}?${publicPageUrl.searchParams.toString()}`
    );
    assert.equal(publicOrder.ok, true);
    assert.equal(Number(publicOrder.order.id), orderId);
    assert.equal(Number(publicOrder.order.total), Number(adminOrder.order.total));
    assert.equal(publicOrder.items.length, 1);
    assert.equal(Number(publicOrder.items[0].productId), productId);
    for (const privateField of ["customer_name", "customer_phone", "shipping_address", "user_email", "user_phone"]) {
      assert.equal(Object.hasOwn(publicOrder.order, privateField), false);
    }

    const validToken = publicPageUrl.searchParams.get("token");
    assert.ok(validToken);
    const tamperedToken = validToken.slice(0, -1) + (validToken.endsWith("a") ? "b" : "a");
    const tampered = await fetch(
      baseUrl + `/api/public/orders/${orderId}?token=${encodeURIComponent(tamperedToken)}`
    );
    assert.equal(tampered.status, 404);

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

  test("advanced checkout keeps coupon Visa loyalty packaging shipping and reports financially consistent", async () => {
    const ownerLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "owner-e2e@example.test",
        password: "owner-password-123"
      })
    });
    const ownerHeaders = { Authorization: "Bearer " + ownerLogin.token };

    await api("/api/admin/settings", {
      method: "PUT",
      headers: ownerHeaders,
      body: JSON.stringify({
        visa_discount_percent: 10,
        loyalty_enabled: true,
        loyalty_redeem_enabled: true,
        loyalty_point_value: 0.5,
        loyalty_points_per_currency: 1,
        loyalty_earning_mode: "amount",
        shipping_fees: { westbank: 20, jerusalem: 35, inside: 70 },
        shipping_discount_percentages: { westbank: 25, jerusalem: 0, inside: 0 },
        packaging_options: [
          { id: "clear-ribbon", nameAr: "تغليف شفاف", nameEn: "Clear wrapping", price: 5, active: true }
        ]
      })
    });

    await api("/api/admin/coupons", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        code: "ADV10",
        discountType: "percent",
        discountValue: 10,
        minimumAmount: 100,
        maxUses: 5
      })
    });

    const product = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Advanced Checkout Product",
        description: "Advanced isolated checkout integration product",
        price: 100,
        cost_price: 40,
        stock: 5,
        images: ["https://example.com/ci-advanced-product.jpg"],
        category: "CI Advanced Category",
        brand: "CI Advanced Brand",
        active: true
      })
    });
    const productId = Number(product.product.id);

    const customer = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Advanced Customer",
        email: "advanced-customer-e2e@example.test",
        password: "advanced-pass-123",
        gender: "female",
        age: 29
      })
    });
    const customerId = Number(customer.user.id);
    await db("UPDATE users SET loyalty_points=20 WHERE id=$1", [customerId]);
    const customerHeaders = { Authorization: "Bearer " + customer.token };

    const checkout = await api("/api/orders", {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        customerName: "CI Advanced Customer",
        customerPhone: "+970599000002",
        shippingAddress: "Nablus - advanced CI checkout",
        shippingRegion: "westbank",
        paymentMethod: "visa",
        couponCode: "ADV10",
        pointsToRedeem: 20,
        items: [{
          productId,
          quantity: 2,
          packagingId: "clear-ribbon"
        }]
      })
    });

    const orderId = Number(checkout.orderId || checkout.order?.id);
    assert.ok(orderId > 0);

    const adminOrder = await api(`/api/admin/orders/${orderId}`, { headers: ownerHeaders });
    const order = adminOrder.order;
    assert.equal(Number(order.subtotal), 200);
    assert.equal(Number(order.coupon_discount), 20);
    assert.equal(Number(order.visa_discount), 18);
    assert.equal(Number(order.loyalty_discount), 10);
    assert.equal(Number(order.points_redeemed), 20);
    assert.equal(Number(order.shipping_base_cost), 20);
    assert.equal(Number(order.shipping_discount_percent), 25);
    assert.equal(Number(order.shipping_discount_amount), 5);
    assert.equal(Number(order.shipping_cost), 15);
    assert.equal(Number(order.packaging_cost), 10);
    assert.equal(Number(order.total), 177);
    assert.equal(String(order.payment_method), "visa");

    const loyaltyAfterCheckout = await api("/api/loyalty", { headers: customerHeaders });
    assert.equal(Number(loyaltyAfterCheckout.points), 152);
    assert.ok(loyaltyAfterCheckout.transactions.some(tx => tx.transaction_type === "redeem" && Number(tx.points) === -20));
    assert.ok(loyaltyAfterCheckout.transactions.some(tx => tx.transaction_type === "order_award" && Number(tx.points) === 152));

    const reportDate = String(order.created_at).slice(0, 10);
    const report = await api(`/api/admin/reports/sales?from=${reportDate}&to=${reportDate}`, { headers: ownerHeaders });
    assert.equal(Number(report.summary.orders), 1);
    assert.equal(Number(report.summary.sales), 162);
    assert.equal(Number(report.summary.cost), 80);
    assert.equal(Number(report.summary.profit), 82);

    const customerOrders = await api("/api/orders", { headers: customerHeaders });
    const customerOrder = customerOrders.orders.find(x => Number(x.id) === orderId);
    assert.ok(customerOrder);
    assert.equal(Number(customerOrder.total), 177);
    assert.equal(Number(customerOrder.coupon_discount), 20);
    assert.equal(Number(customerOrder.visa_discount), 18);
    assert.equal(Number(customerOrder.loyalty_discount), 10);
    assert.equal(Number(customerOrder.packaging_cost), 10);
    assert.equal(Number(customerOrder.shipping_cost), 15);

    await api(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "cancelled" })
    });

    const loyaltyAfterCancel = await api("/api/loyalty", { headers: customerHeaders });
    assert.equal(Number(loyaltyAfterCancel.points), 20);
    assert.ok(loyaltyAfterCancel.transactions.some(tx => tx.transaction_type === "redeem_refund" && Number(tx.points) === 20));
    assert.ok(loyaltyAfterCancel.transactions.some(tx => tx.transaction_type === "order_reversal" && Number(tx.points) === -152));

    const coupons = await api("/api/admin/coupons", { headers: ownerHeaders });
    const coupon = coupons.coupons.find(x => String(x.code).toUpperCase() === "ADV10");
    assert.equal(Number(coupon.used_count), 0);

    const stockAfterCancel = await api(`/api/products/${productId}`);
    assert.equal(Number(stockAfterCancel.product.stock), 5);

    const reportAfterCancel = await api(`/api/admin/reports/sales?from=${reportDate}&to=${reportDate}`, { headers: ownerHeaders });
    assert.equal(Number(reportAfterCancel.summary.orders), 0);
    assert.equal(Number(reportAfterCancel.summary.sales), 0);
    assert.equal(Number(reportAfterCancel.summary.cost), 0);
    assert.equal(Number(reportAfterCancel.summary.profit), 0);
  });


  test("customer account state persists across login sessions", async () => {
    const ownerLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "owner-e2e@example.test",
        password: "owner-password-123"
      })
    });
    const ownerHeaders = { Authorization: "Bearer " + ownerLogin.token };

    const product = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Account State Product",
        description: "Persistent account state product",
        price: 55,
        cost_price: 20,
        stock: 8,
        images: ["https://example.com/ci-account-state.jpg"],
        category: "CI Account Category",
        brand: "CI Account Brand",
        active: true
      })
    });
    const productId = Number(product.product.id);

    const registered = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Account Customer",
        email: "account-state-e2e@example.test",
        password: "account-state-pass-123",
        gender: "female",
        age: 28
      })
    });
    const firstHeaders = { Authorization: "Bearer " + registered.token };

    const savedFavorites = await api("/api/account/favorites", {
      method: "PUT",
      headers: firstHeaders,
      body: JSON.stringify({ favorites: [productId, productId] })
    });
    assert.deepEqual(savedFavorites.favorites, [productId]);

    const savedCart = await api("/api/cart/snapshot", {
      method: "PUT",
      headers: firstHeaders,
      body: JSON.stringify({
        items: [{
          productId,
          qty: 2,
          variant: "",
          packagingId: "clear-ribbon"
        }]
      })
    });
    assert.equal(savedCart.itemCount, 2);
    assert.equal(savedCart.items[0].packagingId, "clear-ribbon");

    const updated = await api("/api/users/me", {
      method: "PATCH",
      headers: firstHeaders,
      body: JSON.stringify({
        name: "CI Account Customer Updated",
        phone: "+970599000003",
        gender: "male",
        age: 31,
        whatsapp_opt_in: true
      })
    });
    assert.equal(updated.user.name, "CI Account Customer Updated");
    assert.equal(updated.user.gender, "male");
    assert.equal(Number(updated.user.age), 31);
    assert.equal(updated.user.whatsapp_opt_in, true);

    const meBeforeRelogin = await api("/api/auth/me", { headers: firstHeaders });
    assert.equal(meBeforeRelogin.user.whatsapp_opt_in, true);
    assert.equal(meBeforeRelogin.greeting, "نورتنا");

    const relogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "account-state-e2e@example.test",
        password: "account-state-pass-123"
      })
    });
    assert.equal(relogin.user.name, "CI Account Customer Updated");
    assert.equal(relogin.user.gender, "male");
    assert.equal(Number(relogin.user.age), 31);
    assert.equal(relogin.user.whatsapp_opt_in, true);
    assert.equal(relogin.greeting, "نورتنا");

    const secondHeaders = { Authorization: "Bearer " + relogin.token };

    const favoritesAfterRelogin = await api("/api/account/favorites", { headers: secondHeaders });
    assert.deepEqual(favoritesAfterRelogin.favorites, [productId]);

    const cartAfterRelogin = await api("/api/cart/snapshot", { headers: secondHeaders });
    assert.equal(cartAfterRelogin.snapshot.itemCount, 2);
    assert.equal(cartAfterRelogin.snapshot.items[0].packagingId, "clear-ribbon");

    await api(`/api/admin/users/${Number(registered.user.id)}`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ gender: "female", age: 32 })
    });

    const meAfterAdminEdit = await api("/api/auth/me", { headers: secondHeaders });
    assert.equal(meAfterAdminEdit.user.gender, "female");
    assert.equal(Number(meAfterAdminEdit.user.age), 32);
    assert.equal(meAfterAdminEdit.greeting, "نورتينا");
    assert.equal(meAfterAdminEdit.user.whatsapp_opt_in, true);

    await api("/api/cart/snapshot", {
      method: "DELETE",
      headers: secondHeaders
    });
    const cleared = await api("/api/cart/snapshot", { headers: secondHeaders });
    assert.equal(cleared.snapshot, null);
  });


  test("fixed coupon and Visa totals match the storefront ordering", async () => {
    const ownerLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "owner-e2e@example.test",
        password: "owner-password-123"
      })
    });
    const ownerHeaders = { Authorization: "Bearer " + ownerLogin.token };

    await api("/api/admin/settings", {
      method: "PUT",
      headers: ownerHeaders,
      body: JSON.stringify({
        visa_discount_percent: 10,
        shipping_fees: { westbank: 20, jerusalem: 35, inside: 70 },
        shipping_discount_percentages: { westbank: 25, jerusalem: 0, inside: 0 }
      })
    });

    await api("/api/admin/coupons", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        code: "FIX20",
        discountType: "fixed",
        discountValue: 20,
        minimumAmount: 0,
        maxUses: 5
      })
    });

    const product = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Fixed Coupon Product",
        description: "Fixed coupon and Visa consistency",
        price: 200,
        cost_price: 80,
        stock: 2,
        images: ["https://example.com/ci-fixed-coupon.jpg"],
        category: "CI Finance Category",
        brand: "CI Finance Brand",
        active: true
      })
    });
    const productId = Number(product.product.id);

    const customer = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Fixed Coupon Customer",
        email: "fixed-coupon-e2e@example.test",
        password: "fixed-coupon-pass-123",
        gender: "female",
        age: 24
      })
    });
    const customerHeaders = { Authorization: "Bearer " + customer.token };

    const checkout = await api("/api/orders", {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({
        customerName: "CI Fixed Coupon Customer",
        customerPhone: "+970599000030",
        shippingAddress: "Nablus - fixed coupon CI",
        shippingRegion: "westbank",
        paymentMethod: "visa",
        couponCode: "FIX20",
        items: [{ productId, quantity: 1 }]
      })
    });

    const orderId = Number(checkout.orderId || checkout.order?.id);
    const adminOrder = await api("/api/admin/orders/" + orderId, { headers: ownerHeaders });
    assert.equal(Number(adminOrder.order.subtotal), 200);
    assert.equal(Number(adminOrder.order.coupon_discount), 20);
    assert.equal(Number(adminOrder.order.visa_discount), 18);
    assert.equal(Number(adminOrder.order.shipping_cost), 15);
    assert.equal(Number(adminOrder.order.total), 177);

    await api("/api/admin/orders/" + orderId + "/status", {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "cancelled" })
    });
  });

}
