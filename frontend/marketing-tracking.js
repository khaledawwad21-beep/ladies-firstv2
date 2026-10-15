/* First-party, opt-in measurement. No names, phones, search text, IPs or body metrics are sent. */
(function(){
 'use strict';
 const key='lf_marketing_consent_v1';let allowed=false,queue=Promise.resolve(),epoch=0;
 const params=new URLSearchParams(location.search),sources=['facebook','instagram','tiktok','snapchat','whatsapp'];
 const aliases={fb:'facebook',ig:'instagram',tt:'tiktok',snap:'snapchat'};
 const raw=(params.get('utm_source')||'').toLowerCase(),source=sources.includes(raw)?raw:(aliases[raw]||'direct');
 const medium=['paid','cpc','paid_social'].includes((params.get('utm_medium')||'').toLowerCase())?'paid':(params.has('utm_source')?'organic':'unknown');
 const campaign=(params.get('utm_campaign')||'').match(/^lf-(\d+)$/);
 const context={source:raw&&!sources.includes(raw)&&!aliases[raw]?'other':source,medium,campaign_id:campaign?Number(campaign[1]):null};
 try{allowed=sessionStorage.getItem(key)==='yes'}catch{}
 function track(event,product_id){
  if(!allowed)return;
  const at=epoch;
  queue=queue.catch(()=>{}).then(async()=>{if(!allowed||at!==epoch)return;try{await fetch('/api/marketing/events',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...context,consent:true,event,product_id:product_id||null}),keepalive:true})}catch{}});
 }
 function choose(yes){
  allowed=yes;epoch++;try{sessionStorage.setItem(key,yes?'yes':'no')}catch{}
  document.getElementById('lfMeasurementChoice')?.remove();
  if(yes){track('visit');const m=location.hash.match(/^#product-(\d+)$/);if(m)track('product_view',Number(m[1]))}
  else{queue=queue.catch(()=>{}).then(()=>fetch('/api/marketing/consent',{method:'DELETE',credentials:'same-origin',keepalive:true})).catch(()=>{})}
 }
 function preferences(){
  document.getElementById('lfMeasurementChoice')?.remove();
  const box=document.createElement('section');box.id='lfMeasurementChoice';box.setAttribute('aria-label','خصوصية قياس الزيارات');box.setAttribute('role','region');
  box.style.cssText='position:fixed;bottom:78px;left:10px;right:10px;max-width:360px;margin:auto;z-index:900;background:#fffaf6;color:#44233f;padding:14px;border:1px solid #d8bdcf;border-radius:16px;box-shadow:0 6px 25px #44233f26;font:14px/1.6 sans-serif;direction:rtl';
  box.innerHTML='<strong>خصوصية الزيارات</strong><p style="margin:6px 0">هل تسمحين بقياس مشاهدة المنتجات والسلة ومصدر الزيارة لتحسين المتجر والإعلانات؟ القياس داخل المتجر فقط، بلا بيانات تواصل أو إرسال للمنصات. بيانات القياس تُحذف بعد 90 يومًا، والرفض لا يؤثر على الشراء.</p><div style="display:flex;gap:8px"><button type="button" data-measure="yes">أوافق</button><button type="button" data-measure="no">لا، شكرًا</button></div>';
  box.querySelectorAll('button').forEach(b=>{b.style.cssText='border:1px solid #63345e;border-radius:9px;padding:9px 14px;background:#fff;color:#63345e;cursor:pointer';b.onclick=()=>choose(b.dataset.measure==='yes')});document.body.appendChild(box);
 }
 window.LFMarketing={track,preferences};
 function ready(){
  const footer=document.querySelector('footer')||document.body;
  const b=document.createElement('button');b.type='button';b.textContent='إعدادات قياس الزيارات';b.style.cssText='display:block;margin:12px auto;border:0;background:transparent;color:#63345e;text-decoration:underline;font:inherit;font-size:12px;cursor:pointer';b.onclick=preferences;footer.appendChild(b);
  let decided=false;try{decided=['yes','no'].includes(sessionStorage.getItem(key))}catch{decided=true}
  if(!decided)preferences();if(allowed)track('visit');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
