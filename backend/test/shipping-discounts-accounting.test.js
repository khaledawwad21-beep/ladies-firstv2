const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");

test("regional delivery discounts are server authoritative and snapshotted",()=>{
  assert.match(server,/shipping_discount_percentages/);
  assert.match(server,/shipping_base_cost/);
  assert.match(server,/shipping_discount_percent/);
  assert.match(server,/shipping_discount_amount/);
  assert.match(server,/shippingBaseCost\s*\*\s*shippingDiscountPercent\s*\/\s*100/);
});

test("admin can configure a percentage for every delivery region",()=>{
  for(const id of ["shipDiscountWestbank","shipDiscountJerusalem","shipDiscountInside"]) assert.match(admin,new RegExp(id));
  assert.match(admin,/shipping_discount_percentages/);
});

test("storefront applies configured delivery percentages",()=>{
  assert.match(app,/shippingDiscountPercentages/);
  assert.match(app,/discountAmount=baseFee\*discountPercent\/100/);
});

test("invoice exposes delivery base, discount and courier amount",()=>{
  assert.match(admin,/رسوم التوصيل الأصلية/);
  assert.match(admin,/خصم التوصيل/);
  assert.match(admin,/المستحق لشركة التوصيل/);
});

test("sales report excludes courier delivery money",()=>{
  const start=server.indexOf("SALES REPORT");
  const end=server.indexOf("TOP 5 PRODUCTS",start);
  const block=server.slice(start,end);
  assert.match(block,/subtotal - coupon_discount - visa_discount - loyalty_discount/);
  assert.doesNotMatch(block,/SUM\(total\) FILTER/);
});

test("removing a waiver reapplies configured regional delivery discount",()=>{
  const start=server.indexOf('app.patch("/api/admin/orders/:id/shipping-waiver"');
  const block=server.slice(start,start+3500);
  assert.match(block,/shipping_discount_percentages/);
  assert.match(block,/baseShipping\*discountPercent\/100/);
  assert.match(block,/shipping_discount_amount=\$5/);
});
