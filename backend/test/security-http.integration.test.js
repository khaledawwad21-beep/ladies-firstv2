'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// PGlite runs PostgreSQL SQL in-process; no production connection is used.
const { PGlite } = require(process.env.PGLITE_PATH || '@electric-sql/pglite');
const database = new PGlite();
process.env.JWT_SECRET = 'isolated-product-tests';
async function query(sql, params) { const result = await database.query(sql, params); return { ...result, rowCount: result.rows.length || result.affectedRows || 0 }; }
require.cache[require.resolve('../src/db')] = { exports: { db: query,
  transaction: callback => database.transaction(tx => callback({ query: async (sql, params) => { const r = await tx.query(sql, params); return { ...r, rowCount: r.rows.length || r.affectedRows || 0 }; } })),
  getDatabaseStatus: async () => ({ configured: true, connected: true }), closeDatabase: async () => {} } };
const { initDatabase } = require('../src/server');
const { gateway: app } = require('../src/start');


const {createToken}=require('../src/auth');
let server,base,owner,admin,staff,customer;
async function call(path,method='GET',body,token=owner?.token,headers={}){
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await res.json()}catch{data={}} return {status:res.status,data,headers:res.headers};
}
async function user(role,permissions=[]){
 const r=await query("INSERT INTO users(name,email,password_hash,role,permissions,is_active) VALUES($1,$2,$3,$4,$5::jsonb,TRUE) RETURNING *",[role,role+'@security.example','unused-test-hash',role,JSON.stringify(permissions)]);
 return {...r.rows[0],token:createToken(r.rows[0])};
}
before(async()=>{
 await initDatabase();await require('../src/database-migrations').migrateDatabase();
 owner=await user('owner');admin=await user('admin');staff=await user('staff',['users']);customer=await user('customer');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
test('disabled admin token cannot read private order data',async()=>{
 await query('UPDATE users SET is_active=FALSE WHERE id=$1',[admin.id]);
 try{assert.equal((await call('/api/admin/orders','GET',null,admin.token)).status,401)}finally{await query('UPDATE users SET is_active=TRUE WHERE id=$1',[admin.id])}
});
test('demoted admin token cannot retain administrator access',async()=>{
 await query("UPDATE users SET role='customer' WHERE id=$1",[admin.id]);
 try{assert.equal((await call('/api/admin/orders','GET',null,admin.token)).status,403)}finally{await query("UPDATE users SET role='admin' WHERE id=$1",[admin.id])}
});
test('staff user management cannot overwrite admin login identity',async()=>{
 const r=await call('/api/admin/users/'+admin.id,'PATCH',{email:'taken@security.example'},staff.token);assert.equal(r.status,403);
});
test('staff cannot reset admin password',async()=>{
 const r=await call('/api/admin/users/'+admin.id+'/password','PATCH',{password:'replacement-password-123'},staff.token);assert.equal(r.status,403);
});
test('password change invalidates existing tokens',async()=>{
 await query("UPDATE users SET password_hash='changed-test-hash' WHERE id=$1",[customer.id]);
 assert.equal((await call('/api/orders','GET',null,customer.token)).status,401);
 const current=(await query('SELECT * FROM users WHERE id=$1',[customer.id])).rows[0];customer.token=createToken(current);
 assert.equal((await call('/api/orders','GET',null,customer.token)).status,200);
});
test('staff cannot access paid Tripo administration',async()=>{
 assert.equal((await call('/api/tripo/balance','GET',null,staff.token)).status,403);
});
test('public settings do not expose private integration settings',async()=>{
 await query("INSERT INTO settings(key,value) VALUES('private_provider_token','\"SYNTHETIC-SECRET\"'::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value");
 const r=await call('/api/settings','GET',null,null);assert.equal(r.status,200);assert.equal(r.data.settings.private_provider_token,undefined);
});
test('untrusted browser origins are blocked and security headers are present',async()=>{
 const cross=await call('/api/orders','GET',null,owner.token,{Origin:'https://untrusted.example'});assert.equal(cross.status,403);
 const own=await call('/api/settings','GET',null,null);assert.equal(own.headers.get('x-content-type-options'),'nosniff');assert.equal(own.headers.get('x-frame-options'),'DENY');
});
test('customer cannot access administration or forge unsigned tokens',async()=>{
 assert.equal((await call('/api/admin/users','GET',null,customer.token)).status,403);
 assert.equal((await call('/api/orders','GET',null,'eyJhbGciOiJub25lIn0.eyJpZCI6MSwicm9sZSI6Im93bmVyIn0.')).status,401);
});
test('public catalog hides purchase costs and rejects image attribute injection',async()=>{
 const good=await call('/api/admin/products','POST',{name:'Security product',price:50,cost_price:11,stock:5,images:['https://example.com/image.png']});assert.equal(good.status,201);
 const p=await call('/api/products/'+good.data.product.id,'GET',null,null);assert.equal(p.status,200);assert.equal(p.data.product.cost_price,undefined);
 assert.equal(Number(good.data.product.cost_price),11);
 const adminRead=await call('/api/admin/products');assert.equal(adminRead.status,200);assert.equal(Number(adminRead.data.products.find(p=>p.id==good.data.product.id).cost_price),11);
 assert.equal((await call('/api/admin/products','GET',null,null)).status,401);
 assert.equal((await call('/api/admin/products','GET',null,customer.token)).status,403);
 const bad=await call('/api/admin/products','POST',{name:'Invalid image',price:50,stock:1,images:['https://example.com/x" onerror="window.probe=1']});assert.equal(bad.status,400);
});
test('customer cannot read or return another customer order and prices come from server',async()=>{
 const p=(await call('/api/admin/products','POST',{name:'Isolated order security',price:50,cost_price:11,stock:5,images:['https://example.com/item.png']})).data.product;
 const o=await call('/api/orders','POST',{userId:owner.id,customerName:'Security buyer',customerPhone:'+970599000001',shippingAddress:'Isolated',shippingRegion:'westbank',paymentMethod:'cash',total:0,shipping:0,items:[{productId:p.id,quantity:1}]},customer.token);assert.equal(o.status,201,JSON.stringify(o.data));
 const id=o.data.orderId||o.data.order.id;
 assert.equal((await call('/api/orders/'+id,'GET',null,staff.token)).status,404);
 const own=await call('/api/orders/'+id,'GET',null,customer.token);assert.equal(own.status,200);assert.equal(Number(own.data.order.subtotal),50);assert.equal(Number(own.data.order.user_id),Number(customer.id));assert.equal(own.data.items[0].purchase_price,undefined);
 assert.equal((await call('/api/public/orders/'+id+'?token=forged','GET',null,null)).status,404);
 assert.equal((await call('/api/returns','POST',{orderId:id,orderItemId:own.data.items[0].id,quantity:1,requestType:'return',reasonCode:'other',reason:'Isolated'},staff.token)).status,404);
});
test('SQL injection strings stay data and cookie-only requests do not authenticate',async()=>{
 assert.equal((await call('/api/products?search='+encodeURIComponent("' OR 1=1; DROP TABLE users; --"),'GET',null,null)).status,200);
 assert.equal((await query('SELECT COUNT(*) AS n FROM users')).rows[0].n,4);
 assert.equal((await call('/api/orders','GET',null,null,{Cookie:'token='+owner.token})).status,401);
});
test('login attempts are throttled',async()=>{
 let response;for(let i=0;i<31;i++)response=await call('/api/auth/login','POST',{contact:'absent@security.example',password:'invalid-password-123'},null);
 assert.equal(response.status,429);assert.ok(Number(response.headers.get('retry-after'))>0);
});
test('logout revokes bearer tokens on the server',async()=>{
 const token=customer.token;assert.equal((await call('/api/auth/logout','POST',{},token)).status,200);
 assert.equal((await call('/api/orders','GET',null,token)).status,401);
});
test('untrusted return image links are rejected before persistence',async()=>{
 const r=await call('/api/returns','POST',{images:['javascript:alert(1)']},owner.token);assert.equal(r.status,400);assert.match(r.data.message,/صورة/);
});
test('production owner setup requires a private setup token',async()=>{
 const before=process.env.NODE_ENV;const previous=process.env.BOOTSTRAP_TOKEN;
 try{
  process.env.NODE_ENV='production';process.env.BOOTSTRAP_TOKEN='isolated-setup-token-12345678901234567890';
  assert.equal((await call('/api/auth/bootstrap-owner','POST',{},null)).status,403);
  const unlocked=await call('/api/auth/bootstrap-owner','POST',{password:'long-password-123'},null,{'X-Bootstrap-Token':process.env.BOOTSTRAP_TOKEN});assert.equal(unlocked.status,409);
 }finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;if(previous===undefined)delete process.env.BOOTSTRAP_TOKEN;else process.env.BOOTSTRAP_TOKEN=previous;}
});
