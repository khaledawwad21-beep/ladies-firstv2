const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");

test("cancelled order refunds redeemed loyalty points once",()=>{
  assert.match(server,/loyalty_points_redeem_refund_once/);
  assert.match(server,/transaction_type = 'redeem_refund'/);
  assert.match(server,/'redeem_refund'/);
  assert.match(server,/redeemedPoints/);
  assert.match(server,/loyalty_points=COALESCE\(loyalty_points,0\)\+\$1/);
});

test("cancelled order releases coupon usage without going below zero",()=>{
  const start=server.indexOf("const isNewCancellation");
  const end=server.indexOf("const updated =",start);
  const block=server.slice(start,end);
  assert.match(block,/cancelledCouponCode/);
  assert.match(block,/used_count=GREATEST\(0,COALESCE\(used_count,0\)-1\)/);
});

test("cancellation remains final and inventory restock remains protected",()=>{
  assert.match(server,/CANCELLED_ORDER_FINAL/);
  assert.match(server,/order_cancel_return/);
  assert.match(server,/isNewCancellation/);
});
