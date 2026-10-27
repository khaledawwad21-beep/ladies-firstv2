(()=>{'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=(ar,en)=>document.documentElement.lang==='en'?en:(window.LFStoreLanguage?.text(ar)||ar);
 let campaign=null,dialog,entry,turn=0,spinning=false,focus,view=0,autoTimer,autoPending=false,hiddenAt=0;
 const api=(p,method='GET',body)=>lfFetch('/api/wheel'+p,{method,cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
 function status(value){const el=dialog?.querySelector('[data-wheel-status]');if(el)el.textContent=value;}
 function close(){if(spinning)return;view++;dialog?.close();autoPending=false;focus?.focus();}
 function account(){close();if(typeof openAccount==='function')openAccount();}
 async function show(){
  if(spinning||dialog?.open)return;
  autoPending=false;clearTimeout(autoTimer);focus=document.activeElement;const request=++view;
  if(!dialog){dialog=document.createElement('dialog');dialog.className='lf-wheel-dialog';dialog.setAttribute('aria-labelledby','lfWheelTitle');document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});}
  dialog.innerHTML='<button type="button" class="lf-wheel-close" aria-label="'+t('إغلاق','Close')+'">×</button><div class="lf-wheel-head"><div class="lf-wheel-eyebrow">LADIES FIRST</div><h2 id="lfWheelTitle">'+E(campaign?.name||t('جوائزي','My rewards'))+'</h2><p class="lf-wheel-intro">'+t('لفّة صغيرة… ومفاجأة إلك','A little spin, a little surprise')+'</p></div><div data-wheel-content><p class="lf-wheel-loading">'+t('عم نجهّز مفاجآتك…','Preparing your surprises…')+'</p></div>';
  dialog.querySelector('.lf-wheel-close').onclick=close;dialog.showModal();
  const content=dialog.querySelector('[data-wheel-content]');
  try{
   const fresh=await api('');let mine={played:false,rewards:[],authenticated:false};
   if(lfToken()){try{mine={...await api('/mine'),authenticated:true};}catch(e){if(e.status!==401)throw e;}}
   if(request!==view||!dialog.open)return;campaign=fresh.campaign;
   dialog.querySelector('#lfWheelTitle').textContent=campaign?.name||t('جوائزي','My rewards');
   content.innerHTML=(campaign?LFWheelView.markup(campaign.prizes)+'<p class="lf-wheel-attempt">'+t(campaign.frequency==='daily'?'محاولة واحدة يوميًا — بتوقيت فلسطين':'محاولة واحدة خلال الحملة',campaign.frequency==='daily'?'One spin daily — Palestine time':'One spin during the campaign')+'</p><button class="lf-wheel-action lf-wheel-spin" data-spin '+(mine.played?'disabled':'')+'>'+t(mine.played?'محاولتك السابقة محفوظة':mine.authenticated?'لفّي الدولاب':'سجّلي دخولك وجرّبي حظك',mine.played?'Your spin is already saved':mine.authenticated?'Spin the wheel':'Sign in and spin')+'</button>':'<p>'+t('الحملة انتهت، وجوائزك السابقة محفوظة هون.','The campaign has ended. Your saved rewards are here.')+'</p>')+'<p class="lf-wheel-result" data-wheel-status role="status" aria-live="polite"></p>'+(campaign?'<details class="lf-wheel-terms"><summary>'+t('شروط الحملة وفرص الفوز','Campaign terms and chances')+'</summary><small>'+t(campaign.oddsNotice,'Winning chances differ between options. Sector sizes do not represent odds. Rewards are subject to availability.')+'</small><small>'+t('الحد الأدنى للطلب: ','Minimum order: ')+Number(campaign.minimum).toFixed(2)+' ₪ · '+t('صلاحية الجائزة: ','Valid for: ')+campaign.validDays+t(' أيام. ',' days. ')+t(campaign.stackable?'يمكن الجمع مع خصم البطاقة والنقاط.':'لا تجمع مع خصم البطاقة والنقاط.',campaign.stackable?'Can combine with card and points discounts.':'Cannot combine with card and points discounts.')+'</small></details>':'')+(mine.authenticated?'<details class="lf-wheel-wallet" '+(mine.played?'open':'')+'><summary>'+t('جوائزي المحفوظة','My saved rewards')+'</summary><div data-wheel-rewards></div></details>':'');
   LFWheelView.hydrate(content);renderRewards(mine.rewards);
   const spin=content.querySelector('[data-spin]');if(spin)spin.onclick=async()=>{
    if(!mine.authenticated){account();return;}if(spinning)return;
    spinning=true;spin.disabled=true;status(t('الدولاب عم يلف…','Spinning…'));
    try{
     const r=await api('/spin','POST',{campaignId:campaign.id});
     if(r.replayed){
      mine.played=true;spin.textContent=t('محاولتك السابقة محفوظة','Your previous spin is saved');
      status(t('هذه نتيجتك السابقة؛ لم تُحتسب محاولة جديدة.','This is your saved result; no new spin was made.')+' '+r.spin.prize.label);
      const latest=await api('/mine');renderRewards(latest.rewards);return;
     }
     mine.played=true;if(r.spin.prize.type==='points'&&typeof lfLoadLoyalty==='function'){await lfLoadLoyalty();await lfSyncMe();}
     const matching=campaign.prizes.map((p,i)=>p.id===r.spin.prize_id?i:-1).filter(i=>i>=0);const index=matching[Math.floor(Math.random()*matching.length)]??0;
     const disc=content.querySelector('.lf-wheel-disc');turn+=1800;const angle=turn-(index+.5)*360/campaign.prizes.length;disc.style.setProperty('--wheel-rotation',angle+'deg');disc.style.transform='rotate('+angle+'deg)';
     if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,4100));
     status(r.spin.prize.type==='none'?r.spin.prize.label:t('مبروك! جائزتك: ','You won: ')+r.spin.prize.label);
     spin.textContent=t('جائزتك انحفظت بحسابك','Your result is saved');const latest=await api('/mine');renderRewards(latest.rewards);
    }catch(e){status(e.message);try{const latest=await api('/mine');renderRewards(latest.rewards);spin.disabled=latest.played;}catch{spin.disabled=false;}}
    finally{spinning=false;}
   };
  }catch(e){if(request===view)content.innerHTML='<p class="lf-wheel-result" data-wheel-status role="status">'+E(e.message)+'</p>';}
 }
 function renderRewards(rows){
  const box=dialog?.querySelector('[data-wheel-rewards]');if(!box)return;
  box.innerHTML=rows.map(r=>'<article class="lf-wheel-reward"><b>'+E(r.prize.label)+'</b><small>'+E(r.prize.campaign)+'</small>'+(r.code?'<code>'+E(r.code)+'</code><small>'+t('صالحة حتى: ','Valid until: ')+E(new Date(r.expiresAt).toLocaleString())+'</small><p>'+t('الحد الأدنى: ','Minimum: ')+Number(r.prize.minimum).toFixed(2)+' ₪</p>'+(r.available?'<button class="lf-wheel-action" data-use-wheel="'+Number(r.id)+'">'+t('استخدميها بالسلة','Use in cart')+'</button>':'<small>'+t(r.used?'استُخدمت':'منتهية أو غير متاحة',r.used?'Used':'Expired or unavailable')+'</small>'):'<small>'+(r.prize.type==='points'?t('أُضيفت النقاط إلى رصيدك','Points added to your balance'):t('محاولة مسجلة','Recorded spin'))+'</small>')+'</article>').join('')||'<p>'+t('جائزتك بتظهر هون بعد أول محاولة.','Your reward appears here after your first spin.')+'</p>';
  box.querySelectorAll('[data-use-wheel]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
   const r=rows.find(x=>String(x.id)===b.dataset.useWheel);if(!cart.length)throw Error(t('أضيفي منتجات للسلة أولًا. جائزتك محفوظة هون.','Add products to your cart first. Your reward is saved here.'));
   activeCoupon=await validateCouponFromServer(r.code);couponCode=activeCoupon.code;localStorage.setItem('lf_coupon',couponCode);renderCart();close();openCart();
  }catch(e){status(e.message);b.disabled=false;}});
 }
 function blocked(){return [...document.querySelectorAll('dialog[open]:not(.lf-wheel-dialog),#lfWelcomeOffer,.modal,#drawer,#nayaAssistant.open')].some(el=>{const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&el.getBoundingClientRect().height>0;});}
 function tryAuto(){clearTimeout(autoTimer);if(!autoPending||document.hidden||dialog?.open)return;if(blocked()){autoTimer=setTimeout(tryAuto,400);return;}show();}
 async function launch(){try{const r=await api('');campaign=r.campaign;if(campaign){autoPending=true;tryAuto();}}catch{}}
 async function init(){try{
  const r=await api('');campaign=r.campaign;if(!campaign){if(!lfToken())return;const mine=await api('/mine');if(!mine.rewards.length)return;}
  entry=document.createElement('button');entry.type='button';entry.className='lf-wheel-entry';entry.textContent=campaign?t('جرّبي حظّك','Spin & win'):t('جوائز دولاب الحظ','My wheel rewards');entry.onclick=()=>show();
  const target=document.querySelector('#storeDiscoveryIdeas');if(target)target.after(entry);else{const footer=document.querySelector('footer');if(footer)footer.before(entry);else document.body.append(entry);}
  if(campaign){autoPending=true;tryAuto();}
 }catch{}}
 document.addEventListener('lf:accountchange',()=>{if(entry)entry.textContent=campaign?t('جرّبي حظّك','Spin & win'):t('جوائز دولاب الحظ','My wheel rewards');if(dialog?.open&&!spinning){close();show();}});
 document.addEventListener('lf:languagechange',()=>{if(entry)entry.textContent=campaign?t('جرّبي حظّك','Spin & win'):t('جوائز دولاب الحظ','My wheel rewards');});
 window.addEventListener('pageshow',e=>{if(e.persisted)launch();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();clearTimeout(autoTimer);}else if(hiddenAt){hiddenAt=0;launch();}else if(autoPending)tryAuto();});
 window.addEventListener('pagehide',()=>clearTimeout(autoTimer));
 window.LFLuckyWheel={open:show};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
