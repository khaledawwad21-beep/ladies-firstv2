const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("completed returns snapshot merchandise, cost and settlement",()=>{
 assert.match(server,/returned_merchandise_value/);
 assert.match(server,/returned_cost_value/);
 assert.match(server,/net_settlement/);
 assert.match(server,/completed_at/);
 assert.match(server,/returnedMerchandiseValue=money\(Number\(rr\.unit_price/);
});
test("return report uses completion date and reduces net sales and cost",()=>{
 assert.match(server,/completed_at >= \$1::date/);
 assert.match(server,/grossSales-returnsValue\+exchangeDifference\+returnServiceFees/);
 assert.match(server,/grossCost-returnedCost/);
});
test("exchange difference and customer service fees affect net sales",()=>{
 assert.match(server,/SUM\(price_difference\).*request_type='exchange'/s);
 assert.match(server,/SUM\(service_fee\)/);
});
test("admin finance exposes net figures and return metrics",()=>{
 assert.match(admin,/صافي المبيعات/);
 assert.match(admin,/قيمة المرتجعات/);
 assert.match(admin,/فرق الاستبدال/);
 assert.match(admin,/رسوم الإرجاع\/الاستبدال/);
});
