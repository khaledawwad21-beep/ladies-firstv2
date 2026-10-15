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

async function json(path,{method="GET",token,body}={}){
  const response=await fetch(base+path,{
    method,
    headers:{
      ...(body!==undefined?{"Content-Type":"application/json"}:{}),
      ...(token?{Authorization:"Bearer "+token}:{})
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
