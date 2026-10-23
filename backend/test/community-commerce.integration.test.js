'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const database=new PGlite();process.env.JWT_SECRET='isolated-community-commerce-tests';
const adapt=r=>({...r,rowCount:r.rows.length||r.affectedRows||0});
const db=async(s,p)=>adapt(await database.query(s,p));
require.cache[require.resolve('../src/db')]={exports:{db,transaction:fn=>database.transaction(tx=>fn({query:async(s,p)=>adapt(await tx.query(s,p))})),getDatabaseStatus:async()=>({configured:true,connected:true}),closeDatabase:async()=>{}}};
const {app,initDatabase}=require('../src/server');
const {migrateDatabase}=require('../src/database-migrations');
const {createToken}=require('../src/auth');
let server,base,owner,alice,bob,carol,staff,bag,perfume,watch,rose;
const visitorA='anonymous-browser-A-1234567890',visitorB='anonymous-browser-B-1234567890';
async function api(path,method='GET',body,who=alice){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(who?{Authorization:'Bearer '+who.token}:{})},...(body?{body:JSON.stringify(body)}:{})});let data={};try{data=await r.json()}catch{}return {status:r.status,body:data};}
async function ok(path,method='GET',body,who=alice,status=200){const r=await api(path,method,body,who);assert.equal(r.status,status,JSON.stringify(r.body));return r.body;}
async function user(name,role='customer',permissions=[]){const r=await db("INSERT INTO users(name,email,phone,password_hash,role,permissions) VALUES($1,$2,$3,'fixture',$4,$5::jsonb) RETURNING *",[name,name+'@community.test','+97059900'+String(Math.random()).slice(2,6),role,JSON.stringify(permissions)]);return {...r.rows[0],token:createToken(r.rows[0])};}
async function product(name,price,category,variants){return (await ok('/api/admin/products','POST',{name,price,stock:20,cost_price:10,category,metadata:{occasionTags:'هدية',styleTags:'ذهبي'},images:['https://example.test/community.png'],...(variants?{variants}:{})},owner,201)).product;}
async function list(kind,items,who=alice,extra={}){return (await ok('/api/community/lists','POST',{kind,title:'قائمة '+kind,items,...extra},who,201)).list;}
const order=(items,extra={})=>({customerName:'Gift buyer',customerPhone:'+970599000010',shippingAddress:'Buyer own address',shippingRegion:'westbank',paymentMethod:'cash',items,...extra});
const item=(p,variantId=null,quantity=1)=>({productId:p.id,variantId,quantity});
before(async()=>{
 await initDatabase();await migrateDatabase();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 owner=await user('Owner','owner');alice=await user('Alice');bob=await user('Bob');carol=await user('Carol');staff=await user('Staff','staff',['marketing']);
 await ok('/api/admin/settings','PUT',{packaging_options:[{id:'wrap',nameAr:'تغليف',price:5,active:true}],gift_card_price:10,gift_card_free_threshold:200,shipping_fees:{westbank:20,jerusalem:35,inside:70},shipping_discount_percentages:{westbank:0,jerusalem:0,inside:0}},owner);
 bag=await product('Bag',80,'شنط',[{name:'وردي',stock:20},{name:'أسود',stock:20}]);rose=bag.variants.find(v=>v.name==='وردي').id;
 perfume=await product('Perfume',50,'عطور');watch=await product('Watch',110,'ساعات');
});
after(async()=>{if(server)await new Promise(r=>server.close(r));await database.close();});
test('inclusive gift quotes and three budget options use current variants, wrapping, card and delivery',async()=>{
 const q=(await ok('/api/community/quote','POST',{items:[{...item(bag,rose),packagingId:'wrap'}],region:'jerusalem',giftCard:true,budget:150},null)).quote;
 assert.equal(q.total,130);assert.equal(q.packaging,5);assert.equal(q.giftCard,10);assert.equal(q.shipping,35);
 const bundles=(await ok('/api/community/gift-bundles','POST',{budget:250,region:'westbank',packagingId:'wrap',giftCard:true,occasion:'هدية'},null)).bundles;
 assert.ok(bundles.length>=2);assert.ok(bundles.every(x=>x.total<=250&&x.total===x.subtotal+x.shipping+x.packaging+x.giftCard));
 const bad=await api('/api/community/quote','POST',{items:[item(bag,999999)],region:'westbank'},null);assert.equal(bad.status,400);
 assert.equal((await api('/api/community/catalog','GET',null,null)).body.products[0].cost_price,undefined);
});
test('private wishlist delivery is never disclosed to visitors or purchasers and claims reverse on cancellation',async()=>{
 const l=await list('wishlist',[item(bag,rose)]);
 await ok('/api/community/lists/'+l.id+'/delivery','PUT',{name:'Private Recipient',phone:'+970599777888',address:'SECRET DELIVERY ADDRESS',region:'jerusalem',consent:true});
 const publicList=(await ok('/api/community/shared/'+l.token,'GET',null,null)).list;
 assert.equal(publicList.deliveryRegion,'jerusalem');assert.equal(JSON.stringify(publicList).includes('SECRET DELIVERY'),false);assert.equal(JSON.stringify(publicList).includes('777888'),false);
 assert.equal((await api('/api/community/lists/'+l.id,'PATCH',{title:'hijack'},bob)).status,404);
 const payload=order([item(bag,rose)],{community:{token:l.token,itemIds:[l.items[0].id],privateDelivery:true}});
 const purchased=await ok('/api/orders','POST',payload,bob,201);const id=purchased.order.id;
 assert.equal(JSON.stringify(purchased).includes('SECRET DELIVERY'),false);assert.equal(purchased.order.customer_phone,'محمي');assert.equal(purchased.shipping,35);
 const history=await ok('/api/orders','GET',null,bob);assert.equal(JSON.stringify(history).includes('SECRET DELIVERY'),false);
 const admin=await ok('/api/admin/orders/'+id,'GET',null,owner);assert.equal(admin.order.shipping_address,'SECRET DELIVERY ADDRESS');
 assert.equal((await ok('/api/community/shared/'+l.token,'GET',null,null)).list.items.length,0);
 const before=(await db('SELECT stock FROM product_variants WHERE id=$1',[rose])).rows[0].stock;
 assert.equal((await api('/api/orders','POST',payload,carol)).status,409);assert.equal((await db('SELECT stock FROM product_variants WHERE id=$1',[rose])).rows[0].stock,before);
 await ok('/api/admin/orders/'+id+'/status','PATCH',{status:'cancelled',cancelSource:'admin'},owner);
 assert.equal((await ok('/api/community/shared/'+l.token,'GET',null,null)).list.items.length,1);
 await ok('/api/community/lists/'+l.id,'DELETE');assert.equal((await api('/api/community/shared/'+l.token,'GET',null,null)).status,404);
});
test('shared basket keeps contributor ownership, aggregates identical options and locks after checkout',async()=>{
 const l=await list('group',[]);
 const a=(await ok('/api/community/shared/'+l.token+'/items','POST',{...item(bag,rose),visitorKey:visitorA,contributorName:'Friend A'},null,201)).id;
 await ok('/api/community/shared/'+l.token+'/items','POST',{...item(bag,rose),visitorKey:visitorB,contributorName:'Friend B'},null,201);
 assert.equal((await api('/api/community/shared/'+l.token+'/items/'+a,'DELETE',{visitorKey:visitorB},null)).status,403);
 const shared=(await ok('/api/community/shared/'+l.token,'GET',null,null)).list;
 const ids=shared.items.map(x=>x.id);assert.equal(ids.length,2);
 const forged=await api('/api/orders','POST',order([item(bag,rose,2)],{community:{token:l.token,itemIds:ids}}),bob);assert.equal(forged.status,409);
 const saved=await ok('/api/orders','POST',order([item(bag,rose,2)],{community:{token:l.token,itemIds:ids}}),alice,201);
 assert.equal(saved.items.length,1);assert.equal(saved.items[0].quantity,2);
 assert.equal((await api('/api/community/shared/'+l.token+'/items','POST',{...item(perfume),visitorKey:visitorA},null)).status,409);
});
test('anonymous polls update one browser vote, reject cross-list options and escape nothing into executable HTML',async()=>{
 const l=await list('poll',[item(perfume),item(watch)]),other=await list('look',[item(perfume)]);
 await ok('/api/community/shared/'+l.token+'/vote','POST',{visitorKey:visitorA,itemId:l.items[0].id,comment:'<img src=x onerror=alert(1)>'},null);
 const changed=await ok('/api/community/shared/'+l.token+'/vote','POST',{visitorKey:visitorA,itemId:l.items[1].id,comment:'Changed my vote'},null);
 assert.deepEqual(changed.list.items.map(i=>i.votes).sort(),[0,1]);assert.deepEqual(changed.list.comments,['Changed my vote']);
 assert.equal((await api('/api/community/shared/'+l.token+'/vote','POST',{visitorKey:visitorB,itemId:other.items[0].id},null)).status,400);
});
test('referral discounts use first-order eligibility and delivery rewards are idempotent and reversible',async()=>{
 const ref=await ok('/api/community/referral');
 const quote=await ok('/api/community/referral/quote','POST',{code:ref.code,subtotal:110},carol);assert.equal(quote.discount,5.5);
 assert.equal((await ok('/api/community/referral/quote','POST',{code:ref.code,subtotal:110},alice)).discount,0);
 const balance=()=>db('SELECT loyalty_points FROM users WHERE id=$1',[alice.id]).then(r=>Number(r.rows[0].loyalty_points));const before=await balance();
 const saved=await ok('/api/orders','POST',order([item(watch)],{referralCode:ref.code}),carol,201);assert.equal(saved.couponDiscount,5.5);assert.equal(saved.total,124.5);assert.equal(await balance(),before);
 const id=saved.order.id;await ok('/api/admin/orders/'+id+'/status','PATCH',{status:'delivered'},owner);assert.equal(await balance(),before+20);
 await ok('/api/admin/orders/'+id+'/status','PATCH',{status:'delivered'},owner);assert.equal(await balance(),before+20);
 assert.equal((await ok('/api/community/referral/quote','POST',{code:ref.code,subtotal:110},carol)).discount,0);
 await ok('/api/admin/orders/'+id+'/status','PATCH',{status:'cancelled',cancelSource:'admin'},owner);assert.equal(await balance(),before);
});
test('delivered wardrobe items may be hidden and price/stock alerts are opt-in and deduplicated',async()=>{
 const o=await ok('/api/orders','POST',order([item(perfume)]),bob,201);await ok('/api/admin/orders/'+o.order.id+'/status','PATCH',{status:'delivered'},owner);
 const closet=(await ok('/api/community/closet','GET',null,bob)).items;const row=closet.find(i=>Number(i.productId)===Number(perfume.id));assert.ok(row);
 assert.equal((await api('/api/community/closet/'+row.id,'PATCH',{hidden:true},alice)).status,404);
 await ok('/api/community/closet/'+row.id,'PATCH',{hidden:true},bob);assert.equal((await ok('/api/community/closet','GET',null,bob)).items.find(i=>i.id===row.id).hidden,true);
 await list('occasion',[item(watch)],alice,{alerts:true});
 await ok('/api/admin/products/'+watch.id+'/offers','PATCH',{salePrice:90,originalPrice:110,onSale:true},owner);
 const one=(await ok('/api/community/notifications')).notifications,two=(await ok('/api/community/notifications')).notifications;assert.ok(one.some(x=>x.message.includes('90')));assert.equal(one.length,two.length);
 await ok('/api/community/notifications/read','POST',{});assert.ok((await ok('/api/community/notifications')).notifications.every(n=>n.seen));
});
test('verified one-star photo reviews need consent and moderation; reward is independent of rating and paid once',async()=>{
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XcAAAAASUVORK5CYII=';
 const payload={productId:perfume.id,rating:1,body:'My honest experience',displayName:'Customer',image:png,consent:true};
 assert.equal((await api('/api/community/reviews','POST',payload,alice)).status,403);
 assert.equal((await api('/api/community/reviews','POST',{...payload,consent:false},bob)).status,400);
 const review=await ok('/api/community/reviews','POST',payload,bob,201);const image=await fetch(base+'/api/community/reviews/'+review.id+'/image');assert.equal(image.status,404);
 assert.equal((await ok('/api/community/reviews','GET',null,null)).reviews.length,0);
 const settings=(await ok('/api/admin/community/settings','GET',null,owner)).settings;await ok('/api/admin/community/settings','PUT',{...settings,reviewPoints:2},owner);
 const bal=()=>db('SELECT loyalty_points FROM users WHERE id=$1',[bob.id]).then(r=>Number(r.rows[0].loyalty_points));const before=await bal();
 await ok('/api/admin/community/reviews/'+review.id,'PATCH',{status:'approved'},owner);await ok('/api/admin/community/reviews/'+review.id,'PATCH',{status:'approved'},owner);assert.equal(await bal(),before+2);
 const publicReview=(await ok('/api/community/reviews','GET',null,null)).reviews[0];assert.equal(publicReview.rating,1);assert.equal(publicReview.user_id,undefined);
 assert.equal((await fetch(base+'/api/community/reviews/'+review.id+'/image')).status,200);
 await ok('/api/community/reviews/'+review.id,'DELETE',{},bob);assert.equal((await fetch(base+'/api/community/reviews/'+review.id+'/image')).status,404);
});
test('marketing staff may moderate but cannot change financial referral settings',async()=>{
 assert.equal((await api('/api/admin/community/summary','GET',null,staff)).status,200);
 assert.equal((await api('/api/admin/community/settings','GET',null,staff)).status,403);
 assert.equal((await api('/api/admin/community/reviews','GET',null,bob)).status,403);
});
