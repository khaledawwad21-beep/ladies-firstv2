'use strict';
// Isolated end-to-end acceptance. No production records or paid services are used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {chromium}=require('playwright');
process.env.JWT_SECRET='isolated-community-browser-fixture';
require('../test/support/no-external-fetch.cjs');
const database=new PGlite();
const adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
const db=async(s,p)=>adapt(await database.query(s,p));
require.cache[require.resolve('../src/db')]={exports:{db,transaction:fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {initDatabase}=require('../src/server');
const {gateway}=require('../src/start');
const {createToken}=require('../src/auth');
const evidence=path.resolve('community-evidence');fs.mkdirSync(evidence,{recursive:true});
let server,browser,base,owner,alice,bag,perfume,watch;
const errors=[];
async function api(route,method='GET',body,user=owner){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:'Bearer '+user.token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.ok(r.ok,route+': '+JSON.stringify(data));return data;}
async function fixture(name,role){const row=(await db("INSERT INTO users(name,email,phone,password_hash,role) VALUES($1,$2,$3,'fixture',$4) RETURNING *",[name,name+'@browser.example',role==='owner'?'+970599111001':'+970599111002',role])).rows[0];return {...row,token:createToken(row)};}
async function context(user,mobile=true){const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,locale:'ar-PS',timezoneId:'Asia/Hebron'});
 await c.addInitScript(({user})=>{localStorage.setItem('lf_measurement_choice','no');if(user){localStorage.setItem('lf_token',user.token);localStorage.setItem('lf_account',JSON.stringify({...user,type:'email',contact:user.email,serverUserId:user.id}));localStorage.setItem('lf_admin_token',user.token);}window.__shared=[];Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared.push({text:data.text,url:data.url,files:data.files?.length||0})}});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});},{user});
 await c.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===base||u.protocol==='data:'||u.protocol==='blob:'?route.continue():route.abort();});
 const page=await c.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=500)errors.push('HTTP '+r.status()+' '+r.url())});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('#lfCommunityHome').waitFor();
 const decline=page.getByRole('button',{name:'لا، شكرًا',exact:true});if(await decline.isVisible())await decline.click();return {c,page};}
