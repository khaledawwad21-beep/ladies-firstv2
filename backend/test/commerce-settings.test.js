"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("loyalty API exposes the settings the checkout actually needs", () => {
  assert.match(server, /settings:\s*\{/);
  assert.match(server, /redeemEnabled:/);
  assert.match(server, /pointValue:/);
  assert.match(server, /pointsPerCurrency:/);
  assert.match(server, /earningMode:/);
  assert.match(server, /pointsPerOrder:/);
});

test("loyalty earning supports per-amount and per-order modes", () => {
  assert.match(server, /loyalty_earning_mode/);
  assert.match(server, /loyalty_points_per_order/);
  assert.match(server, /earningMode === "order" \? pointsPerOrder : calculateLoyaltyPoints/);
});

test("default server packaging matches storefront wrapping ids", () => {
  assert.match(server, /'packaging_options'/);
  assert.match(server, /clear-ribbon/);
  assert.match(server, /paper-ribbon/);
  assert.match(server, /packagingById/);
});

test("admin can configure loyalty, packaging and Visa discount", () => {
  assert.match(admin, /loyaltyEnabled/);
  assert.match(admin, /loyaltyMode/);
  assert.match(admin, /loyaltyPointValue/);
  assert.match(admin, /packagingAdminRows/);
  assert.match(admin, /visaDiscount/);
  assert.match(admin, /packaging_options:adminPackagingOptions/);
});

test("storefront uses authoritative global Visa discount", () => {
  assert.match(app, /storeCommerceSettings=\{visaDiscountPercent:0(?:,whatsappNumber:[^}]*)?\}/);
  assert.match(app, /st\.visa_discount_percent/);
  assert.match(app, /visaDiscount=subtotal\*/);
  assert.doesNotMatch(app, /p\.visaDiscount/);
});
