const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");

test("shipping waiver restoration uses configured regional fees",()=>{
  const start=server.indexOf('app.patch("/api/admin/orders/:id/shipping-waiver"');
  assert.ok(start>=0,"shipping waiver route is missing");
  const block=server.slice(start,start+2600);
  assert.match(block,/getSetting\("shipping_fees"/);
  assert.match(block,/configuredFees\?\.westbank/);
  assert.doesNotMatch(block,/const o=q\.rows\[0\],fees=\{westbank:20,jerusalem:35,inside:70\}/);
});
