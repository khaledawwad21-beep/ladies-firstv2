'use strict';
const crypto=require('node:crypto');
const DEFAULTS={exitEnabled:true,referralEntryEnabled:false,referralEntryPoints:10,referralDailyCap:10,referralNewOnly:false,profit:{packagingCost:0,shippingSupport:0,otherCost:0,paymentFeePercent:0,couponPercent:0,loyaltyDiscount:0}};
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
function fail(status,message){throw Object.assign(new Error(message),{status});}
function num(v,label,max=1000000){const n=Number(v??0);if(!Number.isFinite(n)||n<0||n>max)fail(400,'قيمة '+label+' غير صالحة');return n;}
function profitQuote(b){
 const quantity=num(b.quantity??1,'الكمية',1000);if(!Number.isInteger(quantity)||quantity<1)fail(400,'الكمية غير صالحة');
 const salePrice=num(b.salePrice,'سعر البيع'),unitCost=b.unitCost==null?null:num(b.unitCost,'الكلفة');
 const fee=num(b.paymentFeePercent,'رسوم الدفع',30),coupon=num(b.couponPercent,'الكوبون',100);
 const gross=money(salePrice*quantity),discount=money(gross*coupon/100+num(b.loyaltyDiscount,'خصم النقاط'));
 const revenue=money(Math.max(0,gross-discount)),fees=money(revenue*fee/100);
 const packaging=num(b.packagingCost,'كلفة التغليف'),shipping=num(b.shippingSupport,'دعم التوصيل'),other=num(b.otherCost,'مصاريف أخرى');
 const costs=unitCost===null?null:money(unitCost*quantity+packaging+shipping+other+fees);
 const profit=costs===null?null:money(revenue-costs);
 const breakEven=unitCost===null||coupon===100?null:money((unitCost*quantity+packaging+shipping+other+num(b.loyaltyDiscount,'خصم النقاط')*(1-fee/100))/((1-coupon/100)*(1-fee/100))/quantity);
 return {quantity,salePrice,unitCost,gross,discount,revenue,fees,packaging,shipping,other,costs,profit,margin:profit===null||!revenue?null:money(profit/revenue*100),breakEven,status:profit===null?'unknown':profit<0?'loss':'profit',warnings:[...(unitCost===null?['كلفة الشراء غير مسجلة؛ لا يمكن تأكيد الربحية.']:[]),...(profit<0?['هذا العرض يسبب خسارة وفق التكاليف المدخلة.']:[])],scope:'تقدير لكل طلب بهذه الكمية. أدخل كلفة التغليف الفعلية ودعم التوصيل والخصومات المتوقع جمعها؛ النتيجة لا تغيّر السعر.'};
}
async function initGrowthTools(db){
 await db(`CREATE TABLE IF NOT EXISTS referral_entries(buyer_id BIGINT PRIMARY KEY REFERENCES users(id),referrer_id BIGINT NOT NULL REFERENCES users(id),points INT NOT NULL CHECK(points>=0),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),CHECK(buyer_id<>referrer_id))`);
 await db(`CREATE INDEX IF NOT EXISTS referral_entries_referrer_date ON referral_entries(referrer_id,created_at)`);
 await db(`CREATE TABLE IF NOT EXISTS market_price_searches(id BIGSERIAL PRIMARY KEY,owner_id BIGINT NOT NULL REFERENCES users(id),product_id BIGINT REFERENCES products(id),query TEXT NOT NULL,result JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
function createGrowthTools({db,transaction}){
 async function config(client){const q=client?client.query.bind(client):db,r=await q("SELECT value FROM settings WHERE key='growth_tools'");const c=r.rows[0]?.value||{};return {...DEFAULTS,...c,profit:{...DEFAULTS.profit,...c.profit}};}
 function register(app,{requireAuth,requireOwner}){
  const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  app.get('/api/growth/config',wrap(async(_req,res)=>{const c=await config();res.json({ok:true,exitEnabled:c.exitEnabled,referralEntryEnabled:c.referralEntryEnabled,referralEntryPoints:c.referralEntryPoints});}));
  app.get('/api/admin/growth',requireOwner,wrap(async(_req,res)=>{const c=await config();const referrals=(await db(`SELECT e.points,e.created_at,u.name AS referrer,b.name AS buyer FROM referral_entries e JOIN users u ON u.id=e.referrer_id JOIN users b ON b.id=e.buyer_id ORDER BY e.created_at DESC LIMIT 100`)).rows;res.json({ok:true,settings:c,referrals});}));
  app.put('/api/admin/growth',requireOwner,wrap(async(req,res)=>{
   const b=req.body||{},c={exitEnabled:b.exitEnabled===true,referralEntryEnabled:b.referralEntryEnabled===true,referralNewOnly:b.referralNewOnly===true,referralEntryPoints:num(b.referralEntryPoints,'نقاط الإحالة',10000),referralDailyCap:num(b.referralDailyCap,'حد الإحالات اليومي',1000),profit:{}};
   if(!Number.isInteger(c.referralEntryPoints)||!Number.isInteger(c.referralDailyCap)||c.referralDailyCap<1)fail(400,'النقاط والحد اليومي يجب أن تكون أعدادًا صحيحة');
   for(const key of Object.keys(DEFAULTS.profit))c.profit[key]=num(b.profit?.[key],key,key.endsWith('Percent')?100:100000);
   if(c.profit.paymentFeePercent>30)fail(400,'رسوم الدفع أعلى من الحد المسموح');
   await db("INSERT INTO settings(key,value) VALUES('growth_tools',$1::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",[JSON.stringify(c)]);res.json({ok:true,settings:c});
  }));
  app.post('/api/admin/growth/profit',requireOwner,wrap(async(req,res)=>{
   const c=await config(),body={...c.profit,...req.body};
   if(body.productId){const p=(await db('SELECT id,cost_price FROM products WHERE id=$1',[num(body.productId,'الصنف')])).rows[0];if(!p)fail(404,'الصنف غير موجود');if(body.unitCost===undefined)body.unitCost=Number(p.cost_price)>0?Number(p.cost_price):null;}
   res.json({ok:true,quote:profitQuote(body)});
  }));
  const limiter=require('./persistent-rate-limit').createPersistentRateLimiter({db,secret:process.env.JWT_SECRET});
  app.post('/api/growth/referrals/claim',requireAuth,wrap(async(req,res)=>{
   const limit=await limiter({scope:'referral-claim',clientId:String(req.user.id),limit:15,windowMs:3600000});if(!limit.allowed)fail(429,'محاولات كثيرة؛ حاول لاحقًا');
   const code=String(req.body?.code||'');if(!/^[a-f0-9]{18}$/.test(code))fail(400,'رابط الإحالة غير صالح');
   const result=await transaction(async client=>{
    const c=await config(client);if(!c.referralEntryEnabled)return {credited:false,reason:'disabled'};
    // Lock the two accounts in id order, preventing cross-referral deadlocks.
    const ref=(await client.query('SELECT user_id FROM community_referral_codes WHERE code=$1',[code])).rows[0];if(!ref||String(ref.user_id)===String(req.user.id))return {credited:false,reason:'self_or_invalid'};
    const accounts=(await client.query('SELECT id,phone,email,role,is_active,created_at FROM users WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE',[[ref.user_id,req.user.id]])).rows;
    const owner=accounts.find(x=>String(x.id)===String(ref.user_id)),buyer=accounts.find(x=>String(x.id)===String(req.user.id));
    if(!owner?.is_active||!buyer?.is_active||buyer.role!=='customer')return {credited:false,reason:'ineligible'};
    const digits=x=>String(x||'').replace(/\D/g,'').replace(/^00/,'').replace(/^972/,'970');
    if(owner.phone&&digits(owner.phone)===digits(buyer.phone)||owner.email&&String(owner.email).toLowerCase()===String(buyer.email).toLowerCase())return {credited:false,reason:'same_identity'};
    if(c.referralNewOnly&&new Date(buyer.created_at).getTime()<Date.now()-86400000)return {credited:false,reason:'not_new'};
    const cap=await client.query("SELECT COUNT(*)::int AS n FROM referral_entries WHERE referrer_id=$1 AND (created_at AT TIME ZONE 'Asia/Hebron')::date=(NOW() AT TIME ZONE 'Asia/Hebron')::date",[owner.id]);
    if(Number(cap.rows[0].n)>=c.referralDailyCap)return {credited:false,reason:'daily_cap'};
    const added=await client.query('INSERT INTO referral_entries(buyer_id,referrer_id,points) VALUES($1,$2,$3) ON CONFLICT(buyer_id) DO NOTHING RETURNING points',[buyer.id,owner.id,c.referralEntryPoints]);if(!added.rows.length)return {credited:false,reason:'already_counted'};
    await client.query('UPDATE users SET loyalty_points=COALESCE(loyalty_points,0)+$1,updated_at=NOW() WHERE id=$2',[c.referralEntryPoints,owner.id]);
    await client.query("INSERT INTO loyalty_points_transactions(user_id,points,transaction_type,note) VALUES($1,$2,'referral_entry',$3)",[owner.id,c.referralEntryPoints,'مكافأة دخول حساب من رابط المشاركة #'+buyer.id]);
    return {credited:true,points:c.referralEntryPoints};
   });res.json({ok:true,...result});
  }));
  app.get('/api/growth/referrals/mine',requireAuth,wrap(async(req,res)=>{
   await db('INSERT INTO community_referral_codes(user_id,code) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[req.user.id,crypto.randomBytes(9).toString('hex')]);
   const code=(await db('SELECT code FROM community_referral_codes WHERE user_id=$1',[req.user.id])).rows[0].code;
   const c=await config(),stats=(await db('SELECT COUNT(*)::int AS count,COALESCE(SUM(points),0)::int AS points FROM referral_entries WHERE referrer_id=$1',[req.user.id])).rows[0];
   res.json({ok:true,code,enabled:c.referralEntryEnabled,pointsPerEntry:c.referralEntryPoints,dailyCap:c.referralDailyCap,newOnly:c.referralNewOnly,stats});
  }));
 }
 return {register,config};
}
module.exports={DEFAULTS,profitQuote,initGrowthTools,createGrowthTools};
