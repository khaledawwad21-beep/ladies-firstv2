"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

test("storefront centralizes the agreed stock messages", () => {
  assert.match(app, /function outOfStockMessage\(\)/);
  assert.match(app, /💕 عذرًا سيدتي، خلصت الكمية🌸/);
  assert.match(app, /function insufficientStockMessage\(stock\)/);
  assert.match(app, /المتوفر حاليًا.*قطع … يمكنك إضافة عدد القطع المتاحة/);
  assert.match(app, /function lowStockMessage\(stock\)/);
  assert.match(app, /استغلي الفرصة لآخر.*قطع/);
  assert.doesNotMatch(app, /استغلي الفرصة! آخر/);
  assert.doesNotMatch(app, /قطع فقط 🌸\\nيمكنك إضافة عدد القطع المتاحة/);
});

test("checkout uses the same authoritative stock copy", () => {
  assert.match(server, /function stockAvailabilityMessage\(stock\)/);
  assert.match(server, /💕 عذرًا سيدتي، خلصت الكمية🌸/);
  assert.match(server, /المتوفر حاليًا.*قطع … يمكنك إضافة عدد القطع المتاحة/);
  assert.match(server, /if \(quantity > availableStock\)/);
  assert.match(server, /stockAvailabilityMessage\(availableStock\)/);
});
