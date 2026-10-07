'use strict';
const crypto = require('node:crypto');
const PUBLIC_SETTINGS = new Set([
  'store_name','store_logo','store_description','currency','whatsapp_number','whatsapp',
  'cats','brands','hero','hero_slides','hero_text_style','social_links','social',
  'packaging_options','visa_discount_percent','shipping_fee','shipping_fees','shipping_discount_percentages',
  'loyalty_enabled','loyalty_redeem_enabled','loyalty_point_value','loyalty_points_per_currency',
  'loyalty_earning_mode','loyalty_points_per_order','return_policy','privacy_policy'
]);
const PRIVATE_COST_FIELDS = new Set(['cost_price','costPrice','purchase_price','purchasePrice','returned_cost_value']);
function publicResponse(value) {
  if(Array.isArray(value))return value.map(publicResponse);
  if(value && typeof value==='object' && !(value instanceof Date))return Object.fromEntries(Object.entries(value).filter(([key])=>!PRIVATE_COST_FIELDS.has(key)).map(([key,v])=>[key,publicResponse(v)]));
  return value;
}
function safeImageUrl(value) {
  return typeof value==='string' && !/[<>"'\\\x00-\x20]/.test(value) && (/^https?:\/\//i.test(value)||/^\/(?!\/)/.test(value)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
}
function createSecurityPolicy({now=Date.now,limit=30,windowMs=15*60*1000}={}) {
  const attempts=new Map();
  return function securityPolicy(req,res,next) {
    if(req.securityPolicyApplied)return next();
    req.securityPolicyApplied=true;
    res.set({'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
      'Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(self), microphone=(self), geolocation=(self)',
      'Content-Security-Policy':"object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
    res.removeHeader('X-Powered-By');
    if(req.secure)res.set('Strict-Transport-Security','max-age=31536000');
    const path=req.path.toLowerCase();
    if(!path.startsWith('/api/'))return next();
    res.set('Cache-Control','no-store');
    if(/^\/api\/(products|store|orders|returns|public)(?:\/|$)/.test(path)){
      const json=res.json;
      res.json=function(value){return json.call(this,publicResponse(value));};
    }
    const origin=req.get('origin');
    const own=`${req.protocol}://${req.get('host')}`;
    const allowed=new Set([own,...String(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
    if(origin && !allowed.has(origin))return res.status(403).json({ok:false,code:'ORIGIN_DENIED',message:'مصدر الطلب غير مسموح'});
    if(origin){res.set('Access-Control-Allow-Origin',origin);res.vary('Origin');}
    if(req.method==='OPTIONS'){
      res.set('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.set('Access-Control-Allow-Headers','Content-Type,Authorization,X-Bootstrap-Token');
      return res.sendStatus(204);
    }
    if(req.method==='POST' && (path.startsWith('/api/auth/')||path.startsWith('/api/passkeys/')||path==='/api/waitlist'||path==='/api/orders')) {
      const timestamp=now();
      if(attempts.size>10000)for(const [key,value] of attempts)if(value.until<=timestamp)attempts.delete(key);
      const key=(req.ip||req.socket.remoteAddress||'unknown')+':'+path;
      let counter=attempts.get(key);
      if(!counter||counter.until<=timestamp){
        if(attempts.size>=20000)return res.status(429).json({ok:false,message:'حاول لاحقاً'});
        counter={n:0,until:timestamp+windowMs};attempts.set(key,counter);
      }
      counter.n++;
      if(counter.n>limit){res.set('Retry-After',String(Math.ceil((counter.until-timestamp)/1000)));return res.status(429).json({ok:false,code:'RATE_LIMITED',message:'محاولات كثيرة، حاول لاحقاً'});}
    }
    if(path==='/api/auth/bootstrap-owner'&&req.method==='POST'&&process.env.NODE_ENV==='production'){
      const expected=String(process.env.BOOTSTRAP_TOKEN||'');const supplied=String(req.get('x-bootstrap-token')||'');
      if(expected.length<32||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))
        return res.status(403).json({ok:false,code:'SETUP_LOCKED',message:'إنشاء المالك مقفل؛ يلزم رمز الإعداد الخاص بالخادم'});
    }
    return next();
  };
}
module.exports={PUBLIC_SETTINGS,createSecurityPolicy,safeImageUrl};
