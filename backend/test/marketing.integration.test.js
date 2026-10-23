"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {PGlite}=require("@electric-sql/pglite");

const database=new PGlite();
process.env.JWT_SECRET="isolated-marketing-tests";

require.cache[require.resolve("../src/db")]={exports:{
  db:(sql,values)=>database.query(sql,values),
  transaction:callback=>database.transaction(tx=>callback({query:(sql,values)=>tx.query(sql,values)})),
  getDatabaseStatus:async()=>({configured:true,connected:true}),
  closeDatabase:async()=>{}
}};

const {app,initDatabase}=require("../src/server");
const {createToken}=require("../src/auth");

let server,base;
const ownerToken=createToken({id:1,role:"owner"});
const staffToken=createToken({id:2,role:"staff"});

test.before(async()=>{
  await initDatabase();
  await require("../src/database-migrations").migrateDatabase();
  await database.query(`
    INSERT INTO users(id,name,email,password_hash,role,is_active,permissions)
    VALUES
      (1,'Owner','owner-controls@example.test','fixture','owner',TRUE,'[]'::jsonb),
      (2,'Staff','staff-controls@example.test','fixture','staff',TRUE,'["dashboard","settings"]'::jsonb),
      (4,'Marketing','marketing@example.test','fixture','staff',TRUE,'["marketing"]'::jsonb),
      (3,'Customer','customer-controls@example.test','fixture','customer',TRUE,'[]'::jsonb)
  `);
  server=app.listen(0,"127.0.0.1");
  await new Promise((resolve,reject)=>{
    server.once("listening",resolve);
    server.once("error",reject);
  });
  base="http://127.0.0.1:"+server.address().port;
});

test.after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  await database.close();
});

