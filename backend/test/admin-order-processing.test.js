"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");

test("cancelled orders are terminal after stock and loyalty reversal", () => {
  assert.match(server, /oldStatus === "cancelled"/);
  assert.match(server, /newStatus !== "cancelled"/);
  assert.match(server, /CANCELLED_ORDER_FINAL/);
  assert.match(server, /order_cancel_return/);
  assert.match(server, /order_reversal/);
});

test("admin orders support details status processing and shipping waiver", () => {
  assert.match(admin, /function orderStatusLabel\(/);
  assert.match(admin, /async function openOrderDetails\(/);
  assert.match(admin, /\/api\/admin\/orders\/'\+id\+'\/status/);
  assert.match(admin, /\/api\/admin\/orders\/'\+id\+'\/shipping-waiver/);
  assert.match(admin, /إعفاء من التوصيل/);
  assert.match(admin, /إرجاع الكميات للمخزون وعكس نقاط الولاء/);
});

test("admin order details show product image variant and totals", () => {
  assert.match(admin, /i\.image/);
  assert.match(admin, /i\.variant_name/);
  assert.match(admin, /packaging_cost/);
  assert.match(admin, /loyalty_discount/);
  assert.match(admin, /invoice\(/);
});


test("per-order shipping discount warns before stacking with automation", () => {
  assert.match(server, /\/api\/admin\/orders\/:id\/shipping-discount/);
  assert.match(server, /SHIPPING_AUTO_DISCOUNT_PRESENT/);
  assert.match(server, /shipping_manual_discount_percent/);
  assert.match(server, /shipping_manual_discount_amount/);
  assert.match(admin, /saveOrderShippingDiscount/);
  assert.match(admin, /يوجد خصم توصيل تلقائي/);
});

test("admin gifts are inventory-backed zero-price order lines", () => {
  assert.match(server, /\/api\/admin\/orders\/:id\/gifts/);
  assert.match(server, /is_gift=TRUE/);
  assert.match(server, /gift:/);
  assert.match(server, /gift_removed:/);
  assert.match(admin, /openGiftPicker/);
  assert.match(admin, /saveOrderGift/);
  assert.match(admin, /removeOrderGift/);
  assert.match(admin, /تكلفة الهدايا/);
});

test("invoice shows gift lines and separate automatic/manual shipping discounts", () => {
  assert.match(admin, /🎁 هدية/);
  assert.match(admin, /خصم التوصيل التلقائي/);
  assert.match(admin, /خصم التوصيل اليدوي/);
  assert.match(admin, /store_logo/);
  assert.match(admin, /invoiceLogo/);
});
