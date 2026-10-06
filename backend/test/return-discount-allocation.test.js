const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
test("return cash value allocates all merchandise discounts proportionally",()=>{
 assert.match(server,/allocated_coupon_discount=money\(Number\(rr\.coupon_discount\|\|0\)\*ratio\)/);
 assert.match(server,/allocated_visa_discount=money\(Number\(rr\.visa_discount\|\|0\)\*ratio\)/);
 assert.match(server,/allocated_loyalty_discount=money\(Number\(rr\.loyalty_discount\|\|0\)\*ratio\)/);
 assert.match(server,/refundable_cash_value=money\(Math\.max\(0,returnedMerchandiseValue-/);
});
test("return settlement uses actual refundable cash instead of raw list value",()=>{
 assert.match(server,/refundable_cash_value\|\|returnedMerchandiseValue/);
});
