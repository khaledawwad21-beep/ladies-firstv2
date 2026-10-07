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
  await initDatabase(); await database.query("INSERT INTO users(id,name,password_hash,role) VALUES(1,'Owner','fixture','owner'),(2,'Customer','fixture','customer')");
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { if(server) await new Promise(resolve => server.close(resolve)); await database.close(); });
async function request(path, method = 'GET', body, role = 'owner') {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: 'Bearer ' + createToken({ id: role === 'customer' ? 2 : 1, role }) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
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
  const body={name:'اختبار منتج',price:25,old_price:30,cost_price:10,category:'عطور',brand:'Test Brand',mainImages:[image,image],subImages:[image],variants:[{name:'أحمر',stock:3},{name:'أزرق',stock:2}],metadata:{en:'Test product',top5:true,quickOffer:true,offerLabel:true,offerExpiry:'2026-12-01',videos:['https://www.youtube.com/watch?v=abc1234']}};
  const response=await request('/api/admin/products','POST',body); const data=await response.json(); assert.equal(response.status,201,JSON.stringify(data)); product=data.product;
  assert.equal(product.stock,5);assert.equal(product.mainImages.length,2);assert.equal(product.subImages.length,1);assert.equal(product.category,'عطور');assert.equal(product.brand,'Test Brand');assert.equal(product.metadata.quickOffer,true);assert.deepEqual(product.metadata.videos,['https://www.youtube.com/watch?v=abc1234']);assert.equal(Number(product.cost_price),10);assert.equal(product.variants[0].name,'أحمر');
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
test('actual admin product bundle uploads media before saving JSON product payload', () => {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/admin.html'),'utf8');
  const js=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/admin-product-upload.js'),'utf8');
  assert.match(html,/admin-product-upload\.js/);
  assert.match(js,/\/api\/admin\/uploads\/image/);
  assert.match(js,/readAsDataURL/);
  assert.match(js,/Content-Type["']?\s*:\s*["']application\/json/);
  assert.match(js,/multiple accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(js,/cost_price/);
  assert.match(js,/variants:/);
  assert.match(js,/metadata:\{videos\}/);
  assert.match(js,/adminTaxonomyOptions/);
  assert.match(js,/id="pbrand"/);
  assert.match(js,/id="pcat"/);
  assert.match(js,/pVideoFiles/);
  assert.match(js,/\/api\/admin\/uploads\/video/);
  assert.match(js,/if\s*\(button\?\.disabled\)\s*return/);
  assert.doesNotMatch(js,/new FormData\(/);
});

 test('offer updates persist flags and dates without rewriting stock, media or taxonomy', async () => {
  const before=(await query('SELECT * FROM products WHERE id=$1',[product.id])).rows[0];
  for(const role of [null,'customer']) assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{top5:true},role)).status,role?403:401);
  const offer={top5:true,quickOffer:true,onSale:false,offerExpiry:'2030-10-10',quickOfferExpiry:'2030-10-11'};
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',offer)).status,200);
  let row=(await query('SELECT * FROM products WHERE id=$1',[product.id])).rows[0];
  for(const key of ['stock','price','cost_price','category_id','brand_id','image_url'])assert.equal(row[key],before[key]);
  for(const [key,value] of Object.entries(offer))assert.equal(row.metadata[key],value);
  assert.equal(row.is_featured,true);
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{offerExpiry:'2030-02-30',top5:false})).status,400);
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{quickOffer:'false'})).status,400);
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{onSale:true})).status,400);
  row=(await query('SELECT * FROM products WHERE id=$1',[product.id])).rows[0];assert.equal(row.metadata.top5,true);
  assert.equal((await request('/api/admin/products/999999/offers','PATCH',{top5:true})).status,404);
  const edited=await request('/api/admin/products/'+product.id,'PUT',{name:'Edited after offer',price:26,stock:4});assert.equal(edited.status,200);
  const listed=(await (await request('/api/products')).json()).products.find(x=>String(x.id)===String(product.id));
  for(const [key,value] of Object.entries(offer))assert.equal(listed.metadata[key],value);
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{top5:false,quickOffer:false,offerExpiry:'',quickOfferExpiry:null})).status,200);
  row=(await query('SELECT * FROM products WHERE id=$1',[product.id])).rows[0];assert.equal(row.is_featured,false);assert.equal(row.metadata.quickOffer,false);assert.equal(row.metadata.offerExpiry,'');
});
test('offer editor can change sale and original prices atomically', async () => {
  const response=await request('/api/admin/products/'+product.id+'/offers','PATCH',{
    onSale:true,
    salePrice:20,
    originalPrice:30,
    top5:true
  });
  const body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));
  assert.equal(Number(body.price),20);
  assert.equal(Number(body.oldPrice),30);
  const row=(await query('SELECT price,old_price,metadata FROM products WHERE id=$1',[product.id])).rows[0];
  assert.equal(Number(row.price),20);
  assert.equal(Number(row.old_price),30);
  assert.equal(row.metadata.onSale,true);
  assert.equal((await request('/api/admin/products/'+product.id+'/offers','PATCH',{onSale:true,salePrice:30,originalPrice:20})).status,400);
});

 test('storefront respects selected Top 5, expiry, stock and quick-offer expiry',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/app.js'),'utf8');
  const context=vm.createContext({products:[{id:1,top5:true,stock:2,price:20,old:20},{id:2,onSale:true,stock:2,price:10,old:20},{id:3,top5:true,stock:2,price:5,old:20,offerExpiry:'2000-01-01'},{id:4,top5:true,stock:0,price:5,old:20}],totalStock:p=>p.stock});
  vm.runInContext(source.slice(source.indexOf('function isOfferActive('),source.indexOf('function getBestSellers(')),context);
  assert.deepEqual(Array.from(context.getTop5(),x=>x.id),[1]);context.products[0].top5=false;
  assert.deepEqual(Array.from(context.getTop5(),x=>x.id),[2]);context.products[1].onSale=false;
  assert.equal(context.getTop5().length,0);
  vm.runInContext(source.slice(source.indexOf('function quickOffers('),source.indexOf('function shareOfferWhatsApp(')),context);
  context.products[0].quickOffer=true;context.products[0].quickOfferExpiry='2030-10-11';context.products[1].quickOffer=true;context.products[1].quickOfferExpiry='2000-01-01';
  assert.deepEqual(Array.from(context.quickOffers(),x=>x.id),[1]);
});


