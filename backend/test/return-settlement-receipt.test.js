const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("completed returns and exchanges expose a settlement receipt",()=>{
 assert.match(admin,/x\.status==='completed'.*وصل التسوية/);
 assert.match(admin,/function printReturnSettlement/);
 assert.match(admin,/مرتبط بالفاتورة\/الطلب الأصلي/);
});
test("settlement receipt explains courier cost and signed exchange settlement",()=>{
 assert.match(admin,/تكلفة توصيل تحملها Ladies First/);
 assert.match(admin,/مصروف على المتجر/);
 assert.match(admin,/فرق السعر/);
 assert.match(admin,/طريقة التسوية/);
 assert.match(admin,/هذا وصل تسوية مرتبط بالفاتورة الأصلية ولا يستبدلها/);
});
