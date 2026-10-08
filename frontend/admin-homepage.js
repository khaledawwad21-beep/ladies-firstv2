'use strict';

const hpFonts = [['Tahoma,Arial,sans-serif','Tahoma'],['Arial,Tahoma,sans-serif','Arial'],['Georgia,serif','Georgia']];
const hpDefaultStyle = {font:hpFonts[0][0],color:'#ffffff',opacity:1,bgColor:'#63345e',bgOpacity:.58,x:70,y:70,intervalSeconds:3,transition:'smooth'};
let hpSlides = [], hpStyle = {...hpDefaultStyle}, hpBusy = false, hpLoadRequest = 0, hpPointerDrag = null;

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
    hpStyle.intervalSeconds=Math.max(2,Math.min(30,Number(style.intervalSeconds)||3));
    hpStyle.transition=['smooth','fade','slide','zoom','instant'].includes(style.transition)?style.transition:'smooth';
    hpFeatureSettings=s.feature_carousels||{};
    hpRender();
  } catch(e) { if(request === hpLoadRequest && $('#hpLoading')) container.textContent=e.message; }
};

function hpCapture() {
  hpFeatureCapture();
  if (!$('#hpEditor')) return;
  hpSlides.forEach((slide,index)=>{
    for(const key of ['image','mobileImage','titleAr','titleEn','descAr','descEn']) slide[key]=$(`#hp_${index}_${key}`).value.trim();
    slide.hideText=$(`#hp_${index}_hideText`)?.checked===true;
  });
  hpStyle={intervalSeconds:Number($('#hpInterval').value),transition:$('#hpTransition').value,font:$('#hpFont').value,color:$('#hpColor').value,bgColor:$('#hpBg').value,opacity:Number($('#hpOpacity').value),bgOpacity:Number($('#hpBgOpacity').value),x:Number($('#hpX').value),y:Number($('#hpY').value)};
}
function hpPreviewUrl(value) {
  const url=String(value||'');
  return /^https?:\/\//i.test(url)||/^\/(?!\/)[^\\]+$/.test(url)?url:'';
}
function hpRender() {
  $('#sections').innerHTML=`<div id="hpEditor" class="card"><h2>صور السلايدر والنصوص</h2><p>تظهر الصور بهذا الترتيب وتتبدل حسب المدة والأسلوب المختارين. أفضل مقاس للكمبيوتر 1920×900 (2.13:1)، وللجوال 1080×1350 (4:5). ارفعي نسختين لتظهر الصورة كاملة بالمقاس المناسب لكل جهاز.</p><fieldset id="hpFields" style="border:0;padding:0;min-width:0" ${hpBusy?'disabled':''}>
    <div class="toolbar"><button class="btn" type="button" onclick="hpUseLogoSlide()">استخدام سلايد الشعار الجديد</button><button class="btn" type="button" onclick="hpUseWarmCampaign()">تحميل سلايدات الحملة الدافئة</button><button class="btn" type="button" onclick="hpAdd()">+ شريحة يدوية</button><label class="btn" for="hpFile">اختيار صور للسلايدر</label><input id="hpFile" type="file" multiple accept="image/png,image/jpeg,image/webp" onchange="hpUpload(this)" style="display:none"></div>
    <small class="small-note">بعد الرفع تظهر الصورة ضمن الشرائح تلقائيًا. اضغطي «حفظ السلايدر» لاعتمادها.</small><p id="hpMessage" role="status">${hpBusy?'جاري الرفع أو الحفظ…':''}</p>
    <h3>حركة السلايدر</h3><div class="formgrid"><label>مدة عرض الشريحة بالثواني<input id="hpInterval" class="field" type="number" min="2" max="30" value="${hpStyle.intervalSeconds}" onchange="hpStartPreview()"></label><label>أسلوب الانتقال<select id="hpTransition" class="field" onchange="hpStartPreview()">${[['smooth','انتقال حريري ناعم'],['fade','اندماج ناعم'],['slide','انزلاق أفقي'],['zoom','تكبير ناعم'],['instant','تبديل مباشر']].map(([v,t])=>`<option value="${v}" ${hpStyle.transition===v?'selected':''}>${t}</option>`).join('')}</select></label></div><button class="btn" type="button" onclick="hpStartPreview()">تشغيل المعاينة</button><div id="hpMotionPreview" class="hp-motion-preview heroCard" aria-label="معاينة حركة السلايدات"><img class="heroLogoLayer"><img class="heroLogoLayer"></div>
    ${hpFeatureControls()}
    <h3>ترتيب السلايدات</h3><p>اسحب بطاقة الصورة إلى مكانها، أو استخدم أزرار التحريك. ثم اضغط «حفظ السلايدر».</p><div class="hp-order-list" id="hpOrderList">${hpSlides.map((slide,i)=>`<div class="hp-order-item" data-hp-slide="${i}"><button type="button" class="hp-order-handle" onpointerdown="hpDragStart(event,${i})" aria-label="اسحب الشريحة ${i+1} لتغيير ترتيبها">${hpPreviewUrl(slide.image)?`<img draggable="false" src="${E(hpPreviewUrl(slide.image))}" alt="الشريحة ${i+1}">`:''}<b>⠿ الشريحة ${i+1}</b></button><div class="hp-order-actions"><button type="button" class="btn" onclick="hpMove(${i},-1)" ${i===0?'disabled':''}>قبل</button><button type="button" class="btn" onclick="hpMove(${i},1)" ${i===hpSlides.length-1?'disabled':''}>بعد</button></div><label>الموضع<select class="field" aria-label="موضع الشريحة ${i+1}" onchange="hpReorder(${i},Number(this.value))">${hpSlides.map((_,n)=>`<option value="${n}" ${n===i?'selected':''}>${n+1}</option>`).join('')}</select></label></div>`).join('')}</div><div class="actions hp-save-top"><button class="btn primary" type="button" onclick="hpSave()">حفظ السلايدر</button></div>
    ${hpSlides.map((slide,i)=>`<div id="hpSlide_${i}" class="card hp-slide" data-hp-slide="${i}"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>الشريحة ${i+1}</h3><button type="button" class="btn" style="touch-action:none;cursor:grab" aria-label="اسحبي لإعادة ترتيب الشريحة ${i+1}" onpointerdown="hpDragStart(event,${i})" onpointerup="hpDragEnd(event,${i})" onpointercancel="hpDragEnd(event,${i})">⠿ اسحبي للترتيب</button></div>${hpPreviewUrl(slide.image)?`<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin:8px 0 14px"><div style="flex:1 1 300px"><small>معاينة الكمبيوتر • 2.13:1</small><img src="${E(hpPreviewUrl(slide.image))}" alt="معاينة الكمبيوتر ${i+1}" style="display:block;width:100%;aspect-ratio:2.13/1;max-height:240px;object-fit:contain;object-position:center;background:#fbf4ec;border-radius:12px"></div>${hpPreviewUrl(slide.mobileImage)?`<div style="flex:0 1 130px"><small>معاينة الجوال • 4:5</small><img src="${E(hpPreviewUrl(slide.mobileImage))}" alt="معاينة الجوال ${i+1}" style="display:block;width:100%;aspect-ratio:4/5;max-height:180px;object-fit:contain;object-position:center;background:#fbf4ec;border-radius:12px"></div>`:""}</div>`:""}<div class="formgrid"><label>رابط صورة الكمبيوتر — 1920×900 (2.13:1)<input id="hp_${i}_image" class="field" value="${E(slide.image||"")}" placeholder="https://… أو رابط الصورة المرفوعة"></label><div><label>رابط صورة الجوال — 1080×1350 (4:5)<input id="hp_${i}_mobileImage" class="field" value="${E(slide.mobileImage||"")}" placeholder="اختياري — اتركيه فارغًا لاستخدام صورة الكمبيوتر"></label><label class="btn" for="hpMobileFile_${i}">اختيار صورة الجوال</label><input id="hpMobileFile_${i}" type="file" accept="image/png,image/jpeg,image/webp" onchange="hpUploadMobile(${i},this)" style="display:none"></div><label>العنوان بالعربية<input id="hp_${i}_titleAr" class="field" maxlength="200" value="${E(slide.titleAr||'')}"></label><label>العنوان بالإنجليزية<input id="hp_${i}_titleEn" class="field" maxlength="200" value="${E(slide.titleEn||'')}"></label><label>الوصف بالعربية<textarea id="hp_${i}_descAr" class="field" maxlength="1000">${E(slide.descAr||'')}</textarea></label><label>الوصف بالإنجليزية<textarea id="hp_${i}_descEn" class="field" maxlength="1000">${E(slide.descEn||'')}</textarea></label><label><input id="hp_${i}_hideText" type="checkbox" ${slide.hideText===true?'checked':''}> إخفاء النص والزر لإظهار صورة الشعار فقط</label></div><div class="toolbar"><button type="button" class="btn" onclick="hpMove(${i},-1)" ${i===0?'disabled':''}>للأعلى</button><button type="button" class="btn" onclick="hpMove(${i},1)" ${i===hpSlides.length-1?'disabled':''}>للأسفل</button><button type="button" class="btn" onclick="hpRemove(${i})">حذف الصورة</button></div></div>`).join('')}
    <h3>تنسيق النص</h3><div class="formgrid"><label>الخط<select id="hpFont" class="field">${hpFonts.map(([value,name])=>`<option value="${value}" ${hpStyle.font===value?'selected':''}>${name}</option>`).join('')}</select></label><label>لون النص<input id="hpColor" class="field" type="color" value="${hpStyle.color}"></label><label>لون خلفية النص<input id="hpBg" class="field" type="color" value="${hpStyle.bgColor}"></label><label>ظهور النص (0 شفاف، 1 كامل)<input id="hpOpacity" class="field" type="number" min="0" max="1" step=".05" value="${hpStyle.opacity}"></label><label>شفافية خلفية النص (0 شفافة، 1 كاملة)<input id="hpBgOpacity" class="field" type="number" min="0" max="1" step=".05" value="${hpStyle.bgOpacity}"></label><label>مكان النص أفقيًا (0 يسار، 100 يمين)<input id="hpX" class="field" type="range" min="0" max="100" step="1" value="${hpStyle.x}" oninput="document.getElementById('hpXValue').textContent=this.value+'%'"><output id="hpXValue">${hpStyle.x}%</output></label><label>مكان النص عموديًا (0 أعلى، 100 أسفل)<input id="hpY" class="field" type="range" min="0" max="100" step="1" value="${hpStyle.y}" oninput="document.getElementById('hpYValue').textContent=this.value+'%'"><output id="hpYValue">${hpStyle.y}%</output></label></div>
    <div class="actions"><button class="btn primary" type="button" onclick="hpSave()">حفظ السلايدر</button><a class="btn" href="/" target="_blank" rel="noopener">فتح المتجر</a></div>
    </fieldset></div>`;
  hpStartPreview();
  hpFeaturePreview();
}
function hpUseLogoSlide() {
  if(hpBusy)return;
  hpCapture();
  const logoSlide={image:'/assets/campaign/slide-06-home-desktop.jpg?v=20261009',mobileImage:'/assets/campaign/slide-06-home-mobile.jpg?v=20261009',titleAr:'',titleEn:'',descAr:'',descEn:'',hideText:true};
  if(hpSlides.length)hpSlides[0]={...hpSlides[0],...logoSlide};
  else hpSlides=[logoSlide];
  hpRender();
  $('#hpMessage').textContent='تم تجهيز سلايد الشعار بالمقاسين. اضغطي «حفظ السلايدر» لنشره على المتجر.';
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
function hpReorder(from,to){
 if(hpBusy||from===to||!Number.isInteger(to)||to<0||to>=hpSlides.length)return;
 hpCapture();const [slide]=hpSlides.splice(from,1);hpSlides.splice(to,0,slide);hpRender();
 $('#hpMessage').textContent='تم تغيير ترتيب الشرائح. اضغط «حفظ السلايدر» لاعتماده.';
}
function hpDragStart(event,index) {
 if(hpBusy || (event.pointerType==='mouse' && event.button!==0))return;
 event.preventDefault();hpCapture();hpPointerDrag={from:index,to:index,pointerId:event.pointerId};
 try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}
 event.currentTarget.closest('[data-hp-slide]')?.classList.add('hp-is-dragging');
}
function hpDragMove(event){
 const drag=hpPointerDrag;if(!drag||drag.pointerId!==event.pointerId)return;
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-hp-slide]');
 if(target){drag.to=Number(target.dataset.hpSlide);document.querySelectorAll('.hp-drop-target').forEach(x=>x.classList.remove('hp-drop-target'));target.classList.add('hp-drop-target');}
 // Keep long editors reachable during a touch drag.
 if(event.clientY<70)window.scrollBy(0,-18);
 else if(event.clientY>window.innerHeight-70)window.scrollBy(0,18);
}
function hpDragEnd(event,index) {
 const drag=hpPointerDrag;if(!drag||drag.pointerId!==event.pointerId)return;
 const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-hp-slide]');
 const to=target?Number(target.dataset.hpSlide):drag.to;
 hpPointerDrag=null;document.querySelectorAll('.hp-is-dragging,.hp-drop-target').forEach(x=>x.classList.remove('hp-is-dragging','hp-drop-target'));
 if(event.type==='pointercancel')return;
 hpReorder(drag.from,to);
}
if(typeof document!=='undefined'){
 document.addEventListener('pointermove',hpDragMove);
 document.addEventListener('pointerup',hpDragEnd);
 document.addEventListener('pointercancel',hpDragEnd);
}
async function hpUpload(input) {
  if(hpBusy||!input.files?.length)return;
  hpCapture();
  const files=[...input.files];
  const remaining=Math.max(0,12-hpSlides.length);
  if(!remaining){input.value='';return toast('الحد الأقصى 12 صورة');}
  const selected=files.slice(0,remaining);
  const firstAddedSlide=hpSlides.length;
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
    document.getElementById(`hpSlide_${firstAddedSlide}`)?.scrollIntoView({behavior:"smooth",block:"center"});
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
    $('#hpMessage').textContent='تم رفع صورة الجوال؛ أكملي ثم اضغطي حفظ السلايدر لنشرها.';
    document.getElementById('hpSlide_'+index)?.scrollIntoView({behavior:'smooth',block:'center'});
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
    let storefrontSynced=false;
    try{const fresh=await api('/api/settings?ts='+Date.now());const savedSlides=fresh?.settings?.hero_slides;if(Array.isArray(savedSlides)){localStorage.setItem('lf_hero_text_style',JSON.stringify(fresh.settings.hero_text_style));localStorage.setItem('lf_hero_slides',JSON.stringify(savedSlides));storefrontSynced=true;}}catch{}
    if($('#hpEditor')===editor)$('#hpMessage').textContent=storefrontSynced?'تم حفظ السلايدر وتحديثه في المتجر المفتوح مباشرة.':'تم حفظ السلايدر. حدّثي المتجر إذا كان مفتوحًا.';
  }catch(e){if($('#hpEditor')===editor)$('#hpMessage').textContent=e.message;}
  finally{hpBusy=false;if($('#hpFields'))$('#hpFields').disabled=false;}
}