async function json(path,{method="GET",token,body,cookie}={}){
  const response=await fetch(base+path,{
    method,
    headers:{
      ...(body!==undefined?{"Content-Type":"application/json"}:{}),
      ...(token?{Authorization:"Bearer "+token}:{}),
      ...(cookie?{Cookie:cookie}:{})
    },
    ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  let data={};
  try{data=await response.json()}catch{}
  return {response,data};
}


const campaign={title:'حملة هدايا',content:'منشور أولي',goal:'طلبات',platforms:['facebook','instagram'],regions:['west_bank'],status:'draft',scheduled_at:null,product_id:null,budget:100,spend:20,revenue:120,orders:2,clicks:40};
test('campaign data remains private and requires its own live permission',async()=>{
  for(const [token,status] of [[undefined,401],[createToken({id:3,role:'customer'}),403],[staffToken,403],[createToken({id:4,role:'staff'}),200]]){
    const r=await json('/api/admin/marketing/campaigns',{token});assert.equal(r.response.status,status,JSON.stringify(r.data));
  }
  await database.query("UPDATE users SET permissions='[]'::jsonb WHERE id=4");
  assert.equal((await json('/api/admin/marketing/campaigns',{token:createToken({id:4,role:'staff'})})).response.status,403);
});
test('campaigns round-trip without modifying commerce data; stale writes are rejected',async()=>{
  const before=await database.query('SELECT key,value FROM settings ORDER BY key');
  const created=await json('/api/admin/marketing/campaigns',{method:'POST',token:ownerToken,body:campaign});
  assert.equal(created.response.status,201,JSON.stringify(created.data));
  const row=created.data.campaign;
  const update=await json('/api/admin/marketing/campaigns/'+row.id,{method:'PUT',token:ownerToken,body:{...campaign,version:row.version,status:'planned',scheduled_at:'2026-11-01T12:00:00+02:00'}});
  assert.equal(update.response.status,200,JSON.stringify(update.data));
  assert.equal(update.data.campaign.data.scheduled_at,'2026-11-01T10:00:00.000Z');
  assert.equal((await json('/api/admin/marketing/campaigns/'+row.id,{method:'PUT',token:ownerToken,body:{...campaign,version:row.version}})).response.status,409);
  const list=await json('/api/admin/marketing/campaigns?q='+encodeURIComponent('هدايا'),{token:ownerToken});
  assert.equal(list.data.campaigns.length,1);
  const archived=await json('/api/admin/marketing/campaigns/'+row.id,{method:'PUT',token:ownerToken,body:{...campaign,status:'archived',version:2}});
  assert.equal(archived.response.status,200);
  assert.deepEqual((await database.query('SELECT key,value FROM settings ORDER BY key')).rows,before.rows);
  assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n,0);
  const publicSettings=await json('/api/settings');assert.ok(!JSON.stringify(publicSettings.data).includes('حملة هدايا'));
});
test('invalid money, schedule, platform and product cannot be persisted',async()=>{
  for(const patch of [{spend:101},{budget:-1},{budget:'100'},{orders:1.5},{platforms:['unknown']},{regions:[]},{status:'active'},{status:'planned'},{scheduled_at:'tomorrow'},{scheduled_at:'2026-10-20T10:00:00'},{product_id:99999},{title:''}]){
    const r=await json('/api/admin/marketing/campaigns',{method:'POST',token:ownerToken,body:{...campaign,...patch}});assert.equal(r.response.status,400,JSON.stringify(patch));
  }
});
test('product picker exposes only needed catalog fields to marketing staff',async()=>{
  await database.query("INSERT INTO products(name,price,stock,cost_price) VALUES('Marketing product',30,5,12)");
  await database.query("UPDATE users SET permissions='[\"marketing\"]'::jsonb WHERE id=4");
  const r=await json('/api/admin/marketing/products?q=Marketing',{token:createToken({id:4,role:'staff'})});
  assert.equal(r.response.status,200);assert.equal(r.data.products.length,1);
  assert.equal(r.data.products[0].cost_price,undefined);assert.equal(Number(r.data.products[0].price),30);
});

const {budgetPlan}=require('../src/marketing-insights');
test('budget needs real margin samples and respects the risk ceiling without promising sales',()=>{
  assert.equal(budgetPlan({economics:{sample:4,contribution:100},channels:[]}).ready,false);
  const p=budgetPlan({economics:{sample:5,contribution:250},channels:[{source:'instagram',spend:140,paid_delivered:7}],goal:10,days:7,extra:10,reserve:30,cap:100});
  assert.equal(p.breakEven,40);assert.equal(p.targetCPA,28);assert.equal(p.testBudget,280);assert.equal(p.withinCap,false);assert.equal(p.affordableGoal,3);assert.equal(p.best.cpa,20);
  assert.equal(budgetPlan({economics:{sample:5,contribution:-10},channels:[]}).ready,false);
});
test('measurement requires explicit consent, deduplicates and discards identifying body fields',async()=>{
  assert.equal((await json('/api/marketing/events',{method:'POST',body:{event:'visit'}})).response.status,400);
  assert.equal((await json('/api/marketing/events',{method:'POST',body:{consent:true,event:'purchase'}})).response.status,400);
  const p=(await database.query("SELECT id FROM products WHERE name='Marketing product'")).rows[0];
  let r=await json('/api/marketing/events',{method:'POST',body:{consent:true,event:'product_view',product_id:Number(p.id),source:'instagram',medium:'paid',phone:'DO-NOT-STORE',name:'PRIVATE'}});
  assert.equal(r.response.status,200,JSON.stringify(r.data));
  const cookie=r.response.headers.get('set-cookie').split(';')[0];
  for(let i=0;i<2;i++)assert.equal((await json('/api/marketing/events',{method:'POST',cookie,body:{consent:true,event:'product_view',product_id:Number(p.id)}})).response.status,200);
  assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM marketing_events')).rows[0].n,2);
  const session=(await database.query('SELECT * FROM marketing_sessions')).rows[0];assert.equal(session.source,'instagram');assert.equal(session.medium,'paid');assert.ok(!JSON.stringify(session).includes('DO-NOT-STORE'));
  const insight=await json('/api/admin/marketing/insights',{token:ownerToken});assert.equal(insight.response.status,200,JSON.stringify(insight.data));assert.equal(insight.data.funnel.sessions,1);assert.equal(insight.data.funnel.viewed,1);
  assert.equal((await json('/api/admin/marketing/insights',{token:staffToken})).response.status,403);
  await json('/api/marketing/consent',{method:'DELETE',cookie});assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM marketing_sessions')).rows[0].n,0);assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM marketing_events')).rows[0].n,0);
});
test('spend is dated, replaces rather than doubles, and insights reject invalid ranges',async()=>{
  const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
  for(const amount of [50,75])assert.equal((await json('/api/admin/marketing/spend',{method:'PUT',token:ownerToken,body:{day,source:'instagram',amount}})).response.status,200);
  const r=await json('/api/admin/marketing/insights',{token:ownerToken});assert.equal(r.response.status,200,JSON.stringify(r.data));assert.equal(r.data.channels.find(x=>x.source==='instagram').spend,75);assert.equal(r.data.budget.ready,false);
  for(const suffix of ['?from=2026-02-30&to=2026-03-01','?from=2020-01-01&to=2020-01-02','?goal=NaN'])assert.equal((await json('/api/admin/marketing/insights'+suffix,{token:ownerToken})).response.status,400);
});
test('only server-created successful orders are attributed; rejection cannot affect checkout',async()=>{
  const p=(await database.query("SELECT id FROM products WHERE name='Marketing product'")).rows[0];
  const visit=await json('/api/marketing/events',{method:'POST',body:{consent:true,event:'checkout_start',source:'facebook',medium:'paid'}}),cookie=visit.response.headers.get('set-cookie').split(';')[0];
  const order=await json('/api/orders',{method:'POST',cookie,body:{customerName:'Guest',customerPhone:'+970599888776',shippingAddress:'Test address',shippingRegion:'westbank',paymentMethod:'cod',items:[{productId:Number(p.id),quantity:1}]}});
  assert.equal(order.response.status,201,JSON.stringify(order.data));
  for(let attempt=0;attempt<20;attempt++){
    const count=await database.query('SELECT COUNT(*)::int AS n FROM marketing_order_attribution');if(count.rows[0].n)break;
    await new Promise(r=>setTimeout(r,10));
  }
  assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM marketing_order_attribution')).rows[0].n,1);
  const r=await json('/api/admin/marketing/insights',{token:ownerToken});assert.equal(r.data.channels.find(x=>x.source==='facebook').orders,1);assert.equal(r.data.funnel.ordered,1);
  await database.query("UPDATE orders SET status='cancelled' WHERE id=$1",[order.data.order.id]);
  const cancelled=await json('/api/admin/marketing/insights',{token:ownerToken});assert.equal(cancelled.data.channels.find(x=>x.source==='facebook').orders,0);assert.equal(cancelled.data.funnel.ordered,0);
  await json('/api/marketing/consent',{method:'DELETE',cookie});assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM marketing_order_attribution')).rows[0].n,0);assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM orders')).rows[0].n,1);
});
test('delivered margin uses historical item costs, discounts and shipping support; unknown costs and returns are excluded',async()=>{
 const product=(await database.query("SELECT id FROM products WHERE name='Marketing product'")).rows[0];
 const ids=[];
 for(let i=0;i<7;i++){
  const o=(await database.query("INSERT INTO orders(status,subtotal,coupon_discount,visa_discount,loyalty_discount,shipping_cost,shipping_base_cost,total,shipping_region) VALUES('delivered',100,10,5,5,10,20,90,'westbank') RETURNING id")).rows[0];ids.push(o.id);
  const item=(await database.query('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,total_price,purchase_price) VALUES($1,$2,$3,1,100,100,$4) RETURNING id',[o.id,product.id,'Fixture',i===5?null:30])).rows[0];
  if(i===6)await database.query("INSERT INTO return_requests(order_id,order_item_id,user_id,request_type,quantity,reason) VALUES($1,$2,3,'return',1,'fixture')",[o.id,item.id]);
 }
 const r=await json('/api/admin/marketing/insights',{token:ownerToken});assert.equal(r.response.status,200,JSON.stringify(r.data));
 assert.equal(r.data.economics.sample,5);assert.equal(Number(r.data.economics.contribution),200);assert.equal(r.data.budget.breakEven,40);assert.equal(r.data.budget.targetCPA,28);assert.equal(r.data.budget.testBudget,280);
 await database.query('DELETE FROM orders WHERE id=ANY($1)',[ids]);
});

