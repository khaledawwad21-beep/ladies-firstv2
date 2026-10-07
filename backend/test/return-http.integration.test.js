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
const { app, initDatabase } = require('../src/server');

let server, base, owner, customer, productId, orderId, itemId, returnId;
async function api(path, method='GET', body, token=owner, expected=200) {
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json(); assert.equal(r.status,expected,JSON.stringify(data)); return data;
}
before(async()=>{
 await initDatabase();await require('../src/database-migrations').migrateDatabase();
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 owner=(await api('/api/auth/bootstrap-owner','POST',{name:'Owner',email:'owner@test.example',password:'long-password-123',gender:'male',age:30},null,201)).token;
 customer=(await api('/api/auth/register','POST',{name:'Customer',email:'customer@test.example',password:'long-password-123',gender:'female',age:25},null,201)).token;
 productId=(await api('/api/admin/products','POST',{name:'Return product',active:true,price:100,cost_price:40,stock:5,images:['https://example.com/test.png']},owner,201)).product.id;
 const o=await api('/api/orders','POST',{customerName:'Customer',customerPhone:'+970599000001',shippingAddress:'Test address',shippingRegion:'westbank',paymentMethod:'cash',items:[{productId,quantity:2}]},customer,201);
 orderId=o.orderId||o.order.id;
 itemId=(await api('/api/admin/orders/'+orderId)).items[0].id;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
test('return requires delivery and enforces purchased quantity',async()=>{
 const request={orderId,orderItemId:itemId,quantity:1,requestType:'return',reasonCode:'store_wrong_item',reason:'Wrong item'};
 await api('/api/returns','POST',request,customer,400);
 await api('/api/admin/orders/'+orderId+'/status','PATCH',{status:'delivered'});
 await api('/api/returns','POST',{...request,quantity:3},customer,400);
 returnId=(await api('/api/returns','POST',request,customer,201)).request.id;
});
test('store fault forces free customer delivery and records refund and stock once',async()=>{
 const body={status:'completed',feePayer:'customer',serviceFee:35,storeDeliveryCost:20};
 const a=(await api('/api/admin/returns/'+returnId,'PATCH',body)).request;
 assert.equal(a.fee_payer,'store'); assert.equal(Number(a.service_fee),0);assert.equal(Number(a.store_delivery_cost),20);
 assert.equal(Number(a.return_refund_amount),100);assert.equal(a.return_refund_status,'pending');assert.equal(Number(a.net_settlement),-100);
 const stock=async()=>Number((await api('/api/products/'+productId)).product.stock);
 assert.equal(await stock(),4);
 await api('/api/admin/returns/'+returnId,'PATCH',body);assert.equal(await stock(),4);
 await api('/api/admin/returns/'+returnId,'PATCH',{status:'rejected'},owner,409);
});
test('refund settlement validates transfer reference and is visible to customer',async()=>{
 await api('/api/admin/returns/'+returnId,'PATCH',{status:'completed',returnRefundStatus:'settled',returnRefundMethod:'transfer'},owner,400);
 const a=(await api('/api/admin/returns/'+returnId,'PATCH',{status:'completed',returnRefundStatus:'settled',returnRefundMethod:'transfer',returnRefundReference:'TEST-REFUND-1'})).request;
 assert.equal(a.return_refund_status,'settled');assert.ok(a.return_refund_settled_at);
 const list=await api('/api/returns','GET',null,customer);assert.equal(list.requests[0].return_refund_reference,'TEST-REFUND-1');
});
test('expired delivery blocks a new return',async()=>{
 await query("UPDATE orders SET delivered_at=NOW()-INTERVAL '13 hours' WHERE id=$1",[orderId]);
 await api('/api/returns','POST',{orderId,orderItemId:itemId,quantity:1,requestType:'return',reasonCode:'customer_changed_mind',reason:'Changed mind'},customer,400);
});
test('exchange blocks unsettled difference and moves original and replacement stock once',async()=>{
 await query('UPDATE orders SET delivered_at=NOW() WHERE id=$1',[orderId]);
 const replacement=(await api('/api/admin/products','POST',{name:'Replacement',price:130,cost_price:50,stock:3,images:['https://example.com/replacement.png']},owner,201)).product.id;
 const id=(await api('/api/returns','POST',{orderId,orderItemId:itemId,quantity:1,requestType:'exchange',reasonCode:'store_wrong_item',reason:'Wrong item'},customer,201)).request.id;
 const body={status:'completed',replacementProductId:replacement,feePayer:'customer',serviceFee:35,storeDeliveryCost:20,exchangeSettlementStatus:'pending'};
 await api('/api/admin/returns/'+id,'PATCH',body,owner,409);
 const stock=async p=>Number((await api('/api/products/'+p)).product.stock);
 assert.equal(await stock(productId),4);assert.equal(await stock(replacement),3);
 const done={...body,exchangeSettlementStatus:'settled',exchangeSettlementMethod:'cash'};
 const row=(await api('/api/admin/returns/'+id,'PATCH',done)).request;
 assert.equal(Number(row.price_difference),30);assert.equal(row.fee_payer,'store');assert.equal(Number(row.service_fee),0);
 assert.equal(row.exchange_settlement_direction,'customer_to_store');assert.equal(Number(row.net_settlement),30);
 assert.equal(await stock(productId),5);assert.equal(await stock(replacement),2);
 await api('/api/admin/returns/'+id,'PATCH',done);
 assert.equal(await stock(productId),5);assert.equal(await stock(replacement),2);
 await api('/api/returns','POST',{orderId,orderItemId:itemId,quantity:1,requestType:'return',reasonCode:'other',reason:'Extra return'},customer,400);
});
