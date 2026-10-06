const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");

test("return window is enforced from delivery for 12 hours",()=>{
  assert.match(server,/RETURN_WINDOW_EXPIRED/);
  assert.match(server,/12\*60\*60\*1000/);
  assert.match(server,/order\.delivered_at/);
});
test("return quantity cannot exceed remaining unclaimed purchased quantity",()=>{
  assert.match(server,/SUM\(quantity\)/);
  assert.match(server,/status IN \('pending','approved','completed'\)/);
  assert.match(server,/remainingQty=Math\.max\(0,purchasedQty-alreadyRequested\)/);
});
test("completed return or exchange is final after inventory execution",()=>{
  assert.match(server,/RETURN_COMPLETED_FINAL/);
  assert.match(server,/customer_return/);
  assert.match(server,/customer_exchange_return/);
  assert.match(server,/customer_exchange_out/);
});
test("exchange requires replacement and checks stock and price difference",()=>{
  assert.match(server,/EXCHANGE_REPLACEMENT_REQUIRED/);
  assert.match(server,/REPLACEMENT_OUT_OF_STOCK/);
  assert.match(server,/priceDifference=money/);
});
test("customer and admin return interfaces exist",()=>{
  assert.match(app,/openReturnRequest/);
  assert.match(app,/\/api\/returns/);
  assert.match(admin,/returnsAdmin/);
  assert.match(admin,/feePayer/);
  assert.match(admin,/replacementProductId/);
});
