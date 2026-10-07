'use strict';
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {PGlite} = require('@electric-sql/pglite');
const database = new PGlite();
process.env.JWT_SECRET='isolated-homepage-settings-tests';
require.cache[require.resolve('../src/db')]={exports:{
  db:(sql,values)=>database.query(sql,values),
  transaction:callback=>database.transaction(tx=>callback({query:(sql,values)=>tx.query(sql,values)})),
  getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}
}};
const {app,initDatabase}=require('../src/server');
const {createToken}=require('../src/auth');
const style={font:'Tahoma,Arial,sans-serif',color:'#ffffff',bgColor:'#63345e',opacity:1,bgOpacity:.58,x:43,y:78};
let server,base,saved;
before(async()=>{await initDatabase(); await database.query("INSERT INTO users(id,name,password_hash,role) VALUES(1,'Owner','fixture','owner'),(2,'Customer','fixture','customer')");server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
async function request(route,body,role='owner') {
  return fetch(base+route,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+createToken({id:role==='customer'?2:1,role})}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
test('homepage updates require admin and persist through public settings reads',async()=>{
  const body={hero_slides:[{image:'/api/images/test',mobileImage:'/api/images/mobile-test',titleAr:' عنوان ',descEn:'Description'},{image:'https://example.test/banner.jpg',titleEn:'Second'}],hero_text_style:style};
  assert.equal((await request('/api/admin/settings',body,null)).status,401);
  assert.equal((await request('/api/admin/settings',body,'customer')).status,403);
  assert.equal((await request('/api/admin/settings',{store_name:'Keep this setting'})).status,200);
  assert.equal((await request('/api/admin/settings',body)).status,200);
  saved=(await (await request('/api/settings',null,null)).json()).settings;
  assert.equal(saved.hero_slides[0].titleAr,'عنوان');assert.equal(saved.hero_slides[0].mobileImage,'/api/images/mobile-test');assert.equal(saved.hero_slides[1].titleEn,'Second');
  assert.deepEqual(saved.hero_text_style,style);assert.equal(saved.store_name,'Keep this setting');
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XcAAAAASUVORK5CYII=';
  const uploaded=await fetch(base+'/api/admin/uploads/image',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+createToken({id:1,role:'owner'})},body:JSON.stringify({data:image})});
  assert.equal(uploaded.status,201);const url=(await uploaded.json()).url;
  assert.equal((await request('/api/admin/settings',{hero_slides:[{image:url,titleAr:'صورة مرفوعة'}]})).status,200);
  assert.equal((await fetch(base+url)).status,200);
});
test('invalid image URLs, excessive slides, text, CSS and opacity are rejected atomically',async()=>{
  const before=(await (await request('/api/settings')).json()).settings;
  for(const body of [
    {hero_slides:[{image:'javascript:alert(1)'}]},
    {hero_slides:[{image:'//evil.test/image'}]},
    {hero_slides:[{image:'/\\evil.test/image'}]},
    {hero_slides:[{image:'https://u:p@example.test/image'}]},
    {hero_slides:Array(13).fill({image:'/image.png'})},
    {hero_slides:[{image:'/image.png',titleAr:'x'.repeat(201)}]},
    {hero_text_style:{...style,color:'red;position:fixed'}},
    {hero_text_style:{...style,opacity:2}},
    {hero_text_style:{...style,bgOpacity:'0.5'}},
    {hero_text_style:{...style,x:101}},
    {hero_text_style:{...style,y:-1}},
    {hero_text_style:{...style,font:'url(evil)'}}
  ]) assert.equal((await request('/api/admin/settings',{...body,store_name:'Should not persist'})).status,400,JSON.stringify(body));
  assert.deepEqual((await (await request('/api/settings')).json()).settings,before);
});
test('campaign hero keeps slide images visible and honors the alpha and position controls',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../../frontend/app.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../../frontend/storefront-luxury.css'),'utf8');
  assert.match(app,/setProperty\('--hero-text-bg',hexToRgba\(s\.bgColor,s\.bgOpacity\)\)/);
  assert.match(app,/setProperty\('--hero-text-x',`\$\{s\.x\}%`\)/);
  assert.match(css,/\.heroSlider \.heroLogoLayer\{display:block!important\}/);
  assert.doesNotMatch(css,/\.heroLogo\{display:none!important\}/);
  assert.doesNotMatch(css,/\.heroText\{--hero-text-bg:/);
});
test('actual storefront respects configured order and text, repeats images with different captions, and retains fallback',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../frontend/app.js'),'utf8');
  const functions=source.slice(source.indexOf('function getCustomHeroSlides()'),source.indexOf('function renderHeroSlider'));
  const state={lf_hero:{image:'/default.png'},lf_hero_slides:[...saved.hero_slides,{image:saved.hero_slides[0].image,titleAr:'عنوان آخر'}]};
  const context=vm.createContext({load:(key,fallback)=>state[key]??fallback,LOGO:'/logo.png',DEFAULT_HERO:{image:'/logo.png'},currentLang:'ar'});
  vm.runInContext(functions,context);
  assert.deepEqual(Array.from(context.heroSlides(),x=>x.image),['/api/images/test','https://example.test/banner.jpg','/api/images/test']);
  assert.equal(context.heroSlides()[0].mobileImage,'/api/images/mobile-test');
  assert.equal(context.heroSlides()[0].title,'عنوان');assert.equal(context.heroSlides()[2].title,'عنوان آخر');
  context.currentLang='en';assert.equal(context.heroSlides()[1].title,'Second');
  state.lf_hero_slides=[];assert.equal(context.heroSlides()[0].image,'/default.png');
});
test('admin draft preserves edits across add/reorder/remove, saves only slider settings and recovers after failed save',async()=>{
  const nodes={'#sections':{},'#hpEditor':{},'#hpFields':{},'#hpMessage':{}};
  let rendered='';
  Object.defineProperty(nodes['#sections'],'innerHTML',{get:()=>rendered,set:html=>{
    rendered=html;
    for(const match of html.matchAll(/<input[^>]*id="([^"]+)"[^>]*value="([^"]*)"/g))nodes['#'+match[1]]={value:match[2]};
    for(const match of html.matchAll(/<textarea[^>]*id="([^"]+)"[^>]*>([^<]*)<\/textarea>/g))nodes['#'+match[1]]={value:match[2]};
    const font=/<option value="([^"]+)" selected/.exec(html);nodes['#hpFont']={value:font?font[1]:style.font};
  }});
  let payload,fail=false;
  const context=vm.createContext({window:{},$:(key)=>nodes[key],E:value=>String(value??'').replace(/</g,'&lt;').replace(/"/g,'&quot;'),toast:()=>{},api:async(url,options)=>{payload=JSON.parse(options.body);if(fail)throw Error('تعذر الحفظ');},adminUploadProductImage:async()=>'/api/images/uploaded',adminUploadMany:async files=>[...files].map(()=>'/api/images/uploaded')});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../frontend/admin-homepage.js'),'utf8'),context);
  context.hpRender();context.hpAdd();nodes['#hp_0_image'].value='/one.png';nodes['#hp_0_titleAr'].value='Edited';
  context.hpAdd();nodes['#hp_1_image'].value='/two.png';context.hpMove(1,-1);await context.hpSave();
  assert.equal(payload.hero_slides[0].image,'/two.png');assert.equal(payload.hero_slides[1].titleAr,'Edited');
  assert.deepEqual(Object.keys(payload).sort(),['hero_slides','hero_text_style']);
  fail=true;await context.hpSave();assert.equal(nodes['#hpMessage'].textContent,'تعذر الحفظ');assert.equal(nodes['#hpFields'].disabled,false);
  fail=false;context.hpRemove(0);await context.hpSave();assert.equal(payload.hero_slides.length,1);assert.equal(payload.hero_slides[0].titleAr,'Edited');
  await context.hpUpload({files:[{name:'upload.png'}],value:'upload.png'});await context.hpSave();assert.equal(payload.hero_slides[1].image,'/api/images/uploaded');
});
