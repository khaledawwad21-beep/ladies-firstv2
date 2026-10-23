'use strict';
let seasonalDraft={active:'none',banners:{}};
const seasonalLabels={'none':'بدون ثيم','ramadan':'رمضان','eid-fitr':'عيد الفطر','eid-adha':'عيد الأضحى','halloween':'هالوين','christmas':'كريسماس','new-year':'رأس السنة','spring':'الربيع','summer':'الصيف','autumn':'الخريف','winter':'الشتاء'};
const seasonalNonCardThemes=new Set(['spring','summer','autumn','winter']);
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
  const seasonalFields=[['desktop','بانر الكمبيوتر'],['mobile','بانر الموبايل']];
  const seasonalThemeNote=seasonalNonCardThemes.has(seasonalEditing)?'<p class="small-note">هذا ثيم فصلي للمتجر فقط، بلا بطاقات معايدة.</p>':'';
  if(!seasonalNonCardThemes.has(seasonalEditing))seasonalFields.push(['card','بطاقة المعايدة الأولى'],['card2','بطاقة المعايدة الثانية'],['card3','بطاقة المعايدة الثالثة']);
  const bannerPreview=(image,label)=>image?'<img loading="lazy" src="'+E(safeMediaUrl(image))+'" alt="'+E(label)+'" style="display:block;max-width:100%;max-height:220px;object-fit:contain;border-radius:10px;background:#fbf4ec">':'<small>لا توجد صورة مخصصة؛ ستُستخدم الزخارف الموسمية الخفيفة.</small>';
  $('#sections').innerHTML=`<div class="card" id="lfSeasonsAdmin">
    <h2>الثيمات الموسمية · Ladies First</h2>
    <p class="small-note">الثيم النشط يظهر لكل الزوار، محفوظ في قاعدة البيانات. تغيير بنر مناسبة لا يغيّر السلايدر الرئيسي أو بطاقات المناسبات الأخرى.</p>
    <div class="formgrid">
      <label>الثيم النشط<select id="seasonActive" class="field" onchange="seasonalDraft.active=this.value">${Object.entries(seasonalLabels).map(([key,label])=>'<option value="'+key+'" '+(seasonalDraft.active===key?'selected':'')+'>'+label+'</option>').join('')}</select></label>
      <label>تعديل بنرات مناسبة<select id="seasonEditor" class="field" onchange="seasonalPick(this.value)">${Object.entries(seasonalLabels).filter(([key])=>key!=='none').map(([key,label])=>'<option value="'+key+'" '+(seasonalEditing===key?'selected':'')+'>'+label+'</option>').join('')}</select></label>
    </div>
    ${seasonalThemeNote}
    <div style="background:#fbf4ec;padding:14px;border:1px solid #eadce3;border-radius:14px;margin:12px 0">
      <b>استيراد التصاميم الفخمة المعتمدة دفعة واحدة</b>
      <p class="small-note">ارفَع ملف Ladies_First_Official_Seasonal_Designs.zip المحضّر لك: 6 بنرات أصلية + 18 بطاقة معايدة (3 لكل مناسبة). تحفظ الصور في قاعدة بيانات المتجر، وتبقى متاحة بعد إعادة النشر.</p>
      <label class="btn" style="display:inline-block">اختيار حزمة التصاميم <input id="seasonalZipUpload" type="file" accept=".zip,application/zip" style="display:none" onchange="seasonalImportZip(this)"></label>
      <div id="seasonImportStatus" role="status" aria-live="polite"></div>
    </div>
    <p class="small-note">ترتيب الصور تلقائيًا: بنر 1920×900، جوال حتى 1080×1350، وبطاقات 1500×1000 (15×10 سم). نحافظ على النص داخل الصورة، ونملأ الأطراف الناقصة بخلفية من نفس ألوانها، بدون قص. النصوص والأسماء داخل البطاقات تبقى قابلة للتعديل.</p>
    ${seasonalFields.map(([kind,label])=>`<div style="padding:10px 0;border-bottom:1px solid #eadce3">
      <b>${label}</b><div style="margin:9px 0">${bannerPreview(current[kind],label)}</div>
      <div class="toolbar"><label class="btn">رفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="seasonalUpload('${kind}',this)"></label>
      <button class="btn" type="button" onclick="seasonalClear('${kind}')">العودة للتصميم الافتراضي</button></div>
      <input class="field" aria-label="رابط ${label}" placeholder="رابط صورة مرفوعة أو رابط HTTPS" value="${E(current[kind]||'')}" onchange="seasonalSet('${kind}',this.value)" style="width:100%">
    </div>`).join('')}
    <p class="small-note">كل مناسبة فيها 3 بطاقات مستقلة، ويمكن تغيير أي واحدة دون التأثير على الأخرى. عند عدم رفع صور تبقى الخلفيات البسيطة الاحتياطية. حزمة الصور الجديدة تحتوي بنر رأس السنة بدون رقم ثابت، ويعرض الموقع السنة المطلوبة تلقائيًا.</p>
    <div class="actions"><button id="seasonSaveBtn" class="btn primary" type="button" onclick="seasonalSave()" ${seasonalBusy?'disabled':''}>تفعيل وحفظ التعديلات</button><a class="btn" href="/" target="_blank" rel="noopener">معاينة المتجر</a></div>
    <div id="seasonStatus" role="status"></div>
  </div>`;
}
window.seasonalPick=function(id){if(!seasonalLabels[id]||id==='none')return;seasonalEditing=id;seasonalRender()};
window.seasonalSet=function(kind,url){if(!['desktop','mobile','card','card2','card3'].includes(kind)||(seasonalNonCardThemes.has(seasonalEditing)&&!['desktop','mobile'].includes(kind)))return;(seasonalDraft.banners[seasonalEditing]||={})[kind]=String(url||'').trim();};
window.seasonalClear=function(kind){seasonalSet(kind,'');seasonalRender()};
window.seasonalUpload=async function(kind,input){
  const file=input.files?.[0];if(!file||seasonalBusy)return;
  const id=seasonalEditing;seasonalBusy=true;
  const msg=$('#seasonStatus');if(msg)msg.textContent='جاري رفع الصورة…';
  try {
    const slot=kind==='desktop'?'season-desktop':kind==='mobile'?'season-mobile':'greeting-card';
    const url=(await adminUploadMany([file],slot))[0];
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

// The official ZIP is ZIP_STORED, so the native browser can import it without any
// third-party decompression dependency. The server still validates every uploaded image.
function seasonalReadStoredZip(buffer) {
  const view=new DataView(buffer),bytes=new Uint8Array(buffer),files=new Map();
  const readText=new TextDecoder('utf-8',{fatal:true});
  let offset=0;
  while(offset+4<=bytes.length && view.getUint32(offset,true)===0x04034b50){
    if(offset+30>bytes.length)throw Error('ملف الصور غير مكتمل');
    const flags=view.getUint16(offset+6,true);
    const method=view.getUint16(offset+8,true);
    const size=view.getUint32(offset+18,true);
    const nameSize=view.getUint16(offset+26,true),extraSize=view.getUint16(offset+28,true);
    const nameStart=offset+30,dataStart=nameStart+nameSize+extraSize;
    if(flags&8 || method!==0 || dataStart+size>bytes.length)throw Error('استخدمي حزمة الصور الرسمية غير المضغوطة داخليًا');
    const name=readText.decode(bytes.subarray(nameStart,nameStart+nameSize));
    if(name==='manifest.json'){
      // Informational only. Never use untrusted manifest paths or URLs for uploads.
    } else if(/^(?:ramadan|eid-fitr|eid-adha|halloween|christmas|new-year)-(?:desktop|card-[123])\.webp$/.test(name)){
      if(files.has(name)||size>3*1024*1024)throw Error('ملف مكرر أو كبير: '+name);
      const data=bytes.slice(dataStart,dataStart+size);
      if(data.length<12||String.fromCharCode(...data.slice(0,4))!=='RIFF'||String.fromCharCode(...data.slice(8,12))!=='WEBP')throw Error('صيغة الصورة غير صالحة: '+name);
      files.set(name,new File([data],name,{type:'image/webp'}));
    } else if(!name.endsWith('/')) throw Error('ملف غير متوقع في الحزمة: '+name);
    offset=dataStart+size;
  }
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year'];
  for(const id of ids)for(const suffix of ['desktop','card-1','card-2','card-3']){
    if(!files.has(id+'-'+suffix+'.webp'))throw Error('الحزمة ناقصة: '+id+'-'+suffix);
  }
  if(files.size!==24)throw Error('عدد تصاميم الحزمة غير صحيح');
  return files;
}
window.seasonalImportZip=async function seasonalImportZip(input){
  if(seasonalBusy||!input.files?.length)return;
  const zip=input.files[0];if(zip.size>15*1024*1024){alert('حجم الحزمة كبير جدًا');input.value='';return}
  seasonalBusy=true;
  const status=$('#seasonImportStatus');
  const update=s=>{if(status?.isConnected)status.textContent=s};
  try{
    update('جاري فحص الحزمة…');
    const files=seasonalReadStoredZip(await zip.arrayBuffer());
    const updated=JSON.parse(JSON.stringify(seasonalDraft));
    let done=0;
    for(const [name,file] of files){
      const m=/^(ramadan|eid-fitr|eid-adha|halloween|christmas|new-year)-(desktop|card-[123])\.webp$/.exec(name);
      const slot=m[2]==='desktop'?'season-desktop':'greeting-card';
      const url=(await adminUploadMany([file],slot))[0];
      if(!url)throw Error('تعذر حفظ الصورة '+name);
      const field=m[2]==='desktop'?'desktop':m[2]==='card-1'?'card':m[2]==='card-2'?'card2':'card3';
      (updated.banners[m[1]]||={})[field]=url;
      update('تم رفع '+(++done)+' من 24 صورة…');
    }
    update('جاري ربط جميع الصور ببطاقات المعايدة والثيمات…');
    const saved=await api('/api/admin/seasonal-theme',{method:'PUT',body:JSON.stringify(updated)});
    seasonalDraft={active:saved.active,banners:saved.banners||{}};
    seasonalRender();
    const doneStatus=$('#seasonImportStatus');
    if(doneStatus)doneStatus.textContent='تم حفظ البنرات الستة والبطاقات الـ18 وربطها بالموقع.';
    toast('تم استيراد 24 تصميمًا بنجاح');
  }catch(error){update('تعذر استيراد الحزمة: '+(error.message||'خطأ غير متوقع'))}
  finally{seasonalBusy=false;input.value=''}
};
