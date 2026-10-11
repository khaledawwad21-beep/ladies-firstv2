'use strict';
let seasonalDraft={active:'none',banners:{}};
const seasonalLabels={'none':'بدون ثيم','ramadan':'رمضان','eid-fitr':'عيد الفطر','eid-adha':'عيد الأضحى','halloween':'هالوين','christmas':'كريسماس','new-year':'رأس السنة'};
let seasonalEditing='ramadan',seasonalBusy=false;
window.seasons=async function seasons(){
  $('#sections').innerHTML='<div class="card">جاري تحميل الثيمات الموسمية…</div>';
  try {
    const result=await api('/api/admin/seasonal-theme');
    seasonalDraft={active:result.active||'none',banners:result.banners||{}};
    seasonalEditing=seasonalEditing==='none'?'ramadan':seasonalEditing;
    seasonalRender();
  }catch(error){$('#sections').textContent=error.message||'تعذر تحميل الثيمات'}
};
function seasonalRender() {
  const current=seasonalDraft.banners[seasonalEditing]||{};
  const bannerPreview=(image,label)=>image?'<img loading="lazy" src="'+E(safeMediaUrl(image))+'" alt="'+E(label)+'" style="display:block;max-width:100%;max-height:220px;object-fit:contain;border-radius:10px;background:#fbf4ec">':'<small>لا توجد صورة مخصصة؛ ستُستخدم الزخارف الموسمية الخفيفة.</small>';
  $('#sections').innerHTML=`<div class="card" id="lfSeasonsAdmin">
    <h2>الثيمات الموسمية · Ladies First</h2>
    <p class="small-note">الثيم النشط يظهر لكل الزوار، محفوظ في قاعدة البيانات. تغيير بنر مناسبة لا يغيّر السلايدر الرئيسي أو بطاقات المناسبات الأخرى.</p>
    <div class="formgrid">
      <label>الثيم النشط<select id="seasonActive" class="field" onchange="seasonalDraft.active=this.value">${Object.entries(seasonalLabels).map(([key,label])=>'<option value="'+key+'" '+(seasonalDraft.active===key?'selected':'')+'>'+label+'</option>').join('')}</select></label>
      <label>تعديل بنرات مناسبة<select id="seasonEditor" class="field" onchange="seasonalPick(this.value)">${Object.entries(seasonalLabels).filter(([key])=>key!=='none').map(([key,label])=>'<option value="'+key+'" '+(seasonalEditing===key?'selected':'')+'>'+label+'</option>').join('')}</select></label>
    </div>
    <p class="small-note">المقاسات المقترحة: كمبيوتر 1920×900، موبايل 1080×1350، بطاقة معايدة 3:2 بمقاس 15×10 سم. النصوص والأسماء داخل البطاقات تبقى قابلة للتعديل.</p>
    ${[['desktop','بانر الكمبيوتر'],['mobile','بانر الموبايل'],['card','خلفية بطاقة المعايدة']].map(([kind,label])=>`<div style="padding:10px 0;border-bottom:1px solid #eadce3">
      <b>${label}</b><div style="margin:9px 0">${bannerPreview(current[kind],label)}</div>
      <div class="toolbar"><label class="btn">رفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="seasonalUpload('${kind}',this)"></label>
      <button class="btn" type="button" onclick="seasonalClear('${kind}')">العودة للتصميم الافتراضي</button></div>
      <input class="field" aria-label="رابط ${label}" placeholder="رابط صورة مرفوعة أو رابط HTTPS" value="${E(current[kind]||'')}" onchange="seasonalSet('${kind}',this.value)" style="width:100%">
    </div>`).join('')}
    <p class="small-note">عند ترك صورة البطاقة فارغة سيتم استخدام بانر المناسبة؛ ويمكن رفع نسخة خاصة بالطباعة. صورة رأس السنة يجب أن تكون بدون سنة مرسومة عليها حتى يظهر الرقم الآلي الصحيح فوقها.</p>
    <div class="actions"><button id="seasonSaveBtn" class="btn primary" type="button" onclick="seasonalSave()" ${seasonalBusy?'disabled':''}>تفعيل وحفظ التعديلات</button><a class="btn" href="/" target="_blank" rel="noopener">معاينة المتجر</a></div>
    <div id="seasonStatus" role="status"></div>
  </div>`;
}
window.seasonalPick=function(id){if(!seasonalLabels[id]||id==='none')return;seasonalEditing=id;seasonalRender()};
window.seasonalSet=function(kind,url){if(!['desktop','mobile','card'].includes(kind))return;(seasonalDraft.banners[seasonalEditing]||={})[kind]=String(url||'').trim();};
window.seasonalClear=function(kind){seasonalSet(kind,'');seasonalRender()};
window.seasonalUpload=async function(kind,input){
  const file=input.files?.[0];if(!file||seasonalBusy)return;
  const id=seasonalEditing;seasonalBusy=true;
  const msg=$('#seasonStatus');if(msg)msg.textContent='جاري رفع الصورة…';
  try {
    const url=(await adminUploadMany([file]))[0];
    (seasonalDraft.banners[id]||={})[kind]=url;
    seasonalRender();
    $('#seasonStatus').textContent='تم رفع الصورة؛ اضغط تفعيل وحفظ التعديلات لنشرها.';
  }catch(error){if(msg)msg.textContent=error.message||'تعذر رفع الصورة'}
  finally{seasonalBusy=false;input.value='';}
};
window.seasonalSave=async function(){
  if(seasonalBusy)return;
  seasonalBusy=true;
  const btn=$('#seasonSaveBtn');if(btn)btn.disabled=true;
  const status=$('#seasonStatus');if(status)status.textContent='جاري حفظ الثيم…';
  try {
    const saved=await api('/api/admin/seasonal-theme',{method:'PUT',body:JSON.stringify(seasonalDraft)});
    seasonalDraft={active:saved.active,banners:saved.banners||{}};
    if(status)status.textContent='تم حفظ الثيم على السيرفر. افتح المتجر لمعاينته.';
    toast('تم تفعيل وحفظ الثيم');
  }catch(error){if(status)status.textContent=error.message||'تعذر الحفظ'}
  finally{seasonalBusy=false;if(btn)btn.disabled=false}
};
