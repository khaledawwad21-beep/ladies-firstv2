"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");

test("checkout validates payment methods and accepts cash/visa only", () => {
  assert.match(server, /normalizePaymentMethod/);
  assert.match(server, /\["cash",\s*"visa"\]\.includes\(paymentMethod\)/);
});

test("customer order history is authenticated and exposes product details", () => {
  assert.match(server, /app\.get\(\s*"\/api\/orders",\s*requireAuth/s);
  assert.match(server, /'productName',\s*oi\.product_name/s);
  assert.match(server, /'variantName',\s*oi\.variant_name/s);
  assert.match(server, /'image',\s*oi\.image/s);
  assert.match(server, /'quantity',\s*oi\.quantity/s);
});

test("cancellation restores inventory and records an auditable movement", () => {
  assert.match(server, /isNewCancellation[\s\S]*UPDATE product_variants[\s\S]*stock[\s\S]*\+\s*\$1/);
  assert.match(server, /isNewCancellation[\s\S]*UPDATE products[\s\S]*stock[\s\S]*\+\s*\$1/);
  assert.match(server, /'order_cancel_return'/);
});

test("cancellation reverses awarded loyalty points only once", () => {
  assert.match(server, /!order\.loyalty_points_reversed/);
  assert.match(server, /'order_reversal'/);
  assert.match(server, /loyalty_points_reversed\s*=\s*TRUE/);
});

test("delivery timestamp is persisted for the 12-hour return window", () => {
  assert.match(server, /delivered_at\s*=\s*CASE WHEN \$1 = 'delivered'/);
  assert.match(server, /12\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(server, /RETURN_WINDOW_EXPIRED/);
});

test("return/exchange processing is authenticated and inventory-aware", () => {
  assert.match(server, /app\.post\("\/api\/returns",\s*requireAuth/);
  assert.match(server, /['"]customer_return['"]/);
  assert.match(server, /['"]customer_exchange_return['"]/);
  assert.match(server, /['"]customer_exchange_out['"]/);
  assert.match(server, /REPLACEMENT_OUT_OF_STOCK/);
});

test("admin return fees explicitly support customer, store, or waived", () => {
  assert.match(server, /\["customer","store","waived"\]\.includes\(requestedFeePayer\)/);
  assert.match(server, /service_fee/);
  assert.match(server, /fee_reason/);
});

test("shipping waiver and loyalty ledger endpoints are protected", () => {
  assert.match(server, /app\.patch\(\s*"\/api\/admin\/orders\/:id\/shipping-waiver",\s*requireAdmin/s);
  assert.match(server, /app\.get\(\s*"\/api\/loyalty",\s*requireAuth/s);
});
