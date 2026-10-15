'use strict';
const crypto=require('node:crypto');
const {createPersistentRateLimiter}=require('./persistent-rate-limit');
const SOURCES=['facebook','instagram','tiktok','snapchat','whatsapp','direct','other'];
const PAID=['facebook','instagram','tiktok','snapchat'];
const COOKIE='lf_marketing_session';
function fail(message){const e=new Error(message);e.status=400;return e}
function cookieId(req){const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));const id=raw?.slice(COOKIE.length+1);return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id||'')?id:null}
function clearCookie(res){res.cookie(COOKIE,'',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0,secure:process.env.NODE_ENV==='production'})}
async function initMarketingInsights(db){
 await db(`CREATE TABLE IF NOT EXISTS marketing_sessions(id UUID PRIMARY KEY,source TEXT NOT NULL,medium TEXT NOT NULL,campaign_id BIGINT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL)`);
 await db(`CREATE TABLE IF NOT EXISTS marketing_events(session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,event TEXT NOT NULL,product_id BIGINT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(session_id,event,product_id))`);
 await db(`CREATE TABLE IF NOT EXISTS marketing_order_attribution(order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,session_id UUID NOT NULL REFERENCES marketing_sessions(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE TABLE IF NOT EXISTS marketing_spend_daily(day DATE NOT NULL,source TEXT NOT NULL,amount NUMERIC(12,2) NOT NULL CHECK(amount>=0),updated_by BIGINT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(day,source))`);
 await db('CREATE INDEX IF NOT EXISTS marketing_sessions_date_idx ON marketing_sessions(created_at)');
 await db("DELETE FROM marketing_sessions WHERE created_at<NOW()-INTERVAL '90 days'");
}
function dateRange(query){
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
 const end=query.to||today,start=query.from||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10);
 for(const d of [start,end])if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d)throw fail('تاريخ غير صالح');
 if(start>end||end>today||(Date.parse(end)-Date.parse(start))/86400000>89||start<new Date(Date.parse(today)-89*86400000).toISOString().slice(0,10))throw fail('اختر فترة حتى 90 يومًا ضمن آخر 90 يومًا');
 return [start,end];
}
const round=n=>Math.round(Number(n||0)*100)/100;
function budgetPlan({economics,channels,goal=10,days=7,reserve=30,extra=0,cap=null}){
 for(const [n,min,max] of [[goal,1,10000],[days,1,90],[reserve,10,90],[extra,0,100000]])if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw fail('قيم حاسبة الميزانية غير صالحة');
 if(!Number.isInteger(goal)||!Number.isInteger(days)||(cap!==null&&(typeof cap!=='number'||!Number.isFinite(cap)||cap<0||cap>10000000)))throw fail('قيم الحاسبة غير صالحة');
 const sample=Number(economics.sample||0),avg=sample?Number(economics.contribution)/sample-extra:null;
 if(sample<5||avg<=0)return {ready:false,sample,reason:sample<5?'نحتاج 5 طلبات مسلّمة على الأقل بتكلفة شراء مسجلة ودون طلب إرجاع/استبدال لحساب هامش مرجعي.':'الهامش بعد التكاليف لا يسمح بميزانية اكتساب موجبة؛ راجع التسعير والتكاليف أولًا.'};
 const breakEven=round(avg),targetCPA=round(avg*(1-reserve/100)),testBudget=round(targetCPA*goal);
 if(targetCPA<=0)return {ready:false,sample,reason:'الهامش أصغر من حد الدقة المالية؛ راجع التسعير والتكاليف.'};
 const candidates=channels.filter(c=>PAID.includes(c.source)&&Number(c.spend)>0&&Number(c.paid_delivered)>=5).map(c=>({...c,cpa:Number(c.spend)/Number(c.paid_delivered)})).sort((a,b)=>a.cpa-b.cpa);
 const best=candidates[0]||null;
 return {ready:true,sample,breakEven,targetCPA,testBudget,days,daily:round(testBudget/days),goal,reserve,extra,cap,withinCap:cap===null?null:testBudget<=cap,affordableGoal:cap===null?null:Math.floor(cap/targetCPA),best:best?{source:best.source,cpa:round(best.cpa),orders:Number(best.paid_delivered),viable:best.cpa<=targetCPA}:null,expectedOrdersAtObservedCPA:best?round((cap===null?testBudget:Math.min(cap,testBudget))/best.cpa):null};
}
function registerMarketingInsights(app,{db}){
 const rate=createPersistentRateLimiter({db,secret:process.env.JWT_SECRET||'development-marketing-only'});
 let lastCleanup=0;
 app.post('/api/marketing/events',async(req,res)=>{
  if(req.body?.consent!==true)throw fail('يلزم قبول قياس الزيارات');
  if(!['visit','product_view','add_to_cart','checkout_start'].includes(req.body.event))throw fail('حدث غير صالح');
  const limit=await rate({scope:'marketing-events',clientId:req.ip||'unknown',limit:120,windowMs:60000});
  if(!limit.allowed)return res.status(429).json({ok:false,message:'محاولات كثيرة'});
  if(Date.now()-lastCleanup>86400000){lastCleanup=Date.now();await db("DELETE FROM marketing_sessions WHERE created_at<NOW()-INTERVAL '90 days'")}
  const event=req.body.event,product=Number(req.body.product_id),productId=['product_view','add_to_cart'].includes(event)&&Number.isSafeInteger(product)&&product>0?product:0;
  if(['product_view','add_to_cart'].includes(event)&&!productId)throw fail('رقم منتج غير صالح');
  if(productId&&!(await db('SELECT id FROM products WHERE id=$1 AND is_active=TRUE',[productId])).rows.length)throw fail('منتج غير متاح');
  let id=cookieId(req),session=id?(await db('SELECT id FROM marketing_sessions WHERE id=$1 AND expires_at>NOW()',[id])).rows[0]:null;
  if(!session){
   id=crypto.randomUUID();const source=SOURCES.includes(req.body.source)?req.body.source:'direct',medium=['paid','organic','referral'].includes(req.body.medium)?req.body.medium:'unknown';
   const campaign=Number(req.body.campaign_id),campaignId=Number.isSafeInteger(campaign)&&campaign>0?campaign:null;
   await db("INSERT INTO marketing_sessions(id,source,medium,campaign_id,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '30 minutes')",[id,source,medium,campaignId]);
   res.cookie(COOKIE,id,{httpOnly:true,sameSite:'lax',path:'/',maxAge:30*60000,secure:process.env.NODE_ENV==='production'});
  }
  await db("INSERT INTO marketing_events(session_id,event,product_id) VALUES($1,'visit',0) ON CONFLICT DO NOTHING",[id]);
  await db('INSERT INTO marketing_events(session_id,event,product_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,event,productId]);
  res.json({ok:true});
 });
 app.delete('/api/marketing/consent',async(req,res)=>{const id=cookieId(req);clearCookie(res);if(id)await db('DELETE FROM marketing_sessions WHERE id=$1',[id]);res.json({ok:true})});
 // Observe successful server-created orders only. No client purchase event or customer identity is accepted.
 app.use('/api/orders',(req,res,next)=>{
  const id=cookieId(req);if(req.method!=='POST'||!id||req.path!=='/')return next();
  const json=res.json;
  res.json=function(body){
   if(res.statusCode===201&&body?.ok===true&&body.order?.id){
    const orderId=body.order.id;
    res.once('finish',()=>{db(`INSERT INTO marketing_order_attribution(order_id,session_id) SELECT $1,id FROM marketing_sessions WHERE id=$2 AND expires_at>NOW() ON CONFLICT DO NOTHING`,[orderId,id]).catch(e=>console.warn('[MARKETING ATTRIBUTION]',e.message))});
   }
   return json.call(this,body);
  };next();
 });
}
const WINDOW="created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Jerusalem') AND created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem')";
const period=alias=>WINDOW.replaceAll("created_at",alias+".created_at");
async function insights(db,query){
 const range=dateRange(query);
 const results=await Promise.all([
  db(`SELECT COUNT(*)::int AS sessions,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM marketing_events e WHERE e.session_id=s.id AND event='product_view'))::int AS viewed,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM marketing_events e WHERE e.session_id=s.id AND event='add_to_cart'))::int AS carted,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM marketing_events e WHERE e.session_id=s.id AND event='checkout_start'))::int AS checkout,COUNT(*) FILTER(WHERE EXISTS(SELECT 1 FROM marketing_order_attribution a JOIN orders o ON o.id=a.order_id WHERE a.session_id=s.id AND o.status<>'cancelled'))::int AS ordered FROM marketing_sessions s WHERE ${WINDOW}` ,range),
  db(`SELECT COUNT(*)::int AS orders,COUNT(*) FILTER(WHERE status='delivered')::int AS delivered,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled,COALESCE(SUM(total) FILTER(WHERE status<>'cancelled'),0) AS booked_total FROM orders WHERE ${WINDOW}`,range),
  db(`WITH eligible AS (SELECT o.*,c.cost FROM orders o JOIN LATERAL (SELECT SUM(quantity*purchase_price) AS cost,COUNT(*) AS lines,COUNT(*) FILTER(WHERE purchase_price IS NULL OR purchase_price<=0) AS missing FROM order_items WHERE order_id=o.id) c ON TRUE WHERE o.status='delivered' AND ${period('o')} AND c.lines>0 AND c.missing=0 AND NOT EXISTS(SELECT 1 FROM return_requests rr WHERE rr.order_id=o.id)) SELECT COUNT(*)::int AS sample,COALESCE(SUM(GREATEST(0,subtotal-coupon_discount-visa_discount-loyalty_discount)-cost-GREATEST(0,shipping_base_cost-shipping_cost)),0) AS contribution FROM eligible`,range),
  db(`SELECT s.source,COUNT(DISTINCT s.id)::int AS sessions,COUNT(DISTINCT a.order_id) FILTER(WHERE o.status<>'cancelled')::int AS orders,COUNT(DISTINCT a.order_id) FILTER(WHERE o.status='delivered' AND s.medium='paid' AND NOT EXISTS(SELECT 1 FROM return_requests rr WHERE rr.order_id=o.id))::int AS paid_delivered FROM marketing_sessions s LEFT JOIN marketing_order_attribution a ON a.session_id=s.id LEFT JOIN orders o ON o.id=a.order_id WHERE ${period('s')} GROUP BY s.source`,range),
  db('SELECT source,COALESCE(SUM(amount),0) AS spend FROM marketing_spend_daily WHERE day BETWEEN $1::date AND $2::date GROUP BY source',range),
  db(`SELECT COALESCE(shipping_region,'unknown') AS region,COUNT(*)::int AS orders,COUNT(*) FILTER(WHERE status='delivered')::int AS delivered,COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled FROM orders WHERE ${WINDOW} GROUP BY shipping_region ORDER BY COUNT(*) DESC`,range),
  db(`WITH ev AS(SELECT e.product_id,COUNT(*) FILTER(WHERE event='product_view')::int AS views,COUNT(*) FILTER(WHERE event='add_to_cart')::int AS carts FROM marketing_events e JOIN marketing_sessions s ON s.id=e.session_id WHERE ${period('s')} AND e.product_id>0 GROUP BY e.product_id),sales AS(SELECT oi.product_id,SUM(oi.quantity)::int AS units FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE ${period('o')} AND o.status<>'cancelled' AND NOT COALESCE(oi.is_gift,FALSE) GROUP BY oi.product_id) SELECT p.id,p.name,p.image_url,p.price,p.stock,p.cost_price,COALESCE(ev.views,0)::int AS views,COALESCE(ev.carts,0)::int AS carts,COALESCE(sales.units,0)::int AS units FROM products p LEFT JOIN ev ON ev.product_id=p.id LEFT JOIN sales ON sales.product_id=p.id WHERE p.is_active=TRUE AND (ev.views>0 OR sales.units>0) ORDER BY COALESCE(sales.units,0) DESC,COALESCE(ev.views,0) DESC LIMIT 12`,range),
  db('SELECT day,source,amount FROM marketing_spend_daily WHERE day BETWEEN $1::date AND $2::date ORDER BY day DESC,source LIMIT 360',range)
 ]);
 const [funnel,commerce,economics,traffic,spending,regions,products,spendRows]=results.map(r=>r.rows);
 const channels=SOURCES.map(source=>({...{source,sessions:0,orders:0,paid_delivered:0,spend:0},...traffic.find(x=>x.source===source),spend:Number(spending.find(x=>x.source===source)?.spend||0)}));
 const inputs={goal:query.goal===undefined?10:Number(query.goal),days:query.days===undefined?7:Number(query.days),reserve:query.reserve===undefined?30:Number(query.reserve),extra:query.extra===undefined?0:Number(query.extra),cap:query.cap===undefined||query.cap===''?null:Number(query.cap)};
 return {ok:true,from:range[0],to:range[1],funnel:funnel[0],commerce:commerce[0],economics:economics[0],channels,regions,products,spendRows,budget:budgetPlan({economics:economics[0],channels,...inputs}),measurement:{consentedOnly:true,retentionDays:90,sessionMinutes:30,attribution:'مصدر الجلسة التي أُرسل فيها الطلب، حسب وسم الرابط؛ بدون تتبع عبر الأجهزة. لا يثبت أن الإعلان سبب الشراء.',spend:'يدوي من تقارير المنصة، حسب يوم المصروف',economics:'هامش بضائع تقريبي بعد خصومات الطلب وتكلفة الشراء ودعم التوصيل، للطلبات المسلّمة بلا طلب إرجاع/استبدال. لا يشمل تكاليف التغليف والتشغيل إلا ما تدخله بالحاسبة.'}};
}
function registerMarketingAdminInsights(app,{db}){
 app.get('/api/admin/marketing/insights',async(req,res)=>res.json(await insights(db,req.query)));
 app.put('/api/admin/marketing/spend',async(req,res)=>{
  const b=req.body||{};dateRange({from:b.day,to:b.day});
  if(!PAID.includes(b.source)||typeof b.amount!=='number'||!Number.isFinite(b.amount)||b.amount<0||b.amount>10000000)throw fail('مصروف أو منصة غير صالحة');
  await db(`INSERT INTO marketing_spend_daily(day,source,amount,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(day,source) DO UPDATE SET amount=EXCLUDED.amount,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,[b.day,b.source,round(b.amount),req.user.id]);res.json({ok:true});
 });
}
module.exports={initMarketingInsights,registerMarketingInsights,registerMarketingAdminInsights,insights,budgetPlan,dateRange,cookieId};
