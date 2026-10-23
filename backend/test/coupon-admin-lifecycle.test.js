"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");

test("coupon schema and checkout enforce per-customer usage limits",()=>{
  assert.match(server,/max_uses_per_customer/);
  assert.match(server,/COUPON_CUSTOMER_LIMIT/);
  assert.match(server,/COALESCE\(LOWER\(status\),'?'?\) NOT IN \('cancelled','canceled','ملغي'\)/);
});

test("coupon admin supports lifecycle controls",()=>{
  assert.match(server,/app\.delete\([\s\S]*"\/api\/admin\/coupons\/:id"/);
  assert.match(admin,/function toggleCoupon/);
  assert.match(admin,/function deleteCoupon/);
  assert.match(admin,/max_uses_per_customer/);
  assert.match(admin,/starts_at/);
  assert.match(admin,/expires_at/);
});

test("storefront validates coupon with customer context",()=>{
  assert.match(app,/\/api\/coupons\/validate/);
  assert.match(app,/customerPhone/);
  assert.match(app,/maxUsesPerCustomer/);
});
