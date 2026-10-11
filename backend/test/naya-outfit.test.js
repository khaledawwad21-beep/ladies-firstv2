'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const express=require('express');const {PGlite}=require('@electric-sql/pglite');
const {createOutfitRouter,selection,dayKey,readImage,measurements,measurementPrompt,productFocus,outfitPrompt}=require('../src/naya-outfit');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
test('selection and Palestine day boundary',()=>{assert.throws(()=>selection([{productId:1},{productId:1}]));assert.throws(()=>selection([]));assert.deepEqual(selection([],{allowEmpty:true}),[]);assert.equal(dayKey(new Date('2026-07-01T20:59:00Z')),'2026-07-01');assert.equal(dayKey(new Date('2026-07-01T21:00:00Z')),'2026-07-02')});
test('remote images cannot make outbound requests',async()=>{await assert.rejects(readImage('https://example.com/x.png',{}),/ارفعي/)});
test('durable daily quota, failures, concurrency, budget and private image',async t=>{
 const pg=new PGlite();await pg.exec(`CREATE TABLE categories(id BIGINT PRIMARY KEY,name TEXT);CREATE TABLE products(id BIGINT PRIMARY KEY,name TEXT,image_url TEXT,image TEXT,is_active BOOLEAN,category_id BIGINT);CREATE TABLE product_images(id BIGINT,product_id BIGINT,image_url TEXT,is_primary BOOLEAN,sort_order INT);CREATE TABLE uploaded_images(id TEXT,data BYTEA);CREATE TABLE naya_outfit_daily(user_id BIGINT,usage_day DATE,state TEXT,job_id UUID,selection JSONB,image BYTEA,error_message TEXT,updated_at TIMESTAMPTZ,PRIMARY KEY(user_id,usage_day));CREATE TABLE naya_outfit_budget(month TEXT PRIMARY KEY,attempts INT);INSERT INTO products VALUES(1,'Dress','https://ladies-firstv2.onrender.com/api/images/test',NULL,true,NULL);`);await pg.query('INSERT INTO uploaded_images VALUES($1,$2)',['test',png]);
 let calls=0,release,fail=false;const env={NAYA_OUTFIT_ENABLED:'true',OPENAI_API_KEY:'test',NAYA_OUTFIT_MONTHLY_LIMIT:'4'};
 const app=express();app.use(express.json());app.use('/api/ai/outfit',createOutfitRouter({db:(s,p)=>pg.query(s,p),transaction:fn=>pg.transaction(fn),requireAuth:(req,res,next)=>{const id=Number(req.headers['x-user']);if(!id)return res.sendStatus(401);req.user={id,role:req.headers.authorization==='Bearer owner-token'?'owner':'customer'};next()},env,fetchImpl:async()=>{calls++;await new Promise(r=>release=r);return{ok:!fail,json:async()=>({data:[{b64_json:png.toString('base64')}]})}}}));app.use((e,req,res,next)=>(console.error(e),res.status(500).json({error:e.message})));
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));t.after(async()=>{await new Promise(r=>server.close(r));await pg.close()});const base='http://127.0.0.1:'+server.address().port+'/api/ai/outfit';
 const request=(route,user=1,body)=>fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-user':String(user),...(user===99?{Authorization:'Bearer owner-token'}:{})},body:body?JSON.stringify(body):undefined});const generate=user=>request('/generate',user,{items:[{productId:1}]});
 async function waitState(user,state){for(let i=0;i<100;i++){const d=await(await request('/status',user)).json();if(d.state===state)return d;await new Promise(r=>setTimeout(r,10))}throw Error('state not reached: '+state)}
 assert.equal((await request('/status',0)).status,401);const ownerStatus=await(await request('/status',99)).json();assert.equal(ownerStatus.owner,true);assert.equal(ownerStatus.unlimited,true);assert.equal(ownerStatus.remaining,null);env.NAYA_OUTFIT_ENABLED='false';assert.equal((await generate(1)).status,503);assert.equal(calls,0);env.NAYA_OUTFIT_ENABLED='true';
 assert.equal((await request('/generate',1,{items:[{productId:1},{productId:1}]})).status,400);assert.equal((await request('/generate',1,{items:[{productId:1}],measurements:{height:165}})).status,400);assert.equal(calls,0);
 const responses=await Promise.all([generate(1),generate(1)]);assert.deepEqual(responses.map(r=>r.status).sort(),[202,409]);assert.equal(calls,1);release();await waitState(1,'complete');assert.equal((await generate(1)).status,409);assert.equal((await request('/image')).status,200);assert.equal((await request('/image',2)).status,404);
 fail=true;assert.equal((await generate(2)).status,202);release();assert.equal((await waitState(2,'failed')).remaining,1);fail=false;assert.equal((await generate(2)).status,202);release();await waitState(2,'complete');assert.equal(calls,3);assert.equal((await generate(3)).status,202);release();await waitState(3,'complete');assert.equal(calls,4);assert.equal((await generate(4)).status,400);assert.equal(calls,4);assert.equal((await request('/status',4).then(r=>r.json())).remaining,1);assert.equal((await generate(99)).status,202);release();await waitState(99,'complete');assert.equal((await generate(99)).status,202);release();await waitState(99,'complete');assert.equal(calls,6);assert.equal((await pg.query('SELECT attempts FROM naya_outfit_budget')).rows[0].attempts,4);
});

