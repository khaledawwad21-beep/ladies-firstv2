'use strict';
let offerProducts=[],offerBusy=false,offerLoad=0;
window.offers=async function offers(){
  const request=++offerLoad;
  $('#sections').innerHTML='<div id="offersLoading" class="card">جاري تحميل المنتجات…</div>';
  try{
    const data=await api('/api/products');
    if(request!==offerLoad||!$('#offersLoading'))return;
    offerProducts=data.products||[];
    $('#sections').innerHTML=`<div class="card"><h2>Top 5 والعروض السريعة</h2><p>اختاري منتجًا لتحديد أماكن ظهوره وتاريخ انتهاء عرضه. تعرض Top 5 حتى خمسة منتجات متاحة من اختياراتك، مرتبة حسب نسبة التخفيض. إذا لم توجد اختيارات متاحة، تظهر التخفيضات السارية.</p><label>المنتج<select id="offerProduct" class="field" onchange="offerSelect()"><option value="">اختاري منتجًا</option>${offerProducts.map(p=>`<option value="${E(p.id)}">${E(p.name)} — ${M(p.price)}</option>`).join('')}</select></label><div id="offerEditor"></div><p id="offerMessage" role="status"></p></div>`;
  }catch(e){if(request===offerLoad&&$('#offersLoading'))$('#sections').textContent=e.message;}
};
function offerSelect(){
  const p=offerProducts.find(x=>String(x.id)===$('#offerProduct').value);
  $('#offerMessage').textContent='';
  if(!p){$('#offerEditor').innerHTML='';return;}
  const m=p.metadata||{};
  $('#offerEditor').innerHTML=`<fieldset id="offerFields" style="border:0;padding:0;min-width:0" ${offerBusy?'disabled':''}><p>السعر الحالي: <b>${M(p.price)}</b> — السعر السابق: <b>${M(p.old_price??p.oldPrice)}</b></p><p>لتعديل الأسعار، استخدمي قسم المنتجات. التخفيض يتطلب أن يكون السعر السابق أعلى من الحالي.</p><div class="formgrid"><label><input id="offerSale" type="checkbox" ${m.onSale?'checked':''}> عرض علامة التخفيض</label><label><input id="offerTop5" type="checkbox" ${m.top5?'checked':''}> ضمن Top 5</label><label><input id="offerQuick" type="checkbox" ${m.quickOffer?'checked':''}> ضمن العروض السريعة</label><label>انتهاء الظهور في Top 5<input id="offerExpiry" type="date" class="field" value="${E(m.offerExpiry||'')}"></label><label>انتهاء العرض السريع<input id="offerQuickExpiry" type="date" class="field" value="${E(m.quickOfferExpiry||'')}"></label></div><p>اتركي التاريخ فارغًا لعرض مستمر. ينتهي الظهور بنهاية اليوم المحدد حسب وقت جهاز الزائرة؛ لا يتغير سعر المنتج تلقائيًا.</p><button type="button" class="btn primary" onclick="saveProductOffer()">حفظ إعدادات العرض</button></fieldset>`;
}
async function saveProductOffer(){
  if(offerBusy)return;
  const select=$('#offerProduct'),p=offerProducts.find(x=>String(x.id)===select.value);
  if(!p)return;
  const editor=$('#offerEditor'),fields=$('#offerFields'),message=$('#offerMessage');
  const body={onSale:$('#offerSale').checked,top5:$('#offerTop5').checked,quickOffer:$('#offerQuick').checked,offerExpiry:$('#offerExpiry').value,quickOfferExpiry:$('#offerQuickExpiry').value};
  if(body.onSale&&!(Number(p.old_price??p.oldPrice)>Number(p.price))){message.textContent='السعر السابق يجب أن يكون أعلى من السعر الحالي لتفعيل التخفيض.';return;}
  offerBusy=true;select.disabled=true;fields.disabled=true;message.textContent='جاري الحفظ…';
  try{
    const result=await api('/api/admin/products/'+encodeURIComponent(p.id)+'/offers',{method:'PATCH',body:JSON.stringify(body)});
    p.metadata=result.metadata;
    if($('#offerEditor')===editor)message.textContent='تم حفظ العرض. حدّثي المتجر لمشاهدة التغييرات.';
  }catch(e){if($('#offerEditor')===editor)message.textContent=e.message;}
  finally{offerBusy=false;select.disabled=false;fields.disabled=false;if($('#offerFields'))$('#offerFields').disabled=false;}
}
