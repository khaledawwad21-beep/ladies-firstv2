"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../../frontend/admin.html"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

test("admin navigation exposes returns under order permission", () => {
  assert.match(html, /data-s="returns"/);
  assert.match(admin, /returns:'الإرجاع والاستبدال'/);
  assert.match(admin, /returns:'orders'/);
  assert.match(admin, /if\(sec==='returns'\)return returnsAdmin\(\)/);
});

test("admin returns UI loads requests and manages fees and replacements", () => {
  assert.match(admin, /api\('\/api\/admin\/returns'\)/);
  assert.match(admin, /\/api\/admin\/returns\/'\+id/);
  assert.match(admin, /feePayer/);
  assert.match(admin, /serviceFee/);
  assert.match(admin, /feeReason/);
  assert.match(admin, /replacementProductId/);
  assert.match(admin, /replacementVariantId/);
  assert.match(admin, /updateReturnReplacementVariants/);
  assert.match(admin, /تنفيذ حركة المخزون/);
});

test("server remains authoritative for return completion and fee responsibility", () => {
  assert.match(server, /\["customer","store","waived"\]\.includes\(requestedFeePayer\)/);
  assert.match(server, /customer_return/);
  assert.match(server, /customer_exchange_return/);
  assert.match(server, /customer_exchange_out/);
  assert.match(server, /REPLACEMENT_OUT_OF_STOCK/);
  assert.match(server, /priceDifference=money/);
});
