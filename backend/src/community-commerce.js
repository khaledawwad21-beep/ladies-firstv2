'use strict';
const crypto=require('node:crypto');
const {pricing}=require('../../frontend/commerce-pricing');
const DEFAULTS={enabled:true,referralsEnabled:true,referralPercent:5,referralMaximum:20,referralMinimum:100,referralPoints:20,reviewPoints:0};
const kinds=new Set(['wishlist','look','occasion','poll','group']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const text=(v,n=120)=>String(v??'').trim().slice(0,n);
const money=v=>Math.round((Number(v)||0)*100)/100;
function fail(status,message,code='COMMUNITY_ERROR'){const e=new Error(message);e.status=status;e.code=code;throw e;}
function actorKey(value){const key=text(value,100);if(key.length<20)fail(400,'يرجى إعادة فتح الرابط والمحاولة');return crypto.createHash('sha256').update(key).digest('hex');}
function imageData(value){
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value||''));
 if(!match)fail(400,'استخدمي صورة PNG أو JPG أو WebP');
 const bytes=Buffer.from(match[2],'base64');
 const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid||bytes.length>2*1024*1024||bytes.length<12)fail(400,'الصورة غير صالحة أو أكبر من 2 ميجابايت');
 return {bytes,mime:'image/'+match[1]};
}
async function initCommunity(db){
 await db(`CREATE TABLE IF NOT EXISTS community_lists(
  id UUID PRIMARY KEY,owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,kind TEXT NOT NULL CHECK(kind IN('wishlist','look','occasion','poll','group')),
  title TEXT NOT NULL,alerts BOOLEAN NOT NULL DEFAULT FALSE,delivery JSONB,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE TABLE IF NOT EXISTS community_items(
  id UUID PRIMARY KEY,list_id UUID NOT NULL REFERENCES community_lists(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),variant_id BIGINT REFERENCES product_variants(id),
  quantity INT NOT NULL CHECK(quantity BETWEEN 1 AND 20),packaging_id TEXT NOT NULL DEFAULT '',
  contributor_key TEXT,contributor_name TEXT NOT NULL DEFAULT '',snapshot_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE INDEX IF NOT EXISTS community_items_list ON community_items(list_id)`);
 await db(`CREATE TABLE IF NOT EXISTS community_votes(
  list_id UUID NOT NULL REFERENCES community_lists(id) ON DELETE CASCADE,voter_key TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,comment TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(list_id,voter_key))`);
 await db(`CREATE TABLE IF NOT EXISTS community_order_links(
  order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,list_id UUID REFERENCES community_lists(id),
  item_ids JSONB NOT NULL DEFAULT '[]',private_delivery BOOLEAN NOT NULL DEFAULT FALSE)`);
 await db(`CREATE TABLE IF NOT EXISTS community_gift_claims(
  item_id UUID PRIMARY KEY REFERENCES community_items(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE)`);
 await db(`CREATE TABLE IF NOT EXISTS community_referral_codes(user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,code TEXT NOT NULL UNIQUE)`);
 await db(`CREATE TABLE IF NOT EXISTS community_referrals(
  buyer_id BIGINT PRIMARY KEY REFERENCES users(id),referrer_id BIGINT NOT NULL REFERENCES users(id),
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id),discount NUMERIC(12,2) NOT NULL,
  points INT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',CHECK(buyer_id<>referrer_id))`);
 await db(`CREATE TABLE IF NOT EXISTS community_rewards(
  kind TEXT NOT NULL,entity TEXT NOT NULL,user_id BIGINT NOT NULL REFERENCES users(id),points INT NOT NULL,
  reversed BOOLEAN NOT NULL DEFAULT FALSE,PRIMARY KEY(kind,entity,user_id))`);
 await db(`CREATE TABLE IF NOT EXISTS community_closet_preferences(
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,PRIMARY KEY(user_id,order_item_id))`);
 await db(`CREATE TABLE IF NOT EXISTS community_notifications(
  id UUID PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES community_lists(id) ON DELETE CASCADE,product_id BIGINT REFERENCES products(id),
  fingerprint TEXT NOT NULL,message TEXT NOT NULL,seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,fingerprint))`);
 await db(`CREATE TABLE IF NOT EXISTS community_reviews(
  id UUID PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),product_id BIGINT NOT NULL REFERENCES products(id),
  order_id BIGINT NOT NULL REFERENCES orders(id),rating INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,display_name TEXT NOT NULL,image BYTEA,mime TEXT,
  consent BOOLEAN NOT NULL,status TEXT NOT NULL DEFAULT 'pending',moderation_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,product_id))`);
 await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_delivery_private BOOLEAN NOT NULL DEFAULT FALSE`);
 await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
}
function createCommunity({db,transaction,getProducts}){
 const q=(client)=>client?client.query.bind(client):db;
 async function setting(key,fallback,client){const r=await q(client)('SELECT value FROM settings WHERE key=$1',[key]);return r.rows.length?r.rows[0].value:fallback;}
 async function config(client){return {...DEFAULTS,...await setting('community_settings',{},client)};}
 async function catalog(){return getProducts('',[],'p.created_at DESC');}
 function publicProduct(p){return {id:Number(p.id),name:p.name,category:p.category,brand:p.brand,description:p.description||'',price:Number(p.price),oldPrice:p.oldPrice,image:p.imageUrl||p.images?.[0]||'',metadata:{styleTags:p.metadata?.styleTags||'',scentTags:p.metadata?.scentTags||'',occasionTags:p.metadata?.occasionTags||'',material:p.metadata?.material||''},variants:p.variants||[],stock:Number(p.stock)||0};}
 function choice(p,id){const variants=p.variants||[];const v=id?variants.find(x=>String(x.id)===String(id)):null;if(variants.length&&!v)fail(400,'اختاري لونًا متوفرًا');if(id&&!v)fail(400,'اللون لم يعد متوفرًا');return v;}
 function available(p,v){return Number(v?v.stock:p.stock)>0&&pricing(p,v).purchasable;}
 async function listByToken(token,client){const r=await q(client)('SELECT * FROM community_lists WHERE token=$1 AND revoked=FALSE',[text(token,80)]);if(!r.rows.length)fail(404,'الرابط غير موجود أو تم إلغاؤه');return r.rows[0];}
 async function owned(id,userId,client){if(!uuid.test(id))fail(404,'القائمة غير موجودة');const r=await q(client)('SELECT * FROM community_lists WHERE id=$1 AND owner_id=$2 AND revoked=FALSE',[id,userId]);if(!r.rows.length)fail(404,'القائمة غير موجودة');return r.rows[0];}
 async function groupLocked(list,client){return (await q(client)(`SELECT 1 FROM community_order_links l JOIN orders o ON o.id=l.order_id WHERE l.list_id=$1 AND o.status<>'cancelled' LIMIT 1`,[list.id])).rows.length>0;}
 async function addItem(list,body,userId,visitor,client){
  const locked=(await q(client)('SELECT revoked FROM community_lists WHERE id=$1 FOR UPDATE',[list.id])).rows[0];if(!locked||locked.revoked)fail(404,'القائمة غير متاحة');
  if(list.kind!=='group'&&Number(userId)!==Number(list.owner_id))fail(403,'تعديل القائمة لصاحبها فقط');
  if(list.kind==='group'&&await groupLocked(list,client))fail(409,'الطلبية أُرسلت؛ يمكن إنشاء طلبية جديدة');
  const count=await q(client)('SELECT COUNT(*)::int AS n FROM community_items WHERE list_id=$1',[list.id]);if(count.rows[0].n>=(list.kind==='poll'?3:30))fail(400,list.kind==='poll'?'الحد الأقصى ثلاث قطع في التصويت':'الحد الأقصى 30 قطعة في القائمة');
  const found=await q(client)(`SELECT p.*,
   COALESCE((SELECT json_agg(json_build_object('id',v.id,'name',v.color,'color',v.color,'price',v.price,'stock',v.stock)) FROM product_variants v WHERE v.product_id=p.id AND v.is_active=TRUE),'[]') AS variants
   FROM products p WHERE p.id=$1 AND p.is_active=TRUE`,[Number(body.productId)||0]);
  const p=found.rows[0];if(!p)fail(404,'المنتج غير متوفر');
  const v=choice(p,body.variantId),quantity=Number(body.quantity||1);if(!Number.isInteger(quantity)||quantity<1||quantity>20)fail(400,'الكمية غير صالحة');
  if(!available(p,v))fail(409,'القطعة أو اللون غير متوفر للشراء');
  const id=crypto.randomUUID();
  await q(client)(`INSERT INTO community_items(id,list_id,product_id,variant_id,quantity,packaging_id,contributor_key,contributor_name,snapshot_price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,list.id,p.id,v?.id||null,quantity,text(body.packagingId,100),visitor?actorKey(visitor):null,text(body.contributorName,30),pricing(p,v).price]);
  return id;
 }
 async function listView(list,userId,preloaded){
  const own=Number(userId)===Number(list.owner_id),rows=(await db(`SELECT i.*,c.order_id AS claimed_order,(SELECT COUNT(*)::int FROM community_votes v WHERE v.item_id=i.id) AS votes FROM community_items i LEFT JOIN community_gift_claims c ON c.item_id=i.id WHERE i.list_id=$1 ORDER BY i.created_at,i.id`,[list.id])).rows;
  const products=preloaded||await catalog();
  const items=rows.filter(i=>own||!i.claimed_order).map(i=>{
   const p=products.find(p=>String(p.id)===String(i.product_id)),v=p?.variants?.find(v=>String(v.id)===String(i.variant_id));
   return {id:i.id,productId:Number(i.product_id),variantId:i.variant_id?Number(i.variant_id):null,quantity:i.quantity,packagingId:i.packaging_id,contributorName:i.contributor_name,contributorId:i.contributor_key?.slice(0,12)||'owner',claimed:!!i.claimed_order,votes:Number(i.votes),product:p?publicProduct(p):null,variantName:v?.name||v?.color||'',price:p?pricing(p,v).price:null,available:!!p&&(!i.variant_id||!!v)&&available(p,v),snapshotPrice:Number(i.snapshot_price)};
  });
  const comments=list.kind==='poll'?(await db(`SELECT comment FROM community_votes WHERE list_id=$1 AND comment<>'' ORDER BY updated_at DESC LIMIT 30`,[list.id])).rows.map(x=>x.comment):[];
  return {id:list.id,token:list.token,kind:list.kind,title:list.title,own,alerts:list.alerts,privateDeliveryAvailable:!!list.delivery,deliveryRegion:list.delivery?.region||null,items,comments,locked:list.kind==='group'?await groupLocked(list):false,createdAt:list.created_at};
 }
 async function quote(body,client,cache){
  const products=cache?.products||await catalog(),items=[];let subtotal=0,packaging=0;
  const options=cache?.packaging??await setting('packaging_options',[],client),byId=new Map((Array.isArray(options)?options:[]).filter(x=>x.active!==false).map(x=>[String(x.id),x]));
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>30)fail(400,'اختاري من قطعة إلى 30 قطعة');
  for(const raw of body.items){const p=products.find(x=>String(x.id)===String(raw.productId));if(!p)fail(404,'القطعة لم تعد متوفرة');const v=choice(p,raw.variantId),qty=Number(raw.quantity||1);if(!Number.isInteger(qty)||qty<1||qty>20||qty>Number(v?v.stock:p.stock)||!available(p,v))fail(409,'الكمية أو السعر غير متوفر');
   const price=pricing(p,v).price;subtotal+=price*qty;const packagingId=text(raw.packagingId,100),option=packagingId?byId.get(packagingId):null;if(packagingId&&!option)fail(400,'التغليف لم يعد متوفرًا');packaging+=Math.max(0,money(option?.price))*qty;
   items.push({product:publicProduct(p),productId:Number(p.id),variantId:v?.id||null,variantName:v?.name||v?.color||'',quantity:qty,packagingId,price});}
  const region=text(body.region||'westbank',30),fees=cache?.fees??await setting('shipping_fees',{westbank:20,jerusalem:35,inside:70},client),discounts=cache?.discounts??await setting('shipping_discount_percentages',{},client);
  if(!['westbank','jerusalem','inside'].includes(region))fail(400,'اختاري منطقة التوصيل');
  const shipping=money(Math.max(0,Number(fees[region]??({westbank:20,jerusalem:35,inside:70}[region])))*(1-Math.max(0,Math.min(100,Number(discounts[region])||0))/100));
  const cardPrice=Math.max(0,money(cache?.cardPrice??await setting('gift_card_price',0,client))),threshold=Math.max(0,money(cache?.threshold??await setting('gift_card_free_threshold',0,client)));
  const card=body.giftCard===true?(threshold>0&&subtotal>=threshold?0:cardPrice):0;
  return {items,subtotal:money(subtotal),packaging:money(packaging),shipping,giftCard:card,total:money(subtotal+packaging+shipping+card),region,withinBudget:!Number(body.budget)||money(subtotal+packaging+shipping+card)<=Number(body.budget)};
 }
 async function bundles(body){
  const budget=Number(body.budget);if(!Number.isFinite(budget)||budget<1||budget>100000)fail(400,'أدخلي ميزانية صالحة');
  const cache={products:await catalog(),packaging:await setting('packaging_options',[]),fees:await setting('shipping_fees',{westbank:20,jerusalem:35,inside:70}),discounts:await setting('shipping_discount_percentages',{}),cardPrice:await setting('gift_card_price',0),threshold:await setting('gift_card_free_threshold',0)};
  const products=cache.products.flatMap(p=>{const v=p.variants?.length?p.variants.find(v=>available(p,v)):null;return (!p.variants?.length||v)&&available(p,v)?[{p,v,price:pricing(p,v).price}]:[];}).sort((a,b)=>a.price-b.price).slice(0,80);
  const occasion=text(body.occasion,60);products.sort((a,b)=>Number(String(b.p.metadata?.occasionTags||'').includes(occasion)&&!!occasion)-Number(String(a.p.metadata?.occasionTags||'').includes(occasion)&&!!occasion)||a.price-b.price);
  const result=[],seen=new Set();
  for(const count of [1,2,3]){
   const candidates=[];
   for(let start=0;start<products.length;start++){
    const picks=[products[start]];for(const p of products){if(picks.length>=count)break;if(!picks.includes(p)&&p.p.category!==picks[0].p.category)picks.push(p);}if(picks.length<count)continue;
    const items=picks.map(({p,v})=>({productId:p.id,variantId:v?.id||null,quantity:1,packagingId:body.packagingId||''}));
    const estimate=await quote({...body,items,giftCard:body.giftCard!==false},null,cache);const key=picks.map(x=>x.p.id).sort().join(',');if(estimate.total<=budget&&!seen.has(key))candidates.push({key,estimate});
   }
   const best=candidates.sort((a,b)=>b.estimate.total-a.estimate.total)[0];if(best){seen.add(best.key);result.push(best.estimate);}
  }
  return result;
 }
 async function reward(client,kind,entity,userId,points,orderId,note){
  points=Math.max(0,Math.floor(Number(points)||0));if(!points)return;
  const added=await client.query('INSERT INTO community_rewards(kind,entity,user_id,points) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING points',[kind,String(entity),userId,points]);
  if(added.rows.length){await client.query('UPDATE users SET loyalty_points=COALESCE(loyalty_points,0)+$1 WHERE id=$2',[points,userId]);await client.query("INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note) VALUES($1,$2,$3,'community_reward',$4)",[userId,orderId,points,note]);}
 }
 async function referralDiscount(client,{code,userId,phone,subtotal,couponCode}){
  if(!code||!userId||couponCode)return null;
  const cfg=await config(client);if(!cfg.enabled||!cfg.referralsEnabled)return null;
  const user=(await client.query('SELECT id,phone,email FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
  const ref=(await client.query('SELECT c.user_id,u.phone,u.email FROM community_referral_codes c JOIN users u ON u.id=c.user_id WHERE c.code=$1 AND u.is_active=TRUE',[text(code,40)])).rows[0];
  const digits=x=>String(x||'').replace(/\D/g,'').replace(/^00/,'');
  if(!ref||Number(ref.user_id)===Number(userId)||ref.phone&&[phone,user?.phone].some(p=>digits(p)&&digits(p)===digits(ref.phone))||ref.email&&ref.email===user?.email)return null;
  if((await client.query("SELECT 1 FROM orders WHERE user_id=$1 AND status<>'cancelled' LIMIT 1",[userId])).rows.length||(await client.query("SELECT 1 FROM community_referrals WHERE buyer_id=$1 AND state<>'cancelled'",[userId])).rows.length)return null;
  if(subtotal<Number(cfg.referralMinimum))return null;
  return {referrerId:ref.user_id,buyerId:userId,discount:money(Math.min(subtotal*Number(cfg.referralPercent)/100,Number(cfg.referralMaximum))),points:Math.floor(Number(cfg.referralPoints)||0)};
 }
 async function prepareRequest(req,res,next){
  try{
   const ctx=req.body?.community;if(!ctx?.token)return next();
   const list=await listByToken(ctx.token);if(ctx.privateDelivery===true){
    if(list.kind!=='wishlist'||!list.delivery)fail(400,'العنوان الخاص غير مفعّل لهذه القائمة');
    // No recipient details are returned to the purchaser.
    req.body.customerName=list.delivery.name;req.body.customer_name=list.delivery.name;
    req.body.customerPhone=list.delivery.phone;req.body.customer_phone=list.delivery.phone;
    req.body.shippingAddress=list.delivery.address;req.body.shipping_address=list.delivery.address;
    req.body.shippingRegion=list.delivery.region;req.body.shipping_region=list.delivery.region;
   }
   req.communityList=list;next();
  }catch(e){next(e);}
 }
 async function attachOrder(client,order,items,body,userId,referral){
  if(referral){await client.query(`INSERT INTO community_referrals(buyer_id,referrer_id,order_id,discount,points) VALUES($1,$2,$3,$4,$5) ON CONFLICT(buyer_id) DO UPDATE SET referrer_id=EXCLUDED.referrer_id,order_id=EXCLUDED.order_id,discount=EXCLUDED.discount,points=EXCLUDED.points,state='pending' WHERE community_referrals.state='cancelled'`,[userId,referral.referrerId,order.id,referral.discount,referral.points]);await client.query('UPDATE orders SET referral_discount=$1 WHERE id=$2',[referral.discount,order.id]);order.referral_discount=referral.discount;}
  const ctx=body.community;if(!ctx?.token)return;
  const list=await listByToken(ctx.token,client);await client.query('SELECT id FROM community_lists WHERE id=$1 FOR UPDATE',[list.id]);
  if(list.kind==='poll')fail(400,'اختاري القطعة من صفحة المنتج');
  if(list.kind==='group'&&(Number(userId)!==Number(list.owner_id)||await groupLocked(list,client)))fail(409,'إتمام الطلبية لصاحبتها فقط ولمرة واحدة');
  const ids=Array.isArray(ctx.itemIds)?[...new Set(ctx.itemIds)]:[];
  if(!ids.length||ids.some(id=>!uuid.test(id)))fail(400,'اختيار القائمة غير صالح');
  const selected=(await client.query('SELECT * FROM community_items WHERE list_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE',[list.id,ids])).rows;
  if(selected.length!==ids.length)fail(400,'القائمة تغيرت؛ حدّثي الصفحة');
  const expected=new Map();for(const row of selected){const key=row.product_id+':'+(row.variant_id||'');expected.set(key,(expected.get(key)||0)+Number(row.quantity));}if(expected.size!==items.length)fail(409,'تفاصيل القطع لا تطابق القائمة');for(const item of items){if(expected.get(item.productId+':'+(item.variantId||''))!==Number(item.quantity))fail(409,'تفاصيل القطع لا تطابق القائمة');}
  if(list.kind==='group'&&Number((await client.query('SELECT COUNT(*)::int AS n FROM community_items WHERE list_id=$1',[list.id])).rows[0].n)!==selected.length)fail(409,'أضافت إحدى المشاركات قطعة؛ حدّثي الطلبية');
  if(list.kind==='wishlist')for(const row of selected){const claimed=await client.query('INSERT INTO community_gift_claims(item_id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING item_id',[row.id,order.id]);if(!claimed.rows.length)fail(409,'إحدى الهدايا اختيرت بالفعل؛ حدّثي القائمة');}
  const privateDelivery=ctx.privateDelivery===true&&list.kind==='wishlist'&&!!list.delivery;
  await client.query('INSERT INTO community_order_links(order_id,list_id,item_ids,private_delivery) VALUES($1,$2,$3::jsonb,$4)',[order.id,list.id,JSON.stringify(ids),privateDelivery]);
  if(privateDelivery){await client.query('UPDATE orders SET gift_delivery_private=TRUE WHERE id=$1',[order.id]);order.gift_delivery_private=true;}
 }
 async function onStatus(client,orderId,status){
  if(status==='cancelled')await client.query('DELETE FROM community_gift_claims WHERE order_id=$1',[orderId]);
  const ref=(await client.query('SELECT * FROM community_referrals WHERE order_id=$1 FOR UPDATE',[orderId])).rows[0];if(!ref)return;
  if(status==='delivered'&&ref.state==='pending'){await reward(client,'referral',orderId,ref.referrer_id,ref.points,orderId,'مكافأة دعوة بعد تسليم الطلب');await client.query("UPDATE community_referrals SET state='rewarded' WHERE order_id=$1",[orderId]);}
  if(status==='cancelled'||status==='returned'){
   const reversed=await client.query("UPDATE community_rewards SET reversed=TRUE WHERE kind='referral' AND entity=$1 AND reversed=FALSE RETURNING user_id,points",[String(orderId)]);
   for(const r of reversed.rows){await client.query('UPDATE users SET loyalty_points=GREATEST(0,COALESCE(loyalty_points,0)-$1) WHERE id=$2',[r.points,r.user_id]);await client.query("INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note) VALUES($1,$2,$3,'community_reversal','عكس مكافأة دعوة لطلب ملغي أو مرتجع بالكامل')",[r.user_id,orderId,-r.points]);}
   await client.query("UPDATE community_referrals SET state='cancelled' WHERE order_id=$1",[orderId]);
  }
 }
 function redactOrder(order){if(!order?.gift_delivery_private)return order;return {...order,customer_name:'هدية بعنوان خاص',customer_phone:'محمي',customer_contact:'محمي',shipping_address:'عنوان المستلمة محمي',customer_address:'عنوان المستلمة محمي'};}
 async function notifications(userId){
  const lists=(await db('SELECT * FROM community_lists WHERE owner_id=$1 AND alerts=TRUE AND revoked=FALSE',[userId])).rows;
  for(const list of lists){const view=await listView(list,userId);for(const i of view.items){if(!i.product||i.claimed)continue;
   const low=i.available&&Number(i.variantId?i.product.variants.find(v=>String(v.id)===String(i.variantId))?.stock:i.product.stock)<=3;
   const drop=i.price<i.snapshotPrice;
   if(!low&&!drop)continue;const fingerprint=[i.id,drop?'price:'+i.price:'low'].join(':');
   await db('INSERT INTO community_notifications(id,user_id,list_id,product_id,fingerprint,message) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,fingerprint) DO NOTHING',[crypto.randomUUID(),userId,list.id,i.productId,fingerprint,drop?'انخفض سعر '+i.product.name+' إلى '+i.price+' ₪':'بقيت قطع قليلة من '+i.product.name]);
  }}
  return (await db('SELECT id,list_id AS "listId",product_id AS "productId",message,seen,created_at FROM community_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60',[userId])).rows;
 }
 function register(app,{requireAuth,optionalAuth,requireAdmin}){
  const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  const limiter=require('./persistent-rate-limit').createPersistentRateLimiter({db,secret:process.env.RATE_LIMIT_SECRET||process.env.JWT_SECRET});
  app.use('/api/community',async(req,res,next)=>{try{
    if(req.path!=='/config'&&(await config()).enabled!==true)fail(503,'هذه الخدمات متوقفة مؤقتًا');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      const result=await limiter({scope:'community-write',clientId:req.ip||req.socket.remoteAddress||'unknown',limit:100,windowMs:15*60*1000});
      if(!result.allowed)return res.status(429).set('Retry-After',String(result.retryAfterSeconds)).json({ok:false,message:'محاولات كثيرة؛ جربي بعد قليل'});
    }
    next();
  }catch(e){next(e)}});

  const tokenRoute=wrap(async(req,res)=>res.json({ok:true,list:await listView(await listByToken(req.params.token),req.user?.id)}));
  const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function sharePage(res,title,description,image,target){
    const origin='https://ladies-firstv2.onrender.com';
    const metaImage=image?new URL(image,origin).href:origin+'/assets/brand-lockup.png';
    res.type('html').send('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+htmlEscape(title)+'</title><meta property="og:title" content="'+htmlEscape(title)+'"><meta property="og:description" content="'+htmlEscape(description)+'"><meta property="og:image" content="'+htmlEscape(metaImage)+'"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body style="background:#fbf4ec;color:#63345e;font-family:Arial;text-align:center;padding:40px"><img alt="Ladies First" src="/assets/brand-lockup.png" style="max-width:220px"><h1>'+htmlEscape(title)+'</h1><p>'+htmlEscape(description)+'</p><a href="'+htmlEscape(target)+'">افتحي في المتجر</a><script>location.replace('+JSON.stringify(target).replace(/</g,'\\u003c')+')</script></body></html>');
  }
  app.get('/share/product/:id',wrap(async(req,res)=>{
    const p=(await catalog()).find(p=>String(p.id)===req.params.id);if(!p)return res.sendStatus(404);
    const ref=/^[a-f0-9]{18}$/.test(req.query.ref||'')?'&ref='+req.query.ref:'';
    sharePage(res,p.name+' | Ladies First',Number(p.price)>0?Number(p.price)+' ₪ — اختيارات من Ladies First':'اكتشفي هذه القطعة من Ladies First',p.imageUrl||p.images?.[0],'/?product='+Number(p.id)+ref);
  }));
  app.get('/share/list/:token',wrap(async(req,res)=>{
    const list=await listByToken(req.params.token);sharePage(res,list.title+' | Ladies First','قائمة خاصة للمشاركة مع الأحباب',null,'/?list='+list.token);
  }));
  app.get('/api/community/config',wrap(async(req,res)=>res.json({ok:true,settings:await config(),packaging:await setting('packaging_options',[]),giftCardPrice:await setting('gift_card_price',0)})));
  app.get('/api/community/catalog',wrap(async(req,res)=>res.json({ok:true,products:(await catalog()).map(publicProduct)})));
  app.post('/api/community/gift-bundles',wrap(async(req,res)=>res.json({ok:true,bundles:await bundles(req.body)})));
  app.post('/api/community/quote',wrap(async(req,res)=>res.json({ok:true,quote:await quote(req.body)})));
  app.get('/api/community/lists',requireAuth,wrap(async(req,res)=>{
   const rows=(await db('SELECT * FROM community_lists WHERE owner_id=$1 AND revoked=FALSE ORDER BY created_at DESC LIMIT 100',[req.user.id])).rows;
   const products=await catalog();res.json({ok:true,lists:await Promise.all(rows.map(l=>listView(l,req.user.id,products)))});
  }));
  app.post('/api/community/lists',requireAuth,wrap(async(req,res)=>{
   const kind=text(req.body.kind,20),title=text(req.body.title,80);if(!kinds.has(kind)||!title)fail(400,'اختاري نوع القائمة واكتبي اسمها');
   const ids=Array.isArray(req.body.items)?req.body.items:[];if(kind==='poll'&&(ids.length<2||ids.length>3))fail(400,'التصويت يحتاج قطعتين أو ثلاث');
   const n=(await db('SELECT COUNT(*)::int AS n FROM community_lists WHERE owner_id=$1 AND revoked=FALSE',[req.user.id])).rows[0].n;if(n>=100)fail(400,'وصلتِ للحد الأقصى من القوائم');
   const id=crypto.randomUUID(),token=crypto.randomBytes(18).toString('hex');
   await transaction(async client=>{await client.query('INSERT INTO community_lists(id,owner_id,token,kind,title,alerts) VALUES($1,$2,$3,$4,$5,$6)',[id,req.user.id,token,kind,title,req.body.alerts===true]);const list=await owned(id,req.user.id,client);for(const item of ids)await addItem(list,item,req.user.id,null,client);});
   res.status(201).json({ok:true,list:await listView(await owned(id,req.user.id),req.user.id)});
  }));
  app.get('/api/community/shared/:token',optionalAuth,tokenRoute);
  app.patch('/api/community/lists/:id',requireAuth,wrap(async(req,res)=>{await owned(req.params.id,req.user.id);const patch=req.body;await db('UPDATE community_lists SET title=COALESCE($1,title),alerts=COALESCE($2,alerts) WHERE id=$3 AND owner_id=$4',[patch.title?text(patch.title,80):null,typeof patch.alerts==='boolean'?patch.alerts:null,req.params.id,req.user.id]);res.json({ok:true});}));
  app.delete('/api/community/lists/:id',requireAuth,wrap(async(req,res)=>{await owned(req.params.id,req.user.id);await db('UPDATE community_lists SET revoked=TRUE,alerts=FALSE WHERE id=$1',[req.params.id]);res.json({ok:true});}));
  app.put('/api/community/lists/:id/delivery',requireAuth,wrap(async(req,res)=>{
   const list=await owned(req.params.id,req.user.id);if(list.kind!=='wishlist')fail(400,'العنوان الخاص لقائمة الأمنيات فقط');
   if(req.body.enabled===false){await db('UPDATE community_lists SET delivery=NULL WHERE id=$1',[list.id]);return res.json({ok:true});}
   const delivery={name:text(req.body.name,100),phone:text(req.body.phone,40),address:text(req.body.address,500),region:text(req.body.region,30)};
   if(!delivery.name||!/^\+?[0-9 ()-]{8,25}$/.test(delivery.phone)||delivery.address.length<5||!['westbank','jerusalem','inside'].includes(delivery.region)||req.body.consent!==true)fail(400,'أكملي بيانات المستلمة والموافقة على استخدامها للتوصيل');
   await db('UPDATE community_lists SET delivery=$1::jsonb WHERE id=$2',[JSON.stringify(delivery),list.id]);res.json({ok:true});
  }));
  app.post('/api/community/lists/:id/items',requireAuth,wrap(async(req,res)=>{const list=await owned(req.params.id,req.user.id);const id=await transaction(client=>addItem(list,req.body,req.user.id,null,client));res.status(201).json({ok:true,id});}));
  app.post('/api/community/shared/:token/items',optionalAuth,wrap(async(req,res)=>{const list=await listByToken(req.params.token);if(list.kind!=='group')fail(403,'الإضافة متاحة للسلة المشتركة فقط');const id=await transaction(client=>addItem(list,req.body,req.user?.id,req.body.visitorKey,client));res.status(201).json({ok:true,id});}));
  app.delete('/api/community/shared/:token/items/:id',optionalAuth,wrap(async(req,res)=>{
   const list=await listByToken(req.params.token);if(!uuid.test(req.params.id))fail(404,'القطعة غير موجودة');if(list.kind==='group'&&await groupLocked(list))fail(409,'الطلبية أُرسلت');
   const own=Number(req.user?.id)===Number(list.owner_id),key=own?null:actorKey(req.body.visitorKey);
   const removed=await db('DELETE FROM community_items WHERE id=$1 AND list_id=$2 AND ($3::boolean OR contributor_key=$4) RETURNING id',[req.params.id,list.id,own,key]);if(!removed.rows.length)fail(403,'يمكنك حذف اختياراتك فقط');res.json({ok:true});
  }));
  app.post('/api/community/shared/:token/vote',wrap(async(req,res)=>{
   const list=await listByToken(req.params.token);if(list.kind!=='poll'||!uuid.test(req.body.itemId||''))fail(400,'اختاري قطعة في التصويت');
   if(!(await db('SELECT 1 FROM community_items WHERE id=$1 AND list_id=$2',[req.body.itemId,list.id])).rows.length)fail(400,'الاختيار لا ينتمي للتصويت');
   await db('INSERT INTO community_votes(list_id,voter_key,item_id,comment) VALUES($1,$2,$3,$4) ON CONFLICT(list_id,voter_key) DO UPDATE SET item_id=EXCLUDED.item_id,comment=EXCLUDED.comment,updated_at=NOW()',[list.id,actorKey(req.body.visitorKey),req.body.itemId,text(req.body.comment,180)]);res.json({ok:true,list:await listView(list)});
  }));
  app.get('/api/community/referral',requireAuth,wrap(async(req,res)=>{
   await db('INSERT INTO community_referral_codes(user_id,code) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[req.user.id,crypto.randomBytes(9).toString('hex')]);
   const code=(await db('SELECT code FROM community_referral_codes WHERE user_id=$1',[req.user.id])).rows[0].code;
   const rows=(await db("SELECT state,COUNT(*)::int AS count,COALESCE(SUM(CASE WHEN state='rewarded' THEN points ELSE 0 END),0) AS points FROM community_referrals WHERE referrer_id=$1 GROUP BY state",[req.user.id])).rows;
   res.json({ok:true,code,settings:await config(),summary:rows});
  }));
  app.post('/api/community/referral/quote',requireAuth,wrap(async(req,res)=>{
   const result=await transaction(client=>referralDiscount(client,{code:req.body.code,userId:req.user.id,phone:req.user.phone,subtotal:Math.max(0,Number(req.body.subtotal)||0),couponCode:req.body.couponCode}));res.json({ok:true,discount:result?.discount||0});
  }));
  app.get('/api/community/closet',requireAuth,wrap(async(req,res)=>{
   const rows=(await db(`SELECT oi.id,oi.product_id AS "productId",oi.product_name AS name,oi.variant_name AS variant,oi.image,oi.quantity,o.delivered_at,COALESCE(cp.hidden,o.gift_delivery_private,FALSE) AS hidden FROM order_items oi JOIN orders o ON o.id=oi.order_id LEFT JOIN community_closet_preferences cp ON cp.order_item_id=oi.id AND cp.user_id=$1 WHERE o.user_id=$1 AND o.status='delivered' AND COALESCE(oi.is_gift,FALSE)=FALSE ORDER BY o.delivered_at DESC,oi.id DESC LIMIT 200`,[req.user.id])).rows;
   res.json({ok:true,items:rows});
  }));
  app.patch('/api/community/closet/:id',requireAuth,wrap(async(req,res)=>{
   if(!(await db('SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.id=$1 AND o.user_id=$2',[Number(req.params.id)||0,req.user.id])).rows.length)fail(404,'القطعة غير موجودة');
   await db('INSERT INTO community_closet_preferences(user_id,order_item_id,hidden) VALUES($1,$2,$3) ON CONFLICT(user_id,order_item_id) DO UPDATE SET hidden=EXCLUDED.hidden',[req.user.id,req.params.id,req.body.hidden===true]);res.json({ok:true});
  }));
  app.get('/api/community/notifications',requireAuth,wrap(async(req,res)=>res.json({ok:true,notifications:await notifications(req.user.id)})));
  app.post('/api/community/notifications/read',requireAuth,wrap(async(req,res)=>{await db('UPDATE community_notifications SET seen=TRUE WHERE user_id=$1',[req.user.id]);res.json({ok:true});}));
  app.get('/api/community/reviews',wrap(async(req,res)=>{
   const pid=Number(req.query.productId)||null,rid=uuid.test(req.query.reviewId||'')?req.query.reviewId:null;const rows=(await db(`SELECT r.id,r.product_id AS "productId",r.rating,r.body,r.display_name AS "displayName",(r.image IS NOT NULL) AS "hasImage",r.created_at,p.name AS "productName" FROM community_reviews r JOIN products p ON p.id=r.product_id WHERE r.status='approved' AND r.consent=TRUE AND ($1::bigint IS NULL OR r.product_id=$1) AND ($2::uuid IS NULL OR r.id=$2) ORDER BY r.created_at DESC LIMIT 60`,[pid,rid])).rows;res.json({ok:true,reviews:rows});
  }));
  app.post('/api/community/reviews',requireAuth,wrap(async(req,res)=>{
   const productId=Number(req.body.productId),rating=Number(req.body.rating),body=text(req.body.body,800);if(!Number.isInteger(rating)||rating<1||rating>5||!body||req.body.consent!==true)fail(400,'أضيفي تقييمك ووافقي على نشره');
   const purchase=(await db("SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.user_id=$1 AND o.status='delivered' AND oi.product_id=$2 ORDER BY o.delivered_at DESC LIMIT 1",[req.user.id,productId])).rows[0];if(!purchase)fail(403,'التقييم متاح بعد استلام المنتج');
   const img=req.body.image?imageData(req.body.image):null;
   const id=crypto.randomUUID();const saved=await db(`INSERT INTO community_reviews(id,user_id,product_id,order_id,rating,body,display_name,image,mime,consent) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body,display_name=EXCLUDED.display_name,image=EXCLUDED.image,mime=EXCLUDED.mime,consent=TRUE,status='pending',moderation_note='' RETURNING id`,[id,req.user.id,productId,purchase.id,rating,body,text(req.body.displayName||'زبونة Ladies First',40),img?.bytes||null,img?.mime||null]);res.status(201).json({ok:true,id:saved.rows[0].id});
  }));
  app.get('/api/community/reviews/:id/image',wrap(async(req,res)=>{
   if(!uuid.test(req.params.id))return res.sendStatus(404);const r=(await db("SELECT image,mime FROM community_reviews WHERE id=$1 AND status='approved' AND consent=TRUE",[req.params.id])).rows[0];if(!r?.image)return res.sendStatus(404);res.type(r.mime).set('Cache-Control','no-store').send(Buffer.from(r.image));
  }));
  app.delete('/api/community/reviews/:id',requireAuth,wrap(async(req,res)=>{if(!uuid.test(req.params.id))fail(404,'التقييم غير موجود');await db('DELETE FROM community_reviews WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);res.json({ok:true});}));
  app.get('/api/community/my-reviews',requireAuth,wrap(async(req,res)=>res.json({ok:true,reviews:(await db('SELECT id,product_id AS "productId",rating,body,status,moderation_note AS note FROM community_reviews WHERE user_id=$1 ORDER BY created_at DESC',[req.user.id])).rows})));
  app.get('/api/admin/community/settings',requireAdmin,wrap(async(req,res)=>res.json({ok:true,settings:await config()})));
  app.put('/api/admin/community/settings',requireAdmin,wrap(async(req,res)=>{
   const raw=req.body,settings={};for(const key of ['enabled','referralsEnabled'])settings[key]=raw[key]===true;
   for(const [key,max] of [['referralPercent',50],['referralMaximum',200],['referralMinimum',10000],['referralPoints',10000],['reviewPoints',1000]]){const n=Number(raw[key]);if(!Number.isFinite(n)||n<0||n>max)fail(400,'قيمة الإعداد غير صالحة');settings[key]=key.includes('Points')?Math.floor(n):n;}
   await db("INSERT INTO settings(key,value) VALUES('community_settings',$1::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[JSON.stringify(settings)]);res.json({ok:true,settings});
  }));
  app.get('/api/admin/community/reviews',requireAdmin,wrap(async(req,res)=>{
   const rows=(await db('SELECT r.*,p.name AS product_name FROM community_reviews r JOIN products p ON p.id=r.product_id ORDER BY r.created_at DESC LIMIT 100')).rows;
   res.json({ok:true,reviews:rows.map(r=>({...r,image:undefined,preview:r.image?'data:'+r.mime+';base64,'+Buffer.from(r.image).toString('base64'):null}))});
  }));
  app.patch('/api/admin/community/reviews/:id',requireAdmin,wrap(async(req,res)=>{
   if(!uuid.test(req.params.id)||!['approved','rejected','pending'].includes(req.body.status))fail(400,'حالة التقييم غير صالحة');
   await transaction(async client=>{const r=(await client.query('SELECT * FROM community_reviews WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!r)fail(404,'التقييم غير موجود');await client.query('UPDATE community_reviews SET status=$1,moderation_note=$2 WHERE id=$3',[req.body.status,text(req.body.note,300),r.id]);if(req.body.status==='approved'&&r.consent)await reward(client,'review',r.product_id,r.user_id,(await config(client)).reviewPoints,r.order_id,'مشاركة تجربة شراء؛ المكافأة لا تعتمد على درجة التقييم');});res.json({ok:true});
  }));
  app.get('/api/admin/community/summary',requireAdmin,wrap(async(req,res)=>res.json({ok:true,lists:(await db('SELECT kind,COUNT(*)::int AS count FROM community_lists WHERE revoked=FALSE GROUP BY kind')).rows,referrals:(await db('SELECT state,COUNT(*)::int AS count,COALESCE(SUM(discount),0) AS discount,COALESCE(SUM(CASE WHEN state=\'rewarded\' THEN points ELSE 0 END),0) AS points FROM community_referrals GROUP BY state')).rows,pendingReviews:Number((await db("SELECT COUNT(*)::int AS n FROM community_reviews WHERE status='pending'")).rows[0].n)})));
  app.get('/api/admin/community/orders/:id',requireAdmin,wrap(async(req,res)=>{
   const link=(await db('SELECT l.*,c.title,c.kind FROM community_order_links l JOIN community_lists c ON c.id=l.list_id WHERE l.order_id=$1',[Number(req.params.id)||0])).rows[0];if(!link)return res.json({ok:true,link:null});const items=(await db('SELECT product_id,variant_id,quantity,contributor_name FROM community_items WHERE list_id=$1 AND id=ANY($2::uuid[])',[link.list_id,link.item_ids])).rows;res.json({ok:true,link:{title:link.title,kind:link.kind,privateDelivery:link.private_delivery,items}});
  }));
 }
 return {register,prepareRequest,attachOrder,onStatus,redactOrder,referralDiscount,config,quote,bundles,listView,listByToken};
}
module.exports={initCommunity,createCommunity,imageData,DEFAULTS};
