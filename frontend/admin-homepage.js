'use strict';

const hpFonts = [['Tahoma,Arial,sans-serif','Tahoma'],['Arial,Tahoma,sans-serif','Arial'],['Georgia,serif','Georgia']];
const hpDefaultStyle = {font:hpFonts[0][0],color:'#ffffff',opacity:1,bgColor:'#63345e',bgOpacity:.58,x:70,y:70};
let hpSlides = [], hpStyle = {...hpDefaultStyle}, hpBusy = false, hpLoadRequest = 0;

window.homepage = async function homepage() {
  const request = ++hpLoadRequest;
  const container = $('#sections');
  container.innerHTML = '<div id="hpLoading" class="card">جاري تحميل صور السلايدر…</div>';
  try {
    const d = await api('/api/admin/settings'), s = d.settings || {};
    if (request !== hpLoadRequest || !$('#hpLoading')) return;
    hpSlides = Array.isArray(s.hero_slides) ? s.hero_slides.map(x=>({...x})) : (s.hero?.image ? [{image:s.hero.image,titleAr:'كل ما تحتاجينه.. في مكان واحد',descAr:'منتجات مختارة بعناية لتكملي إطلالتك.'}] : []);
    const style = s.hero_text_style || {};
    hpStyle = {...hpDefaultStyle};
    for(const key of ['color','bgColor']) if(/^#[a-f\d]{6}$/i.test(style[key] || '')) hpStyle[key]=style[key];
    for(const key of ['opacity','bgOpacity']) if(Number.isFinite(Number(style[key]))) hpStyle[key]=Math.max(0,Math.min(1,Number(style[key])));
    for(const key of ['x','y']) if(Number.isFinite(Number(style[key]))) hpStyle[key]=Math.max(0,Math.min(100,Number(style[key])));
    if(hpFonts.some(x=>x[0]===style.font)) hpStyle.font=style.font;
    hpRender();
  } catch(e) { if(request === hpLoadRequest && $('#hpLoading')) container.textContent=e.message; }
};

function hpCapture() {
  if (!$('#hpEditor')) return;
  hpSlides.forEach((slide,index)=>{
    for(const key of ['image','mobileImage','titleAr','titleEn','descAr','descEn']) slide[key]=$(`#hp_${index}_${key}`).value.trim();
  });
  hpStyle={font:$('#hpFont').value,color:$('#hpColor').value,bgColor:$('#hpBg').value,opacity:Number($('#hpOpacity').value),bgOpacity:Number($('#hpBgOpacity').value),x:Number($('#hpX').value),y:Number($('#hpY').value)};
}
function hpPreviewUrl(value) {
  const url=String(value||'');
  return /^https?:\/\//i.test(url)||/^\/(?!\/)[^\\]+$/.test(url)?url:'';
}
function hpRender() {
  $('#sections').innerHTML=`<div id="hpEditor" class="card"><h2>صور السلايدر والنصوص</h2><p>تظهر الصور بهذا الترتيب، وتتبدل تلقائيًا كل 3 ثوانٍ. استخدمي صورة الكمبيوتر 1920×1080 (16:9) وصورة الجوال 1080×1350 (4:5) لتظهر السلايدات كاملة. صورة الجوال اختيارية؛ إن تركت فارغة تُستخدم صورة الكمبيوتر.</p><fieldset id="hpFields" style="border:0;padding:0;min-width:0" ${hpBusy?'disabled':''}>
    <div class="toolbar"><button class="btn" type="button" onclick="hpUseWarmCampaign()">تحميل سلايدات الحملة الدافئة</button><button class="btn" type="button" onclick="hpAdd()">+ شريحة يدوية</button><label class="field">رفع عدة صور من الجهاز<input id="hpFile" type="file" multiple accept="image/png,image/jpeg,image/webp" onchange="hpUpload(this)"></label></div>
    ${hpSlides.map((slide,i)=>`<div class="card"><h3>الصورة ${i+1}</h3>${hpPreviewUrl(slide.image)?`<img src="${E(hpPreviewUrl(slide.image))}" alt="معاينة الصورة ${i+1}" style="display:block;width:100%;max-height:240px;object-fit:contain;border-radius:12px">`:""}<div class="formgrid"><label>رابط صورة الكمبيوتر — 1920×1080 (16:9)<input id="hp_${i}_image" class="field" value="${E(slide.image||"")}" placeholder="https://… أو رابط الصورة المرفوعة"></label><div><label>رابط صورة الجوال — 1080×1350 (4:5)<input id="hp_${i}_mobileImage" class="field" value="${E(slide.mobileImage||"")}" placeholder="اختياري — اتركيه فارغًا لاستخدام صورة الكمبيوتر"></label><label class="field">رفع صورة الجوال<input type="file" accept="image/png,image/jpeg,image/webp" onchange="hpUploadMobile(${i},this)"></label></div><label>العنوان بالعربية<input id="hp_${i}_titleAr" class="field" maxlength="200" value="${E(slide.titleAr||'')}"></label><label>العنوان بالإنجليزية<input id="hp_${i}_titleEn" class="field" maxlength="200" value="${E(slide.titleEn||'')}"></label><label>الوصف بالعربية<textarea id="hp_${i}_descAr" class="field" maxlength="1000">${E(slide.descAr||'')}</textarea></label><label>الوصف بالإنجليزية<textarea id="hp_${i}_descEn" class="field" maxlength="1000">${E(slide.descEn||'')}</textarea></label></div><div class="toolbar"><button type="button" class="btn" onclick="hpMove(${i},-1)" ${i===0?'disabled':''}>للأعلى</button><button type="button" class="btn" onclick="hpMove(${i},1)" ${i===hpSlides.length-1?'disabled':''}>للأسفل</button><button type="button" class="btn" onclick="hpRemove(${i})">حذف الصورة</button></div></div>`).join('')}
    <h3>تنسيق النص</h3><div class="formgrid"><label>الخط<select id="hpFont" class="field">${hpFonts.map(([value,name])=>`<option value="${value}" ${hpStyle.font===value?'selected':''}>${name}</option>`).join('')}</select></label><label>لون النص<input id="hpColor" class="field" type="color" value="${hpStyle.color}"></label><label>لون خلفية النص<input id="hpBg" class="field" type="color" value="${hpStyle.bgColor}"></label><label>ظهور النص (0 شفاف، 1 كامل)<input id="hpOpacity" class="field" type="number" min="0" max="1" step=".05" value="${hpStyle.opacity}"></label><label>شفافية خلفية النص (0 شفافة، 1 كاملة)<input id="hpBgOpacity" class="field" type="number" min="0" max="1" step=".05" value="${hpStyle.bgOpacity}"></label><label>مكان النص أفقيًا (0 يسار، 100 يمين)<input id="hpX" class="field" type="range" min="0" max="100" step="1" value="${hpStyle.x}" oninput="document.getElementById('hpXValue').textContent=this.value+'%'"><output id="hpXValue">${hpStyle.x}%</output></label><label>مكان النص عموديًا (0 أعلى، 100 أسفل)<input id="hpY" class="field" type="range" min="0" max="100" step="1" value="${hpStyle.y}" oninput="document.getElementById('hpYValue').textContent=this.value+'%'"><output id="hpYValue">${hpStyle.y}%</output></label></div>
    <div class="actions"><button class="btn primary" type="button" onclick="hpSave()">حفظ السلايدر</button><a class="btn" href="/" target="_blank" rel="noopener">فتح المتجر</a></div>
    </fieldset><p id="hpMessage" role="status">${hpBusy?'جاري الحفظ…':''}</p></div>`;
}
function hpUseWarmCampaign() {
  if(hpBusy)return;
  hpCapture();
  hpSlides=[
    {image:'/assets/campaign/slide-01-boutique.webp?v=20261008',mobileImage:'/assets/campaign/slide-01-boutique-mobile.webp?v=20261008',titleAr:'مساحة أنيقة… صُممت لأجلكِ',titleEn:'An elegant space, made for you',descAr:'اختيارات نحبّها، وتفاصيل صغيرة تصنع فرقًا كبيرًا في يومكِ.',descEn:'Thoughtful choices and little details that make your day.'},
    {image:'/assets/campaign/slide-02-bag.webp?v=20261008',mobileImage:'/assets/campaign/slide-02-bag-mobile.webp?v=20261008',titleAr:'قطعتكِ المميزة تبدأ من هنا',titleEn:'Your signature piece starts here',descAr:'أناقة ترافقكِ كل يوم، وتُشبه ذوقكِ الجميل.',descEn:'Everyday elegance that feels just like you.'},
    {image:'/assets/campaign/slide-03-beauty.webp?v=20261008',mobileImage:'/assets/campaign/slide-03-beauty-mobile.webp?v=20261008',titleAr:'دلّلي نفسكِ… فأنتِ تستحقين',titleEn:'A little care, just for you',descAr:'لحظات عناية جميلة، لأن راحتكِ ورضاكِ يليقان بكِ.',descEn:'Beautiful moments of care, because you deserve them.'},
    {image:'/assets/campaign/slide-04-jewelry.webp?v=20261008',mobileImage:'/assets/campaign/slide-04-jewelry-mobile.webp?v=20261008',titleAr:'تفاصيل ناعمة… وفرحة كبيرة',titleEn:'Soft details, a little more joy',descAr:'لمسات تكمل حضوركِ، وتضيف إلى يومكِ شيئًا من البهجة.',descEn:'Delicate touches that complete your look and brighten your day.'}
  ];
  hpRender();
  $('#hpMessage').textContent='تم تحميل 4 سلايدات. راجعي النصوص ثم اضغطي «حفظ السلايدر» لنشرها على المتجر.';
}
function hpAdd() {if(hpBusy)return;hpCapture();if(hpSlides.length>=12)return toast('الحد الأقصى 12 صورة');hpSlides.push({image:'',mobileImage:'',titleAr:'',titleEn:'',descAr:'',descEn:''});hpRender();}
function hpRemove(index) {if(hpBusy)return;hpCapture();hpSlides.splice(index,1);hpRender();}
function hpMove(index,delta) {if(hpBusy)return;hpCapture();const next=index+delta;if(next<0||next>=hpSlides.length)return;[hpSlides[index],hpSlides[next]]=[hpSlides[next],hpSlides[index]];hpRender();}
async function hpUpload(input) {
  if(hpBusy||!input.files?.length)return;
  hpCapture();
  const files=[...input.files];
  const remaining=Math.max(0,12-hpSlides.length);
  if(!remaining){input.value='';return toast('الحد الأقصى 12 صورة');}
  const selected=files.slice(0,remaining);
  const editor=$('#hpEditor');
  hpBusy=true;
  $('#hpFields').disabled=true;
  $('#hpMessage').textContent=`جاري رفع ${selected.length} صورة…`;
  try {
    const urls=await adminUploadMany(selected);
    if($('#hpEditor')!==editor)return;
    urls.forEach(url=>hpSlides.push({image:url,mobileImage:'',titleAr:'',titleEn:'',descAr:'',descEn:''}));
    hpBusy=false;
    hpRender();
    $('#hpMessage').textContent=files.length>selected.length
      ?`تم رفع ${selected.length} صورة. تم تجاهل الباقي لأن الحد الأقصى 12 شريحة.`
      :`تم رفع ${selected.length} صورة. رتبيها أو احذفي ما لا تريدينه ثم اضغطي حفظ السلايدر.`;
  }catch(e){
    if($('#hpEditor')===editor)$('#hpMessage').textContent=e.message;
  }finally{
    hpBusy=false;
    if($('#hpFields'))$('#hpFields').disabled=false;
    input.value='';
  }
}
async function hpUploadMobile(index,input) {
  if(hpBusy||!input.files?.length)return;
  hpCapture();
  const file=input.files[0];
  const editor=$('#hpEditor');
  hpBusy=true;
  $('#hpFields').disabled=true;
  $('#hpMessage').textContent='جاري رفع صورة الجوال…';
  try {
    const urls=await adminUploadMany([file]);
    if($('#hpEditor')!==editor)return;
    hpSlides[index].mobileImage=urls[0]||'';
    hpBusy=false;
    hpRender();
    $('#hpMessage').textContent='تم رفع صورة الجوال. اضغطي حفظ السلايدر لنشرها.';
  }catch(e){
    if($('#hpEditor')===editor)$('#hpMessage').textContent=e.message;
  }finally{
    hpBusy=false;
    if($('#hpFields'))$('#hpFields').disabled=false;
    input.value='';
  }
}
async function hpSave() {
  if(hpBusy)return;hpCapture();
  if(hpSlides.some(x=>!x.image)){ $('#hpMessage').textContent='أضيفي رابط صورة لكل شريحة أو احذفي الشريحة الفارغة.';return; }
  const editor=$('#hpEditor');hpBusy=true;$('#hpFields').disabled=true;$('#hpMessage').textContent='جاري حفظ السلايدر…';
  try {
    await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({hero_slides:hpSlides,hero_text_style:hpStyle})});
    if($('#hpEditor')===editor)$('#hpMessage').textContent='تم حفظ السلايدر على الخادم. افتحي المتجر أو حدّثيه لمشاهدة التغييرات.';
  }catch(e){if($('#hpEditor')===editor)$('#hpMessage').textContent=e.message;}
  finally{hpBusy=false;if($('#hpFields'))$('#hpFields').disabled=false;}
}
