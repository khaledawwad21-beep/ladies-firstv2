'use strict';
// Planning only: never publishes or calls advertising services.
const PLATFORMS=['facebook','instagram','tiktok','snapchat','whatsapp'];
const REGIONS=['west_bank','jerusalem','interior'];
function invalid(message){const e=new Error(message);e.status=400;return e}
function validateCampaign(b){
  if(!b||typeof b!=='object'||Array.isArray(b))throw invalid('بيانات الحملة غير صالحة');
  const str=(key,max,required=false)=>{if(typeof b[key]!=='string'||b[key].length>max||(required&&!b[key].trim()))throw invalid('تحقق من حقل '+key);return b[key].trim()};
  const list=(key,allowed)=>{if(!Array.isArray(b[key])||!b[key].length||b[key].some(x=>!allowed.includes(x)))throw invalid('اختر '+key);return [...new Set(b[key])]};
  const num=(key,max,integer=false)=>{const n=b[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n)))throw invalid('قيمة غير صالحة: '+key);return integer?n:Math.round(n*100)/100};
  if(!['draft','planned','published','archived'].includes(b.status))throw invalid('حالة غير صالحة');
  let scheduled_at=null;
  if(b.scheduled_at){
    if(typeof b.scheduled_at!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(b.scheduled_at)||!Number.isFinite(Date.parse(b.scheduled_at)))throw invalid('موعد غير صالح');
    scheduled_at=new Date(b.scheduled_at).toISOString();
  }
  if(b.status==='planned'&&!scheduled_at)throw invalid('حدد موعد الخطة');
  const product_id=b.product_id==null?null:b.product_id;
  if(product_id!==null&&(!Number.isSafeInteger(product_id)||product_id<1))throw invalid('منتج غير صالح');
  const data={title:str('title',160,true),content:str('content',6000),goal:str('goal',300),platforms:list('platforms',PLATFORMS),regions:list('regions',REGIONS),status:b.status,scheduled_at,product_id,budget:num('budget',10000000),spend:num('spend',10000000),revenue:num('revenue',10000000),orders:num('orders',1000000,true),clicks:num('clicks',1000000000,true)};
  if(data.spend>data.budget)throw invalid('المصروف المسجل يتجاوز ميزانية الحملة؛ راجع الميزانية أولًا');
  return data;
}
async function initMarketing(db){
  await db(`CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id BIGSERIAL PRIMARY KEY,data JSONB NOT NULL,version INTEGER NOT NULL DEFAULT 1,
    created_by BIGINT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
function registerMarketing(app,{db}){
  const prefix='/api/admin/marketing'; // Registered after the database-backed admin permission guard.
  app.get(prefix+'/products',async(req,res)=>{
    const q=String(req.query.q||'').trim().slice(0,160);
    const r=await db('SELECT id,name,price,image_url,stock FROM products WHERE is_active=TRUE AND name ILIKE $1 ORDER BY name LIMIT 50',['%'+q+'%']);
    res.json({ok:true,products:r.rows});
  });
  app.get(prefix+'/campaigns',async(req,res)=>{
    const q=String(req.query.q||'').trim().slice(0,160);
    const r=await db("SELECT * FROM marketing_campaigns WHERE data->>'title' ILIKE $1 OR data->>'content' ILIKE $1 ORDER BY updated_at DESC LIMIT 500",['%'+q+'%']);
    res.json({ok:true,campaigns:r.rows,limit:500});
  });
  app.post(prefix+'/campaigns',async(req,res)=>{
    const data=validateCampaign(req.body);
    if(data.product_id&&!(await db('SELECT id FROM products WHERE id=$1 AND is_active=TRUE',[data.product_id])).rows.length)throw invalid('المنتج غير متاح');
    const r=await db('INSERT INTO marketing_campaigns(data,created_by) VALUES($1::jsonb,$2) RETURNING *',[JSON.stringify(data),req.user.id]);
    res.status(201).json({ok:true,campaign:r.rows[0]});
  });
  app.put(prefix+'/campaigns/:id',async(req,res)=>{
    if(!/^\d{1,15}$/.test(req.params.id))throw invalid('رقم حملة غير صالح');
    const data=validateCampaign(req.body);
    if(!Number.isSafeInteger(req.body.version)||req.body.version<1)throw invalid('نسخة حملة غير صالحة');
    const r=await db('UPDATE marketing_campaigns SET data=$1::jsonb,version=version+1,updated_at=NOW() WHERE id=$2 AND version=$3 RETURNING *',[JSON.stringify(data),req.params.id,req.body.version]);
    if(!r.rows.length)return res.status(409).json({ok:false,message:'تغيرت الحملة أو لم تعد موجودة؛ أعد فتحها قبل الحفظ'});
    res.json({ok:true,campaign:r.rows[0]});
  });
}
module.exports={initMarketing,registerMarketing,validateCampaign};
