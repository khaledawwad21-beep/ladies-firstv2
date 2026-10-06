const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("exchange settlement direction follows signed price difference",()=>{
 assert.match(server,/priceDifference>0\?"customer_to_store":priceDifference<0\?"store_to_customer":"none"/);
 assert.match(server,/exchange_settlement_amount/);
});
test("exchange cannot complete before a required price difference is settled",()=>{
 assert.match(server,/EXCHANGE_SETTLEMENT_PENDING/);
 assert.match(server,/exchangeSettlementStatus!=="settled"/);
});
test("settled exchange requires a settlement method",()=>{
 assert.match(server,/EXCHANGE_SETTLEMENT_METHOD_REQUIRED/);
 assert.match(server,/exchange_settled_at/);
});
test("admin exposes settlement status and payment/refund method",()=>{
 assert.match(admin,/rrExchangeSettlementStatus/);
 assert.match(admin,/rrExchangeSettlementMethod/);
 assert.match(admin,/رصيد متجر/);
 assert.match(admin,/الموجب على الزبون، والسالب مستحق للزبون/);
});
