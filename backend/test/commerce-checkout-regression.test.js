'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const database=new PGlite();
process.env.JWT_SECRET='isolated-commerce-regressions';
const adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
const db=async(s,p)=>adapt(await database.query(s,p));
require.cache[require.resolve('../src/db')]={exports:{db,transaction:fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))})),getDatabaseStatus:async()=>({configured:true,connected:true})}};
const {app,initDatabase}=require('../src/server');
const {migrateDatabase}=require('../src/database-migrations');
const {createToken}=require('../src/auth');
let server,base,token;
async function api(path,method='GET',body,auth=token){
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
}
async function create(name,extra={}){
 const r=await api('/api/admin/products','POST',{name,price:100,stock:5,active:true,images:['https://example.test/product.png'],...extra});
 assert.equal(r.status,201,JSON.stringify(r.body));return r.body.product;
}
const checkout=items=>api('/api/orders','POST',{customerName:'Regression',customerPhone:'+970599000001',shippingAddress:'Test address',shippingRegion:'westbank',paymentMethod:'cash',items},null);
function storefront(product,variant){
 const src=fs.readFileSync(require.resolve('../../frontend/app.js'),'utf8');
 const names=['variantList','productUnitPrice','productPriceAvailable','cartMerchandiseSubtotal','makeOrderItems'];
 const functions=names.map(name=>src.split('\n').find(l=>l.startsWith('function '+name+'('))).filter(Boolean).join('\n');
 const context={products:[{...product,id:Number(product.id)}],cart:[{id:Number(product.id),qty:1,variant}],getPackaging:()=>null,storeCommerceSettings:{},LFCommerce:require('../../frontend/commerce-pricing'),Date};
 return vm.runInNewContext(functions+';({items:makeOrderItems("cod"),subtotal:cartMerchandiseSubtotal()})',context);
}
before(async()=>{
 await initDatabase();await migrateDatabase();
 const owner=(await db("INSERT INTO users(name,password_hash,role) VALUES('Owner','unused','owner') RETURNING *")).rows[0];token=createToken(owner);
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
test('actual storefront item preserves color identity and price through checkout and cancellation',async()=>{
 const p=await create('Colors',{variants:[{name:'Gold',stock:5},{name:'Black',stock:3}]});
 await db('UPDATE product_variants SET price=125 WHERE product_id=$1 AND color=$2',[p.id,'Gold']);
 const publicProduct=(await api('/api/products/'+p.id)).body.product;
 const generated=storefront(publicProduct,'Gold');
 assert.equal(generated.subtotal,125);assert.equal(generated.items[0].price,125);assert.ok(generated.items[0].variantId);
 // The production placeOrder request contract, including variant ID from makeOrderItems.
 const r=await checkout(generated.items.map(i=>({productId:i.productId,variantId:i.variantId,variantName:i.variant,quantity:i.qty})));
 assert.equal(r.status,201,JSON.stringify(r.body));const id=r.body.orderId||r.body.order.id;
 const item=(await db('SELECT * FROM order_items WHERE order_id=$1',[id])).rows[0];
 assert.equal(Number(item.variant_id),Number(publicProduct.variants[0].id));assert.equal(item.variant_name,'Gold');assert.equal(Number(item.unit_price),125);
 assert.equal(Number((await db('SELECT stock FROM product_variants WHERE id=$1',[item.variant_id])).rows[0].stock),4);
 assert.equal(Number((await db('SELECT stock FROM product_variants WHERE product_id=$1 AND color=$2',[p.id,'Black'])).rows[0].stock),3);
 assert.equal((await api('/api/admin/orders/'+id+'/status','PATCH',{status:'cancelled',cancelSource:'admin'})).status,200);
 assert.equal(Number((await db('SELECT stock FROM product_variants WHERE id=$1',[item.variant_id])).rows[0].stock),5);
});
test('legacy named colors resolve safely; missing, invalid and foreign IDs cannot consume base stock',async()=>{
 const p=await create('Legacy colors',{variants:[{name:'Rose',stock:2},{name:'Black',stock:2}]});
 const r=await checkout([{productId:p.id,variantId:null,variantName:'Rose',quantity:1}]);assert.equal(r.status,201,JSON.stringify(r.body));
 const saved=(await db('SELECT variant_name FROM order_items WHERE order_id=$1',[r.body.orderId||r.body.order.id])).rows[0];assert.equal(saved.variant_name,'Rose');
 for(const fields of [{},{variantName:'Deleted'},{variantId:999999}]){
  const before=(await db('SELECT stock FROM products WHERE id=$1',[p.id])).rows[0].stock;
  assert.equal((await checkout([{productId:p.id,quantity:1,...fields}])).status,400);
  assert.equal((await db('SELECT stock FROM products WHERE id=$1',[p.id])).rows[0].stock,before);
 }
});
test('catalog and checkout use original price before/after scheduled sales; admin retains editable sale price',async()=>{
 for(const [name,start,end] of [['Future','2099-01-01','2099-01-02'],['Expired','2000-01-01','2000-01-02']]){
  const p=await create(name,{oldPrice:150,metadata:{onSale:true,saleStartsAt:start,saleEndsAt:end}});
  assert.equal(Number(p.price),100);
  const visible=(await api('/api/products/'+p.id)).body.product;assert.equal(Number(visible.price),150);assert.equal(visible.offerActive,false);
  const r=await checkout([{productId:p.id,quantity:1}]);assert.equal(r.status,201);
  assert.equal(Number((await db('SELECT subtotal FROM orders WHERE id=$1',[r.body.orderId||r.body.order.id])).rows[0].subtotal),150);
 }
 const p=await create('Current',{oldPrice:150,metadata:{onSale:true,saleStartsAt:'2000-01-01',saleEndsAt:'2099-01-01'}});
 assert.equal(Number((await api('/api/products/'+p.id)).body.product.price),100);
});
test('zero-priced merchandise is unavailable for purchase without stock or order mutation',async()=>{
 const p=await create('Unpriced',{price:0});
 const before=Number((await db('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n);
 const r=await checkout([{productId:p.id,quantity:1}]);assert.equal(r.status,409);assert.equal(r.body.code,'PRICE_UNAVAILABLE');
 assert.equal(Number((await db('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n),before);
 assert.equal(Number((await db('SELECT stock FROM products WHERE id=$1',[p.id])).rows[0].stock),5);
});
