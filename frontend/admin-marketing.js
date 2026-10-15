'use strict';
const marketingPlatforms={facebook:'فيسبوك',instagram:'إنستغرام',tiktok:'تيك توك',snapchat:'سناب شات',whatsapp:'واتساب'};
const marketingRegions={west_bank:'الضفة',jerusalem:'القدس',interior:'الداخل'};
const marketingStatuses={draft:'مسودة',planned:'ضمن الخطة',published:'نُشر يدويًا',archived:'مؤرشفة'};
let marketingRows=[],marketingProductRows=[],marketingRequest=0;
async function marketing(){
  $('#sections').innerHTML='<section id="marketingWorkspace" class="card"><h2>التسويق والإعلانات</h2><p>خطط المحتوى والحملات محفوظة على السيرفر. المواعيد للتذكير ضمن الخطة فقط؛ النشر والتمويل غير متصلين بالمنصات حاليًا.</p><div class="actions"><button class="btn primary" id="marketingNew">حملة جديدة</button><button class="btn" id="marketingGuide">خطة البداية</button></div><label>بحث مباشر بالحملة أو النص<input class="field" type="search" id="marketingSearch" maxlength="160"></label><label>الحالة<select class="field" id="marketingStatus"><option value="">كل الحالات</option>'+Object.entries(marketingStatuses).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><div id="marketingSummary" aria-live="polite"></div><div id="marketingList" aria-live="polite"></div></section>';
  $('#marketingNew').onclick=()=>marketingEdit();
  $('#marketingGuide').onclick=()=>modal('خطة البداية — أسبوع تجريبي','<ol><li>يوم 1: تعريف بالمتجر وطريقة الطلب والتوصيل.</li><li>يوم 2: فيديو قصير لمنتج متوفر مع تفاصيله.</li><li>يوم 3: أسئلة وأجوبة عبر القصص.</li><li>يوم 4: تنسيق منتجات أو فكرة هدية.</li><li>يوم 5: تجربة زبون بعد إذنه، أو عرض تفاصيل التغليف.</li><li>يوم 6: عرض فعلي مطابق لسعر المتجر.</li><li>يوم 7: مراجعة الطلبات والمصروف وتحديد محتوى الأسبوع التالي.</li></ol><p>قبل التمويل: نحدد ميزانية التجربة والمنتجات والمناطق، ونجهز الربط الرسمي وقياس الطلبات. هذه خطة أولية قابلة للتعديل.</p>');
  $('#marketingSearch').oninput=()=>liveDebounce('marketing',marketingRefresh,220);
  $('#marketingStatus').onchange=marketingRender;
  await marketingRefresh();
}
async function marketingRefresh(){
  const root=$('#marketingWorkspace');if(!root)return;
  const sequence=++marketingRequest,q=$('#marketingSearch').value;
  $('#marketingList').textContent='جاري تحميل الحملات…';
  try{
    const d=await api('/api/admin/marketing/campaigns?q='+encodeURIComponent(q));
    if(sequence!==marketingRequest||!root.isConnected)return;
    marketingRows=d.campaigns;marketingRender();
  }catch(e){if(root.isConnected&&sequence===marketingRequest)$('#marketingList').textContent=e.message}
}
function marketingRender(){
  if(!$('#marketingList'))return;
  const status=$('#marketingStatus').value,rows=marketingRows.filter(r=>!status||r.data.status===status);
  const active=rows.filter(r=>r.data.status!=='archived'),sum=key=>active.reduce((n,r)=>n+Number(r.data[key]||0),0);
  const spend=sum('spend'),orders=sum('orders'),revenue=sum('revenue');
  $('#marketingSummary').innerHTML='<p>ملخص النتائج الظاهرة غير المؤرشفة (إدخال يدوي، بالشيكل): ميزانية '+M(sum('budget'))+' | مصروف '+M(spend)+' | مبيعات منسوبة '+M(revenue)+' | طلبات '+orders+' | تكلفة الطلب '+(orders?M(spend/orders):'—')+' | عائد المصروف '+(spend?M(revenue/spend)+'×':'—')+'</p><small>العائد يقارن الإيراد بالمصروف ولا يحسب صافي الربح. آخر 500 نتيجة كحد أقصى؛ تجنب تسجيل الطلب نفسه في حملتين.</small>';
  const sorted=[...rows].sort((a,b)=>(a.data.scheduled_at||'9999').localeCompare(b.data.scheduled_at||'9999'));
  $('#marketingList').innerHTML=sorted.length?sorted.map(r=>'<article class="card" style="margin-top:12px;overflow-wrap:anywhere"><h3>'+E(r.data.title)+'</h3><p>'+E(marketingStatuses[r.data.status])+' · '+r.data.platforms.map(x=>E(marketingPlatforms[x])).join('، ')+'</p><p>'+E(r.data.regions.map(x=>marketingRegions[x]).join('، '))+' · '+(r.data.scheduled_at?E(new Date(r.data.scheduled_at).toLocaleString('ar-PS',{timeZone:'Asia/Jerusalem'}))+' بتوقيت فلسطين':'بلا موعد')+'</p><p style="white-space:pre-wrap">'+E(r.data.content)+'</p><p>الميزانية: '+M(r.data.budget)+' ₪ · المصروف المسجل: '+M(r.data.spend)+' ₪</p><div class="actions"><button class="btn" data-marketing-edit="'+E(r.id)+'">فتح وتعديل</button><button class="btn" data-marketing-copy="'+E(r.id)+'">نسخ النص</button></div></article>').join(''):'<p>لا توجد حملات مطابقة. ابدأ بحملة جديدة.</p>';
  document.querySelectorAll('[data-marketing-edit]').forEach(b=>b.onclick=()=>marketingEdit(marketingRows.find(r=>String(r.id)===b.dataset.marketingEdit)));
  document.querySelectorAll('[data-marketing-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(marketingRows.find(r=>String(r.id)===b.dataset.marketingCopy).data.content);toast('تم نسخ النص')}catch{toast('افتح الحملة وحدد النص لنسخه')}});
}
function marketingEdit(row){
  marketingProductRows=[];
  const d=row?.data||{title:'',content:'',goal:'طلبات من الموقع',platforms:['facebook','instagram'],regions:['west_bank','jerusalem','interior'],status:'draft',budget:0,spend:0,revenue:0,orders:0,clicks:0};
  const checks=(key,labels,values)=>Object.entries(labels).map(([k,v])=>'<label style="display:inline-flex;gap:6px;margin:6px"><input type="checkbox" name="'+key+'" value="'+k+'" '+(values.includes(k)?'checked':'')+'>'+v+'</label>').join('');
  const numeric=(key,label)=>'<label>'+label+'<input class="field" id="mk_'+key+'" type="number" min="0" step="'+(['orders','clicks'].includes(key)?'1':'0.01')+'" value="'+Number(d[key]||0)+'" required></label>';
  modal(row?'تعديل الحملة':'حملة جديدة','<form id="marketingForm"><label>اسم الحملة<input class="field" id="mk_title" maxlength="160" value="'+E(d.title)+'" required></label><label>الهدف<input class="field" id="mk_goal" maxlength="300" value="'+E(d.goal)+'"></label><fieldset><legend>المنصات</legend>'+checks('mk_platforms',marketingPlatforms,d.platforms)+'</fieldset><fieldset><legend>المناطق</legend>'+checks('mk_regions',marketingRegions,d.regions)+'</fieldset><label>الحالة<select class="field" id="mk_status">'+Object.entries(marketingStatuses).map(([k,v])=>'<option value="'+k+'" '+(d.status===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label>الموعد حسب توقيت جهازك<input class="field" id="mk_date" type="datetime-local"></label><p>الموعد ينظم الخطة فقط ولا ينشر تلقائيًا.</p><label>ابحث عن منتج لإعداد النص<input id="mk_productSearch" class="field" type="search" placeholder="اكتب اسم المنتج"></label><select id="mk_product" class="field"><option value="">بدون منتج جديد</option></select><button class="btn" type="button" id="mk_generate">تجهيز نص من المنتج المختار</button><label>نص المنشور<textarea class="field" id="mk_content" rows="7" maxlength="6000">'+E(d.content)+'</textarea></label><p>النص قالب أولي؛ راجع السعر والمخزون قبل النشر.</p><div class="formgrid">'+numeric('budget','ميزانية الحملة بالشيكل')+numeric('spend','المصروف الفعلي المسجل يدويًا')+numeric('clicks','النقرات المسجلة يدويًا')+numeric('orders','الطلبات المنسوبة يدويًا')+numeric('revenue','إيراد الطلبات المنسوبة بالشيكل')+'</div><p>تسجيل الميزانية لا يشحن الحساب ولا يشغّل إعلانًا.</p><div id="mk_error" role="alert"></div><button id="mk_save" class="btn primary" type="submit">حفظ الحملة</button></form>');
  if(d.scheduled_at){const dt=new Date(d.scheduled_at);$('#mk_date').value=new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16)}
  const form=$('#marketingForm');let query=0;
  $('#mk_productSearch').oninput=()=>liveDebounce('marketingProduct',async()=>{
    if(!form.isConnected)return;const seq=++query;
    try{const result=await api('/api/admin/marketing/products?q='+encodeURIComponent($('#mk_productSearch').value));if(!form.isConnected||seq!==query)return;marketingProductRows=result.products;$('#mk_product').innerHTML='<option value="">اختر منتجًا (حتى 50 نتيجة)</option>'+result.products.map(p=>'<option value="'+Number(p.id)+'">'+E(p.name)+' — '+M(p.price)+' ₪ · مخزون '+Number(p.stock)+'</option>').join('')}catch(e){if(form.isConnected)$('#mk_error').textContent=e.message}
  },220);
  $('#mk_generate').onclick=()=>{
    const p=marketingProductRows.find(p=>String(p.id)===$('#mk_product').value);if(!p)return $('#mk_error').textContent='ابحث عن منتج واختره أولًا';
    if(Number(p.stock)<=0)return $('#mk_error').textContent='هذا المنتج غير متوفر حاليًا؛ اختر منتجًا متوفرًا';
    if($('#mk_content').value.trim()&&!confirm('استبدال النص الحالي بقالب المنتج؟'))return;
    const link=new URL('/#product-'+Number(p.id),location.origin);link.searchParams.set('utm_source','social');link.searchParams.set('utm_medium','social');link.searchParams.set('utm_campaign','product-'+p.id);
    $('#mk_content').value='لمسة حلوة من Ladies First 🌸\n'+p.name+'\nالسعر: '+M(p.price)+' شيكل\nشاهدي التفاصيل واطلبي من الموقع:\n'+link.href;
    if(!$('#mk_title').value)$('#mk_title').value=p.name;$('#mk_error').textContent='';
  };
  form.onsubmit=async e=>{
    e.preventDefault();const button=$('#mk_save'),error=$('#mk_error');button.disabled=true;error.textContent='';
    try{
      const b={title:$('#mk_title').value,goal:$('#mk_goal').value,content:$('#mk_content').value,status:$('#mk_status').value,platforms:[...form.querySelectorAll('[name="mk_platforms"]:checked')].map(x=>x.value),regions:[...form.querySelectorAll('[name="mk_regions"]:checked')].map(x=>x.value),scheduled_at:$('#mk_date').value?new Date($('#mk_date').value).toISOString():null,product_id:$('#mk_product').value?Number($('#mk_product').value):(d.product_id||null)};
      for(const key of ['budget','spend','revenue','clicks','orders'])b[key]=Number($('#mk_'+key).value);
      if(row)b.version=row.version;
      await api('/api/admin/marketing/campaigns'+(row?'/'+row.id:''),{method:row?'PUT':'POST',body:JSON.stringify(b)});
      if(form.isConnected)closeModal();toast('تم حفظ الحملة');await marketingRefresh();
    }catch(e){if(form.isConnected)error.textContent=e.message}finally{if(form.isConnected)button.disabled=false}
  };
}
