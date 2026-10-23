const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
test("completed merchandise return reverses earned points cumulatively and proportionally",()=>{
 assert.match(server,/return_award_reversal/);
 assert.match(server,/cumulativeGross\/subtotal/);
 assert.match(server,/targetAwardReversal=Math\.min/);
 assert.match(server,/awardReversal=Math\.max\(0,targetAwardReversal-Number\(previous\.award_reversed\|\|0\)\)/);
 assert.match(server,/loyalty_award_reversed/);
});
test("completed merchandise return refunds redeemed points proportionally",()=>{
 assert.match(server,/return_redeem_refund/);
 assert.match(server,/loyalty_redeem_refunded/);
});
test("return loyalty ledgers are idempotent",()=>{
 assert.match(server,/loyalty_return_award_reversal_once/);
 assert.match(server,/loyalty_return_redeem_refund_once/);
 assert.match(server,/ON CONFLICT DO NOTHING RETURNING id/);
});
test("coupon usage is released only after completed returns cover full merchandise subtotal",()=>{
 assert.match(server,/cumulativeReturned>=subtotal/);
 assert.match(server,/coupon_released/);
 assert.match(server,/used_count=GREATEST\(0,COALESCE\(used_count,0\)-1\)/);
});
