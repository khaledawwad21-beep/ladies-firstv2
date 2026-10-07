'use strict';

let offerProducts=[],offerBusy=false,offerLoad=0;

function offerProductImage(p){
  const main=Array.isArray(p?.mainImages)?p.mainImages.find(Boolean):'';
  const images=Array.isArray(p?.images)?p.images.find(Boolean):'';
  return main||images||p?.imageUrl||p?.image_url||p?.image||'';
}

window.offers=async function offers(){
  const request=++offerLoad;
  $('#sections').innerHTML='<div id="offersLoading" class="card">جاري تحميل المنتجات…</div>';
  try{
    const data=await api('/api/products');
    if(request!==offerLoad||!$('#offersLoading'))return;
    offerProducts=data.products||[];
    $('#sections').innerHTML=`<div class="card"><h2>Top 5 والعروض السريعة</h2>
      <p>ابحثي عن المنتج مباشرة، ثم عدّلي سعر العرض والسعر الأصلي ومكان ظهوره وتاريخ انتهاء العرض.</p>
      <div class="offer-search-box">
        <input id="offerSearch" class="field" placeholder="بحث مباشر باسم المنتج أو البراند" autocomplete="off" oninput="offerRenderSearch()">
        <input id="offerProduct" type="hidden" value="">
        <div id="offerSearchResults" class="offer-search-results"><small>اكتبي جزءًا من اسم المنتج للبحث.</small></div>
      </div>
      <div id="offerEditor"></div>
      <p id="offerMessage" role="status"></p>
    </div>`;
  }catch(e){
    if(request===offerLoad&&$('#offersLoading'))$('#sections').textContent=e.message;
  }
};

window.offerRenderSearch=function offerRenderSearch(){
  const box=$('#offerSearchResults');
  if(!box)return;
  const q=String($('#offerSearch')?.value||'').trim().toLowerCase();
  $('#offerProduct').value='';
  $('#offerEditor').innerHTML='';
  $('#offerMessage').textContent='';
  if(!q){
    box.innerHTML='<small>اكتبي جزءًا من اسم المنتج للبحث.</small>';
    return;
  }
  const list=offerProducts.filter(p=>[
    p.name||'',p.brand||'',p.category||p.cat||''
  ].join(' ').toLowerCase().includes(q)).slice(0,15);
  box.innerHTML=list.length?list.map(p=>{
    const img=offerProductImage(p);
    return `<button type="button" class="offer-result" onclick="offerPick(${Number(p.id)})">
      ${img?`<img src="${E(img)}" alt="">`:'<span class="offer-result-placeholder">📦</span>'}
      <span><b>${E(p.name||'منتج')}</b><small>${E(p.brand||'')} ${p.brand?'— ':''}${M(p.price)} ₪</small></span>
    </button>`;
  }).join(''):'<small>لا توجد منتجات مطابقة.</small>';
};

window.offerPick=function offerPick(id){
  const p=offerProducts.find(x=>Number(x.id)===Number(id));
  if(!p)return;
  $('#offerProduct').value=String(p.id);
  $('#offerSearch').value=p.name||'';
  $('#offerSearchResults').innerHTML='';
  offerSelect();
};

function offerSelect(){
  const p=offerProducts.find(x=>String(x.id)===$('#offerProduct').value);
  $('#offerMessage').textContent='';
  if(!p){$('#offerEditor').innerHTML='';return;}
  const m=p.metadata||{};
  $('#offerEditor').innerHTML=`<fieldset id="offerFields" style="border:0;padding:0;min-width:0" ${offerBusy?'disabled':''}>
    <div class="offer-selected">
      ${offerProductImage(p)?`<img src="${E(offerProductImage(p))}" alt="">`:''}
      <div><b>${E(p.name||'')}</b><small>${E(p.brand||'')}</small></div>
    </div>
    <div class="formgrid">
      <label>سعر العرض
        <input id="offerSalePrice" class="field compact-field" type="number" min="0" step=".01" value="${Number(p.price)||0}">
      </label>
      <label>السعر الأصلي
        <input id="offerOriginalPrice" class="field compact-field" type="number" min="0" step=".01" value="${p.old_price??p.oldPrice??''}">
      </label>
      <label><input id="offerSale" type="checkbox" ${m.onSale?'checked':''}> عرض علامة التخفيض</label>
      <label><input id="offerTop5" type="checkbox" ${m.top5?'checked':''}> ضمن Top 5</label>
      <label><input id="offerQuick" type="checkbox" ${m.quickOffer?'checked':''}> ضمن العروض السريعة</label>
      <label>انتهاء الظهور في Top 5
        <input id="offerExpiry" type="date" class="field compact-field" value="${E(m.offerExpiry||'')}">
      </label>
      <label>انتهاء العرض السريع
        <input id="offerQuickExpiry" type="date" class="field compact-field" value="${E(m.quickOfferExpiry||'')}">
      </label>
    </div>
    <p class="small-note">سعر العرض هو السعر الذي يدفعه الزبون أثناء التخفيض، والسعر الأصلي يظهر مشطوبًا للمقارنة. لتفعيل علامة التخفيض يجب أن يكون السعر الأصلي أعلى من سعر العرض.</p>
    <button type="button" class="btn primary" onclick="saveProductOffer()">حفظ إعدادات العرض</button>
  </fieldset>`;
  initDateInputs?.($('#offerEditor'));
}

async function saveProductOffer(){
  if(offerBusy)return;
  const select=$('#offerProduct'),p=offerProducts.find(x=>String(x.id)===select.value);
  if(!p)return;
  const editor=$('#offerEditor'),fields=$('#offerFields'),message=$('#offerMessage');
  const salePrice=Math.max(0,Number($('#offerSalePrice')?.value||0));
  const originalRaw=String($('#offerOriginalPrice')?.value||'').trim();
  const originalPrice=originalRaw===''?null:Math.max(0,Number(originalRaw));
  const body={
    onSale:$('#offerSale').checked,
    top5:$('#offerTop5').checked,
    quickOffer:$('#offerQuick').checked,
    offerExpiry:$('#offerExpiry').value,
    quickOfferExpiry:$('#offerQuickExpiry').value,
    salePrice,
    originalPrice
  };
  if(body.onSale&&!(Number(originalPrice)>Number(salePrice))){
    message.textContent='السعر الأصلي يجب أن يكون أعلى من سعر العرض لتفعيل التخفيض.';
    return;
  }
  offerBusy=true;fields.disabled=true;message.textContent='جاري الحفظ…';
  try{
    const result=await api('/api/admin/products/'+encodeURIComponent(p.id)+'/offers',{method:'PATCH',body:JSON.stringify(body)});
    p.metadata=result.metadata||body;
    p.price=result.price;
    p.old_price=result.oldPrice;
    if($('#offerEditor')===editor){
      message.textContent='تم حفظ العرض والسعر. التغيير مرتبط مباشرة بسعر المنتج في المتجر.';
      offerSelect();
    }
  }catch(e){
    if($('#offerEditor')===editor)message.textContent=e.message;
  }finally{
    offerBusy=false;
    if($('#offerFields'))$('#offerFields').disabled=false;
  }
}
