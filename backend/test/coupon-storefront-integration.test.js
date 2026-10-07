"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");

test("storefront validates coupons against the backend instead of local coupon storage", () => {
  assert.match(app, /validateCouponFromServer/);
  assert.match(app, /\/api\/coupons\/validate/);
  assert.doesNotMatch(app, /load\('lf_coupons'/);
});

test("backend exposes coupon validation and checkout still validates the submitted coupon", () => {
  assert.match(server, /"\/api\/coupons\/validate"/);
  assert.match(server, /COUPON_MINIMUM/);
  assert.match(server, /COUPON_EXHAUSTED/);
  assert.match(server, /UPDATE coupons[\s\S]*used_count/);
});
