const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");

test("shipping waiver restoration uses the order's delivery snapshot",()=>{
  const start=server.indexOf('app.patch("/api/admin/orders/:id/shipping-waiver"');
  assert.ok(start>=0,"shipping waiver route is missing");
  const block=server.slice(start,start+3200);
  assert.match(block,/shipping_base_cost/);
  assert.match(block,/shipping_discount_percent/);
  assert.match(block,/shipping_discount_amount/);
  assert.match(block,/shipping_manual_discount_percent/);
  assert.match(block,/shipping_manual_discount_amount/);
  assert.match(block,/normalShipping/);
  assert.doesNotMatch(block,/getSetting\("shipping_fees"/);
  assert.doesNotMatch(block,/fees=\{westbank:20,jerusalem:35,inside:70\}/);
});
