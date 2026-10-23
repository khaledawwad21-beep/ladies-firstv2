"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

function loadDiscountHelper() {
  const start = app.indexOf("function calculateDiscountBreakdown");
  const end = app.indexOf("function getCartTotals", start);
  assert.ok(start >= 0 && end > start, "calculateDiscountBreakdown helper is missing");
  const source = app.slice(start, end).trim();
  return vm.runInNewContext("(" + source + ")");
}

test("storefront applies coupon before Visa exactly like backend checkout", () => {
  const calculate = loadDiscountHelper();

  const fixed = calculate(200, "visa", { type: "fixed", value: 20 }, 10);
  assert.equal(fixed.couponDiscount, 20);
  assert.equal(fixed.visaDiscount, 18);
  assert.equal(fixed.afterDiscounts, 162);
  assert.equal(fixed.afterDiscounts + 15, 177);

  const percent = calculate(200, "visa", { type: "percent", value: 10 }, 10);
  assert.equal(percent.couponDiscount, 20);
  assert.equal(percent.visaDiscount, 18);
  assert.equal(percent.afterDiscounts, 162);
});

test("non-Visa checkout does not apply a Visa discount", () => {
  const calculate = loadDiscountHelper();
  const result = calculate(200, "cod", { type: "fixed", value: 20 }, 10);
  assert.equal(result.couponDiscount, 20);
  assert.equal(result.visaDiscount, 0);
  assert.equal(result.afterDiscounts, 180);
});

test("getCartTotals uses the shared backend-consistent discount breakdown", () => {
  assert.match(app, /const discounts=calculateDiscountBreakdown\(/);
  assert.match(app, /visaDiscount:discounts\.visaDiscount/);
  assert.match(app, /couponDiscount:discounts\.couponDiscount/);
  assert.doesNotMatch(app, /const afterVisa=Math\.max\(0,subtotal-visaDiscount\)/);
});
