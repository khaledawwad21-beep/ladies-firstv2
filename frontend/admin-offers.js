'use strict';

let offerProducts=[],offerBusy=false,offerLoad=0,welcomeConfig={enabled:false,scope:'all',productIds:[],categoryName:'',offerText:'',startAt:'',endAt:'',couponCode:'',headline:''},welcomeCoupons=[];

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
    const [settings,couponData]=await Promise.all([
      api('/api/admin/settings').catch(()=>({settings:{}})),
      api('/api/admin/coupons').catch(()=>({coupons:[]}))
    ]);
    welcomeConfig={enabled:false,scope:'all',productIds:[],categoryName:'',offerText:'',startAt:'',endAt:'',couponCode:'',headline:'',...(settings.settings?.welcome_offer||{})};
    welcomeCoupons=(couponData.coupons||[]).filter(c=>c.is_active!==false);
    $('#sections').innerHTML=`<div class="card"><h2>Top 5 والعروض السريعة</h2>
      <p>ابحثي عن المنتج مباشرة، ثم عدّلي سعر العرض والسعر الأصلي ومكان ظهوره وتاريخ انتهاء العرض.</p>
      <div class="offer-search-box">
        <input id="offerSearch" class="field" placeholder="بحث مباشر باسم المنتج أو البراند" autocomplete="off" oninput="offerRenderSearch()">
        <input id="offerProduct" type="hidden" value="">
        <div id="offerSearchResults" class="offer-search-results"><small>اكتبي جزءًا من اسم المنتج للبحث.</small></div>
      </div>
      <div id="offerEditor"></div>
      <p id="offerMessage" role="status"></p>
    </div>
    <div class="card" style="margin-top:18px"><h2>نافذة الترحيب والعرض المؤقت</h2>
      <p class="small-note">اختاري الإعلان على كل المنتجات أو فئة أو أصناف محددة، واكتبي رسالة الخصم أو الكوبون وحددي مدة ظهوره.</p>
      <div class="formgrid">
        <label class="full"><input id="welcomeEnabled" type="checkbox"> تفعيل نافذة الترحيب</label>
        <label class="full">نطاق الإعلان
          <select id="welcomeScope" class="field" onchange="offerWelcomeScopeChange()">
            <option value="all">كل المنتجات</option><option value="category">فئة محددة</option><option value="products">أصناف أختارها</option>
          </select>
        </label>
        <label id="welcomeCategoryField" class="full" style="display:none">الفئة المعلَن عنها
          <select id="welcomeCategory" class="field"></select>
        </label>
        <label id="welcomeProductsHeading" class="full" style="display:none;margin-top:8px">الأصناف التي تظهر في النافذة
          <input id="welcomeSearch" class="field" placeholder="ابحثي باسم الصنف أو البراند" oninput="offerRenderWelcomeProducts()">
        </label>
        <div id="welcomeProductPicker" class="full" style="display:none;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px"></div>
        <label class="full">عنوان النافذة<input id="welcomeHeadline" class="field" maxlength="100" placeholder="مثال: عروض لفترة محدودة"></label>
        <label class="full">نص الإعلان<textarea id="welcomeOfferText" class="field" rows="3" maxlength="240" placeholder="مثال: خصم 50٪ على كل المنتجات — استغلي كوبونك قبل انتهاء العرض"></textarea></label>
        <label>بداية الحملة<input id="welcomeStart" class="field" type="datetime-local"></label>
        <label>نهاية الحملة / نهاية الكوبون<input id="welcomeEnd" class="field" type="datetime-local"></label>
        <label class="full">كوبون الإعلان<select id="welcomeCoupon" class="field"><option value="">بدون كوبون</option></select></label>
      </div>
      <p class="small-note">نص الإعلان للترويج فقط؛ جهّزي الخصم أو الكوبون من إعداداتهما، وحددي هنا نطاق الإعلان وموعد انتهائه للعداد.</p>
      <p id="welcomeCampaignMessage" role="status"></p>
      <button type="button" class="btn primary" onclick="saveWelcomeCampaign()">حفظ نافذة الترحيب</button>
    </div>`;
    offerInitWelcome();
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


function offerLocalDateTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function offerInitWelcome(){
  const config=welcomeConfig||{};
  config.productIds=Array.isArray(config.productIds)?config.productIds:[];
  if(!config.scope)config.scope=config.productIds.length?'products':'all';
  $('#welcomeEnabled').checked=config.enabled===true;
  $('#welcomeHeadline').value=config.headline||'';
  $('#welcomeOfferText').value=config.offerText||'';
  $('#welcomeStart').value=offerLocalDateTime(config.startAt);
  $('#welcomeEnd').value=offerLocalDateTime(config.endAt);
  $('#welcomeScope').value=['all','category','products'].includes(config.scope)?config.scope:'all';
  const categories=[...new Set(offerProducts.map(p=>String(p.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  $('#welcomeCategory').innerHTML=categories.map(name=>'<option value="'+E(name)+'">'+E(name)+'</option>').join('')||'<option value="">لا توجد فئات</option>';
  $('#welcomeCategory').value=categories.includes(config.categoryName)?config.categoryName:(categories[0]||'');
  $('#welcomeCoupon').innerHTML='<option value="">بدون كوبون</option>'+welcomeCoupons.map(c=>'<option value="'+E(c.code)+'">'+E(c.code)+' — '+E(c.discount_type==='percent'?Number(c.discount_value)+'%':M(c.discount_value)+' ₪')+'</option>').join('');
  $('#welcomeCoupon').value=welcomeCoupons.some(c=>String(c.code).toUpperCase()===String(config.couponCode||'').toUpperCase())?config.couponCode:'';
  offerWelcomeScopeChange();
}
window.offerWelcomeScopeChange=function offerWelcomeScopeChange(){
  const scope=$('#welcomeScope')?.value||'all';
  const cat=$('#welcomeCategoryField'),productsTitle=$('#welcomeProductsHeading'),picker=$('#welcomeProductPicker');
  if(cat)cat.style.display=scope==='category'?'block':'none';
  if(productsTitle)productsTitle.style.display=scope==='products'?'block':'none';
  if(picker)picker.style.display=scope==='products'?'grid':'none';
  if(scope==='products')offerRenderWelcomeProducts();
};
window.offerRenderWelcomeProducts=function offerRenderWelcomeProducts(){
  const box=$('#welcomeProductPicker');
  if(!box||$('#welcomeScope')?.value!=='products')return;
  const q=String($('#welcomeSearch')?.value||'').trim().toLowerCase();
  const chosen=new Set((welcomeConfig.productIds||[]).map(Number));
  const matches=offerProducts.filter(p=>!q||[p.name||'',p.brand||'',p.category||''].join(' ').toLowerCase().includes(q)).slice(0,40);
  const rows=matches.map(p=>'<label style="display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #eadce3;border-radius:10px"><input type="checkbox" value="'+Number(p.id)+'" '+(chosen.has(Number(p.id))?'checked':'')+' onchange="offerToggleWelcomeProduct('+Number(p.id)+',this.checked)">'+
    (offerProductImage(p)?'<img src="'+E(offerProductImage(p))+'" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:8px">':'')+
    '<span>'+E(p.name||'صنف')+'</span></label>').join('');
  const chosenNotVisible=(welcomeConfig.productIds||[]).map(Number).filter(id=>!matches.some(p=>Number(p.id)===id)).map(id=>{
    const p=offerProducts.find(x=>Number(x.id)===id);
    if(!p)return '';
    return '<label style="display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #eadce3;border-radius:10px"><input type="checkbox" value="'+id+'" checked onchange="offerToggleWelcomeProduct('+id+',this.checked)">'+E(p.name||'صنف')+'</label>';
  }).join('');
  box.innerHTML=(chosenNotVisible+rows)||'<small>لا توجد أصناف مطابقة.</small>';
};
window.offerToggleWelcomeProduct=function offerToggleWelcomeProduct(id,checked){
  const selected=new Set((welcomeConfig.productIds||[]).map(Number));
  checked?selected.add(Number(id)):selected.delete(Number(id));
  welcomeConfig.productIds=[...selected];
};
window.saveWelcomeCampaign=async function saveWelcomeCampaign(){
  const message=$('#welcomeCampaignMessage');
  const scope=$('#welcomeScope')?.value||'all';
  const productIds=scope==='products'?(welcomeConfig.productIds||[]).map(Number):[];
  const categoryName=scope==='category'?$('#welcomeCategory')?.value||'':'';
  const startRaw=$('#welcomeStart')?.value||'',endRaw=$('#welcomeEnd')?.value||'';
  const enabled=$('#welcomeEnabled')?.checked===true;
  if(enabled&&(!startRaw||!endRaw||(scope==='products'&&!productIds.length)||(scope==='category'&&!categoryName))){
    message.textContent='حددي نطاق الإعلان وتاريخ البداية والنهاية قبل تفعيل النافذة.';return;
  }
  const startAt=startRaw?new Date(startRaw).toISOString():'',endAt=endRaw?new Date(endRaw).toISOString():'';
  if(startAt&&endAt&&Date.parse(startAt)>=Date.parse(endAt)){message.textContent='تاريخ البداية يجب أن يسبق النهاية.';return}
  const payload={welcome_offer:{enabled,scope,productIds,categoryName,offerText:$('#welcomeOfferText')?.value.trim()||'',startAt,endAt,couponCode:$('#welcomeCoupon')?.value||'',headline:$('#welcomeHeadline')?.value.trim()||''}};
  message.textContent='جاري الحفظ…';
  try{
    await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(payload)});
    welcomeConfig=payload.welcome_offer;
    message.textContent='تم حفظ إعدادات الإعلان والعداد.';
  }catch(e){message.textContent=e.message||'تعذر حفظ الإعدادات.'}
};
