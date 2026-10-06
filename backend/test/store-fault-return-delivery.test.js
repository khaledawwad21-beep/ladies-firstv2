const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("store fault reasons force the store to pay return delivery",()=>{
 assert.match(server,/storeFaultReasons/);
 assert.match(server,/المنتج تالف/);
 assert.match(server,/المنتج مختلف عن الطلب/);
 assert.match(server,/if\(storeFault\)requestedFeePayer="store"/);
});
test("store delivery cost is snapshotted and deducted from profit",()=>{
 assert.match(server,/store_delivery_cost/);
 assert.match(server,/store_fault/);
 assert.match(server,/netProfit=money\(netSales-netCost-storeDeliveryCost\)/);
});
test("admin captures actual courier cost paid by the store",()=>{
 assert.match(admin,/rrStoreDeliveryCost/);
 assert.match(admin,/تكلفة شركة التوصيل على المتجر/);
 assert.match(admin,/خطأ من المتجر/);
 assert.match(admin,/توصيل أخطاء المتجر/);
});
