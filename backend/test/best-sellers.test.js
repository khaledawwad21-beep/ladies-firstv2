'use strict';
const {test,before,beforeEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const database=new PGlite();
require.cache[require.resolve('../src/db')]={exports:{db:(sql,params)=>database.query(sql,params)}};
const app=require('express')();
require('../src/best-sellers').registerBestSellers(app);
let server,base;
before(async()=>{
  await database.exec(`
    CREATE TABLE products(id BIGINT PRIMARY KEY,stock INT,is_active BOOLEAN);
    CREATE TABLE product_variants(id BIGINT PRIMARY KEY,product_id BIGINT,stock INT,is_active BOOLEAN);
    CREATE TABLE orders(id BIGINT PRIMARY KEY,status TEXT,created_at TIMESTAMPTZ);
    CREATE TABLE order_items(product_id BIGINT,order_id BIGINT,quantity INT,product_name TEXT,is_gift BOOLEAN NOT NULL DEFAULT FALSE);
  `);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
beforeEach(async()=>{
  await database.exec(`TRUNCATE products,product_variants,orders,order_items;
    INSERT INTO products VALUES (1,3,TRUE),(2,3,TRUE),(3,0,TRUE),(4,3,FALSE),(5,0,TRUE),(6,2,TRUE),(7,2,TRUE),(8,99,TRUE);
    INSERT INTO product_variants VALUES (1,5,2,TRUE),(2,5,100,FALSE),(3,8,0,TRUE);
    INSERT INTO orders VALUES (1,'delivered',NOW()-INTERVAL '8 days'),(2,'confirmed',NOW()-INTERVAL '1 day'),
      (3,'cancelled',NOW()),(4,'CANCELED',NOW()),(5,'ملغي',NOW()),(6,'pending',NOW()+INTERVAL '1 day');
    INSERT INTO order_items(product_id,order_id,quantity,product_name) VALUES
      (1,1,30,'Old'),(2,2,2,'Old product name'),(2,2,3,'Renamed product'),
      (3,2,100,'Sold out'),(4,2,100,'Disabled'),(5,2,3,'Available variant'),(6,2,5,'Tie'),
      (7,3,100,'Cancelled'),(7,4,100,'Cancelled'),(7,5,100,'Cancelled'),(7,6,100,'Future'),
      (8,2,100,'Variants sold out'),(999,2,100,'Deleted product');
    INSERT INTO order_items(product_id,order_id,quantity,product_name,is_gift)
      VALUES (2,2,999,'Free gift',TRUE);`);
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
async function read(){const response=await fetch(base+'/api/store/best-sellers');assert.equal(response.status,200);return response.json();}
test('public ranking aggregates by product across names, uses weekly sales and ignores cancelled, future, unavailable and deleted products',async()=>{
  const data=await read();assert.equal(data.period,'week');
  assert.deepEqual(data.bestSellers.map(x=>[Number(x.productId),x.quantity]),[[2,5],[6,5],[5,3]]);
  assert.deepEqual(Object.keys(data).sort(),['bestSellers','ok','period']);
});
test('no eligible sales in the last seven days falls back to all-time totals',async()=>{
  await database.exec("UPDATE orders SET created_at=NOW()-INTERVAL '9 days' WHERE id=2");
  const data=await read();assert.equal(data.period,'all_time');
  assert.deepEqual(data.bestSellers.map(x=>[Number(x.productId),x.quantity]),[[1,30],[2,5],[6,5],[5,3]]);
});
test('empty history yields no invented products and ranking is capped at five',async()=>{
  await database.exec('DELETE FROM order_items');assert.deepEqual((await read()).bestSellers,[]);
  for(let id=10;id<17;id++) {
    await database.query('INSERT INTO products VALUES($1,2,TRUE)',[id]);
    await database.query("INSERT INTO order_items(product_id,order_id,quantity,product_name) VALUES($1,2,$2,'Product')",[id,id]);
  }
  assert.deepEqual((await read()).bestSellers.map(x=>Number(x.productId)),[16,15,14,13,12]);
});
test('storefront uses the public ranking, preserves Top 5 offers, handles failed loads and ignores late responses',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../frontend/app.js'),'utf8');
  const pending=[];
  const context=vm.createContext({window:{},currentLang:'ar',products:[{id:1,stock:4,price:10,old:20,onSale:true,top5:true},{id:2,stock:2,price:15}],totalStock:p=>p.stock,load:()=>{throw Error('Personal order history must not determine store rankings');},renderFeatureSections:()=>{},console:{warn:()=>{}},lfFetch:url=>{assert.equal(url,'/api/store/best-sellers');return new Promise((resolve,reject)=>pending.push({resolve,reject}));}});
  vm.runInContext(source.slice(source.indexOf('function isOfferActive('),source.indexOf('function scrollFeature(')),context);
  vm.runInContext(source.slice(source.indexOf('let lfFeaturedRequest='),source.indexOf('async function lfSyncMe(')),context);
  assert.equal(context.getBestSellers().length,0);
  const first=context.lfSyncFeatured();const second=context.lfSyncFeatured();
  pending[1].resolve({period:'week',bestSellers:[{productId:'2',quantity:9}]});await second;
  assert.equal(context.getBestSellers()[0].p.id,2);assert.equal(context.getBestSellers()[0].qty,9);
  assert.equal(context.getTop5()[0].id,1);
  pending[0].resolve({period:'all_time',bestSellers:[{productId:1,quantity:100}]});await first;
  assert.equal(context.getBestSellers()[0].p.id,2);
  const failed=context.lfSyncFeatured();pending[2].reject(Error('Network failure'));await failed;
  assert.equal(context.getBestSellers().length,0);assert.match(context.bestSellersEmptyMessage(),/تعذر تحميل/);
  const retry=context.lfSyncFeatured();pending[3].resolve({period:'all_time',bestSellers:[]});await retry;
  assert.equal(context.window.LF_BEST_SELLERS_STATUS,'ready');assert.match(context.bestSellersEmptyMessage(),/لا توجد/);
});
