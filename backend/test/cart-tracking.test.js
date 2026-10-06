"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  normalizeCartItems,
  stockForItem
} = require("../src/cart-tracking");

test("cart snapshots normalize valid lines and remove duplicates", () => {
  const items = normalizeCartItems([
    { id: 7, qty: 2, variant: "وردي" },
    { productId: "7", quantity: 4, variantName: "وردي" },
    { productId: 8, qty: 1 },
    { productId: -1, qty: 1 },
    { productId: 9, qty: 0 }
  ]);

  assert.deepEqual(items, [
    { productId: 7, qty: 2, variant: "وردي", packagingId: "" },
    { productId: 8, qty: 1, variant: "", packagingId: "" }
  ]);
});

test("low-stock lookup prefers a matching variant", () => {
  const products = new Map([
    [7, { id: 7, stock: 20 }]
  ]);
  const variants = new Map([
    [7, [
      { color: "وردي", size: null, stock: 2 },
      { color: "أسود", size: null, stock: 9 }
    ]]
  ]);

  assert.equal(
    stockForItem({ productId: 7, variant: "وردي" }, products, variants),
    2
  );
  assert.equal(
    stockForItem({ productId: 7, variant: "" }, products, variants),
    20
  );
});

test("server wires cart tracking and customer profile persists WhatsApp consent", () => {
  const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  assert.match(server, /cart-tracking['"]\)\.initCartTracking\(db\)/);
  assert.match(server, /registerCartTrackingRoutes\(app/);
  assert.match(server, /whatsapp_opt_in_updated_at/);
});

test("storefront sends cart heartbeats and persists WhatsApp consent to the API", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
  assert.match(app, /\/api\/cart\/snapshot/);
  assert.match(app, /whatsapp_opt_in:v/);
  assert.doesNotMatch(app, /async function lfCartHeartbeat\(\)\{return\}/);
});
