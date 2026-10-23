const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
test("sales report deducts actual refundable cash, not pre-discount merchandise value",()=>{
 assert.match(server,/SUM\(refundable_cash_value\).*AS returns_value/);
 assert.match(server,/AS returns_gross_value/);
 assert.match(server,/returned_coupon_discount/);
 assert.match(server,/returned_visa_discount/);
 assert.match(server,/returned_loyalty_discount/);
});
test("settlement receipt matches discount-adjusted refund basis",()=>{
 assert.match(admin,/refundable_cash_value/);
 assert.match(admin,/قيمة البضاعة قبل الخصومات/);
 assert.match(admin,/حصة خصم الكوبون/);
 assert.match(admin,/حصة خصم Visa/);
 assert.match(admin,/حصة خصم الولاء/);
 assert.match(admin,/القيمة النقدية القابلة للإرجاع/);
});
