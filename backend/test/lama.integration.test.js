'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const database=new PGlite();process.env.JWT_SECRET='lama-isolated';process.env.OPENAI_API_KEY='mock-lama-key';
require.cache[require.resolve('../src/db')]={exports:{db:(s,v)=>database.query(s,v),transaction:fn=>database.transaction(tx=>fn({query:(s,v)=>tx.query(s,v)})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
let calls=0,lastPayload,failure=false;const nativeFetch=global.fetch;
global.fetch=async(url,opts)=>{if(String(url).startsWith('https://api.openai.com/')){calls++;if(failure)throw Error('mock failure');if(String(url).includes('transcriptions'))return {ok:true,json:async()=>({text:'التكلفة 40 والبيع 85 والأسود 3'})};lastPayload=JSON.parse(opts.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({fields:{name:{value:'شنطة اختبار',source:'suggestion',evidence:''},price:{value:85,source:'notes',evidence:'البيع 85'},cost_price:{value:40,source:'image',evidence:'شكلها غالية'},stock:{value:999,source:'notes',evidence:'الأسود 3'},category_id:{value:99999,source:'suggestion',evidence:''}},variants:[{name:'أسود',stock:3,source:'notes',evidence:'الأسود 3'}],image_order:[],image_checks:[],questions:['أكد الخامة']})}}]})}}return nativeFetch(url,opts)};
const {app,initDatabase}=require('../src/server'),{createToken}=require('../src/auth');
const root='/api/admin/products/lama',png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzTYAAAAASUVORK5CYII=','base64'),dataUrl='data:image/png;base64,'+png.toString('base64');
let server,base,asset,draft,category;
async function request(path,{user=1,method='GET',body,raw,headers={}}={}){const r=await fetch(base+path,{method,headers:{...(user?{Authorization:'Bearer '+createToken({id:user,role:user===1||user===4?'owner':'staff'})}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:raw?{body:raw}:{})});return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer())}}
test.before(async()=>{await initDatabase();await require('../src/database-migrations').migrateDatabase();await database.query("INSERT INTO users(id,name,email,password_hash,role,permissions) VALUES(1,'Owner','lama1@test.invalid','fixture','owner','[]'),(2,'Products','lama2@test.invalid','fixture','staff','[\"products\"]'),(3,'Marketing','lama3@test.invalid','fixture','staff','[\"marketing\"]'),(4,'Other','lama4@test.invalid','fixture','owner','[]')");category=(await database.query('SELECT id FROM categories LIMIT 1')).rows[0].id;server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port});
test.after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();global.fetch=nativeFetch});
test('Lama needs products permission, owns private images and preserves original bytes',async()=>{
 for(const user of [null,3])for(const [path,method,body] of [['/config','GET'],['/drafts','GET'],['/drafts','POST',{}],['/transcribe','POST',{}],['/assets','POST',{}]])assert.equal((await request(root+path,{user,method,body})).status,user===null?401:403);
 assert.equal((await request(root+'/config',{user:2})).status,200);
 const uploaded=await request(root+'/assets',{method:'POST',raw:png,headers:{'Content-Type':'image/png'}});assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));asset=uploaded.data.id;
 assert.equal((await request(root+'/assets/'+asset+'/previews',{method:'PUT',body:{display:dataUrl,analysis:dataUrl}})).status,200);
 assert.deepEqual((await request(root+'/assets/'+asset+'?original=1')).data,png);assert.equal((await request(root+'/assets/'+asset,{user:4})).status,404);
 assert.equal((await request(root+'/assets',{method:'POST',raw:Buffer.from('bad'),headers:{'Content-Type':'image/png'}})).status,400);
});
test('drafts tolerate incomplete inputs, stay private and reject stale saves',async()=>{
 let r=await request(root+'/drafts',{method:'POST',body:{title:'ملاحظات شنطة',notes:'التكلفة 40 والبيع 85 والأسود 3',asset_ids:[asset],fields:{variants:[{name:'',stock:2}]}}});assert.equal(r.status,201,JSON.stringify(r.data));draft=r.data.draft;
 assert.equal((await request(root+'/drafts/'+draft.id,{user:4})).status,404);
 const old=draft;r=await request(root+'/drafts/'+draft.id,{method:'PUT',body:{...draft.data,fields:{},version:draft.version}});assert.equal(r.status,200);draft=r.data.draft;
 assert.equal((await request(root+'/drafts/'+draft.id,{method:'PUT',body:{...old.data,version:old.version}})).status,409);
 assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM products')).rows[0].n,0);
});
test('vision is consent-gated, rejects guessed money and invented evidence, survives failures and rate limits',async()=>{
 assert.equal((await request(root+'/drafts/'+draft.id+'/analyze',{method:'POST',body:{version:draft.version}})).status,400);assert.equal(calls,0);
 let r=await request(root+'/drafts/'+draft.id+'/analyze',{method:'POST',body:{version:draft.version,consent:true}});assert.equal(r.status,200,JSON.stringify(r.data));draft=r.data.draft;
 assert.equal(draft.analysis.fields.price.value,85);assert.equal(draft.analysis.fields.cost_price,undefined);assert.equal(draft.analysis.fields.stock,undefined);assert.equal(draft.analysis.fields.category_id,undefined);assert.equal(draft.analysis.variants[0].stock,3);assert.equal(lastPayload.messages[1].content[1].type,'image_url');
 failure=true;assert.equal((await request(root+'/drafts/'+draft.id+'/analyze',{method:'POST',body:{version:draft.version,consent:true}})).status,502);failure=false;
 assert.equal((await request(root+'/drafts/'+draft.id)).data.draft.version,draft.version);
 for(let i=0;i<4;i++){r=await request(root+'/drafts/'+draft.id+'/analyze',{method:'POST',body:{version:draft.version,consent:true}});assert.equal(r.status,200);draft=r.data.draft}
 assert.equal((await request(root+'/drafts/'+draft.id+'/analyze',{method:'POST',body:{version:draft.version,consent:true}})).status,429);
});
test('voice requires consent and returns transcript without creating a product',async()=>{
 assert.equal((await request(root+'/transcribe',{method:'POST',raw:Buffer.from('mock audio'),headers:{'Content-Type':'audio/webm'}})).status,400);
 const r=await request(root+'/transcribe',{method:'POST',raw:Buffer.from('mock audio'),headers:{'Content-Type':'audio/webm','X-Lama-Consent':'true'}});assert.equal(r.status,200,JSON.stringify(r.data));assert.match(r.data.text,/البيع 85/);
});
test('confirmed review opens inactive product; final write atomically prevents duplicate creation',async()=>{
 const data={...draft.data,fields:{name:'شنطة اختبار',description:'وصف مؤكد',price:85,cost_price:40,stock:3,category_id:Number(category),barcode:'LAMA-1',variants:[{name:'أسود / M',stock:3}]},provenance:{price:{source:'notes',evidence:'البيع 85'}}};
 let r=await request(root+'/drafts/'+draft.id,{method:'PUT',body:{...data,version:draft.version}});assert.equal(r.status,200,JSON.stringify(r.data));draft=r.data.draft;assert.equal(draft.data.provenance.price.source,'notes');
 assert.equal((await request(root+'/drafts/'+draft.id+'/prepare',{method:'POST',body:{version:draft.version}})).status,400);
 r=await request(root+'/drafts/'+draft.id+'/prepare',{method:'POST',body:{version:draft.version,reviewed:true}});assert.equal(r.status,200,JSON.stringify(r.data));const seed=r.data.product;assert.equal(seed.isActive,false);assert.equal(seed.stock,3);assert.equal(seed.mainImages.length,1);assert.ok(!JSON.stringify(seed.metadata).includes('البيع 85'));
 const created=await request('/api/admin/products',{method:'POST',body:seed});assert.equal(created.status,201,JSON.stringify(created.data));
 assert.equal((await database.query('SELECT is_active FROM products WHERE id=$1',[created.data.product.id])).rows[0].is_active,false);
 assert.equal((await request('/api/admin/products',{method:'POST',body:seed})).status,409);assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM products')).rows[0].n,1);
 assert.equal((await request(root+'/drafts/'+draft.id)).data.draft.product_id,created.data.product.id);
 const next=await request(root+'/drafts',{method:'POST',body:data});assert.ok(next.data.duplicates[0].reasons.includes('باركود مطابق'));assert.ok(next.data.duplicates[0].reasons.includes('ملف صورة مطابق'));
});