test('measurements require explicit consent, validate bounds and discard extra fields',()=>{assert.equal(measurements({}),null);assert.throws(()=>measurements({measurements:{height:165}}),/موافقتك/);assert.throws(()=>measurements({measurementsConsent:true,measurements:{height:300}}),/المقاسات/);const m=measurements({measurementsConsent:true,measurements:{height:165,weight:70,waist:80,secret:'ignore'}});assert.deepEqual(m,{height:165,weight:70,waist:80});assert.match(measurementPrompt(m),/165/);assert.equal(measurementPrompt(null),'')});

test('selected products drive framing and unobstructed accessory poses',()=>{
 assert.deepEqual(productFocus({name:'Pearl earring',category:'إكسسوارات'}),['earrings']);
 assert.deepEqual(productFocus({name:'Luxury watch',category:'ساعات'}),['watch']);
 const earrings=outfitPrompt([{name:'حلق ذهبي'}],null);
 assert.match(earrings,/close product-focused portrait/);assert.match(earrings,/Sweep hair away/);assert.doesNotMatch(earrings,/head-to-toe fashion frame/);
 const ensemble=outfitPrompt([{name:'فستان'},{name:'ساعة'},{name:'حقيبة'}],null);
 assert.match(ensemble,/head-to-toe fashion frame/);assert.match(ensemble,/turn the watch dial/);assert.match(ensemble,/hardware or strap/);
 assert.match(ensemble,/"referenceImage":2/);assert.match(ensemble,/"referenceImage":4/);
 const shirt=outfitPrompt([{name:'بلوزة'}],{height:165,weight:70});
 assert.match(shirt,/head-to-hip/);assert.match(shirt,/"weight":70/);
 const unknown=outfitPrompt([{name:'قطعة خاصة'}],null);assert.match(unknown,/Inspect the reference products/);
 const bodyOnly=outfitPrompt([],{height:170,weight:75});assert.match(bodyOnly,/Do not stretch, warp, or simply resize/);assert.match(bodyOnly,/\"weight\":75/);
});

test('store absolute image URLs resolve to the uploaded bytes without outbound fetches',async()=>{
 const queries=[];
 const db=async(sql,params)=>{queries.push({sql,params});return{rows:[{data:png}]}};
 for(const url of ['/api/images/abc123','https://ladies-firstv2.onrender.com/api/images/abc123','https://ladies-firstv2.onrender.com/api/images/abc123?v=2']){
  const image=await readImage(url,{db,env:{}});
  assert.deepEqual(image.bytes,png);assert.equal(image.mime,'image/png');
 }
 assert.equal(queries.length,3);
 assert.ok(queries.every(q=>q.params[0]==='abc123'&&q.sql.includes('uploaded_images')));
 const configured=await readImage('https://shop.example/api/images/abc123',{db,env:{RENDER_EXTERNAL_URL:'https://shop.example'}});
 assert.deepEqual(configured.bytes,png);
 for(const url of ['https://evil.example/api/images/abc123','https://ladies-firstv2.onrender.com.evil.example/api/images/abc123','https://user:secret@ladies-firstv2.onrender.com/api/images/abc123']){
  await assert.rejects(readImage(url,{db,env:{}}),/ارفعي/);
 }
 assert.equal(queries.length,4);
});
