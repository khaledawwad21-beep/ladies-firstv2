'use strict';
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveFrontendPath } = require('./safe-frontend-path');
function dayKey(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year:'numeric', month:'2-digit', day:'2-digit' }).format(now); }
function selection(value) {
  if (!Array.isArray(value) || !value.length || value.length > 5) throw new Error('اختاري من قطعة إلى خمس قطع متناسقة للإطلالة.');
  const seen = new Set();
  return value.map(v => {
    const id = Number(v.productId), imageIndex = Number(v.imageIndex ?? 0);
    if (!Number.isSafeInteger(id) || id < 1 || seen.has(id) || !Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex > 30) throw new Error('راجعي القطع والصور المختارة.');
    seen.add(id); return { productId:id, imageIndex };
  });
}
function measurements(body) {
  const value=body?.measurements;
  if(value==null)return null;
  if(body.measurementsConsent!==true)throw new Error('المقاسات تحتاج موافقتك قبل إرسالها لخدمة توليد الصور.');
  if(typeof value!=='object'||Array.isArray(value))throw new Error('راجعي المقاسات المدخلة.');
  const limits={height:[120,220],weight:[30,250],bust:[60,180],waist:[50,170],hips:[60,190]},result={};
  for(const [key,[min,max]] of Object.entries(limits)){
    if(value[key]==null||value[key]==='')continue;
    const number=Number(value[key]);
    if(!Number.isFinite(number)||number<min||number>max)throw new Error('راجعي المقاسات المدخلة.');
    result[key]=Math.round(number*10)/10;
  }
  if(!Object.keys(result).length)throw new Error('أدخلي مقاسًا واحدًا على الأقل أو اتركي المقاسات فارغة.');
  return result;
}
function measurementPrompt(profile){return profile?' Approximate the adult body proportions using these customer-provided measurements: '+JSON.stringify(profile)+' (height, bust, waist, hips in cm; weight in kg). Preserve Naya facial identity and hair while adjusting only body proportions. These are visual cues, not a precise body scan or garment-fit prediction. Avoid exaggerated proportions.':'';}
function imageType(bytes) {
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp';
  throw new Error('صيغة الصورة غير مدعومة.');
}
async function readImage(url, { db, frontendRoot }) {
  let bytes;
  if (typeof url !== 'string') throw new Error('صورة المنتج غير متاحة.');
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (match) { if(match[1].length>12*1024*1024) throw new Error('الصورة كبيرة جدًا.'); bytes = Buffer.from(match[1], 'base64'); }
  else if (/^\/api\/images\/[a-zA-Z0-9-]+$/.test(url)) {
    const r = await db('SELECT data FROM uploaded_images WHERE id=$1',[url.split('/').pop()]); bytes = r.rows[0]?.data;
  } else {
    // Never fetch arbitrary URLs or read non-image project files.
    if (/^[a-z]+:|^\/\//i.test(url)) throw new Error('ارفعي صورة المنتج إلى المتجر قبل تجربة الإطلالة.');
    const p = resolveFrontendPath(frontendRoot, '/' + url.replace(/^\//,''));
    if (!p || !/\.(png|jpe?g|webp)$/i.test(p)) throw new Error('صورة غير صالحة.');
    const real = await fs.realpath(p), root = await fs.realpath(frontendRoot);
    if (!real.startsWith(root + path.sep)) throw new Error('صورة غير صالحة.');
    const stat = await fs.stat(real); if (stat.size > 8*1024*1024) throw new Error('الصورة كبيرة؛ اختاري صورة أصغر.');
    bytes = await fs.readFile(real);
  }
  if (!bytes || !bytes.length || bytes.length > 8*1024*1024) throw new Error('صورة غير متاحة أو كبيرة جدًا.');
  bytes=Buffer.from(bytes); return { bytes, mime:imageType(bytes) };
}
function createOutfitRouter({ db, transaction, requireAuth, env=process.env, fetchImpl=fetch, frontendRoot=path.resolve(__dirname,'../../frontend') }) {
  const router=express.Router();
  const enabled=()=>env.NAYA_OUTFIT_ENABLED==='true' && !!env.OPENAI_API_KEY;
  router.get('/status', requireAuth, async(req,res,next)=>{try{
    const day=dayKey(); const r=await db('SELECT state,error_message FROM naya_outfit_daily WHERE user_id=$1 AND usage_day=$2',[req.user.id,day]);
    const row=r.rows[0]; res.json({ok:true,enabled:enabled(),day,state:row?.state||'available',message:row?.error_message||'',remaining:row?.state==='complete'||row?.state==='pending'?0:1,imageUrl:row?.state==='complete'?'/api/ai/outfit/image?day='+day:null});
  }catch(e){next(e)}});
  router.get('/image',requireAuth,async(req,res,next)=>{try{
    const day=String(req.query.day||dayKey());if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return res.sendStatus(400);
    const r=await db("SELECT image FROM naya_outfit_daily WHERE user_id=$1 AND usage_day=$2 AND state='complete'",[req.user.id,day]);
    if(!r.rows[0]?.image)return res.sendStatus(404);res.type('png').send(Buffer.from(r.rows[0].image));
  }catch(e){next(e)}});
  router.post('/generate',requireAuth,async(req,res,next)=>{
    if(!enabled())return res.status(503).json({ok:false,message:'توليد الإطلالة لم يُفعّل بعد؛ يمكنك تجهيز اختياراتك.'});
    let chosen,profile;try{chosen=selection(req.body?.items);profile=measurements(req.body)}catch(e){return res.status(400).json({ok:false,message:e.message})}
    try{
      const r=await db(`SELECT p.id,p.name,COALESCE((SELECT json_agg(image_url ORDER BY is_primary DESC,sort_order,id) FROM product_images WHERE product_id=p.id),'[]'::json) AS images,p.image_url,p.image FROM products p WHERE p.id=ANY($1::bigint[]) AND p.is_active=TRUE`,[chosen.map(x=>x.productId)]);
      const inputs=[];const names=[];
      // Reference is a fixed server-controlled asset, never a customer-supplied file path.
      inputs.push(await readImage('/naya-fullbody-clean.png',{db,frontendRoot}));
      for(const item of chosen){const p=r.rows.find(x=>Number(x.id)===item.productId);if(!p)throw new Error('إحدى القطع لم تعد متاحة.');const images=p.images?.length?p.images:[p.image_url||p.image].filter(Boolean);if(!images[item.imageIndex])throw new Error('صورة إحدى القطع غير متاحة.');inputs.push(await readImage(images[item.imageIndex],{db,frontendRoot}));names.push(p.name)}
      const day=dayKey(),month=day.slice(0,7),job=crypto.randomUUID();
      const cap=Math.max(1,Math.min(10000,Math.floor(Number(env.NAYA_OUTFIT_MONTHLY_LIMIT))||100));
      const accepted=await transaction(async client=>{
        await client.query("INSERT INTO naya_outfit_daily(user_id,usage_day,state) VALUES($1,$2,'available') ON CONFLICT DO NOTHING",[req.user.id,day]);
        const current=await client.query('SELECT state FROM naya_outfit_daily WHERE user_id=$1 AND usage_day=$2 FOR UPDATE',[req.user.id,day]);
        if(['pending','complete'].includes(current.rows[0].state))return false;
        const budget=await client.query(`INSERT INTO naya_outfit_budget(month,attempts) VALUES($1,1) ON CONFLICT(month) DO UPDATE SET attempts=naya_outfit_budget.attempts+1 WHERE naya_outfit_budget.attempts<$2 RETURNING attempts`,[month,cap]);
        if(!budget.rows.length)throw new Error('وصلنا لحد التجارب الشهري؛ جربي لاحقًا.');
        await client.query("UPDATE naya_outfit_daily SET state='pending',job_id=$3,selection=$4,error_message=NULL,updated_at=NOW() WHERE user_id=$1 AND usage_day=$2",[req.user.id,day,job,JSON.stringify(chosen)]);return true;
      });
      if(!accepted)return res.status(409).json({ok:false,message:'صورتك قيد التجهيز أو استخدمتِ صورتك المجانية اليوم. افتحي الإطلالة لرؤية النتيجة.'});
      res.status(202).json({ok:true,state:'pending',day});
      // No automatic provider retries: a duplicate request can incur another image charge.
      (async()=>{
        try{
          const form=new FormData();form.set('model',env.NAYA_IMAGE_MODEL||'gpt-image-1.5');form.set('n','1');form.set('size','1024x1536');form.set('quality','medium');
          form.set('prompt','Create one photorealistic full-body fashion try-on image. Image 1 is the adult Naya identity reference: preserve her face, hair and identity; keep reference body proportions unless measurements are provided. Subsequent images are the selected actual store products in this order: '+names.join(', ')+'. Combine the selected garments and accessories into ONE coherent wearable outfit. Preserve each product color, pattern, cut, proportions and visible details. Do not invent products, change logos, or present this as a measurement guarantee. Neutral elegant studio background, natural skin, realistic hair and hands. No captions, grids or multiple people.'+measurementPrompt(profile));
          inputs.forEach((input,i)=>form.append('image[]',new Blob([input.bytes],{type:input.mime}),'input-'+i+(input.mime==='image/png'?'.png':input.mime==='image/jpeg'?'.jpg':'.webp')));
          const response=await fetchImpl('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(180000)});
          if(!response.ok)throw new Error('PROVIDER_FAILED');const output=await response.json();const b64=output.data?.[0]?.b64_json;
          if(!b64||b64.length>30*1024*1024)throw new Error('INVALID_OUTPUT');const bytes=Buffer.from(b64,'base64');if(imageType(bytes)!=='image/png')throw new Error('INVALID_OUTPUT');
          await db("UPDATE naya_outfit_daily SET state='complete',image=$4,updated_at=NOW() WHERE user_id=$1 AND usage_day=$2 AND job_id=$3 AND state='pending'",[req.user.id,day,job,bytes]);
        }catch(error){console.error('[NAYA OUTFIT] generation failed',error.name);await db("UPDATE naya_outfit_daily SET state='failed',error_message=$4,updated_at=NOW() WHERE user_id=$1 AND usage_day=$2 AND job_id=$3 AND state='pending'",[req.user.id,day,job,'تعذر تجهيز الصورة. لم تُحتسب حصتك اليومية؛ يمكنك المحاولة مجددًا.']).catch(()=>{});}
      })();
    }catch(e){if(/قطعة|القطع|صورة|الصورة|الإطلالة|تجارب|ارفعي|صيغة/.test(e.message))return res.status(400).json({ok:false,message:e.message});next(e)}
  });return router;
}
module.exports={createOutfitRouter,selection,dayKey,readImage,imageType,measurements,measurementPrompt};
