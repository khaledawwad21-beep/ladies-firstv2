'use strict';
// Isolated database and browser: no production accounts, messages or spins.
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {chromium}=require('playwright');
process.env.JWT_SECRET='local-account-addressing-smoke';
require('../test/support/no-external-fetch.cjs');
const database=new PGlite(),adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
const db=async(s,p)=>adapt(await database.query(s,p));
require.cache[require.resolve('../src/db')]={exports:{db,transaction:fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {initDatabase}=require('../src/server'),{gateway}=require('../src/start'),{createToken}=require('../src/auth');
let server,browser,base;
async function user(name,role,gender){const row=(await db("INSERT INTO users(name,email,password_hash,role,gender) VALUES($1,$2,'fixture',$3,$4) RETURNING *",[name,name+'@address.test',role,gender])).rows[0];return {...row,token:createToken(row)};}
async function api(path,method,body,u){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+u.token},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.ok,true,JSON.stringify(d));return d;}
(async()=>{try{
 await initDatabase();await require('../src/database-migrations').migrateDatabase();
 server=gateway.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const owner=await user('Khaled','owner','male'),customer=await user('Customer','customer','female');
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.WHEEL_BROWSER_EXECUTABLE?{executablePath:process.env.WHEEL_BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await context.addInitScript(u=>{
  localStorage.setItem('lf_measurement_choice','no');localStorage.setItem('lf_token',u.token);localStorage.setItem('lf_admin_token',u.token);
  const stale={...u,gender:'female',type:'email',contact:u.email,serverUserId:u.id};
  localStorage.setItem('lf_account',JSON.stringify(stale));localStorage.setItem('lf_users',JSON.stringify([stale]));
 },owner);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(15000);
 await page.goto(base);
 await page.getByRole('button',{name:'نورتنا، Khaled 🩷',exact:true}).waitFor();
 await page.getByRole('button',{name:'ابحث عن قطعة مميزة',exact:true}).waitFor();
 await page.getByRole('heading',{name:'تسوّق حسب الفئة',exact:true}).waitFor();
 assert.equal(await page.locator('#search').getAttribute('placeholder'),'ابحث عن منتج...');
 await page.evaluate(()=>{const old=JSON.parse(localStorage.getItem('lf_account'));localStorage.setItem('lf_users',JSON.stringify([{...old,gender:'female'}]));});
 assert.equal(await page.evaluate(()=>getAccount().gender),'male');
 await page.getByRole('button',{name:/^ابدأ الاختيار/}).click();
 await page.getByText('يا أهلا فيك 🌸 أنا نايا، شو بقدر ساعدك اليوم؟',{exact:true}).waitFor();
 await page.locator('.lf-store-ai-close').click();
 await page.locator('#lang').click();await page.getByRole('heading',{name:'Shop by category',exact:true}).waitFor();
 await page.locator('#lang').click();await page.getByRole('heading',{name:'تسوّق حسب الفئة',exact:true}).waitFor();
 // Changing accounts restores the correct form, rather than retaining male DOM text.
 await page.evaluate(async u=>{localStorage.setItem('lf_token',u.token);await lfSyncMe();},customer);
 await page.getByRole('button',{name:'ابحثي عن قطعة مميزة',exact:true}).waitFor();
 await page.getByRole('heading',{name:'تسوقي حسب الفئة',exact:true}).waitFor();
 await page.evaluate(async u=>{localStorage.setItem('lf_token',u.token);await lfSyncMe();},owner);
 const c=(await api('/api/admin/wheel','PUT',{name:'محاولة المالك',enabled:true,startsAt:new Date(Date.now()-60000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),frequency:'campaign',minimum:0,validDays:7,prizes:Array.from({length:8},(_,i)=>({id:'p'+i,type:'none',weight:1,limit:0}))},owner)).campaign;
 const first=await api('/api/wheel/spin','POST',{campaignId:c.id},owner);
 // Simulate a stale tab / second-device race: eligibility was read before the saved spin.
 let stale=true;
 await page.route('**/api/wheel/mine',async route=>{if(stale){stale=false;await route.fulfill({json:{ok:true,played:false,rewards:[]}});}else await route.continue();});
 await page.evaluate(()=>window.LFLuckyWheel.open());await page.locator('[data-spin]').waitFor();
 assert.equal(await page.locator('[data-spin]').textContent(),'لفّ الدولاب');
 await page.locator('[data-spin]').click();await page.getByText('هذه نتيجتك السابقة؛ لم تُحتسب محاولة جديدة. حظ أوفر',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-spin]').isDisabled(),true);
 assert.equal(await page.locator('.lf-wheel-disc').evaluate(el=>el.style.transform),'');
 assert.equal((await db('SELECT COUNT(*)::int AS n FROM lucky_spins WHERE campaign_id=$1 AND user_id=$2',[c.id,owner.id])).rows[0].n,1);
 assert.equal((await db('SELECT id FROM lucky_spins WHERE campaign_id=$1 AND user_id=$2',[c.id,owner.id])).rows[0].id,first.spin.id);
 await page.reload();await page.locator('[data-spin]').waitFor();assert.equal(await page.locator('[data-spin]').isDisabled(),true);
 assert.equal(await page.locator('[data-spin]').textContent(),'محاولتك السابقة محفوظة');
 await page.locator('.lf-wheel-close').click();
 await page.evaluate(async()=>{localStorage.setItem('lf_token','invalid-local-test-token');await lfSyncMe();});
 assert.equal(await page.evaluate(()=>getAccount()),null);
 await page.getByRole('button',{name:'حسابي',exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: stale profile, male/female account switching, Arabic/English, Naya welcome, owner replay without animation, reload and invalid-session cleanup');
 await context.close();
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await database.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
