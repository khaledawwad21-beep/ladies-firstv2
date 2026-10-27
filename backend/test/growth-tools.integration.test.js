'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const database=new PGlite(),adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
process.env.JWT_SECRET='isolated-growth-test-secret';
const db=async(s,p)=>adapt(await database.query(s,p));
const transaction=fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))}));
require.cache[require.resolve('../src/db')]={exports:{db,transaction,getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {app,initDatabase}=require('../src/server'),{createToken}=require('../src/auth');
const {profitQuote}=require('../src/growth-tools'),{parseMarketResponse}=require('../src/market-prices'),{createPushNotifications,encrypt,decrypt,validCampaign}=require('../src/push-notifications');
let server,base,owner,admin,alice,bob,carol,product;
async function user(name,role='customer'){const u=(await db("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,'fixture',$3) RETURNING *",[name,name+'@growth.test',role])).rows[0];return {...u,token:createToken(u)};}
async function api(path,method='GET',body,u=owner){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(u?{Authorization:'Bearer '+u.token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
const defaults={exitEnabled:true,referralEntryEnabled:true,referralEntryPoints:12,referralDailyCap:10,referralNewOnly:false,profit:{packagingCost:3,shippingSupport:4,otherCost:2,paymentFeePercent:2,couponPercent:10,loyaltyDiscount:5}};
before(async()=>{await initDatabase();await require('../src/database-migrations').migrateDatabase();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;owner=await user('Owner','owner');admin=await user('Admin','admin');alice=await user('Alice');bob=await user('Bob');carol=await user('Carol');product=(await api('/api/admin/products','POST',{name:'Test watch',price:100,cost_price:60,stock:50,images:['/api/images/'+'a'.repeat(64)]})).product;});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
test('profit calculation includes stacked discounts, fees and per-order expenses',()=>{
 const q=profitQuote({salePrice:100,unitCost:60,quantity:2,packagingCost:3,shippingSupport:4,otherCost:2,paymentFeePercent:2,couponPercent:10,loyaltyDiscount:5});
 assert.equal(q.gross,200);assert.equal(q.revenue,175);assert.equal(q.fees,3.5);assert.equal(q.costs,132.5);assert.equal(q.profit,42.5);assert.equal(q.status,'profit');
 const loss=profitQuote({salePrice:20,unitCost:30});assert.equal(loss.status,'loss');
 assert.equal(profitQuote({salePrice:20}).status,'unknown');assert.throws(()=>profitQuote({salePrice:-1}));assert.throws(()=>profitQuote({salePrice:5,paymentFeePercent:100}));
});
test('private growth, market and push routes remain owner-only even for admins',async()=>{
 for(const u of [admin,alice])for(const path of ['/api/admin/growth','/api/admin/growth/market','/api/admin/push'])assert.equal((await api(path,'GET',null,u)).status,403);
 assert.equal((await api('/api/admin/growth','PUT',defaults)).status,200);
 const quote=await api('/api/admin/growth/profit','POST',{productId:product.id,salePrice:80});assert.equal(quote.quote.unitCost,60);
 const visible=await api('/api/growth/config','GET',null,null);assert.equal(visible.profit,undefined);
});
test('entry referral rewards the referrer once, including existing eligible accounts',async()=>{
 const r=await api('/api/growth/referrals/mine','GET',null,alice);
 const results=await Promise.all(Array.from({length:3},()=>api('/api/growth/referrals/claim','POST',{code:r.code},bob)));
 assert.equal(results.filter(x=>x.credited).length,1);assert.equal((await db('SELECT loyalty_points FROM users WHERE id=$1',[alice.id])).rows[0].loyalty_points,12);
 assert.equal((await api('/api/growth/referrals/claim','POST',{code:r.code},alice)).credited,false);
 const r2=await api('/api/growth/referrals/mine','GET',null,carol);assert.equal((await api('/api/growth/referrals/claim','POST',{code:r2.code},bob)).reason,'already_counted');
 assert.equal((await db("SELECT COUNT(*)::int AS n FROM loyalty_points_transactions WHERE transaction_type='referral_entry'")).rows[0].n,1);
});
test('referral daily cap, same identity and new-only setting are enforced by server',async()=>{
 await api('/api/admin/growth','PUT',{...defaults,referralDailyCap:1});const r=await api('/api/growth/referrals/mine','GET',null,alice);
 assert.equal((await api('/api/growth/referrals/claim','POST',{code:r.code},carol)).reason,'daily_cap');
 await api('/api/admin/growth','PUT',{...defaults,referralNewOnly:true});await db("UPDATE users SET created_at=NOW()-interval '3 days' WHERE id=$1",[carol.id]);assert.equal((await api('/api/growth/referrals/claim','POST',{code:r.code},carol)).reason,'not_new');
 await api('/api/admin/growth','PUT',defaults);
});
test('wheel points are credited once across concurrent retries and never mint a coupon',async()=>{
 const c=await api('/api/admin/wheel','PUT',{name:'Points test',enabled:true,startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),frequency:'campaign',minimum:0,validDays:7,prizes:Array.from({length:8},(_,i)=>({id:'pt'+i,type:'points',value:25,weight:1,limit:0}))});assert.equal(c.status,200,JSON.stringify(c));
 const results=await Promise.all(Array.from({length:4},()=>api('/api/wheel/spin','POST',{campaignId:c.campaign.id},carol)));
 assert.ok(results.every(r=>r.status===200));assert.equal(new Set(results.map(r=>String(r.spin.id))).size,1);assert.ok(results.every(r=>r.spin.coupon_code===null));
 assert.equal((await db('SELECT loyalty_points FROM users WHERE id=$1',[carol.id])).rows[0].loyalty_points,25);
 assert.equal((await db("SELECT COUNT(*)::int AS n FROM loyalty_points_transactions WHERE user_id=$1 AND transaction_type='wheel_points'",[carol.id])).rows[0].n,1);
});
test('market results discard fabricated URLs and prices without source evidence',()=>{
 const response={output:[{type:'web_search_call',action:{sources:[{url:'https://shop.ps/item',title:'Watch'}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({query:'watch',results:[{url:'https://shop.ps/item',price:150,currency:'ILS',evidence:'السعر 150 شيكل',match:'exact'},{url:'https://invented.ps/item',price:100,currency:'ILS',evidence:'100'},{url:'https://shop.ps/item',price:99,currency:'ILS',evidence:'لا سعر'}]})}]}]};
 const result=parseMarketResponse(response);assert.equal(result.results.length,1);assert.equal(result.results[0].price,150);assert.equal(result.results[0].match,'claimed_exact');
});
test('push tokens are encrypted, consent is required and logout disables delivery',async()=>{
 const token='fake-fcm-token-for-local-tests-only-001',installation='1'.repeat(64);
 assert.equal((await api('/api/push/device','PUT',{token,installation,platform:'android',consent:false},owner)).status,400);
 assert.equal((await api('/api/push/device','PUT',{token,installation,platform:'android',consent:true},owner)).status,200);
 const d=(await db('SELECT * FROM push_devices WHERE user_id=$1',[owner.id])).rows[0];assert.notEqual(d.token_cipher,token);assert.equal(decrypt(d.token_cipher,process.env.JWT_SECRET),token);assert.equal(encrypt('same',process.env.JWT_SECRET)===encrypt('same',process.env.JWT_SECRET),false);
 await api('/api/push/device','DELETE',{installation},null);assert.equal((await db('SELECT enabled FROM push_devices WHERE id=$1',[d.id])).rows[0].enabled,false);
 await api('/api/push/device','PUT',{token,installation,platform:'android',consent:true},owner);
});
test('push drafts do not send; worker targets opted-in accounts and sends each job once',async()=>{
 assert.throws(()=>validCampaign({title:'a',body:'b',path:'//evil.test'}));
 const c=await api('/api/admin/push','POST',{title:'New stock',body:'See our new watches',path:'/?product=1',audience:'self'});assert.equal(c.status,200);
 assert.equal((await db('SELECT COUNT(*)::int AS n FROM push_deliveries')).rows[0].n,0);
 assert.equal((await api('/api/admin/push/'+c.id+'/send','POST',{confirm:true})).status,503);
 const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),env={JWT_SECRET:process.env.JWT_SECRET,FCM_SERVICE_ACCOUNT_JSON:JSON.stringify({project_id:'fixture',client_email:'fixture@example.test',private_key:keys.privateKey.export({type:'pkcs8',format:'pem'})})};let sent=0;
 const worker=createPushNotifications({db,transaction,env,fetchImpl:async(url,options)=>{if(url.includes('oauth2'))return {ok:true,json:async()=>({access_token:'fake-access',expires_in:3600})};sent++;const payload=JSON.parse(options.body);assert.equal(payload.message.token,'fake-fcm-token-for-local-tests-only-001');return {ok:true,json:async()=>({name:'projects/fixture/messages/local'})};}});
 await db("UPDATE push_campaigns SET state='queued' WHERE id=$1",[c.id]);await worker.run();await worker.run();assert.equal(sent,1);
 assert.equal((await db('SELECT state FROM push_campaigns WHERE id=$1',[c.id])).rows[0].state,'complete');
});
test('device account changes retire the old subscription without deleting its delivery history',async()=>{
 const r=await api('/api/push/device','PUT',{token:'fake-fcm-token-for-local-tests-only-001',installation:'1'.repeat(64),platform:'android',consent:true},bob);assert.equal(r.status,200,JSON.stringify(r));
 const devices=(await db('SELECT user_id,enabled FROM push_devices ORDER BY updated_at')).rows;assert.equal(devices.filter(d=>d.enabled).length,1);assert.equal(String(devices.find(d=>d.enabled).user_id),String(bob.id));
 assert.equal((await db('SELECT COUNT(*)::int AS n FROM push_deliveries')).rows[0].n,1);
});
test('exit recommendations choose three available relevant products and exclude cart items',()=>{
 const {pick}=require('../../frontend/exit-recommendations');const catalog=[{id:1,stock:0,price:50,cat:'watches'},{id:2,stock:1,price:60,cat:'bags'},{id:3,stock:1,price:70,cat:'watches'},{id:4,stock:1,price:80,cat:'watches'},{id:5,stock:1,price:90,cat:'bags'}];
 assert.deepEqual(pick(catalog,[{id:3,category:'watches'}],[4]).map(p=>p.id),[3,2,5]);
});