let hpPreviewTimer=null,hpPreviewRequest=0;
function hpStartPreview(){
 const request=++hpPreviewRequest;clearTimeout(hpPreviewTimer);const box=$('#hpMotionPreview');if(!box)return;
 box.dataset.transition=$('#hpTransition').value;
 const images=hpSlides.map(x=>hpPreviewUrl(x.image)).filter(Boolean);
 if(!images.length){box.textContent='أضيفي صور السلايدر لتظهر المعاينة';return}
 if(box.querySelectorAll('img').length!==2)box.innerHTML='<img class="heroLogoLayer"><img class="heroLogoLayer">';
 let index=0,layer=0;const frames=box.querySelectorAll('img');frames.forEach(x=>x.classList.remove('active'));frames[0].src=images[0];frames[0].classList.add('active');
 const tick=()=>{
  if(request!==hpPreviewRequest||!box.isConnected||$('#hpMotionPreview')!==box)return;
  index=(index+1)%images.length;const incoming=1-layer;
  const preload=new Image();
  preload.onload=async()=>{
   if(typeof preload.decode==='function')await preload.decode().catch(()=>{});
   if(request!==hpPreviewRequest||!box.isConnected||$('#hpMotionPreview')!==box)return;
   const outgoing=layer;frames[incoming].classList.remove('active');void frames[incoming].offsetWidth;
   frames[incoming].src=preload.src;frames[incoming].style.zIndex='2';frames[outgoing].style.zIndex='1';frames[incoming].classList.add('active');layer=incoming;
   if(['smooth','fade'].includes(box.dataset.transition))setTimeout(()=>{if(request===hpPreviewRequest)frames[outgoing].classList.remove('active')},950);else frames[outgoing].classList.remove('active');
   hpPreviewTimer=setTimeout(tick,Math.max(2,Math.min(30,Number($('#hpInterval')?.value)||3))*1000);
  };
  preload.onerror=()=>{if(request===hpPreviewRequest&&box.isConnected)hpPreviewTimer=setTimeout(tick,3000)};
  preload.src=images[index];
 };
 if(images.length>1)hpPreviewTimer=setTimeout(tick,Math.max(2,Math.min(30,Number($('#hpInterval').value)||3))*1000);
}

