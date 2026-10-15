const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {PGlite}=require(path.join(root,'backend/node_modules/@electric-sql/pglite'));
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
process.env.JWT_SECRET='isolated-marketing-visual-test';
const database=new PGlite();
require.cache[require.resolve(path.join(root,'backend/src/db'))]={exports:{db:(s,v)=>database.query(s,v),transaction:fn=>database.transaction(tx=>fn({query:(s,v)=>tx.query(s,v)})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {app,initDatabase}=require(path.join(root,'backend/src/server'));
const {createToken}=require(path.join(root,'backend/src/auth'));
(async()=>{
 await initDatabase();
 await database.query("INSERT INTO users(id,name,email,password_hash,role,is_active) VALUES(1,'Owner','visual@example.test','fixture','owner',TRUE)");
 await database.query("INSERT INTO products(name,price,stock) VALUES('عطر الورد',49,10)");
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Jerusalem'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(token=>localStorage.setItem('lf_admin_token',token),createToken({id:1,role:'owner'}));
 await page.route('https://**/*',r=>r.abort());
 await page.goto(base+'/admin.html');
 await page.locator('#app').waitFor({state:'visible'});
 await page.locator('[data-s="marketing"]').click();
 await page.locator('#marketingNew').click();
 await page.locator('#mk_title').fill('حملة عطر الورد');
 await page.locator('#mk_productSearch').fill('عطر');
 await page.locator('#mk_product option').nth(1).waitFor({state:'attached'});
 await page.locator('#mk_product').selectOption({index:1});
 await page.locator('#mk_generate').click();
 assert.match(await page.locator('#mk_content').inputValue(),/49.00/);
 await page.locator('#mk_budget').fill('100');
 await page.locator('#mk_save').click();
 await page.locator('#modal.open').waitFor({state:'hidden'});
 await page.locator('[data-marketing-edit]').waitFor();
 await page.reload();
 await page.locator('[data-s="marketing"]').click();
 await page.locator('[data-marketing-edit]').waitFor();
 await page.screenshot({path:path.join(root,'marketing-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('[data-marketing-edit]').click();
 await page.locator('#mk_spend').fill('200');
 await page.locator('#mk_save').click();
 await page.waitForFunction(()=>document.querySelector('#mk_error').textContent.length>0);
 assert.match(await page.locator('#mk_error').textContent(),/يتجاوز/);
 await page.locator('.modal-close').click();
 for(const section of ['products','orders','settings','social','marketing']){
   await page.locator('[data-s="'+section+'"]').click();
   await page.waitForTimeout(150);
   assert.equal(await page.locator('#title').textContent()==='',false);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS mobile create, product content, persistence, invalid spend, modal close, navigation, no page errors or overflow');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await database.close()}
})().catch(e=>{console.error(e);process.exit(1)});
