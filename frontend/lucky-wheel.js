(()=>{'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=(ar,en)=>document.documentElement.lang==='en'?en:ar;
 let campaign=null,dialog,entry,turn=0,spinning=false,focus;
 const api=(p,method='GET',body)=>lfFetch('/api/wheel'+p,{method,...(body?{body:JSON.stringify(body)}:{})});
 function status(v){dialog.querySelector('[data-wheel-status]').textContent=v;}
 function close(){if(spinning)return;dialog.close();focus?.focus();}
 async function show(){
  focus=document.activeElement;
  if(!dialog){dialog=document.createElement('dialog');dialog.className='lf-wheel-dialog';dialog.setAttribute('aria-labelledby','lfWheelTitle');document.body.append(dialog);dialog.addEventListener('cancel',e=>{if(spinning)e.preventDefault();});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});}
  if(!dialog.open)dialog.showModal();
  dialog.innerHTML='<button type="button" class="lf-wheel-close" aria-label="'+t('إغلاق','Close')+'">×</button><h2 id="lfWheelTitle">'+E(campaign?.name||t('جوائزي','My rewards'))+'</h2><div data-wheel-content></div><p data-wheel-status role="status" aria-live="polite"></p>';
  dialog.querySelector('.lf-wheel-close').onclick=close;
  const content=dialog.querySelector('[data-wheel-content]');
  if(!lfToken()){content.innerHTML='<p>'+t('سجّلي دخولك لتجرّبي حظك وتنحفظ جائزتك بحسابك.','Sign in to spin and save your reward to your account.')+'</p><button class="lf-wheel-action">'+t('تسجيل الدخول','Sign in')+'</button>';content.querySelector('button').onclick=()=>{close();if(typeof openAccount==='function')openAccount();};return;}
  status(t('جاري تحميل جوائزك…','Loading your rewards…'));
  try{
   const [fresh,mine]=await Promise.all([api(''),api('/mine')]);campaign=fresh.campaign;status('');
   content.innerHTML=(campaign?'<p>'+t(campaign.frequency==='daily'?'محاولة واحدة يوميًا بتوقيت فلسطين.':'محاولة واحدة خلال الحملة.',campaign.frequency==='daily'?'One spin per day, Palestine time.':'One spin during this campaign.')+'</p>'+LFWheelView.markup(campaign.prizes)+'<button class="lf-wheel-action" data-spin '+(mine.played?'disabled':'')+'>'+t(mine.played?'استخدمتِ محاولتك':'لفّي الدولاب',mine.played?'Already played':'Spin the wheel')+'</button><small>'+t('الخيارات: ','Options: ')+campaign.prizes.map(p=>E(p.label)).join(' · ')+'</small><small>'+t(campaign.oddsNotice,'Winning chances vary between options. Segment sizes do not represent odds. Rewards are subject to availability.')+'</small><small>'+t('الحد الأدنى للطلب: ','Minimum order: ')+Number(campaign.minimum).toFixed(2)+' ₪ · '+t('صلاحية الجائزة: ','Reward valid for: ')+campaign.validDays+t(' أيام. ',' days. ')+t(campaign.stackable?'يمكن الجمع مع خصم البطاقة والنقاط.':'لا تجمع مع خصم البطاقة والنقاط.',campaign.stackable?'Can combine with card and points discounts.':'Cannot combine with card and points discounts.')+'</small>':'<p>'+t('لا توجد حملة متاحة الآن. جوائزك السابقة محفوظة أدناه.','No active campaign. Your previous rewards are below.')+'</p>')+'<h3>'+t('جوائزك ومحاولاتك','Your rewards and spins')+'</h3><div data-wheel-rewards></div>';
   LFWheelView.hydrate(content);
   renderRewards(mine.rewards);
   const spin=content.querySelector('[data-spin]');if(spin)spin.onclick=async()=>{
    if(spinning)return;spinning=true;spin.disabled=true;status(t('الدولاب عم يلف…','Spinning…'));
    try{
     const r=await api('/spin','POST',{campaignId:campaign.id});const matching=campaign.prizes.map((p,i)=>p.id===r.spin.prize_id?i:-1).filter(i=>i>=0);const index=matching[Math.floor(Math.random()*matching.length)]??0;
     const disc=content.querySelector('.lf-wheel-disc');turn+=1800;disc.style.transform='rotate('+(turn-(index+.5)*360/campaign.prizes.length)+'deg)';
     if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,4100));
     status(r.spin.prize.type==='none'?r.spin.prize.label:t('مبروك! جائزتك: ','You won: ')+r.spin.prize.label);
     const latest=await api('/mine');renderRewards(latest.rewards);
    }catch(e){status(e.message);try{const m=await api('/mine');renderRewards(m.rewards);spin.disabled=m.played;}catch{spin.disabled=false;}}
    finally{spinning=false;}
   };
  }catch(e){status(e.message);}
 }
 function renderRewards(rows){
  const box=dialog.querySelector('[data-wheel-rewards]');if(!box)return;
  box.innerHTML=rows.map(r=>'<article class="lf-wheel-reward"><b>'+E(r.prize.label)+'</b><small>'+E(r.prize.campaign)+'</small>'+(r.code?'<code>'+E(r.code)+'</code><small>'+t('صالحة حتى: ','Valid until: ')+E(new Date(r.expiresAt).toLocaleString())+'</small><p>'+t('الحد الأدنى: ','Minimum: ')+Number(r.prize.minimum).toFixed(2)+' ₪</p>'+(r.available?'<button class="lf-wheel-action" data-use-wheel="'+Number(r.id)+'">'+t('استخدميها بالسلة','Use in cart')+'</button>':'<small>'+t(r.used?'استُخدمت':'منتهية أو غير متاحة',r.used?'Used':'Expired or unavailable')+'</small>'):'<small>'+t('محاولة مسجلة','Recorded spin')+'</small>')+'</article>').join('')||'<p>'+t('بعد أول محاولة بتلاقي جائزتك هون.','Your first reward will appear here.')+'</p>';
  box.querySelectorAll('[data-use-wheel]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
   const r=rows.find(x=>String(x.id)===b.dataset.useWheel);
   if(!cart.length)throw Error(t('أضيفي منتجات للسلة أولًا. جائزتك محفوظة هون.','Add products to your cart first. Your reward is saved here.'));
   activeCoupon=await validateCouponFromServer(r.code);couponCode=activeCoupon.code;localStorage.setItem('lf_coupon',couponCode);renderCart();close();openCart();
  }catch(e){status(e.message);b.disabled=false;}});
 }
 async function init(){try{
  const r=await api('');campaign=r.campaign;
  // Keep the rewards entry accessible after the campaign ends for signed-in customers.
  if(!campaign){if(!lfToken())return;const mine=await api('/mine');if(!mine.rewards.length)return;}
  entry=document.createElement('button');entry.type='button';entry.className='lf-wheel-entry';entry.textContent=campaign?t('جرّبي حظّك 🎁','Spin & win 🎁'):t('جوائز دولاب الحظ','My wheel rewards');entry.onclick=show;
  const target=document.querySelector('#storeDiscoveryIdeas');if(target)target.after(entry);else{const footer=document.querySelector('footer');if(footer)footer.before(entry);else document.body.append(entry);}
 }catch{}}
 document.addEventListener('lf:languagechange',()=>{if(entry)entry.textContent=campaign?t('جرّبي حظّك 🎁','Spin & win 🎁'):t('جوائز دولاب الحظ','My wheel rewards');if(dialog?.open&&!spinning)show();});
 window.LFLuckyWheel={open:show};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
