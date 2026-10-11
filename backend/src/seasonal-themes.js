'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./db');
const { requireAdmin } = require('./auth');

const THEME_IDS = Object.freeze(['none','ramadan','eid-fitr','eid-adha','halloween','christmas','new-year']);
const LABELS = Object.freeze({
  none:'بدون ثيم',ramadan:'رمضان','eid-fitr':'عيد الفطر','eid-adha':'عيد الأضحى',
  halloween:'هالوين',christmas:'كريسماس','new-year':'رأس السنة'
});
const GREETINGS = Object.freeze({
  ramadan:'رمضان كريم، نورتينا في Ladies First',
  'eid-fitr':'عيد فطر سعيد، كل عام وأنتِ بخير',
  'eid-adha':'عيد أضحى مبارك، أعاده الله عليكم بالخير',
  halloween:'إطلالة مميزة بأجواء موسمية أنيقة',
  christmas:'أجواء احتفالية أنيقة مع Ladies First',
  'new-year':'سنة جديدة بإطلالات أجمل'
});
const empty = () => ({active:'none',banners:{}});
const validTheme = id => THEME_IDS.includes(id);
function validImage(value) {
  if(value === '' || value == null) return '';
  if(typeof value !== 'string' || value.length > 2048) throw Object.assign(new Error('رابط صورة غير صالح'), {status:400});
  const str=value.trim();
  if(/^\/(?!\/)[A-Za-z0-9._~/%-]+(?:\?[A-Za-z0-9._~%=&-]+)?$/.test(str)) return str;
  try {
    const url = new URL(str);
    if(['https:','http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {}
  throw Object.assign(new Error('اختاري صورة مرفوعة أو رابطًا آمنًا'), {status:400});
}
function normalize(input) {
  if(!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('إعدادات ثيم غير صالحة'), {status:400});
  if(!validTheme(input.active)) throw Object.assign(new Error('اختاري ثيمًا من القائمة'), {status:400});
  const banners={};
  if(input.banners != null && (typeof input.banners !== 'object' || Array.isArray(input.banners))) throw Object.assign(new Error('بيانات البنرات غير صالحة'), {status:400});
  for(const [id,images] of Object.entries(input.banners || {})) {
    if(!validTheme(id) || id==='none' || !images || typeof images !== 'object' || Array.isArray(images)) throw Object.assign(new Error('مناسبة غير معروفة'), {status:400});
    banners[id] = {desktop: validImage(images.desktop),mobile:validImage(images.mobile),card:validImage(images.card),card2:validImage(images.card2),card3:validImage(images.card3)};
  }
  return {active:input.active,banners};
}
function safeState(value) {
  try { return normalize({active:value?.active||'none',banners:value?.banners||{}}); }
  catch { return empty(); }
}
async function readState() {
  const data=await db("SELECT value FROM settings WHERE key = $1 LIMIT 1",['seasonal_theme_config']);
  return safeState(data.rows[0]?.value);
}
function targetNewYear(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Hebron',year:'numeric',month:'numeric'}).formatToParts(date);
  const year=Number(parts.find(p=>p.type==='year')?.value)||date.getUTCFullYear();
  const month=Number(parts.find(p=>p.type==='month')?.value)||date.getUTCMonth()+1;
  return month>=7?year+1:year;
}
function publicState(state) {
  const s=safeState(state);
  return {...s,labels:LABELS,greetings:GREETINGS,year:targetNewYear()};
}
// Inject on the server before the browser receives the first HTML byte; never use localStorage for active theme.
function renderHomeHTML(source,state) {
  const s=publicState(state);
  const serialized=JSON.stringify(s).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return source.replace(/<html([^>]*)>/i, (match,attrs)=>'<html'+attrs+' data-theme="'+s.active+'">')
    .replace('</head>','<script>window.__LF_SEASONAL__='+serialized+';<\/script></head>');
}
function registerSeasonalThemeRoutes(app) {
  app.get('/api/seasonal-theme',async(req,res)=>{
    try { res.set('Cache-Control','no-store');res.json({ok:true,...publicState(await readState())}); }
    catch(err){res.status(503).json({ok:false,message:'تعذر قراءة الثيم النشط'});}
  });
  app.get('/api/admin/seasonal-theme',requireAdmin,async(req,res)=>{
    try { res.set('Cache-Control','no-store');res.json({ok:true,...publicState(await readState())}); }
    catch(err){res.status(503).json({ok:false,message:'تعذر تحميل الثيمات'});} 
  });
  app.put('/api/admin/seasonal-theme',requireAdmin,async(req,res)=>{
    try {
      const state=normalize(req.body);
      await db(`INSERT INTO settings(key,value) VALUES($1,$2::jsonb)
        ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        ['seasonal_theme_config',JSON.stringify(state)]);
      res.set('Cache-Control','no-store');
      res.json({ok:true,...publicState(state)});
    }catch(error){res.status(error.status||500).json({ok:false,message:error.status?error.message:'تعذر حفظ الثيم'});}
  });
  // Server-rendered theme attribute prevents a flash of the default theme.
  app.get(['/', '/index.html'],async(req,res,next)=>{
    try {
      const file=path.join(__dirname,'../../frontend/index.html');
      const html=fs.readFileSync(file,'utf8');
      const state=await readState();
      res.type('html').set('Cache-Control','no-store').send(renderHomeHTML(html,state));
    }catch(error){next(error);}
  });
}
module.exports={THEME_IDS,LABELS,GREETINGS,normalize,safeState,publicState,targetNewYear,renderHomeHTML,registerSeasonalThemeRoutes};
