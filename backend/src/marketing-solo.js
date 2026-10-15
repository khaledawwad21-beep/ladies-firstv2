'use strict';
const {insights}=require('./marketing-insights');
const TASKS=['offer','content','review'];
const defaults=()=>({risk_cap:null,extra_cost:null,goal:3,days:7,reserve:30});
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const today=(date=new Date())=>date.toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});
function invalid(message,status=400){const e=new Error(message);e.status=status;return e}
function validateSettings(b){
 if(!b||typeof b!=='object')throw invalid('إعدادات غير صالحة');
 const out={};
 for(const [key,min,max,integer] of [['risk_cap',0,10000000,false],['extra_cost',0,100000,false],['goal',1,10000,true],['days',1,30,true],['reserve',10,90,false]]){
  const n=b[key];if(n===null&&['risk_cap','extra_cost'].includes(key)){out[key]=null;continue}
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw invalid('تحقق من '+key);
  out[key]=round(n);
 }
 return out;
}
function trialFor(candidate,settings){
 if(settings.extra_cost===null||settings.risk_cap===null)return {ready:false,reason:'أدخل سقف التجربة وتكاليف الطلب الإضافية أولًا. الصفر مسموح إذا تأكدت أنه فعلي.'};
 const contribution=round(candidate.unit_price-candidate.unit_cost-settings.extra_cost);
 const target_cpa=Math.floor(Math.max(0,contribution*(1-settings.reserve/100))*100)/100;
 const amount=round(Math.min(settings.risk_cap,settings.goal*target_cpa,candidate.stock*target_cpa));
 if(!target_cpa||!amount)return {ready:false,reason:'الهامش أو السقف لا يسمح بتجربة ممولة وفق إعداداتك؛ راجع التكاليف أو جهّز محتوى بدون تمويل.'};
 return {ready:true,amount,daily:round(amount/settings.days),days:settings.days,target_cpa,contribution,reserved_profit:round(contribution-target_cpa),goal:settings.goal,stock:candidate.stock,limited_by:settings.risk_cap<=Math.min(settings.goal,candidate.stock)*target_cpa?'risk_cap':candidate.stock<settings.goal?'stock':'goal'};
}
function rankCandidates(products,variants,signals=[]){
 const candidates=[];
 for(const p of products){
  if(!(Number(p.cost_price)>0))continue;
  const options=variants.filter(v=>String(v.product_id)===String(p.id));
  for(const v of options.length?options:[null]){
   const price=Number(v?.price??p.price),cost=Number(p.cost_price),stock=Number(v?.stock??p.stock);
   if(stock<1||price<=cost)continue;
   const signal=signals.find(s=>String(s.id)===String(p.id))||{};
   candidates.push({product_id:Number(p.id),variant_id:v?Number(v.id):null,name:p.name,variant:v?[v.color,v.size].filter(Boolean).join(' / '):'',image_url:p.image_url,unit_price:price,unit_cost:cost,stock,quantity:1,cost_override:null,cost_source:'catalog',units:Number(signal.units||0),carts:Number(signal.carts||0),views:Number(signal.views||0),purchase_margin:round(price-cost)});
  }
 }
 // Keep viable stock ahead of interest; signals are product-level, never variant conversion claims.
 candidates.sort((a,b)=>(b.stock>=3)-(a.stock>=3)||b.units-a.units||b.carts-a.carts||b.views-a.views||b.purchase_margin-a.purchase_margin||a.product_id-b.product_id||(a.variant_id||0)-(b.variant_id||0));
 const seen=new Set();return candidates.filter(c=>{if(seen.has(c.product_id))return false;seen.add(c.product_id);return true}).slice(0,3);
}
function channelAdvice(data){
 const target=data.budget.ready?data.budget.targetCPA:null;
 return data.channels.filter(c=>c.spend>0).map(c=>{
  const mature=Number(c.paid_delivered)>=5,cpa=mature?round(c.spend/Number(c.paid_delivered)):null;
  return {source:c.source,spend:c.spend,orders:Number(c.paid_delivered),cpa,action:!mature||!target?'collect':cpa>target?'review':'hold',reason:!mature?'أقل من 5 طلبات مسلّمة موسومة كمدفوعة؛ انتظر اكتمال التسليم وراجع تسجيل المصروف قبل الحكم.':!target?'عينة الهامش غير كافية؛ راجع تكلفة الطلبات قبل تقرير التوسّع.':cpa>target?'التكلفة المرصودة أعلى من هدف الهامش؛ راجع العرض والمحتوى وفكّر بإيقاف التجربة إذا استمر الأداء بعد اكتمال التسليم.':'ثبّت الاختبار واجمع نتائج إضافية قبل زيادة الصرف.'};
 });
}
async function initSoloMarketing(db){
 await db('CREATE TABLE IF NOT EXISTS marketing_solo_preferences(user_id BIGINT PRIMARY KEY,settings JSONB NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 await db('CREATE TABLE IF NOT EXISTS marketing_daily_tasks(user_id BIGINT NOT NULL,day DATE NOT NULL,task_key TEXT NOT NULL,done BOOLEAN NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,day,task_key))');
}
function registerSoloMarketing(app,{db}){
 const root='/api/admin/marketing/solo';
 app.get(root,async(req,res)=>{
  const day=today(),prefs=(await db('SELECT * FROM marketing_solo_preferences WHERE user_id=$1',[req.user.id])).rows[0];
  const settings=prefs?.settings||defaults();
  const from=new Date(Date.parse(day)-29*86400000).toISOString().slice(0,10);
  const data=await insights(db,{from,to:day,goal:settings.goal,days:settings.days,reserve:settings.reserve,extra:settings.extra_cost??0,cap:settings.risk_cap??''});
  const [products,variants,tasks,campaigns]=await Promise.all([
   db('SELECT id,name,price,cost_price,stock,image_url FROM products WHERE is_active=TRUE ORDER BY stock DESC,id LIMIT 100'),
   db('SELECT v.id,v.product_id,v.color,v.size,v.price,v.stock FROM product_variants v JOIN (SELECT id FROM products WHERE is_active=TRUE ORDER BY stock DESC,id LIMIT 100) p ON p.id=v.product_id WHERE v.is_active=TRUE ORDER BY v.id'),
   db('SELECT task_key,done FROM marketing_daily_tasks WHERE user_id=$1 AND day=$2',[req.user.id,day]),
   db("SELECT id,data,version FROM marketing_campaigns WHERE data->>'status' IN ('draft','planned') ORDER BY updated_at DESC LIMIT 3")
  ]);
  const candidates=rankCandidates(products.rows,variants.rows,data.products).map(c=>({...c,trial:trialFor(c,settings)}));
  const advice=channelAdvice(data);if(settings.extra_cost===null)for(const a of advice){a.action='collect';a.reason='أدخل التكاليف الإضافية وراجع هامش الطلبات قبل الحكم على تكلفة الإعلان.'}
  res.json({ok:true,day,from,settings,version:prefs?.version||0,candidates,tasks:TASKS.map(key=>({key,done:tasks.rows.find(t=>t.task_key===key)?.done||false})),campaigns:campaigns.rows,channels:advice,platform:data.budget.best?.source||'facebook',platform_reason:data.budget.best?'أقل تكلفة مرصودة في العينة المؤهلة؛ الاختيار تجريبي وليس ضمان أداء.':'فيسبوك نقطة تجربة مقترحة فقط؛ لا توجد منصة فائزة مثبتة بعد.',summary:{orders:Number(data.commerce.orders),delivered:Number(data.commerce.delivered),spend:round(data.channels.reduce((n,c)=>n+c.spend,0)),sessions:Number(data.funnel.sessions)},limits:'آخر 30 يومًا. اقتراحات من بيانات المتجر والتكاليف المدخلة، وليست قراءة لتفاعل منصات الإعلان. الاهتمام على مستوى المنتج لا اللون. فحص أفضل 100 منتج نشط حسب المخزون. لا صرف أو نشر تلقائي.'});
 });
 app.put(root+'/settings',async(req,res)=>{
  const settings=validateSettings(req.body),version=req.body.version;
  if(!Number.isSafeInteger(version)||version<0)throw invalid('نسخة إعدادات غير صالحة');
  let r;
  if(version===0)r=await db('INSERT INTO marketing_solo_preferences(user_id,settings) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING *',[req.user.id,JSON.stringify(settings)]);
  else r=await db('UPDATE marketing_solo_preferences SET settings=$1::jsonb,version=version+1,updated_at=NOW() WHERE user_id=$2 AND version=$3 RETURNING *',[JSON.stringify(settings),req.user.id,version]);
  if(!r.rows.length)throw invalid('الإعدادات تغيرت على جهاز آخر؛ حدّث الشاشة قبل الحفظ',409);
  res.json({ok:true,settings:r.rows[0].settings,version:r.rows[0].version});
 });
 app.put(root+'/tasks',async(req,res)=>{
  const b=req.body||{};if(b.day!==today()||!TASKS.includes(b.key)||typeof b.done!=='boolean')throw invalid('المهمة أو تاريخ اليوم غير صالح؛ حدّث الشاشة إذا بدأ يوم جديد');
  await db('INSERT INTO marketing_daily_tasks(user_id,day,task_key,done) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,day,task_key) DO UPDATE SET done=EXCLUDED.done,updated_at=NOW()',[req.user.id,b.day,b.key,b.done]);
  res.json({ok:true});
 });
}
module.exports={defaults,today,validateSettings,trialFor,rankCandidates,channelAdvice,initSoloMarketing,registerSoloMarketing};
