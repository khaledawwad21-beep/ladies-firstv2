'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {PGlite}=require('@electric-sql/pglite');
const {createNayaAiRouter}=require('../src/naya-ai');
test('both Naya paths atomically share daily quota, reset by day, and preserve owner exemption',async t=>{
 const database=new PGlite();
 t.after(()=>database.close());
 await database.exec('CREATE TABLE store_ai_daily_usage(customer_key TEXT,usage_day TEXT,message_count INT,updated_at TIMESTAMPTZ,PRIMARY KEY(customer_key,usage_day))');
 let paidCalls=0,clock=Date.parse('2026-10-13T10:00:00Z'),failDatabase=false;
 const app=express();app.use(express.json());
 app.use('/api/ai',createNayaAiRouter({
  env:{OPENAI_API_KEY:'synthetic-test-key',STORE_AI_DAILY_LIMIT:'2',JWT_SECRET:'synthetic-test-secret'},now:()=>clock,
  optionalAuth:(req,res,next)=>{if(req.headers['x-test-role'])req.user={id:10,role:req.headers['x-test-role']};next()},
  rateLimiter:async()=>({allowed:true}),
  db:async(sql,args)=>{if(/INSERT INTO store_ai_daily_usage/.test(sql)){if(failDatabase)throw Error('isolated outage');return database.query(sql,args)}return {rows:[]}},
  fetchImpl:async()=>{paidCalls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:'test',recommendationIds:[]})}}]})}}
 }));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const call=(path,role='customer')=>fetch(`http://127.0.0.1:${server.address().port}/api/ai/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},body:JSON.stringify({message:'gift'})});
 const results=await Promise.all(['chat','store-chat','chat','store-chat'].map(p=>call(p)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,200,429,429]);assert.equal(paidCalls,2);
 assert.equal((await call('chat','owner')).status,200);assert.equal(paidCalls,3);
 clock+=86400000;assert.equal((await call('chat')).status,200);
 assert.equal((await call('chat','')).status,200);assert.equal((await call('store-chat','')).status,200);assert.equal((await call('chat','')).status,429);
 const before=paidCalls;failDatabase=true;assert.equal((await call('chat')).status,502);assert.equal(paidCalls,before);
});
