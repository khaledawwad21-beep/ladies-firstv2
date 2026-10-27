'use strict';
const {randomInt,randomBytes,randomUUID}=require('node:crypto');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'WHEEL_ERROR'});};
const text=(v,n=100)=>String(v??'').trim().slice(0,n);
const number=(v,min,max,integer=false)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))fail(400,'قيمة رقمية غير صالحة في الحملة');return n;};
function prizeLabel(p,productName=''){
 if(p.type==='percent')return `خصم ${Number(p.value)}%`;
 if(p.type==='fixed')return `خصم ${Number(p.value)} ₪`;
 if(p.type==='points')return `ربح ${Number(p.value)} نقطة`;
 if(p.type==='shipping')return 'توصيل مجاني';
 if(p.type==='none')return 'حظ أوفر';
 return productName?text(`هدية: ${productName}`,70):'هدية منتج';
}
function normalizeCampaign(b){
 b=b||{};
 const name=text(b.name),start=Date.parse(b.startsAt),end=Date.parse(b.endsAt);
 if(!name||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)fail(400,'أدخلي اسم الحملة وتاريخ بداية ونهاية صحيحين');
 if(!Array.isArray(b.prizes)||b.prizes.length!==8)fail(400,'الدولاب يتكون من 8 خانات بالضبط؛ يمكن تكرار نفس الخيار في عدة خانات');
 const ids=new Set();
 const prizes=b.prizes.map(p=>{
  const id=text(p.id||randomUUID(),50),type=text(p.type);
  if(!/^[a-zA-Z0-9-]{1,50}$/.test(id)||ids.has(id)||!['percent','fixed','points','gift','shipping','none'].includes(type))fail(400,'بيانات خيارات الدولاب غير صالحة');ids.add(id);
  const value=['percent','fixed','points'].includes(type)?number(p.value,type==='points'?1:0.01,type==='percent'?100:type==='points'?10000:100000,type==='points'):0;
  const productId=type==='gift'?number(p.productId,1,Number.MAX_SAFE_INTEGER,true):null;
  const variantId=type==='gift'&&p.variantId?number(p.variantId,1,Number.MAX_SAFE_INTEGER,true):null;
  return {id,label:prizeLabel({type,value}),type,value,productId,variantId,weight:number(p.weight,1,100000,true),limit:number(p.limit??0,0,1000000,true)};
 });
 return {name,enabled:b.enabled===true,startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),frequency:b.frequency==='daily'?'daily':'campaign',minimum:number(b.minimum??0,0,100000),validDays:number(b.validDays??7,1,365,true),stackable:b.stackable===true,prizes};
}
function choosePrize(prizes,draw=randomInt){const total=prizes.reduce((n,p)=>n+p.weight,0);if(!total)fail(409,'نفدت جوائز الحملة');let n=draw(total);for(const p of prizes){n-=p.weight;if(n<0)return p;}fail(500,'تعذر اختيار الجائزة');}
async function initLuckyWheel(db){
 await db(`CREATE TABLE IF NOT EXISTS lucky_campaigns(id BIGSERIAL PRIMARY KEY,config JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE TABLE IF NOT EXISTS lucky_spins(id BIGSERIAL PRIMARY KEY,campaign_id BIGINT NOT NULL REFERENCES lucky_campaigns(id),user_id BIGINT NOT NULL REFERENCES users(id),period TEXT NOT NULL,prize_id TEXT NOT NULL,prize JSONB NOT NULL,coupon_code TEXT UNIQUE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(campaign_id,user_id,period))`);
 await db(`CREATE INDEX IF NOT EXISTS lucky_spins_customer ON lucky_spins(user_id,created_at DESC)`);
 await db("CREATE UNIQUE INDEX IF NOT EXISTS wheel_points_award_once ON loyalty_points_transactions(note) WHERE transaction_type='wheel_points'");
 await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS wheel_reward JSONB`);
}
function createLuckyWheel({db,transaction}){
 const active=async query=>(await query(`SELECT * FROM lucky_campaigns WHERE config->>'enabled'='true' AND (config->>'startsAt')::timestamptz<=NOW() AND (config->>'endsAt')::timestamptz>NOW() ORDER BY id DESC LIMIT 1`)).rows[0];
 async function publicCampaign(row){
  if(!row)return null;
  const ids=[...new Set(row.config.prizes.filter(p=>p.type==='gift').map(p=>p.productId))];
  const products=ids.length?(await db(`SELECT p.id,p.name,p.image_url,
   (SELECT COUNT(*)::int FROM product_images WHERE product_id=p.id) AS image_count,
   (SELECT COUNT(*)::int FROM product_images WHERE product_id=p.id AND is_primary=TRUE) AS primary_count
   FROM products p WHERE p.id=ANY($1::bigint[]) AND p.is_active=TRUE`,[ids])).rows:[];
  const prizes=row.config.prizes.map(p=>{
   const product=products.find(x=>String(x.id)===String(p.productId));
   const imageSources=product?[product.image_url?`/api/product-images/${product.id}/hero/0`:null,Number(product.primary_count)>0?`/api/product-images/${product.id}/main/0`:null,Number(product.image_count)>0?`/api/product-images/${product.id}/all/0`:null].filter(Boolean):[];
   return {id:p.id,label:prizeLabel(p,product?.name),productName:product?.name||null,type:p.type,value:p.value,image:imageSources[0]||null,imageSources};
  });
  // Older campaigns keep their stored odds, quantities and earned rewards.
  // Repeated visible sectors do not create extra server-side prizes.
  const visible=prizes.length<8?Array.from({length:8},(_,i)=>prizes[i%prizes.length]):prizes;
  return {id:row.id,name:row.config.name,startsAt:row.config.startsAt,endsAt:row.config.endsAt,frequency:row.config.frequency,minimum:row.config.minimum,validDays:row.config.validDays,stackable:row.config.stackable,prizes:visible,oddsNotice:'فرص الفوز تختلف بين الخيارات؛ حجم الخانة لا يمثل الاحتمال. الجوائز حسب الكمية المتاحة.'};
 }
 const period=async(q,c)=>(await q(`SELECT CASE WHEN $1='daily' THEN to_char(NOW() AT TIME ZONE 'Asia/Hebron','YYYY-MM-DD') ELSE 'campaign' END AS period`,[c.frequency])).rows[0].period;
 async function previousSpin(query,campaignId,userId,frequency,day){
  // Campaign-wide attempts remain consumed after legacy frequency changes.
  // For daily campaigns, created_at is authoritative even for old period keys.
  return (await query(`SELECT * FROM lucky_spins
   WHERE campaign_id=$1 AND user_id=$2 AND
    ($3='campaign' OR period='campaign' OR period=$4 OR
     to_char(created_at AT TIME ZONE 'Asia/Hebron','YYYY-MM-DD')=$4)
   ORDER BY id DESC LIMIT 1`,[campaignId,userId,frequency,day])).rows[0];
 }
 async function reward(query,code,userId,lock=false){
  const r=(await query(`SELECT * FROM lucky_spins WHERE coupon_code=$1${lock?' FOR UPDATE':''}`,[code])).rows[0];
  if(!r)return null;
  if(!userId||String(r.user_id)!==String(userId))fail(403,'هذه الجائزة مرتبطة بحساب الفائز فقط');
  if(new Date(r.expires_at)<=new Date())fail(400,'انتهت صلاحية الجائزة');
  return r;
 }
 async function attach(client,order,r){
  if(!r)return;
  const p=r.prize;
  if(p.type==='gift'){
   const product=(await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[p.productId])).rows[0];
   if(!product||product.is_active===false)fail(409,'هدية الحملة غير متاحة حاليًا؛ تواصلي معنا');
   const variants=(await client.query('SELECT * FROM product_variants WHERE product_id=$1 AND is_active=TRUE ORDER BY id FOR UPDATE',[p.productId])).rows;
   const variant=p.variantId?variants.find(v=>String(v.id)===String(p.variantId)):null;
   if((variants.length&&!variant)||(p.variantId&&!variant))fail(409,'خيار الهدية غير متاح حاليًا؛ تواصلي معنا');
   const stock=variant?variant.stock:product.stock;if(Number(stock)<1)fail(409,'الهدية غير متوفرة حاليًا؛ جائزتك محفوظة حتى انتهاء صلاحيتها');
   await client.query(variant?'UPDATE product_variants SET stock=stock-1,updated_at=NOW() WHERE id=$1':'UPDATE products SET stock=stock-1,updated_at=NOW() WHERE id=$1',[variant?variant.id:product.id]);
   await client.query(`INSERT INTO order_items(order_id,product_id,variant_id,product_name,variant_name,image,quantity,unit_price,total,purchase_price,is_gift,created_at) VALUES($1,$2,$3,$4,$5,$6,1,0,0,$7,TRUE,NOW())`,[order.id,product.id,variant?.id||null,product.name,variant?[variant.color,variant.size].filter(Boolean).join(' / '):'',product.image||product.image_url||null,Number(product.purchase_price||product.cost_price||0)]);
   await client.query(`INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at) VALUES($1,$2,-1,$3,$4,NOW())`,[product.id,variant?.id||null,'gift: lucky wheel '+p.label,order.id]);
  }
  const snapshot={spinId:r.id,label:p.label,type:p.type,campaign:p.campaign,code:r.coupon_code};
  await client.query('UPDATE orders SET wheel_reward=$1::jsonb WHERE id=$2',[JSON.stringify(snapshot),order.id]);order.wheel_reward=snapshot;
 }
 function register(app,{requireAuth,requireAdmin}){
  const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.status)return res.status(e.status).json({ok:false,message:e.message});next(e);}};
  app.get('/api/wheel',route(async(req,res)=>res.json({ok:true,campaign:await publicCampaign(await active(db))})));
  app.get('/api/wheel/mine',requireAuth,route(async(req,res)=>{
   const c=await active(db);let played=false;if(c){const day=await period(db,c.config);played=!!(await previousSpin(db,c.id,req.user.id,c.config.frequency,day));}
   const rewards=(await db(`SELECT s.*,c.used_count,c.is_active FROM lucky_spins s LEFT JOIN coupons c ON c.code=s.coupon_code WHERE s.user_id=$1 ORDER BY s.id DESC LIMIT 100`,[req.user.id])).rows;
   res.json({ok:true,played,rewards:rewards.map(r=>({id:r.id,campaignId:r.campaign_id,prize:r.prize,code:r.coupon_code,expiresAt:r.expires_at,createdAt:r.created_at,used:Number(r.used_count)>0,available:!!r.coupon_code&&r.is_active===true&&!Number(r.used_count)&&new Date(r.expires_at)>new Date()}))});
  }));
  app.post('/api/wheel/spin',requireAuth,route(async(req,res)=>{
   const result=await transaction(async client=>{
    const q=client.query.bind(client);
    // Serialize campaign spins and edits; the unique period key is a second guard.
    const row=(await q('SELECT * FROM lucky_campaigns WHERE id=$1 FOR UPDATE',[Number(req.body?.campaignId)||0])).rows[0];
    if(!row||!row.config.enabled)fail(409,'الحملة غير متاحة');
    const now=(await q('SELECT NOW() AS now')).rows[0].now,c=row.config;
    if(new Date(now)<new Date(c.startsAt)||new Date(now)>=new Date(c.endsAt))fail(409,'الحملة غير متاحة الآن');
    const day=await period(q,c);
    const existing=await previousSpin(q,row.id,req.user.id,c.frequency,day);
    if(existing)return {spin:existing,replayed:true};
    const counts=(await q('SELECT prize_id,COUNT(*)::int AS n FROM lucky_spins WHERE campaign_id=$1 GROUP BY prize_id',[row.id])).rows;
    const eligible=[];
    for(const p of c.prizes){
     if(p.limit&&Number(counts.find(x=>x.prize_id===p.id)?.n||0)>=p.limit)continue;
     let productName='';
     if(p.type==='gift'){
      const available=(await q(`SELECT p.id,p.name FROM products p WHERE p.id=$1 AND p.is_active=TRUE AND
       (($2::bigint IS NULL AND p.stock>0 AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.is_active=TRUE)) OR
        EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.id=$2 AND v.is_active=TRUE AND v.stock>0))`,[p.productId,p.variantId])).rows[0];
      if(!available)continue;
      productName=available.name;
     }
     eligible.push({...p,label:prizeLabel(p,productName)});
    }
    const p=choosePrize(eligible),code=['none','points'].includes(p.type)?null:'LF-W-'+randomBytes(12).toString('hex').toUpperCase();
    const expiresAt=new Date(new Date(now).getTime()+c.validDays*86400000).toISOString();
    const snapshot={...p,minimum:c.minimum,stackable:c.stackable,campaign:c.name};
    const spin=(await q(`INSERT INTO lucky_spins(campaign_id,user_id,period,prize_id,prize,coupon_code,expires_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING *`,[row.id,req.user.id,day,p.id,JSON.stringify(snapshot),code,expiresAt])).rows[0];
    if(p.type==='points'){
     await q('UPDATE users SET loyalty_points=COALESCE(loyalty_points,0)+$1,updated_at=NOW() WHERE id=$2',[p.value,req.user.id]);
     await q("INSERT INTO loyalty_points_transactions(user_id,points,transaction_type,note) VALUES($1,$2,'wheel_points',$3)",[req.user.id,p.value,'جائزة دولاب الحظ #'+spin.id]);
    }
    if(code)await q(`INSERT INTO coupons(code,discount_type,discount_value,min_order,minimum_amount,max_uses,max_uses_per_customer,expires_at,is_active) VALUES($1,$2,$3,$4,$4,1,1,$5,TRUE)`,[code,p.type==='percent'?'percent':'fixed',p.value,c.minimum,expiresAt]);
    return {spin,replayed:false};
   });
   res.json({ok:true,...result});
  }));
  app.get('/api/admin/wheel',requireAdmin,route(async(req,res)=>{
   const campaigns=(await db('SELECT c.*,EXISTS(SELECT 1 FROM lucky_spins s WHERE s.campaign_id=c.id) AS has_spins FROM lucky_campaigns c ORDER BY c.id DESC LIMIT 100')).rows;
   const spins=(await db(`SELECT s.id,s.campaign_id,s.prize,s.coupon_code,s.created_at,s.expires_at,u.name AS customer,c.used_count FROM lucky_spins s JOIN users u ON u.id=s.user_id LEFT JOIN coupons c ON c.code=s.coupon_code ORDER BY s.id DESC LIMIT 200`)).rows;
   res.json({ok:true,campaigns,spins});
  }));
  app.put('/api/admin/wheel',requireAdmin,route(async(req,res)=>{
   const id=Number(req.body?.id)||0;
   const saved=await transaction(async client=>{
    const q=client.query.bind(client);
    // Serialize activation across different campaigns, including new campaigns.
    await q('LOCK TABLE lucky_campaigns IN EXCLUSIVE MODE');
    const old=id?(await q('SELECT * FROM lucky_campaigns WHERE id=$1 FOR UPDATE',[id])).rows[0]:null;
    if(id&&!old)fail(404,'الحملة غير موجودة');
    let config,toggleOnly=false;
    if(old){
     const a={...old.config},b={...req.body};delete a.enabled;delete b.enabled;delete b.id;
     toggleOnly=require('node:util').isDeepStrictEqual(a,b);
    }
    // Spins carry immutable prize snapshots. Editing future choices must not
    // mint extra attempts or rewrite previously awarded discounts and gifts.
    config=toggleOnly?{...old.config,enabled:req.body.enabled===true}:normalizeCampaign(req.body);
    if(old&&config.frequency!==old.config.frequency&&(await q('SELECT id FROM lucky_spins WHERE campaign_id=$1 LIMIT 1',[id])).rows.length)fail(409,'لا يمكن تغيير تكرار المحاولات بعد أول مشاركة؛ أنشئ حملة جديدة لتغيير التكرار');
    for(const p of config.prizes.filter(p=>p.type==='gift'&&(!toggleOnly||config.enabled))){
     const product=(await q('SELECT id,name,is_active FROM products WHERE id=$1',[p.productId])).rows[0];
     if(!config.enabled&&(!product||product.is_active===false))continue;
     if(!product||product.is_active===false)fail(400,'منتج الهدية غير موجود أو غير فعال');
     if(!toggleOnly)p.label=prizeLabel(p,product.name);
     const vs=(await q('SELECT id FROM product_variants WHERE product_id=$1 AND is_active=TRUE',[p.productId])).rows;
     if((vs.length&&!p.variantId)||(p.variantId&&!vs.some(v=>String(v.id)===String(p.variantId))))fail(400,'حددي خيارًا صالحًا لمنتج الهدية');
    }
    if(config.enabled)await q(`UPDATE lucky_campaigns SET config=jsonb_set(config,'{enabled}','false'),updated_at=NOW() WHERE config->>'enabled'='true'`);
    return (await q(id?'UPDATE lucky_campaigns SET config=$1::jsonb,updated_at=NOW() WHERE id=$2 RETURNING *':'INSERT INTO lucky_campaigns(config) VALUES($1::jsonb) RETURNING *',id?[JSON.stringify(config),id]:[JSON.stringify(config)])).rows[0];
   });res.json({ok:true,campaign:saved});
  }));
 }
 return {register,reward,attach};
}
module.exports={initLuckyWheel,createLuckyWheel,normalizeCampaign,choosePrize,prizeLabel};
