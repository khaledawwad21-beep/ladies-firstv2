const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("canonical store-fault reason codes force the store to pay return delivery",()=>{
 assert.match(server,/canonicalStoreFaultCodes=new Set\(\["store_damaged","store_wrong_item","store_missing_item"\]\)/);
 assert.match(server,/canonicalStoreFaultCodes\.has\(String\(rr\.reason_code\|\|""\)\.toLowerCase\(\)\)/);
 assert.match(server,/if\(storeFault\)requestedFeePayer="store"/);
 assert.doesNotMatch(server,/storeFaultReasons/);
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

test("storefront submits canonical reason code plus readable reason text",()=>{
 const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
 assert.match(app,/value="store_damaged">المنتج تالف/);
 assert.match(app,/value="store_wrong_item">المنتج مختلف عن الطلب/);
 assert.match(app,/value="store_missing_item">يوجد نقص في الطلب/);
 assert.match(app,/reasonCode=reasonEl\?\.value/);
 assert.match(app,/reasonCode,reason,notes,images/);
});
test("existing return rows are backfilled to canonical reason codes",()=>{
 assert.match(server,/ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS reason_code TEXT/);
 assert.match(server,/THEN 'store_damaged'/);
 assert.match(server,/THEN 'store_wrong_item'/);
 assert.match(server,/THEN 'store_missing_item'/);
});