let hpFeatureSettings={},hpFeatureTimer=null;
function hpFeatureControls(){return `<h3>Top 5 والأكثر مبيعًا</h3><p>مدة وأسلوب مستقل لكل قسم. اسحب بطاقات المعاينة بالإصبع لتجربة التمرير.</p>${[['top5','Top 5'],['bestSellers','الأكثر مبيعًا']].map(([key,title])=>{const c=window.LFCarouselMotion?.config(hpFeatureSettings[key])||{intervalSeconds:3.5,transition:'smooth'};return `<div class="card"><h4>${title}</h4><div class="formgrid"><label>مدة التقليب بالثواني<input id="hpFeature_${key}_interval" class="field" type="number" min="2" max="30" step=".5" value="${c.intervalSeconds}" onchange="hpFeaturePreview()"></label><label>أسلوب الانتقال<select id="hpFeature_${key}_effect" class="field" onchange="hpFeaturePreview()">${[['smooth','تمرير حريري ناعم'],['slide','انزلاق'],['fade','تلاشي ناعم'],['instant','تبديل مباشر']].map(([v,t])=>`<option value="${v}" ${c.transition===v?'selected':''}>${t}</option>`).join('')}</select></label></div><div class="hp-feature-preview" id="hpFeaturePreview_${key}" dir="rtl">${hpSlides.length?Array.from({length:Math.max(5,hpSlides.length)},(_,i)=>{const slide=hpSlides[i%hpSlides.length];return `<div class="featureCard">${hpPreviewUrl(slide.image)?`<img draggable="false" src="${E(hpPreviewUrl(slide.image))}" alt="">`:''}<b>منتج للمعاينة ${i+1}</b></div>`}).join(''):Array.from({length:5},(_,i)=>`<div class="featureCard"><b>منتج للمعاينة ${i+1}</b></div>`).join('')}</div><div class="toolbar"><button class="btn" type="button" onclick="hpFeatureMove('${key}',-1)">السابق</button><button class="btn" type="button" onclick="hpFeatureMove('${key}',1)">التالي</button></div></div>`}).join('')}<button class="btn primary" type="button" onclick="hpFeatureSave()">حفظ إعدادات Top 5 والأكثر مبيعًا</button><p id="hpFeatureMessage" role="status"></p>`}
function hpFeatureCapture(){for(const key of ['top5','bestSellers']){const input=$('#hpFeature_'+key+'_interval'),effect=$('#hpFeature_'+key+'_effect');if(input&&effect)hpFeatureSettings[key]={intervalSeconds:Number(input.value),transition:effect.value}}}
function hpFeaturePreview(){clearInterval(hpFeatureTimer);if(!window.LFCarouselMotion)return;hpFeatureCapture();for(const key of ['top5','bestSellers'])window.LFCarouselMotion.bind($('#hpFeaturePreview_'+key));hpFeatureTimer=setInterval(()=>{if(!$('#hpFeaturePreview_top5')){clearInterval(hpFeatureTimer);return}if(document.hidden)return;for(const key of ['top5','bestSellers'])window.LFCarouselMotion.tick($('#hpFeaturePreview_'+key),hpFeatureSettings[key])},250)}
function hpFeatureMove(key,dir){hpFeatureCapture();window.LFCarouselMotion?.move($('#hpFeaturePreview_'+key),dir,hpFeatureSettings[key])}
async function hpFeatureSave(){hpFeatureCapture();try{await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({feature_carousels:hpFeatureSettings})});localStorage.setItem('lf_feature_carousels',JSON.stringify(hpFeatureSettings));$('#hpFeatureMessage').textContent='تم حفظ إعدادات القسمين وتحديث المتجر.'}catch(e){$('#hpFeatureMessage').textContent=e.message}}
