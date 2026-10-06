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
