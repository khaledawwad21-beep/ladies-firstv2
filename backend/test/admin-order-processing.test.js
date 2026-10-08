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

test("selecting delivered status saves immediately",()=>{
  assert.ok(admin.includes("async function handleOrderStatusSelect(id)"));
  assert.ok(admin.includes("await saveOrderStatus(id)"));
});

test("all non-cancelled order statuses save automatically while cancellation remains deliberate",()=>{
  assert.ok(admin.includes("select.value==='cancelled'||select.value===String(select.dataset.savedStatus||'')"));
  assert.ok(admin.includes("await saveOrderStatus(id)"));
});

test("customer order history uses account identity and has status events",()=>{
  assert.match(server,/CREATE TABLE IF NOT EXISTS order_status_history/);
  assert.match(server,/WHERE o\.user_id = \$1/);
  assert.match(server,/INSERT INTO order_status_history/);
  assert.match(admin,/بيانات الاستلام بالطلب/);
  assert.match(admin,/سجل الحالات/);
});

test("customer tracking shows status history without relying on order phone",()=>{
  assert.match(admin,/orderUserId===userId/);
  assert.match(admin,/orderTrackingHtml\(o\)/);
  assert.match(server,/completed_at = CASE/);
});

test("delivering a guest order links only to one unique customer phone match",()=>{
  assert.match(server,/matchingCustomers\.rowCount === 1/);
  assert.match(server,/LIMIT 2/);
  assert.match(server,/customerAccountLinkedNow/);
  assert.match(admin,/لم نجد حسابًا واحدًا مطابقًا لرقم هاتف الطلب/);
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

test("invoice print CSS removes screen table width and avoids internal page breaks", () => {
  const css = fs.readFileSync(path.join(__dirname, "../../frontend/admin.css"), "utf8");
  assert.match(css, /@page\{size:A4/);
  assert.match(css, /min-width:0!important/);
  assert.match(css, /table-layout:fixed!important/);
  assert.match(css, /break-inside:avoid!important/);
});

test("invoice shows gift lines and separate automatic/manual shipping discounts", () => {
  assert.match(admin, /🎁 هدية/);
  assert.match(admin, /خصم التوصيل التلقائي/);
  assert.match(admin, /خصم التوصيل اليدوي/);
  assert.match(admin, /store_logo/);
  assert.match(admin, /invoiceLogo/);
});


test("free gifts are not treated as customer return or exchange items",()=>{
  assert.match(server,/GIFT_NOT_RETURNABLE/);
  assert.match(admin,/gift-badge|🎁 هدية/);
});
