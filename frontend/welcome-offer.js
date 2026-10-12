/* Configurable welcome campaign popup. */
(() => {
  'use strict';
  const COOLDOWN_MS=24*60*60*1000;
  const money=v=>`${Number(v).toLocaleString('en-US',{maximumFractionDigits:2})} ₪`;
  const productList=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const stock=p=>{try{return typeof totalStock==='function'?totalStock(p):Number(p?.stock)||0}catch{return 0}};
  const image=p=>{try{const a=typeof mainImagesOf==='function'?mainImagesOf(p):[];if(a?.[0])return a[0]}catch{}return p?.imageUrl||p?.image||p?.images?.[0]||''};
  function makePopup(config,items){
    if(document.getElementById('lfWelcomeOffer')||!items.length)return;
    const overlay=document.createElement('section');overlay.id='lfWelcomeOffer';overlay.className='lf-welcome-offer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','lfWelcomeOfferTitle');
    const backdrop=document.createElement('button');backdrop.className='lf-welcome-offer__backdrop';backdrop.type='button';backdrop.setAttribute('aria-label','إغلاق العرض');
    const card=document.createElement('div');card.className='lf-welcome-offer__card';
    const close=document.createElement('button');close.className='lf-welcome-offer__close';close.type='button';close.setAttribute('aria-label','إغلاق');close.textContent='×';
    const eyebrow=document.createElement('p');eyebrow.className='lf-welcome-offer__eyebrow';eyebrow.textContent='عرض خاص من Ladies First';
    const title=document.createElement('h2');title.id='lfWelcomeOfferTitle';title.textContent=config.headline||'عروض لفترة محدودة';
    const timer=document.createElement('div');timer.className='lf-welcome-offer__ticket';
    const timeValue=document.createElement('strong');const timeLabel=document.createElement('span');timeLabel.textContent='ينتهي العرض خلال';timer.append(timeValue,timeLabel);
    const list=document.createElement('div');list.style.cssText='display:grid;gap:9px;margin:14px 0';
    items.forEach(p=>{
      const row=document.createElement('div');row.className='lf-welcome-offer__product';
      const img=document.createElement('img');img.src=image(p);img.alt=String(p.name||'منتج من المتجر');img.loading='eager';
      const details=document.createElement('div');details.className='lf-welcome-offer__details';
      const name=document.createElement('strong');name.textContent=String(p.name||'قطعة مميزة');details.append(name);
      const price=Number(p.price)||0,oldPrice=Number(p.oldPrice??p.old_price)||0;
      if(price>0){const prices=document.createElement('div');prices.className='lf-welcome-offer__prices';if(oldPrice>price){const old=document.createElement('del');old.textContent=money(oldPrice);prices.append(old)}const now=document.createElement('b');now.textContent=money(price);prices.append(now);details.append(prices)}
      row.append(img,details);const open=document.createElement('button');open.type='button';open.className='lf-welcome-offer__primary';open.style.cssText='flex:0 0 auto;padding:0 12px;min-height:42px;border:0;border-radius:999px;cursor:pointer';open.textContent='شوفيه';open.addEventListener('click',()=>{dismiss();try{if(typeof window.openProduct==='function')window.openProduct(p.id)}catch{}});row.append(open);list.append(row);
    });
    const coupon=document.createElement('div');
    if(config.couponCode){coupon.className='lf-welcome-offer__coupon';const label=document.createElement('span');label.textContent='كود الخصم';const code=document.createElement('strong');code.textContent=String(config.couponCode);const copy=document.createElement('button');copy.type='button';copy.textContent='نسخ الكود';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(String(config.couponCode));copy.textContent='تم النسخ'}catch{copy.textContent=String(config.couponCode)}});coupon.append(label,code,copy)}
    const actions=document.createElement('div');actions.className='lf-welcome-offer__actions';const later=document.createElement('button');later.type='button';later.className='lf-welcome-offer__later';later.textContent='تصفّحي المتجر';actions.append(later);
    const note=document.createElement('p');note.className='lf-welcome-offer__note';note.textContent='الأسعار والكوبون يخضعان لشروط العرض.';
    card.append(close,eyebrow,title,timer,list,coupon,actions,note);overlay.append(backdrop,card);document.body.append(overlay);
    function dismiss(){overlay.classList.remove('is-open');document.body.classList.remove('lf-welcome-offer-open');window.setTimeout(()=>overlay.remove(),220)}
    close.addEventListener('click',dismiss);backdrop.addEventListener('click',dismiss);later.addEventListener('click',dismiss);overlay.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});
    const end=Date.parse(config.endAt);const update=()=>{const left=Math.max(0,end-Date.now());if(!left){dismiss();return false}const d=Math.floor(left/86400000),h=Math.floor(left%86400000/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);timeValue.textContent=[d?d+' يوم':'',[h,m,s].map(x=>String(x).padStart(2,'0')).join(':')].filter(Boolean).join(' · ');return true};
    const ticker=window.setInterval(()=>{if(!update())window.clearInterval(ticker)},1000);update();
    requestAnimationFrame(()=>{overlay.classList.add('is-open');document.body.classList.add('lf-welcome-offer-open');close.focus({preventScroll:true})});
  }
  let campaignPromise;
  function loadCampaign(){if(!campaignPromise)campaignPromise=fetch('/api/store/welcome-offer',{cache:'no-store'}).then(r=>r.json()).then(d=>d?.offer||null).catch(()=>null);return campaignPromise}
  async function tryShow(){
    const config=await loadCampaign();
    if(!config||config.enabled!==true||!config.startAt||!config.endAt)return false;
    const now=Date.now(),start=Date.parse(config.startAt),end=Date.parse(config.endAt);if(!Number.isFinite(start)||!Number.isFinite(end)||now<start||now>=end)return false;
    const key='lf_welcome_offer_seen_'+String(end),seen=Number(localStorage.getItem(key))||0;if(now-seen<COOLDOWN_MS)return false;
    const chosen=new Set((config.productIds||[]).map(Number)),items=productList().filter(p=>chosen.has(Number(p.id))&&stock(p)>0).slice(0,12);if(!items.length)return false;
    if(document.getElementById('nayaAssistant')?.classList.contains('open')||document.querySelector('.lf-idea-modal[aria-hidden="false"],.lfImageZoom.open'))return false;
    makePopup(config,items);localStorage.setItem(key,String(now));return true;
  }
  function start(){let attempts=0;const timer=window.setInterval(async()=>{attempts++;if(await tryShow()||attempts>=40)window.clearInterval(timer)},1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
