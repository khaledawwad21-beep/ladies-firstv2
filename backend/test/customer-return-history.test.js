const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
test("customer order details include only the owner's return history",()=>{
 assert.match(server,/FROM return_requests[\s\S]*WHERE order_id=\$1 AND user_id=\$2/);
 assert.match(server,/returns:\s*returnsResult\.rows/);
});
test("customer sees return status, fee payer and exchange settlement",()=>{
 assert.match(app,/سجل الإرجاع والاستبدال/);
 assert.match(app,/المتجر يتحمل رسوم التوصيل/);
 assert.match(app,/رسوم التوصيل على الزبون/);
 assert.match(app,/فرق السعر/);
 assert.match(app,/التسوية معلقة/);
 assert.match(app,/تمت التسوية/);
});
