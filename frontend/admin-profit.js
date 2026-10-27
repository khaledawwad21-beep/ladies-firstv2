(()=>{'use strict';
 let defaults=null,timer,version=0;
 async function settings(){if(!defaults)defaults=(await api('/api/admin/growth')).settings.profit;return defaults;}
 function values(root){const out={};root.querySelectorAll('[data-profit]').forEach(x=>out[x.dataset.profit]=Number(x.value));return out;}
 async function mount(){if(currentAdminUser?.role!=='owner')return;
  for(const target of [document.querySelector('#offerEditor #offerFields'),document.querySelector('#modal.open .product-admin-form')]){
   if(!target||target.querySelector('.lf-profit-review'))continue;const d=await settings();if(!target.isConnected||target.querySelector('.lf-profit-review'))continue;
   const card=document.createElement('section');card.className='lf-profit-review full';card.style.cssText='padding:14px;border:1px solid #d8c2d0;border-radius:14px;background:#fffaf6';
   card.innerHTML='<h3>مراقب ربحية العرض</h3><div class="formgrid"><label>الكمية في الطلب<input class="field" data-profit="quantity" type="number" min="1" step="1" value="1"></label>'+Object.entries({packagingCost:'كلفة التغليف ₪',shippingSupport:'دعم التوصيل ₪',otherCost:'مصاريف أخرى ₪',paymentFeePercent:'رسوم الدفع %',couponPercent:'كوبون إضافي %',loyaltyDiscount:'خصم النقاط ₪'}).map(([k,l])=>`<label>${l}<input class="field" data-profit="${k}" type="number" min="0" step="0.01" value="${Number(d[k])||0}"></label>`).join('')+'</div><div data-profit-result role="status">جاري الحساب…</div><button class="btn" type="button" data-market-open>مقارنة سعر السوق بالصورة</button><div data-market-panel></div>';
   target.append(card);card.querySelector('[data-market-open]').onclick=()=>{const id=target.closest('#offerEditor')?Number(document.querySelector('#offerProduct').value):Number(typeof adminProductDraft==='object'?adminProductDraft.id:0);window.LFMarket?.mount(card.querySelector('[data-market-panel]'),id);};refresh(card);
  }
 }
 async function quote(card){const inOffer=!!card.closest('#offerEditor'),price=document.querySelector(inOffer?'#offerSalePrice':'#pp')?.value,body={...values(card),salePrice:Number(price)};
  if(inOffer)body.productId=Number(document.querySelector('#offerProduct')?.value);else{const cost=document.querySelector('#pcost')?.value;body.unitCost=cost!==''&&Number(cost)>0?Number(cost):null;}
  return (await api('/api/admin/growth/profit',{method:'POST',body:JSON.stringify(body)})).quote;
 }
 async function refresh(card){const n=++version;try{const q=await quote(card);if(!card.isConnected||n!==version)return;const el=card.querySelector('[data-profit-result]');el.textContent=q.status==='unknown'?q.warnings.join(' '):`صافي الربح المتوقع: ${q.profit.toFixed(2)} ₪ — هامش ${q.margin??0}% — سعر التعادل للوحدة: ${q.breakEven??'غير متاح'} ₪`+(q.status==='loss'?' ⚠ هذا العرض يسبب خسارة':'');el.style.color=q.status==='loss'?'#b42332':'#63345e';const p=document.createElement('small');p.textContent=q.scope;el.append(document.createElement('br'),p);}catch(e){if(card.isConnected)card.querySelector('[data-profit-result]').textContent=e.message;}}
 async function check(){const card=document.querySelector('#modal.open .lf-profit-review')||document.querySelector('#offerEditor .lf-profit-review');if(!card||currentAdminUser?.role!=='owner')return true;try{const q=await quote(card);if(q.status==='loss')return confirm(`العرض يسبب خسارة متوقعة ${Math.abs(q.profit).toFixed(2)} ₪ لكل طلب وفق الحسبة. هل تريد حفظه رغم الخسارة؟`);if(q.status==='unknown')return confirm('كلفة الصنف غير مسجلة ولا يمكن تأكيد الربحية. هل تريد الحفظ؟');return true;}catch(e){return confirm('تعذر حساب الربحية: '+e.message+' — هل تريد متابعة الحفظ؟');}}
 document.addEventListener('input',e=>{if(e.target.matches('[data-profit],#pp,#pcost,#offerSalePrice,#offerOriginalPrice')){clearTimeout(timer);timer=setTimeout(()=>{const card=document.querySelector('#modal.open .lf-profit-review')||document.querySelector('#offerEditor .lf-profit-review');if(card)refresh(card);},350);}});
 let queued=false;new MutationObserver(rs=>{if(rs.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('#offerFields,.product-admin-form')||n.querySelector('#offerFields,.product-admin-form'))))&&!queued){queued=true;queueMicrotask(()=>{queued=false;mount().catch(()=>{});});}}).observe(document.body,{childList:true,subtree:true});
 for(const name of ['saveProductOffer','saveProduct']){const original=window[name];if(typeof original==='function')window[name]=async function(...args){if(await check())return original.apply(this,args);};}
 window.LFProfit={resetDefaults:()=>{defaults=null;},quote};mount().catch(()=>{});
})();
