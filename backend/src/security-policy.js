'use strict';
const crypto = require('node:crypto');
const PUBLIC_SETTINGS = new Set([
  'store_name','store_logo','store_description','currency','whatsapp_number','whatsapp',
  'cats','brands','hero','hero_slides','hero_text_style','feature_carousels','social_links','social',
  'packaging_options','visa_discount_percent','gift_card_price','gift_card_free_threshold','shipping_fee','shipping_fees','shipping_discount_percentages',
  'loyalty_enabled','loyalty_redeem_enabled','loyalty_point_value','loyalty_points_per_currency',
  'loyalty_earning_mode','loyalty_points_per_order','return_policy','privacy_policy',
  'storefront_general_message','maintenance_mode','maintenance_message'
]);
const PRIVATE_COST_FIELDS = new Set(['cost_price','costPrice','purchase_price','purchasePrice','returned_cost_value']);
const { createPersistentRateLimiter } = require("./persistent-rate-limit");
function publicResponse(value) {
  if(Array.isArray(value))return value.map(publicResponse);
  if(value && typeof value==='object' && !(value instanceof Date))return Object.fromEntries(Object.entries(value).filter(([key])=>!PRIVATE_COST_FIELDS.has(key)).map(([key,v])=>[key,publicResponse(v)]));
  return value;
}
function safeImageUrl(value) {
  return typeof value==='string' && !/[<>"'\\\x00-\x20]/.test(value) && (/^https?:\/\//i.test(value)||/^\/(?!\/)/.test(value)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
}
function createSecurityPolicy({now=Date.now,limit=30,windowMs=15*60*1000,db,env=process.env}={}) {
  const query=db||require("./db").db;
  const checkRateLimit=createPersistentRateLimiter({db:query,secret:env.RATE_LIMIT_SECRET||env.JWT_SECRET,now});
  return async function securityPolicy(req,res,next) {
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
    if(req.method==='POST' && (path.startsWith('/api/auth/')||path.startsWith('/api/passkeys/')||path==='/api/waitlist'||path==='/api/orders'||path==='/api/orders/track')) {
      let result;
      try {
        result=await checkRateLimit({
          scope:'http:'+path,
          clientId:req.ip||req.socket.remoteAddress||'unknown',
          limit,
          windowMs
        });
      } catch(error) {
        console.error('[RATE LIMIT] Persistent counter unavailable:',error.message);
        return res.status(503).json({ok:false,code:'RATE_LIMIT_UNAVAILABLE',message:'الخدمة غير متاحة مؤقتًا. جربي بعد قليل.'});
      }
      if(!result.allowed){
        res.set('Retry-After',String(result.retryAfterSeconds));
        return res.status(429).json({ok:false,code:'RATE_LIMITED',message:'محاولات كثيرة، حاول لاحقاً'});
      }
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
