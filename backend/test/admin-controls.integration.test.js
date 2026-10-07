"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {PGlite}=require("@electric-sql/pglite");

const database=new PGlite();
process.env.JWT_SECRET="isolated-admin-controls-tests";

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
      (2,'Staff','staff-controls@example.test','fixture','staff',TRUE,'["dashboard"]'::jsonb)
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

test("public storefront message and maintenance settings round-trip safely",async()=>{
  let r=await json("/api/admin/settings",{
    method:"PUT",
    token:ownerToken,
    body:{
      storefront_general_message:{active:true,message:"CI storefront announcement"},
      maintenance_mode:true,
      maintenance_message:"CI maintenance message"
    }
  });
  assert.equal(r.response.status,200,JSON.stringify(r.data));

  r=await json("/api/settings");
  assert.equal(r.response.status,200);
  assert.deepEqual(r.data.settings.storefront_general_message,{
    active:true,
    message:"CI storefront announcement"
  });
  assert.equal(r.data.settings.maintenance_mode,true);
  assert.equal(r.data.settings.maintenance_message,"CI maintenance message");

  r=await json("/api/admin/settings",{
    method:"PUT",
    token:ownerToken,
    body:{maintenance_mode:false}
  });
  assert.equal(r.response.status,200);
});

test("staff announcement appears once per published version and tracks read state",async()=>{
  let r=await json("/api/admin/settings/staff-message",{
    method:"POST",
    token:ownerToken,
    body:{message:"CI message for staff"}
  });
  assert.equal(r.response.status,201,JSON.stringify(r.data));
  const version=String(r.data.message.version||"");
  assert.ok(version);

  r=await json("/api/staff-message",{token:staffToken});
  assert.equal(r.response.status,200,JSON.stringify(r.data));
  assert.equal(r.data.shouldShow,true);
  assert.equal(r.data.message.message,"CI message for staff");
  assert.equal(r.data.message.version,version);

  r=await json("/api/staff-message/read",{
    method:"POST",
    token:staffToken,
    body:{version}
  });
  assert.equal(r.response.status,200,JSON.stringify(r.data));

  r=await json("/api/staff-message",{token:staffToken});
  assert.equal(r.response.status,200);
  assert.equal(r.data.shouldShow,false);

  r=await json("/api/admin/settings/staff-message",{token:ownerToken});
  assert.equal(r.response.status,200);
  assert.equal(Number(r.data.eligible),2);
  assert.equal(Number(r.data.seen),1);

  r=await json("/api/admin/settings/staff-message",{
    method:"PATCH",
    token:ownerToken,
    body:{active:false}
  });
  assert.equal(r.response.status,200);
  assert.equal(r.data.message.active,false);
});
