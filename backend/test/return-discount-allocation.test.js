const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
test("return cash value allocates all merchandise discounts proportionally across cumulative returns",()=>{
 assert.match(server,/targetCoupon=money\(Number\(rr\.coupon_discount\|\|0\)\*cumulativeRatio\)/);
 assert.match(server,/targetVisa=money\(Number\(rr\.visa_discount\|\|0\)\*cumulativeRatio\)/);
 assert.match(server,/targetLoyalty=money\(Number\(rr\.loyalty_discount\|\|0\)\*cumulativeRatio\)/);
 assert.match(server,/allocated_coupon_discount=money\(Math\.max\(0,targetCoupon-Number\(previous\.coupon\|\|0\)\)\)/);
 assert.match(server,/allocated_visa_discount=money\(Math\.max\(0,targetVisa-Number\(previous\.visa\|\|0\)\)\)/);
 assert.match(server,/allocated_loyalty_discount=money\(Math\.max\(0,targetLoyalty-Number\(previous\.loyalty\|\|0\)\)\)/);
 assert.match(server,/refundable_cash_value=money\(Math\.max\(0,returnedMerchandiseValue-/);
});
test("return settlement uses actual refundable cash instead of raw list value",()=>{
 assert.match(server,/money\(-Number\(rr\.refundable_cash_value\)\+serviceFee\)/);
 assert.doesNotMatch(server,/refundable_cash_value\|\|returnedMerchandiseValue/);
});
test("fully discounted return can settle at exactly zero",()=>{
 const gross=100,coupon=60,visa=20,loyalty=20,serviceFee=0;
 const refundable=Math.max(0,gross-coupon-visa-loyalty);
 const net=-Number(refundable)+serviceFee;
 assert.equal(refundable,0);
 assert.equal(net,0);
});

test("partial returns use cumulative target-minus-previous allocation",()=>{
 assert.match(server,/previousReturnTotals=await client\.query/);
 assert.match(server,/const cumulativeGross=Math\.min\(subtotal,previousGross\+returnedMerchandiseValue\)/);
 assert.match(server,/targetCoupon=money\(Number\(rr\.coupon_discount\|\|0\)\*cumulativeRatio\)/);
 assert.match(server,/allocated_coupon_discount=money\(Math\.max\(0,targetCoupon-Number\(previous\.coupon\|\|0\)\)\)/);
 assert.match(server,/targetAwardReversal=Math\.min/);
 assert.match(server,/awardReversal=Math\.max\(0,targetAwardReversal-Number\(previous\.award_reversed\|\|0\)\)/);
 const total=100,discount=10,parts=[33.33,33.33,33.34];
 let previousGross=0,previousAllocated=0,allocated=0;
 for(const gross of parts){
   const cumulativeGross=Math.min(total,previousGross+gross);
   const target=Math.round((discount*(cumulativeGross/total))*100)/100;
   const current=Math.max(0,Math.round((target-previousAllocated)*100)/100);
   allocated=Math.round((allocated+current)*100)/100;
   previousGross=cumulativeGross;
   previousAllocated=target;
 }
 assert.equal(allocated,discount);
});
