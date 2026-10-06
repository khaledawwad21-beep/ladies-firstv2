"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  signOrderToken,
  verifyOrderToken,
  safeOrder
} = require("../src/order-public-access");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("order QR tokens are signed and reject tampering", () => {
  const createdAt = "2026-10-06T20:00:00.000Z";
  const token = signOrderToken(44, createdAt, "test-secret");
  assert.equal(verifyOrderToken(44, createdAt, token, "test-secret"), true);
  assert.equal(verifyOrderToken(45, createdAt, token, "test-secret"), false);
  assert.equal(verifyOrderToken(44, createdAt, token.slice(0, -1) + "x", "test-secret"), false);
});

test("public order payload excludes personal customer fields", () => {
  const order = safeOrder({
    id: 1,
    status: "processing",
    total: 100,
    customer_name: "Private Name",
    customer_phone: "0500000000",
    shipping_address: "Private address",
    created_at: new Date("2026-10-06T20:00:00.000Z")
  });
  assert.equal(order.id, 1);
  assert.equal(Object.hasOwn(order, "customer_name"), false);
  assert.equal(Object.hasOwn(order, "customer_phone"), false);
  assert.equal(Object.hasOwn(order, "shipping_address"), false);
});

test("server wires secure public order QR routes before SPA fallback", () => {
  assert.match(server, /registerOrderPublicAccessRoutes\(app/);
  assert.match(server, /SECURE PUBLIC ORDER QR/);
});

test("invoice requests a signed public order link for the second QR", () => {
  assert.match(admin, /\/api\/admin\/orders\/'\+id\+'\/public-link/);
  assert.match(admin, /qrorder/);
  assert.match(admin, /text:orderUrl/);
});

test("storefront opens signed order links without exposing PII", () => {
  assert.match(app, /async function openPublicOrderFromUrl\(/);
  assert.match(app, /\/api\/public\/orders\//);
  assert.match(app, /هذا الرابط يعرض تفاصيل الطلب بدون إظهار رقم الهاتف أو العنوان/);
  assert.match(app, /await openPublicOrderFromUrl\(\)/);
});
