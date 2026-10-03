'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// PGlite runs PostgreSQL SQL in-process; no production connection is used.
const { PGlite } = require(process.env.PGLITE_PATH || '@electric-sql/pglite');
const database = new PGlite();
process.env.JWT_SECRET = 'isolated-product-tests';
async function query(sql, params) { const result = await database.query(sql, params); return { ...result, rowCount: result.affectedRows ?? result.rows.length }; }
require.cache[require.resolve('../src/db')] = { exports: { db: query,
  transaction: callback => database.transaction(tx => callback({ query: async (sql, params) => { const r = await tx.query(sql, params); return { ...r, rowCount: r.affectedRows ?? r.rows.length }; } })),
  getDatabaseStatus: async () => ({ configured: true, connected: true }), closeDatabase: async () => {} } };
const { app, initDatabase } = require('../src/server');
const { createToken } = require('../src/auth');
let server, base, image, product;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XcAAAAASUVORK5CYII=';
before(async () => {
  await initDatabase();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { if(server) await new Promise(resolve => server.close(resolve)); await database.close(); });
async function request(path, method = 'GET', body, role = 'owner') {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: 'Bearer ' + createToken({ id: 1, role }) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('upload requires admin, validates content, deduplicates and survives app recreation', async () => {
  for (const role of [null, 'customer']) assert.equal((await request('/api/admin/uploads/image','POST',{data:png},role)).status, role ? 403 : 401);
  assert.equal((await request('/api/admin/uploads/image','POST',{data:'data:image/png;base64,YmFk'})).status,400);
  const response = await request('/api/admin/uploads/image','POST',{data:png});
  assert.equal(response.status,201); image=(await response.json()).url;
  assert.equal((await (await request('/api/admin/uploads/image','POST',{data:png})).json()).url,image);
  assert.equal((await query('SELECT COUNT(*) AS n FROM uploaded_images')).rows[0].n,1);
  const secondApp = require('express')(); require('../src/product-media').registerMedia(secondApp);
  const restarted=secondApp.listen(0,'127.0.0.1'); await new Promise(resolve=>restarted.once('listening',resolve));
  try { const r=await fetch('http://127.0.0.1:'+restarted.address().port+image); assert.equal(r.status,200); assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await r.arrayBuffer()),Buffer.from(png.split(',')[1],'base64')); } finally { await new Promise(resolve=>restarted.close(resolve)); }
});
test('create and reload retains multiple main/sub images, stock by color and offer fields', async () => {
  const body={name:'اختبار منتج',price:25,old_price:30,cost_price:10,category:'عطور',brand:'Test Brand',mainImages:[image,image],subImages:[image],variants:[{name:'أحمر',stock:3},{name:'أزرق',stock:2}],metadata:{en:'Test product',top5:true,quickOffer:true,offerLabel:true,offerExpiry:'2026-12-01'}};
  const response=await request('/api/admin/products','POST',body); const data=await response.json(); assert.equal(response.status,201,JSON.stringify(data)); product=data.product;
  assert.equal(product.stock,5);assert.equal(product.mainImages.length,2);assert.equal(product.subImages.length,1);assert.equal(product.category,'عطور');assert.equal(product.brand,'Test Brand');assert.equal(product.metadata.quickOffer,true);assert.equal(Number(product.cost_price),10);assert.equal(product.variants[0].name,'أحمر');
  const list=await (await request('/api/products')).json();assert.equal(list.products.length,1);assert.deepEqual(list.products[0].images,[image,image,image]);
});
test('editing updates the same product and retains variant IDs; invalid save is atomic', async () => {
  const variantId=product.variants[0].id;
  const response=await request('/api/admin/products/'+product.id,'PUT',{name:'Updated',price:26,category:'عطور',brand:'Test Brand',mainImages:[image],subImages:[],variants:[{name:'أحمر',stock:4}],metadata:{quickOffer:true}});
  assert.equal(response.status,200);product=(await response.json()).product;
  assert.equal(product.variants[0].id,variantId);assert.equal(product.stock,4);assert.equal(product.images.length,1);
  assert.equal((await query('SELECT COUNT(*) AS n FROM products')).rows[0].n,1);
  const invalid=await request('/api/admin/products/'+product.id,'PUT',{name:'Bad',price:20,mainImages:[],variants:[]});assert.equal(invalid.status,400);
  assert.equal((await query('SELECT name FROM products WHERE id=$1',[product.id])).rows[0].name,'Updated');
});
test('actual admin upload and save helpers preserve failures and avoid duplicate creates', async () => {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/admin.html'),'utf8');
  const alerts=[],input={files:[{name:'picked.png'}],value:'selected'};
  const context=vm.createContext({API_BASE:base,fetch,URL,apiToken:()=>createToken({id:1,role:'owner'}),alert:x=>alerts.push(x),compressImage:(file,cb)=>cb(png),save(){},products:[]});
  const start=html.indexOf('async function uploadDataUrl');const end=html.indexOf('\nfunction readOne',start);vm.runInContext(html.slice(start,end),context);
  for(const name of ['apiFetch','normalizeProductImages','variantList','totalStock','apiProductPayload','apiProductFromServer'])vm.runInContext(html.split('\n').filter(x=>new RegExp('^(async )?function '+name+'\\(').test(x)).at(-1),context);
  const pstart=html.indexOf('let productSaveBusy=');const pend=html.indexOf('\nlet addingProduct=',pstart);vm.runInContext(html.slice(pstart,pend),context);
  let callback=false;await context.readImages(input,()=>{callback=true});assert.equal(callback,true);assert.equal(input.value,'selected');
  context.apiToken=()=>'';callback=false;await context.readImages(input,()=>{callback=true});assert.equal(callback,false);assert.match(alerts.at(-1),/تسجيل الدخول/);assert.equal(input.value,'selected');context.apiToken=()=>createToken({id:1,role:'owner'});
  context.products=[{id:'local-new',name:'UI-created',price:5,stock:1,mainImages:[base+image],subImages:[],variants:[]}];
  assert.equal(await context.persistProducts(),true);const savedId=context.products[0].id;
  assert.equal(await context.persistProducts(),true);
  context.products[0].name='UI edited';assert.equal(await context.persistProducts(),true);assert.equal(context.products[0].id,savedId);
  assert.equal((await query('SELECT COUNT(*) AS n FROM products')).rows[0].n,2);
  const fields={n:'Added from full form',mainPhoto:input,subPhotos:{files:[]},pr:'15',old:'20',cost:'6',stock:'2',en:'Form product',brandNew:'',brand:'Test Brand',cat:'عطور',desc:'description',visaDisc:'0',offerExpiry:'',quickOfferExpiry:''};
  context.document={getElementById:id=>typeof fields[id]==='object'?fields[id]:{value:fields[id]??'',checked:id==='offer'}};
  context.crypto=require('node:crypto');context.collectVariants=()=>[];context.ensureProductBrand=x=>x;context.render=async()=>{};
  const add=html.split('\n').find(x=>x.startsWith('async function addProduct('));vm.runInContext('let addingProduct=false;'+add,context);
  await Promise.all([context.addProduct(),context.addProduct()]);
  assert.equal((await query('SELECT COUNT(*) AS n FROM products')).rows[0].n,3);
  const created=await query('SELECT name FROM products ORDER BY id DESC LIMIT 1');assert.equal(created.rows[0].name,'Added from full form');

});
