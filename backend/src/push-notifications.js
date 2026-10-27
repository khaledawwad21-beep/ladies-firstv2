'use strict';
const crypto=require('node:crypto'),jwt=require('jsonwebtoken');
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function fail(status,message){throw Object.assign(new Error(message),{status});}
function encrypt(value,secret){const iv=crypto.randomBytes(12),key=crypto.createHash('sha256').update(secret).digest(),c=crypto.createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(value,'utf8'),c.final(),c.getAuthTag()]).toString('base64');}
function decrypt(value,secret){const bytes=Buffer.from(value,'base64'),d=crypto.createDecipheriv('aes-256-gcm',crypto.createHash('sha256').update(secret).digest(),bytes.subarray(0,12));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(12,-16)),d.final()]).toString('utf8');}
function credentials(env){try{const c=JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON||'{}');return c.project_id&&c.client_email&&c.private_key?c:null;}catch{return null;}}
function publicConfig(env){let c={};try{c=JSON.parse(env.FIREBASE_PUBLIC_CONFIG||'{}');}catch{}return Object.fromEntries(['apiKey','projectId','messagingSenderId','appIdAndroid','appIdIos','iosBundleId'].filter(k=>typeof c[k]==='string').map(k=>[k,c[k]]));}
function validCampaign(b){
 const title=String(b.title||'').trim(),body=String(b.body||'').trim(),path=String(b.path||'/');
 if(!title||title.length>80||!body||body.length>300)fail(400,'العنوان مطلوب حتى 80 حرفًا والنص حتى 300 حرف');
 if(!/^\/(?:$|[?#])/.test(path)||/[\x00-\x20\\]/.test(path)||path.length>600)fail(400,'اختر رابطًا داخليًا صالحًا');
 let image=String(b.image||'');if(image){try{const u=new URL(image);if(u.protocol!=='https:'||u.username||u.password||image.length>2048)throw Error();}catch{fail(400,'رابط صورة الإشعار يجب أن يكون HTTPS');}}
 const audience=b.audience??'all';if(!['all','users','category','self'].includes(audience))fail(400,'الجمهور غير صالح');
 const userIds=Array.isArray(b.userIds)?[...new Set(b.userIds.map(Number))]:[];
 if(userIds.some(x=>!Number.isSafeInteger(x)||x<1)||userIds.length>100||audience==='users'&&!userIds.length)fail(400,'حدد الحسابات المستهدفة');
 const category=String(b.category||'').trim().slice(0,120);if(audience==='category'&&!category)fail(400,'اختر الفئة المستهدفة');
 const at=b.scheduledAt?new Date(b.scheduledAt):new Date();if(!Number.isFinite(at.getTime())||at>Date.now()+90*86400000)fail(400,'موعد الإرسال غير صالح');
 return {title,body,path,image,audience,userIds,category,scheduledAt:at.toISOString()};
}
async function initPushNotifications(db){
 await db(`CREATE TABLE IF NOT EXISTS push_devices(id UUID PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,installation_hash TEXT NOT NULL UNIQUE,token_hash TEXT NOT NULL UNIQUE,token_cipher TEXT NOT NULL,platform TEXT NOT NULL,interests JSONB NOT NULL DEFAULT '[]',enabled BOOLEAN NOT NULL DEFAULT TRUE,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE TABLE IF NOT EXISTS push_campaigns(id UUID PRIMARY KEY,owner_id BIGINT NOT NULL REFERENCES users(id),payload JSONB NOT NULL,state TEXT NOT NULL DEFAULT 'draft',scheduled_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db(`CREATE TABLE IF NOT EXISTS push_deliveries(campaign_id UUID NOT NULL REFERENCES push_campaigns(id),device_id UUID NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,state TEXT NOT NULL DEFAULT 'pending',provider_id TEXT,error TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(campaign_id,device_id))`);
 await db('CREATE INDEX IF NOT EXISTS push_campaigns_due ON push_campaigns(state,scheduled_at)');
}
function createPushNotifications({db,transaction,env=process.env,fetchImpl=global.fetch}){
 let accessToken=null,expires=0,busy=false;
 async function token(){if(accessToken&&Date.now()<expires)return accessToken;const c=credentials(env);if(!c)fail(503,'Firebase غير مربوط بالخادم');
  const now=Math.floor(Date.now()/1000),assertion=jwt.sign({iss:c.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},c.private_key,{algorithm:'RS256'});
  const r=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString(),signal:AbortSignal.timeout(15000)});
  if(!r.ok)fail(503,'تعذر التحقق من إعداد Firebase');const d=await r.json();if(!d.access_token)fail(503,'تعذر اعتماد خدمة الإشعارات');accessToken=d.access_token;expires=Date.now()+Math.min(Number(d.expires_in)||3600,3600)*1000-60000;return accessToken;
 }
 async function send(payload,device,campaignId){
  const c=credentials(env),registrationToken=decrypt(device.token_cipher,env.JWT_SECRET||'');
  const message={token:registrationToken,notification:{title:payload.title,body:payload.body,...(payload.image?{image:payload.image}:{})},data:{path:payload.path,campaignId},android:{priority:'normal',notification:{tag:campaignId}},apns:{headers:{'apns-collapse-id':campaignId},payload:{aps:{sound:'default'}},...(payload.image?{fcm_options:{image:payload.image}}:{})}};
  const r=await fetchImpl('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(c.project_id)+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({message}),signal:AbortSignal.timeout(15000)});
  const body=await r.json().catch(()=>({}));if(!r.ok){if(body.error?.details?.some(x=>x.errorCode==='UNREGISTERED'))await db('UPDATE push_devices SET enabled=FALSE WHERE id=$1',[device.id]);if(r.status===401){accessToken=null;expires=0;}throw Object.assign(Error('provider_rejected'),{providerRejected:true});}return String(body.name||'accepted');
 }
 async function run(){if(busy||!credentials(env))return;busy=true;try{
  // An interrupted send has an unknown outcome. Never automatically resend it.
  await db("UPDATE push_deliveries SET state='unknown',error='interrupted',updated_at=NOW() WHERE state='sending' AND updated_at<NOW()-interval '10 minutes'");
  const campaign=await transaction(async client=>{const r=await client.query("SELECT * FROM push_campaigns WHERE state IN ('queued','sending') AND scheduled_at<=NOW() ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 1");const c=r.rows[0];if(!c)return null;
   if(c.state==='queued'){
    const p=c.payload;const ids=p.audience==='self'?[Number(c.owner_id)]:p.userIds;
    await client.query(`INSERT INTO push_deliveries(campaign_id,device_id) SELECT $1,d.id FROM push_devices d JOIN users u ON u.id=d.user_id WHERE d.enabled=TRUE AND u.is_active=TRUE AND ($2='all' OR $2 IN ('users','self') AND d.user_id=ANY($3::bigint[]) OR $2='category' AND d.interests ? $4) ON CONFLICT DO NOTHING`,[c.id,p.audience,ids,p.category]);
    await client.query("UPDATE push_campaigns SET state='sending' WHERE id=$1",[c.id]);
   }return c;
  });if(!campaign)return;
  const jobs=await transaction(async client=>{const r=await client.query("SELECT device_id FROM push_deliveries WHERE campaign_id=$1 AND state='pending' ORDER BY device_id FOR UPDATE SKIP LOCKED LIMIT 20",[campaign.id]);for(const x of r.rows)await client.query("UPDATE push_deliveries SET state='sending',updated_at=NOW() WHERE campaign_id=$1 AND device_id=$2",[campaign.id,x.device_id]);return r.rows;});
  for(const job of jobs){const device=(await db('SELECT * FROM push_devices WHERE id=$1 AND enabled=TRUE',[job.device_id])).rows[0];if(!device){await db("UPDATE push_deliveries SET state='skipped' WHERE campaign_id=$1 AND device_id=$2",[campaign.id,job.device_id]);continue;}
   try{const name=await send(campaign.payload,device,campaign.id);await db("UPDATE push_deliveries SET state='sent',provider_id=$1,updated_at=NOW() WHERE campaign_id=$2 AND device_id=$3",[name,campaign.id,device.id]);}
   catch(e){await db("UPDATE push_deliveries SET state=$1,error=$2,updated_at=NOW() WHERE campaign_id=$3 AND device_id=$4",[e.providerRejected?'failed':'unknown',e.providerRejected?'provider_rejected':'delivery_unknown',campaign.id,device.id]);}
  }
  await db("UPDATE push_campaigns SET state='complete' WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM push_deliveries WHERE campaign_id=$1 AND state IN ('pending','sending'))",[campaign.id]);
 }finally{busy=false;}}
 function register(app,{requireAuth,requireOwner}){
  const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  app.get('/api/push/config',(_req,res)=>res.json({ok:true,configured:!!credentials(env),firebase:publicConfig(env)}));
  const limiter=require('./persistent-rate-limit').createPersistentRateLimiter({db,secret:env.JWT_SECRET});
  app.put('/api/push/device',requireAuth,wrap(async(req,res)=>{
   const b=req.body||{},t=String(b.token||''),secret=String(b.installation||'');if(!/^[A-Za-z0-9_:.-]{20,4096}$/.test(t)||!/^\w{32,100}$/.test(secret)||!['android','ios'].includes(b.platform)||b.consent!==true)fail(400,'يلزم موافقة على الإشعارات وبيانات جهاز صالحة');
   const limit=await limiter({scope:'push-device',clientId:String(req.user.id),limit:30,windowMs:3600000});if(!limit.allowed)fail(429,'محاولات كثيرة لتسجيل الجهاز');
   const interests=Array.isArray(b.interests)?[...new Set(b.interests.map(x=>String(x).slice(0,120)))].slice(0,20):[];
   await transaction(async client=>{await client.query("UPDATE push_devices SET enabled=FALSE,token_hash=id::text,installation_hash=id::text,token_cipher='' WHERE (token_hash=$1 AND installation_hash<>$2) OR (installation_hash=$2 AND user_id<>$3)",[hash(t),hash(secret),req.user.id]);await client.query(`INSERT INTO push_devices(id,user_id,installation_hash,token_hash,token_cipher,platform,interests) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(installation_hash) DO UPDATE SET user_id=EXCLUDED.user_id,token_hash=EXCLUDED.token_hash,token_cipher=EXCLUDED.token_cipher,platform=EXCLUDED.platform,interests=EXCLUDED.interests,enabled=TRUE,updated_at=NOW()`,[crypto.randomUUID(),req.user.id,hash(secret),hash(t),encrypt(t,env.JWT_SECRET||''),b.platform,JSON.stringify(interests)]);});res.json({ok:true});
  }));
  app.delete('/api/push/device',wrap(async(req,res)=>{const secret=String(req.body?.installation||'');if(!/^\w{32,100}$/.test(secret))fail(400,'بيانات الجهاز غير صالحة');await db('UPDATE push_devices SET enabled=FALSE,updated_at=NOW() WHERE installation_hash=$1',[hash(secret)]);res.json({ok:true});}));
  app.get('/api/admin/push',requireOwner,wrap(async(_req,res)=>{const campaigns=(await db(`SELECT c.id,c.payload,c.state,c.scheduled_at,c.created_at,COUNT(d.device_id)::int AS devices,COUNT(*) FILTER(WHERE d.state='sent')::int AS accepted,COUNT(*) FILTER(WHERE d.state='failed')::int AS failed,COUNT(*) FILTER(WHERE d.state='unknown')::int AS unknown FROM push_campaigns c LEFT JOIN push_deliveries d ON d.campaign_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 50`)).rows;
   const devices=(await db('SELECT platform,COUNT(*)::int AS count FROM push_devices WHERE enabled=TRUE GROUP BY platform')).rows;res.json({ok:true,configured:!!credentials(env),mobileConfigured:!!publicConfig(env).appIdAndroid,campaigns,devices});}));
  app.post('/api/admin/push',requireOwner,wrap(async(req,res)=>{const payload=validCampaign(req.body||{}),id=crypto.randomUUID();await db('INSERT INTO push_campaigns(id,owner_id,payload,scheduled_at) VALUES($1,$2,$3::jsonb,$4)',[id,req.user.id,JSON.stringify(payload),payload.scheduledAt]);res.json({ok:true,id,state:'draft'});}));
  app.post('/api/admin/push/:id/send',requireOwner,wrap(async(req,res)=>{if(!credentials(env))fail(503,'جهّز Firebase قبل إرسال الإشعارات');if(req.body?.confirm!==true)fail(400,'اعتمد الإرسال بعد مراجعة الرسالة والجمهور');const r=await db("UPDATE push_campaigns SET state='queued' WHERE id=$1 AND state='draft' RETURNING id",[req.params.id]);if(!r.rows.length)fail(409,'الحملة أُرسلت أو غير موجودة');res.json({ok:true,state:'queued'});run().catch(()=>{});}));
  app.post('/api/admin/push/:id/cancel',requireOwner,wrap(async(req,res)=>{const r=await db("UPDATE push_campaigns SET state='cancelled' WHERE id=$1 AND state IN ('draft','queued') RETURNING id",[req.params.id]);if(!r.rows.length)fail(409,'يمكن إلغاء المسودة أو الحملة المنتظرة فقط');res.json({ok:true});}));
  app.post('/api/internal/push/tick',wrap(async(req,res)=>{const key=String(env.PUSH_CRON_SECRET||''),got=String(req.headers['x-push-cron-secret']||'');if(key.length<24||got.length!==key.length||!crypto.timingSafeEqual(Buffer.from(key),Buffer.from(got)))fail(403,'غير مسموح');await run();res.json({ok:true});}));
 }
 function start(){const timer=setInterval(()=>run().catch(()=>{}),30000);timer.unref();run().catch(()=>{});return ()=>clearInterval(timer);}
 return {register,run,start};
}
module.exports={initPushNotifications,createPushNotifications,validCampaign,encrypt,decrypt};
