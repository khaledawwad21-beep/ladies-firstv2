'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const {calculateQuote,initOfferLab,registerOfferLab}=require('../src/marketing-offer-lab');
const database=new PGlite(),db=(s,v)=>database.query(s,v);
let server,base,calls=0,fail=false,lastBody;
const input=()=>({title:'باقة اختبار',goal:'طلبات مربحة',items:[{product_id:1,variant_id:null,quantity:2,cost_override:null}],discount_mode:'percent',discount_value:10,coupon_percent:10,loyalty_discount:5,packaging_cost:2,shipping_support:3,other_cost:1,failure_reserve:4,ad_cost:10,payment_fee_percent:2,target_profit:15,media_budget:100,goal_orders:3,days:7,platform:'instagram',region:'all',starts_at:null,ends_at:null});
test.before(async()=>{
 await db('CREATE TABLE products(id BIGSERIAL PRIMARY KEY,name TEXT,price NUMERIC,cost_price NUMERIC,stock INT,image_url TEXT,is_active BOOLEAN DEFAULT TRUE)');
 await db('CREATE TABLE product_variants(id BIGSERIAL PRIMARY KEY,product_id BIGINT,color TEXT,size TEXT,price NUMERIC,stock INT,is_active BOOLEAN DEFAULT TRUE)');
 await db('CREATE TABLE rate_limit_counters(bucket_key TEXT,window_start TIMESTAMPTZ,request_count INT,max_count INT,expires_at TIMESTAMPTZ,PRIMARY KEY(bucket_key,window_start))');
 await db("INSERT INTO products(name,price,cost_price,stock) VALUES('Lab',100,30,7),('Variant',80,NULL,5)");
 await db("INSERT INTO product_variants(product_id,color,size,price,stock) VALUES(2,'Red','M',90,2)");
 await initOfferLab(db);
 const express=require('express'),app=express();app.use(express.json());app.use((req,res,next)=>{req.user={id:1};next()});
 registerOfferLab(app,{db,env:{OPENAI_API_KEY:'mock-only',JWT_SECRET:'fixture'},fetchImpl:async(url,opts)=>{calls++;lastBody=JSON.parse(opts.body);if(fail)throw Error('simulated');return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({concepts:[{title:'هدية',audience:'بالغون يبحثون عن هدية',hook:'تفاصيل تستاهل تشوفيها',script:'عرض المنتج من زوايا مختلفة',caption:'اكتشفي التفاصيل',cta:'شاهدي المنتج',hypothesis:'اختبار فكرة الهدية'}],review:'راجعي السعر والشروط'})}}]})}}});
 app.use((err,req,res,next)=>res.status(err.status||500).json({message:err.message}));
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port+'/api/admin/marketing/offer-lab';
});
test.after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close()});
async function send(path,body,method='POST'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
test('stacked discounts and costs preserve target margin and finite stock ceiling',async()=>{
 const q=await calculateQuote(db,input());assert.equal(q.subtotal,200);assert.equal(q.offered,180);assert.equal(q.revenue,157);assert.equal(q.fees,3.14);assert.equal(q.profit,73.86);assert.equal(q.max_cpa,68.86);assert.equal(q.capacity,3);assert.equal(q.minimum_offer,113.27);
});
test('missing costs, duplicate options and invalid inputs fail; loss has zero safe acquisition budget',async()=>{
 const b={...input(),items:[{product_id:2,variant_id:1,quantity:1,cost_override:100}]};
 const q=await calculateQuote(db,b);assert.equal(q.subtotal,90);assert.equal(q.capacity,2);assert.ok(q.profit<0);assert.equal(q.max_cpa,0);assert.ok(q.warnings.length>=3);
 for(const patch of [{items:[{...b.items[0],cost_override:null}]},{items:[{...b.items[0],variant_id:null}]},{items:[{...b.items[0],variant_id:999}]},{items:[{...b.items[0],quantity:1.5}]},{items:[b.items[0],b.items[0]]},{coupon_percent:100},{ad_cost:-1},{discount_mode:'bundle',discount_value:100},{starts_at:'2026-11-01T10:00:00'},{ends_at:'2026-11-01T10:00:00Z'}])await assert.rejects(()=>calculateQuote(db,{...b,...patch}));
});
test('drafts recompute current prices, reject stale writes and never modify catalog',async()=>{
 const created=await send('/drafts',input());assert.equal(created.status,201);const row=created.data.draft;
 await db('UPDATE products SET price=120 WHERE id=1');
 const saved=await send('/drafts/'+row.id,{...input(),version:1},'PUT');assert.equal(saved.status,200);assert.equal(saved.data.draft.quote.subtotal,240);
 assert.equal((await send('/drafts/'+row.id,{...input(),version:1},'PUT')).status,409);
 const p=(await db('SELECT * FROM products WHERE id=1')).rows[0];assert.equal(Number(p.price),120);assert.equal(Number(p.cost_price),30);assert.equal(p.stock,7);
});
test('AI requires consent, excludes costs, refreshes stock/prices, preserves failures and caps paid calls',async()=>{
 let row=(await send('/drafts',input())).data.draft;
 assert.equal((await send('/drafts/'+row.id+'/creative',{version:1})).status,400);assert.equal(calls,0);
 await db('UPDATE products SET price=110 WHERE id=1');
 let r=await send('/drafts/'+row.id+'/creative',{consent:true,version:row.version});assert.equal(r.status,200,JSON.stringify(r.data));row=r.data.draft;assert.equal(row.quote.subtotal,220);assert.equal(row.creative.concepts[0].title,'هدية');
 const sent=JSON.parse(lastBody.messages[1].content);assert.equal(sent.products[0].price,110);assert.equal(sent.products[0].unit_cost,undefined);assert.equal(sent.products[0].cost_override,undefined);assert.equal(sent.status,'proposal_not_active');assert.equal(sent.customer,undefined);
 assert.equal((await send('/drafts/'+row.id+'/creative',{consent:true,version:1})).status,409);assert.equal(calls,1);
 fail=true;assert.equal((await send('/drafts/'+row.id+'/creative',{consent:true,version:row.version})).status,502);assert.equal((await db('SELECT version FROM marketing_offer_drafts WHERE id=$1',[row.id])).rows[0].version,row.version);fail=false;
 for(let i=0;i<4;i++){r=await send('/drafts/'+row.id+'/creative',{consent:true,version:row.version});assert.equal(r.status,200);row=r.data.draft}
 assert.equal((await send('/drafts/'+row.id+'/creative',{consent:true,version:row.version})).status,429);assert.equal(calls,6);
});