test('offer lab requires live marketing permission on every route',async()=>{
 for(const [token,status] of [[undefined,401],[staffToken,403],[createToken({id:3,role:'customer'}),403]]){
  for(const [path,method,body] of [['catalog','GET'],['drafts','GET'],['quote','POST',{}],['drafts','POST',{}],['drafts/1','PUT',{}],['drafts/1/creative','POST',{}]])assert.equal((await json('/api/admin/marketing/offer-lab/'+path,{token,method,body})).response.status,status,path);
 }
 assert.equal((await json('/api/admin/marketing/offer-lab/catalog',{token:ownerToken})).response.status,200);
});

test('solo desk protects routes and isolates daily tasks and settings by account',async()=>{
 for(const [token,status] of [[undefined,401],[staffToken,403],[createToken({id:3,role:'customer'}),403]])for(const [path,method,body] of [['','GET'],['/settings','PUT',{}],['/tasks','PUT',{}]])assert.equal((await json('/api/admin/marketing/solo'+path,{token,method,body})).response.status,status);
 const day=require('../src/marketing-solo').today(),settings={risk_cap:50,extra_cost:5,goal:3,days:7,reserve:30,version:0},endpoint='/api/admin/marketing/solo';
 const before=await json(endpoint,{token:ownerToken});assert.equal(before.response.status,200,JSON.stringify(before.data));assert.equal(before.data.version,0);assert.ok(before.data.tasks.every(t=>!t.done));
 assert.equal((await json(endpoint+'/settings',{method:'PUT',token:ownerToken,body:settings})).response.status,200);
 assert.equal((await json(endpoint+'/settings',{method:'PUT',token:ownerToken,body:settings})).response.status,409);
 assert.equal((await json(endpoint+'/tasks',{method:'PUT',token:ownerToken,body:{day,key:'offer',done:true}})).response.status,200);
 for(const body of [{day:'2020-01-01',key:'offer',done:true},{day,key:'other',done:true}])assert.equal((await json(endpoint+'/tasks',{method:'PUT',token:ownerToken,body})).response.status,400);
 const saved=await json(endpoint,{token:ownerToken});assert.equal(saved.data.tasks[0].done,true);assert.equal(saved.data.settings.risk_cap,50);assert.ok(saved.data.candidates.every(c=>!c.trial.ready||c.trial.amount<=50));
 const other=await json(endpoint,{token:createToken({id:4,role:'staff'})});assert.equal(other.response.status,200);assert.equal(other.data.version,0);assert.ok(other.data.tasks.every(t=>!t.done));
 await database.query("UPDATE users SET permissions='[]'::jsonb WHERE id=4");assert.equal((await json(endpoint,{token:createToken({id:4,role:'staff'})})).response.status,403);
});