const act=(page,action)=>page.locator('[data-c-act="'+action+'"]');
async function main(){try{
 await initDatabase();await require('../src/database-migrations').migrateDatabase();owner=await fixture('Owner','owner');alice=await fixture('Alice','customer');
 server=gateway.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 const image=(await api('/api/admin/uploads/image','POST',{data:'data:image/jpeg;base64,'+fs.readFileSync(path.resolve('../frontend/category-images/bags.jpg')).toString('base64')})).url;
 async function create(name,price,category,variants){return (await api('/api/admin/products','POST',{name,price,stock:15,category,images:[image],metadata:{occasionTags:'هدية',styleTags:'ذهبي'},...(variants?{variants}:{})})).product;}
 bag=await create('حقيبة الاختبار',80,'شنط',[{name:'ذهبي',stock:15},{name:'أسود',stock:15}]);perfume=await create('عطر الاختبار',50,'عطور');watch=await create('ساعة الاختبار',110,'ساعات');
 const mobile=await context(alice);const page=mobile.page;
 await page.locator('#lfCommunityHome [data-tab="gifts"]').click();await page.locator('#lfGiftRecipient').fill('لينا');await page.locator('#lfGiftBudget').fill('250');await act(page,'gift-find').click();await act(page,'gift-buy').first().waitFor();
 await page.screenshot({path:path.join(evidence,'01-gifts-mobile.png'),fullPage:true});
 await act(page,'gift-swap').first().click();await act(page,'choose-product').filter({hasText:'اختاري'}).first().click();await act(page,'confirm-product').click();await act(page,'gift-buy').first().waitFor();
 await act(page,'gift-buy').first().click();await page.locator('#shippingRegion').waitFor();assert.equal(await page.locator('#shippingRegion').inputValue(),'westbank');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lf_gift_card_draft')).file),'card-13.jpg');await page.locator('#drawer > .panel > .close').click();
 await page.locator('#grid .pic').first().click();await page.locator('#lfCommunityProductTools').waitFor();await page.locator('#lfCommunityProductTools [data-c-act="save-product"]').click();
 await page.locator('#lfNewKind').selectOption('look');await page.locator('#lfNewTitle').fill('تنسيقتي للعيد');await act(page,'pick-for-list').click();await page.locator('#lfPickerSearch').fill('عطر');await act(page,'choose-product').first().click();await act(page,'confirm-product').click();assert.equal(await page.locator('#lfNewTitle').inputValue(),'تنسيقتي للعيد');await act(page,'save-list').click();await page.getByRole('heading',{name:'تنسيقتي للعيد'}).waitFor();
 await page.screenshot({path:path.join(evidence,'02-saved-look-mobile.png'),fullPage:true});
 await act(page,'share-list').click();assert.ok((await page.evaluate(()=>window.__shared)).at(-1).url.includes('/share/list/'));
 await act(page,'close').click();await page.locator('#modal .close').click();
 await page.locator('#lfCommunityHome [data-tab="compare"]').click();for(const name of ['حقيبة','عطر']){await act(page,'pick-compare').click();await page.locator('#lfPickerSearch').fill(name);await act(page,'choose-product').first().click();await act(page,'confirm-product').click();}
 await act(page,'compare-advice').click();await page.locator('#lfCompareAdvice').getByText(/نايا/).waitFor();await act(page,'new-poll').click();await page.locator('#lfNewTitle').fill('شو أختار؟');await act(page,'save-list').click();await page.getByRole('heading',{name:'شو أختار؟'}).waitFor();
 const poll=(await api('/api/community/lists','GET',null,alice)).lists.find(x=>x.kind==='poll');assert.ok(poll);
 const guest=await context(null);await guest.page.goto(base+'/?list='+poll.token);await act(guest.page,'vote').first().waitFor();await guest.page.locator('#lfVoteComment').fill('العطر جميل');await act(guest.page,'vote').first().click();await guest.page.getByText('وصل صوتك 🌸',{exact:true}).waitFor();
 await guest.page.screenshot({path:path.join(evidence,'03-friend-vote-mobile.png'),fullPage:true});
 const group=(await api('/api/community/lists','POST',{kind:'group',title:'طلبية الصحبات',items:[]},alice)).list;
 await guest.page.goto(base+'/?list='+group.token);await act(guest.page,'add-group').waitFor();await act(guest.page,'add-group').click();await guest.page.locator('#lfPickerSearch').fill('عطر');await act(guest.page,'choose-product').first().click();await guest.page.locator('#lfContributor').fill('سارة');await act(guest.page,'confirm-product').click();await guest.page.getByText('اختيار: سارة',{exact:true}).waitFor();
 await page.goto(base+'/?list='+group.token);await act(page,'group-split').waitFor();await act(page,'group-split').click();await page.locator('#lfGroupSplit').getByText(/20.00/).waitFor();
 await page.screenshot({path:path.join(evidence,'04-friends-basket-mobile.png'),fullPage:true});
 await act(page,'close').click();await page.locator('#grid .pic').first().click();await page.locator('#lfCommunityProductTools [data-c-act="story-product"]').click();await page.locator('#lfStoryCanvas').waitFor();await act(page,'share-story').click();await page.waitForFunction(()=>window.__shared.some(x=>x.files===1));
 await page.screenshot({path:path.join(evidence,'05-story-card-mobile.png'),fullPage:true});
 const desktop=await context(alice,false);await desktop.page.locator('#lfCommunityHome [data-tab="referrals"]').click();await desktop.page.getByText(/نقطة بعد تسليم/).waitFor();await desktop.page.screenshot({path:path.join(evidence,'06-referrals-desktop.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await desktop.page.goto(base+'/admin.html');await desktop.page.locator('#login').waitFor({state:'visible'});
 const admin=await context(owner,false);await admin.page.goto(base+'/admin.html');await admin.page.locator('#app').waitFor({state:'visible'});await admin.page.locator('[data-s=community]').click();await admin.page.locator('#cmSettings').waitFor();await admin.page.screenshot({path:path.join(evidence,'07-admin-community.png'),fullPage:true});
 }finally{
  fs.writeFileSync(path.join(evidence,'browser-errors.json'),JSON.stringify(errors,null,2));
  if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await database.close();
 }}
(async()=>{browser=await chromium.launch({headless:true});await main();assert.deepEqual(errors,[]);console.log('Community mobile and desktop flows passed.');})().catch(e=>{console.error(e);process.exitCode=1;});