test('product video metadata rejects unsafe URLs and storefront renders supported videos', () => {
  const { cleanMetadata } = require('../src/product-write');
  assert.throws(() => cleanMetadata({videos:['javascript:alert(1)']}), /رابط الفيديو/);
  assert.throws(() => cleanMetadata({videos:Array(9).fill('https://example.test/video.mp4')}), /8 فيديوهات/);
  assert.deepEqual(cleanMetadata({videos:['https://example.test/video.mp4']}).videos,['https://example.test/video.mp4']);
  const local='/api/videos/'+'a'.repeat(64);
  assert.deepEqual(cleanMetadata({videos:[local]}).videos,[local]);
  const app=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/app.js'),'utf8');
  assert.match(app,/function productVideoHtml\(/);
  assert.match(app,/youtube\.com\/embed/);
  assert.match(app,/productVideos/);
  assert.match(app,/u\.pathname\.startsWith\('\/api\/videos\/'\)/);
});

test('admin can upload and range-stream a product video', async () => {
  const token=createToken({id:1,role:'owner'});
  const mp4=Buffer.concat([
    Buffer.from([0,0,0,24]),
    Buffer.from('ftypisom'),
    Buffer.from('0000000000000000')
  ]);
  const upload=await fetch(base+'/api/admin/uploads/video',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'},
    body:mp4
  });
  const payload=await upload.json();
  assert.equal(upload.status,201,JSON.stringify(payload));
  assert.match(payload.url,/^\/api\/videos\/[a-f0-9]{64}$/);
  const ranged=await fetch(base+payload.url,{headers:{Range:'bytes=0-7'}});
  assert.equal(ranged.status,206);
  assert.equal(ranged.headers.get('content-type'),'video/mp4');
  assert.match(ranged.headers.get('content-range')||'',/^bytes 0-7\//);
  assert.equal(Buffer.from(await ranged.arrayBuffer()).length,8);
});


test('large product images are compressed client-side before upload', () => {
  const js=fs.readFileSync(require('node:path').join(__dirname,'../../frontend/admin-product-upload.js'),'utf8');
  assert.match(js,/ADMIN_IMAGE_TARGET_BYTES\s*=\s*Math\.floor\(2\.5 \* 1024 \* 1024\)/);
  assert.match(js,/ADMIN_IMAGE_MAX_DIMENSION\s*=\s*2400/);
  assert.match(js,/function adminLoadImage\(/);
  assert.match(js,/function adminCanvasBlob\(/);
  assert.match(js,/async function adminPrepareProductImage\(/);
  assert.match(js,/canvas\.toBlob/);
  assert.match(js,/"image\/webp"/);
  assert.match(js,/const data = await adminPrepareProductImage\(file\)/);
  assert.doesNotMatch(js,/const data = await adminImageDataUrl\(file\);\s*const response = await fetch\("\/api\/admin\/uploads\/image"/);
});
