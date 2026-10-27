'use strict';
// Real browser and isolated PostgreSQL-compatible fixtures; no production writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {chromium}=require('playwright');
process.env.JWT_SECRET='isolated-wheel-browser-secret';require('../test/support/no-external-fetch.cjs');
const database=new PGlite(),adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
const db=async(s,p)=>adapt(await database.query(s,p));
require.cache[require.resolve('../src/db')]={exports:{db,transaction:fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {initDatabase}=require('../src/server'),{gateway}=require('../src/start'),{createToken}=require('../src/auth');
let server,browser,base;
const evidence=process.env.WHEEL_EVIDENCE_DIR||'/tmp/ladies-wheel-evidence';fs.mkdirSync(evidence,{recursive:true});
const errors=[];
async function api(route,method,body,user){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+user.token},body:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
async function user(name,role){const r=(await db("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,'fixture',$3) RETURNING *",[name,name+'@wheel.test',role])).rows[0];return {...r,token:createToken(r)};}
async function context(u,width=390){const c=await browser.newContext({viewport:{width,height:844},locale:'ar-PS',timezoneId:'Asia/Hebron',reducedMotion:'reduce'});await c.addInitScript(u=>{localStorage.setItem('lf_measurement_choice','no');localStorage.setItem('lf_token',u.token);localStorage.setItem('lf_admin_token',u.token);localStorage.setItem('lf_account',JSON.stringify({...u,contact:u.email,serverUserId:u.id}));},u);await c.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());const page=await c.newPage();page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(15000);return {c,page};}
(async()=>{try{
 await initDatabase();await require('../src/database-migrations').migrateDatabase();server=gateway.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const owner=await user('Owner','owner'),alice=await user('Alice','customer');
 const product=(await api('/api/admin/products','POST',{name:'حقيبة وردية',price:100,stock:20,cost_price:25,category:'شنط',images:['https://example.test/wheel.png']},owner)).product;
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.WHEEL_BROWSER_EXECUTABLE?{executablePath:process.env.WHEEL_BROWSER_EXECUTABLE}:{})});
 const admin=await context(owner);await admin.page.goto(base+'/admin.html');await admin.page.locator('[data-s=wheel]').click();await admin.page.locator('#wName').fill('دولاب هدايا Ladies First');await admin.page.locator('[data-wheel-row="0"] [data-key=type]').selectOption('gift');await admin.page.locator('[data-wheel-row="0"] [data-key=productId]').selectOption(String(product.id));assert.equal(await admin.page.locator('[data-wheel-row="0"] [data-key=productId]').inputValue(),String(product.id));await admin.page.locator('[data-wheel-row="0"] [data-key=type]').selectOption('percent');await admin.page.locator('#wPreview').click();await admin.page.locator('.wheel-preview-disc').waitFor();
 await admin.page.screenshot({path:path.join(evidence,'admin-mobile.png'),fullPage:true});
 await Promise.all([admin.page.waitForResponse(r=>r.url().endsWith('/api/admin/wheel')&&r.request().method()==='PUT'),admin.page.locator('#wheelForm button[type=submit]').click()]);
 // Server confirms the UI created a disabled campaign.
 let c=(await (await fetch(base+'/api/admin/wheel',{headers:{Authorization:'Bearer '+owner.token}})).json()).campaigns[0];assert.ok(c);assert.equal(c.config.enabled,false);
 c.config.prizes=c.config.prizes.map(p=>({...p,type:'fixed',value:10}));c.config.enabled=true;
 await api('/api/admin/wheel','PUT',{id:c.id,...c.config},owner);
 const shop=await context(alice);await shop.page.goto(base+'/');await shop.page.locator('.lf-wheel-entry').click();await shop.page.locator('[data-spin]').click();await shop.page.locator('[data-wheel-rewards] .lf-wheel-reward').waitFor();
 assert.match(await shop.page.locator('[data-wheel-status]').textContent(),/مبروك/);assert.ok(await shop.page.locator('[data-spin]').isDisabled());
 await shop.page.screenshot({path:path.join(evidence,'wheel-mobile.png')});
 await shop.page.locator('.lf-wheel-close').click();await shop.page.evaluate(id=>{cart=[{id:Number(id),qty:1}];save('lf_cart',cart);renderCart();},product.id);
 await shop.page.locator('.lf-wheel-entry').click();await shop.page.locator('[data-use-wheel]').first().click();await shop.page.waitForFunction(()=>couponCode.startsWith('LF-W-'));
 assert.equal(await shop.page.evaluate(()=>getCartTotals('cod').couponDiscount),10);
 await shop.page.setViewportSize({width:320,height:740});await shop.page.evaluate(()=>closeCart());await shop.page.locator('.lf-wheel-entry').click();assert.equal(await shop.page.evaluate(()=>document.querySelector('.lf-wheel-dialog').scrollWidth>document.querySelector('.lf-wheel-dialog').clientWidth+1),false);
 await shop.page.screenshot({path:path.join(evidence,'wheel-narrow.png')});await shop.c.close();
 const desktop=await context(alice,1440);await desktop.page.goto(base+'/');await desktop.page.locator('.lf-wheel-entry').click();await desktop.page.locator('[data-wheel-rewards] .lf-wheel-reward').waitFor();await desktop.page.screenshot({path:path.join(evidence,'wheel-desktop.png')});await desktop.c.close();await admin.c.close();
 assert.deepEqual(errors,[]);console.log('PASS: admin campaign creation, preview, mobile spin, persistence, cart redemption, 320px and desktop layout');
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await database.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
