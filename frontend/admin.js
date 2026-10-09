function safeMediaUrl(value){const s=String(value||'');if(/[<>\"'\\\x00-\x20]/.test(s))return '#';return /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(s)?s:'#'}
const $=s=>document.querySelector(s),E=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),M=v=>Number(v||0).toFixed(2);let sec='dashboard',currentAdminUser=null;
const ADMIN_MALE_COPY=[
  ['اختاري','اختر'],['استخدمي','استخدم'],['راجعي','راجع'],['اضغطي','اضغط'],
  ['أضيفي','أضف'],['اكتبي','اكتب'],['عدّلي','عدّل'],['أدخلي','أدخل'],
  ['احذفي','احذف'],['رتبي','رتب'],['اتركي','اترك'],['حدّثي','حدّث'],
  ['جرّبي','جرّب'],['سيدتي','سيدي']
];
function adminGender(){const value=String(currentAdminUser?.gender||'').trim().toLowerCase();if(['male','m','ذكر'].includes(value))return 'male';if(['female','f','أنثى','انثى'].includes(value))return 'female';return ''}
function adminIsMale(){return adminGender()==='male'}
function adminGenderText(value){
  let text=String(value??'');
  if(!adminIsMale())return text;
  for(const [female,male] of ADMIN_MALE_COPY)text=text.split(female).join(male);
  return text;
}
let adminGenderCopyBusy=false;
function applyAdminGenderCopy(root=document){
  if(!currentAdminUser||adminGenderCopyBusy)return;
  adminGenderCopyBusy=true;
  try{
    if(adminIsMale()){
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(node=>{
        const parent=node.parentElement;
        if(!parent||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(parent.tagName))return;
        const next=adminGenderText(node.nodeValue);
        if(next!==node.nodeValue)node.nodeValue=next;
      });
      root.querySelectorAll?.('input[placeholder],textarea[placeholder],[title],[aria-label]').forEach(el=>{
        for(const attr of ['placeholder','title','aria-label']){
          if(!el.hasAttribute(attr))continue;
          const value=el.getAttribute(attr),next=adminGenderText(value);
          if(next!==value)el.setAttribute(attr,next);
        }
      });
    }
    const greeting=$('#adminGreeting');
    if(greeting){
      const name=currentAdminUser?.name||currentAdminUser?.email||currentAdminUser?.phone||'';
      const welcome=adminGender()==='male'?'أهلًا بك في فريق Ladies First، ':adminGender()==='female'?'أهلًا بكِ في فريق Ladies First، ':'مرحبًا بك في فريق Ladies First، ';
      greeting.textContent=name?welcome+name+' ✨':'';
    }
  }finally{adminGenderCopyBusy=false}
}
let adminGenderObserver=null;
if(typeof MutationObserver!=='undefined'&&document?.documentElement){
  adminGenderObserver=new MutationObserver(()=>{if(currentAdminUser)setTimeout(()=>applyAdminGenderCopy($('#app')||document),0)});
  adminGenderObserver.observe(document.documentElement,{childList:true,subtree:true});
}

async function api(u,o={}){const token=localStorage.getItem('lf_admin_token')||'';const headers={'Content-Type':'application/json',...(o.headers||{})};if(token)headers.Authorization='Bearer '+token;let r=await fetch(u,{...o,headers}),d={};try{d=await r.json()}catch{}if(r.status===401){localStorage.removeItem('lf_admin_token');showLogin();const e=Error(d.message||'انتهت جلسة الدخول');e.status=401;e.code=d.code||'UNAUTHORIZED';throw e}if(!r.ok||d.ok===false){const e=Error(d.message||('HTTP '+r.status));e.status=r.status;e.code=d.code||'HTTP_ERROR';e.data=d;throw e}return d}

function showLogin(){const l=$('#login'),a=$('#app');if(l)l.hidden=false;if(a)a.hidden=true;const b=$('#recoveryBox');if(b)b.hidden=true}

const STAFF_DAILY_MOTIVATIONS=[
  'خطوة صغيرة بإتقان اليوم تصنع فرقًا كبيرًا مع الوقت.',
  'كل يوم فرصة جديدة لنترك أثرًا جميلًا في تجربة زبائننا.',
  'نجاح الفريق يبدأ بتعاوننا واهتمامنا بالتفاصيل.',
  'ابتسامتك واهتمامك يصنعان تجربة أجمل لكل زبونة.',
  'إنجاز اليوم يبدأ بتركيز هادئ ونية طيبة.',
  'كل موقف لطيف قد يصنع ذكرى جميلة لزبونة.',
  'وجودك وجهدك جزء مهم من نجاح Ladies First.',
  'ابدأ يومك بثقة؛ إنجازاتك الصغيرة تستحق التقدير.',
  'التفاصيل الجميلة تصنع فرقًا، وشغلك اليوم يضيف لمستك.',
  'يوم جديد، فرصة جديدة للتعاون والإنجاز.'
];
function showDailyStaffMotivation(){
  if(String(currentAdminUser?.role||'').toLowerCase()!=='staff')return;
  const now=new Date(),dayKey=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const identity=String(currentAdminUser?.id||currentAdminUser?.email||currentAdminUser?.phone||'staff');
  const key='lf_staff_motivation_seen:'+identity;
  try{if(localStorage.getItem(key)===dayKey)return;localStorage.setItem(key,dayKey)}catch{}
  const dayNumber=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
  const offset=[...identity].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  const message=STAFF_DAILY_MOTIVATIONS[(dayNumber+offset)%STAFF_DAILY_MOTIVATIONS.length];
  const name=String(currentAdminUser?.name||'').trim();
  const greeting=name?'صباح الخير، '+E(name)+' 🌸':'صباح الخير 🌸';
  modal('رسالة صباحية من Ladies First','<div class="staff-login-message"><div class="staff-message-copy"><b>'+greeting+'</b><p>'+E(message)+'</p></div><div class="actions"><button class="btn primary" type="button" onclick="closeModal()">شكرًا، لنبدأ يومنا</button></div></div>');
}

async function showApp(){const l=$('#login'),a=$('#app');if(l)l.hidden=true;if(a)a.hidden=false;try{const d=await api('/api/auth/me');if(!d.user||!['owner','admin','staff'].includes(String(d.user.role||'').toLowerCase())){localStorage.removeItem('lf_admin_token');showLogin();$('#loginMsg').textContent='جلسة الإدارة غير صالحة أو الحساب غير مفعل.';return}currentAdminUser=d.user;applyAdminPermissions();applyAdminGenderCopy($('#app')||document);showDailyStaffMotivation();startStaffMessagePolling();const allowed=navs.find(n=>!n.hidden);if(!allowed){$('#title').textContent='لا توجد صلاحيات';$('#sections').innerHTML='<div class="card"><h2>لا توجد صلاحيات إدارية مخصصة لهذا الحساب.</h2><p>راجعي المالك لتحديد الأقسام المسموح بها.</p></div>';return}if(!canAdminSection(sec))sec=allowed.dataset.s;navs.forEach(n=>n.classList.toggle('active',n.dataset.s===sec));$('#title').textContent=titles[sec];await load()}catch(e){if(a)a.hidden=true;if(l)l.hidden=false;const msg=e&&e.message?e.message:'تعذر التحقق من جلسة الدخول';$('#loginMsg').textContent=msg.includes('جلسة')||msg.includes('انتهت')?msg:'تعذر فتح لوحة التحكم: '+msg}}
async function adminLogin(){const contact=$('#loginContact').value.trim(),password=$('#loginPassword').value||'',msg=$('#loginMsg');if(!contact||!password){msg.textContent='أدخل البريد أو الهاتف وكلمة المرور';return}try{const d=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact,password})});const x=await d.json();if(!d.ok||x.ok===false)throw Error(x.message||'بيانات الدخول غير صحيحة');if(!['owner','admin','staff'].includes(String(x.user?.role||'').toLowerCase()))throw Error('هذا الحساب ليس حساب إدارة');localStorage.setItem('lf_admin_token',x.token);showApp()}catch(e){msg.textContent=e.message}}
async function adminPasskeyLogin(){const contact=$('#loginContact').value.trim(),msg=$('#loginMsg');if(!contact){msg.textContent='أدخل البريد أو الهاتف أولًا';return}if(!window.LFPasskeys?.supported()){msg.textContent='هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.';return}try{let r=await fetch('/api/passkeys/login/options',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact})}),o=await r.json();if(!r.ok||o.ok===false)throw Error(o.message||'لا توجد بصمة مفعلة');const credential=await window.LFPasskeys.getCredential(o);r=await fetch('/api/passkeys/login/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:o.challengeId,credential})});const x=await r.json();if(!r.ok||x.ok===false)throw Error(x.message||'تعذر التحقق من البصمة');if(!['owner','admin','staff'].includes(String(x.user?.role||'').toLowerCase()))throw Error('هذه البصمة ليست لحساب إدارة');localStorage.setItem('lf_admin_token',x.token);msg.textContent='';showApp()}catch(e){msg.textContent=e?.name==='NotAllowedError'?'تم إلغاء طلب البصمة أو لم يتم التعرف عليها.':(e.message||'تعذر تسجيل الدخول بالبصمة')}}
async function logout(){try{await api('/api/auth/logout',{method:'POST'});}catch{}stopStaffMessagePolling();localStorage.removeItem('lf_admin_token');showLogin()}
function showRecovery(){const b=$('#recoveryBox');b.hidden=false;b.innerHTML='<h3>استرداد كلمة المرور</h3><p class="small-note">أدخل الإيميل أو رقم الهاتف. سيصلك رمز صالح لمدة 15 دقيقة.</p><input id="rc" class="field" placeholder="البريد الإلكتروني أو الهاتف" autocomplete="username"><button class="btn" onclick="requestRecovery()">إرسال رمز الاسترداد</button><div id="recoveryConfirm" style="margin-top:10px"></div>'}
async function requestRecovery(){const contact=$('#rc').value.trim();if(!contact)return;try{const d=await fetch('/api/auth/password-recovery/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact})});const x=await d.json();if(!d.ok||x.ok===false)throw Error(x.message||'تعذر إرسال الرمز');$('#recoveryConfirm').innerHTML='<input id="rCode" class="field" inputmode="numeric" maxlength="6" placeholder="رمز الاسترداد"><input id="rNew" class="field" type="password" minlength="12" placeholder="كلمة المرور الجديدة — 12 خانة على الأقل"><button class="btn primary" onclick="confirmRecovery()">تأكيد وتغيير كلمة المرور</button>';$('#loginMsg').textContent=x.message}catch(e){$('#loginMsg').textContent=e.message}}
async function confirmRecovery(){const contact=$('#rc').value.trim(),code=$('#rCode').value.trim(),newPassword=$('#rNew').value;if(newPassword.length<12){$('#loginMsg').textContent='كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل';return}try{const d=await fetch('/api/auth/password-recovery/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact,code,newPassword})});const x=await d.json();if(!d.ok||x.ok===false)throw Error(x.message||'تعذر تغيير كلمة المرور');$('#loginMsg').textContent='تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.';$('#recoveryBox').hidden=true}catch(e){$('#loginMsg').textContent=e.message}}
function showOwnerSetup(){const b=$('#recoveryBox');b.hidden=false;b.innerHTML='<h3>إعداد المالك لأول مرة</h3><p class="small-note">هذا الخيار يعمل مرة واحدة فقط، ومقيد بالإيميل والهاتف المعتمدين في النظام.</p><input id="osName" class="field" value="Khaled" placeholder="اسم المالك"><input id="osEmail" class="field" value="khaledawwad21@gmail.com" readonly><input id="osPhone" class="field" value="0562499924" readonly><input id="osSetupToken" class="field" type="password" autocomplete="off" placeholder="رمز الإعداد الخاص بالخادم"><input id="osPass" class="field" type="password" minlength="12" placeholder="اختر كلمة مرور — 12 خانة على الأقل"><button class="btn primary" onclick="bootstrapOwner()">إنشاء حساب المالك</button>'}
async function bootstrapOwner(){const password=$('#osPass').value;if(password.length<12){$('#loginMsg').textContent='كلمة المرور يجب أن تكون 12 خانة على الأقل';return}try{const d=await fetch('/api/auth/bootstrap-owner',{method:'POST',headers:{'Content-Type':'application/json','X-Bootstrap-Token':$('#osSetupToken')?.value||''},body:JSON.stringify({name:$('#osName').value.trim(),email:$('#osEmail').value,phone:$('#osPhone').value,password})});const x=await d.json();if(!d.ok||x.ok===false)throw Error((x.code?x.code+' — ':'')+(x.message||'تعذر إنشاء حساب المالك'));localStorage.setItem('lf_admin_token',x.token);showApp()}catch(e){$('#loginMsg').textContent=e.message}}
let staffMessagePollTimer=null,staffMessageCheckBusy=false;
function startStaffMessagePolling(){
  if(staffMessagePollTimer)clearInterval(staffMessagePollTimer);
  checkStaffGeneralMessage().catch(error=>console.warn('[STAFF MESSAGE]',error));
  staffMessagePollTimer=setInterval(()=>{if(!document.hidden)checkStaffGeneralMessage().catch(error=>console.warn('[STAFF MESSAGE]',error));},30000);
}
function stopStaffMessagePolling(){if(staffMessagePollTimer){clearInterval(staffMessagePollTimer);staffMessagePollTimer=null}}
async function checkStaffGeneralMessage(){
  if(!currentAdminUser||staffMessageCheckBusy||$('#modal')?.classList.contains('open'))return;
  staffMessageCheckBusy=true;
  try{
    const d=await api('/api/staff-message');
    if(!d.shouldShow||!d.message?.message)return;
    const version=String(d.message.version||'');
    modal('رسالة عامة من الإدارة',`<div class="staff-login-message"><div class="staff-message-copy">${E(d.message.message).replace(/\n/g,'<br>')}</div><div class="actions"><button class="btn primary" type="button" onclick="acknowledgeStaffMessage(this.dataset.messageVersion)" data-message-version="${E(version)}">تمت القراءة</button></div></div>`);
  }finally{staffMessageCheckBusy=false}
}
async function acknowledgeStaffMessage(version){
  const button=$('#modalBox .actions .btn.primary');
  if(button){button.disabled=true;button.textContent='جارٍ تسجيل القراءة…'}
  try{
    const result=await api('/api/staff-message/read',{method:'POST',body:JSON.stringify({version})});
    if(!result.ok)throw Error(result.message||'تعذر تسجيل قراءة الرسالة');
    closeModal();toast('تم تسجيل قراءة الرسالة، شكرًا.');
  }catch(e){
    if(button){button.disabled=false;button.textContent='تمت القراءة'}
    alert(e.message||'تعذر تسجيل قراءة الرسالة');
  }
}
function normalizeStorefrontMessage(value){
  if(typeof value==='string')return {active:!!value.trim(),message:value.trim()};
  if(value&&typeof value==='object')return {active:value.active===true,message:String(value.message||'').trim()};
  return {active:false,message:''};
}
async function publishStorefrontGeneralMessage(){
  const active=!!$('#storefrontMessageEnabled')?.checked;
  const message=String($('#storefrontGeneralMessageText')?.value||'').trim().slice(0,2000);
  if(active&&!message)return alert('اكتبي رسالة الزبائن أولًا أو أوقفي إظهارها');
  try{
    await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({storefront_general_message:{active,message}})});
    const saved=normalizeStorefrontMessage((await api('/api/admin/settings')).settings?.storefront_general_message);
    if(saved.active!==active||saved.message!==message)throw Error('لم يتم تأكيد حفظ الرسالة');
    toast(active?'تم نشر رسالة الزبائن؛ ستظهر للزوار خلال دقيقة':'تم إيقاف رسالة الزبائن');
  }catch(e){alert(e.message||'تعذر حفظ رسالة الزبائن')}
}
async function publishStaffGeneralMessage(){
  const message=String($('#staffGeneralMessageText')?.value||'').trim();
  if(!message)return alert('اكتب الرسالة العامة للموظفين أولًا');
  const targetRoles=[...document.querySelectorAll('.staffMessageTarget:checked')].map(x=>x.value);
  if(!targetRoles.length)return alert('اختاري دورًا واحدًا على الأقل لاستلام الرسالة');
  if(!confirm('سيتم عرض هذه الرسالة للحسابات المستهدفة عند أول دخول بعد النشر. متابعة؟'))return;
  try{
    await api('/api/admin/settings/staff-message',{method:'POST',body:JSON.stringify({message,targetRoles})});
    toast('تم نشر الرسالة العامة للفئات المحددة');
    await settings();
  }catch(e){alert(e.message||'تعذر نشر الرسالة')}
}
async function toggleStaffGeneralMessage(active){
  try{
    await api('/api/admin/settings/staff-message',{method:'PATCH',body:JSON.stringify({active:!!active})});
    toast(active?'تم تفعيل رسالة الموظفين':'تم إيقاف رسالة الموظفين');
    await settings();
  }catch(e){alert(e.message||'تعذر تغيير حالة الرسالة')}
}

async function changeOwnPassword(){const current=$('#cpCurrent')?.value||'',next=$('#cpNew')?.value||'';if(next.length<12)return alert('كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل');try{await api('/api/auth/password',{method:'PATCH',body:JSON.stringify({currentPassword:current,newPassword:next})});alert('تم تغيير كلمة المرور بنجاح');$('#cpCurrent').value='';$('#cpNew').value=''}catch(e){alert(e.message)}}

function toast(x){let t=$('#toast');t.textContent=x;t.style.cssText='display:block;position:fixed;bottom:18px;left:18px;background:#63345e;color:white;padding:12px 16px;border-radius:10px;z-index:20';setTimeout(()=>t.style.display='none',2500)}

const adminLiveTimers=new Map();
function liveDebounce(key,fn,delay=260){
  clearTimeout(adminLiveTimers.get(key));
  adminLiveTimers.set(key,setTimeout(()=>{adminLiveTimers.delete(key);fn()},delay));
}
function initDateInputs(root=document){
  root.querySelectorAll?.('input[type="date"],input[type="datetime-local"]').forEach(el=>{
    if(el.dataset.lfDateReady==='1')return;
    el.dataset.lfDateReady='1';
    el.addEventListener('click',()=>{try{if(typeof el.showPicker==='function')el.showPicker()}catch{}});
  });
}
let adminDateObserver=null;
if(typeof MutationObserver!=='undefined'&&document?.documentElement){
  adminDateObserver=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node&&node.nodeType===1)initDateInputs(node);
      }
    }
  });
  adminDateObserver.observe(document.documentElement,{childList:true,subtree:true});
}
initDateInputs();
const titles={dashboard:'الرئيسية',users:'المستخدمون',products:'المنتجات',inventory:'المخزون',orders:'الطلبات والفواتير',returns:'الإرجاع والاستبدال',waitlist:'قائمة التوفر',finance:'الحسابات',offers:'العروض والحملات',catalog:'التصنيفات والعلامات',coupons:'الكوبونات',reports:'التقارير',homepage:'الصفحة الرئيسية',social:'مواقع التواصل',settings:'الإعدادات',staff:'الموظفون والصلاحيات',messages:'المحادثات الداخلية'};
const permissionLabels={dashboard:'الرئيسية',products:'المنتجات',inventory:'المخزون',orders:'الطلبات وقائمة التوفر',users:'المستخدمون',catalog:'الفئات والبراندات',coupons:'أكواد الخصم',reports:'التقارير والحسابات',offers:'العروض وواتساب',settings:'الإعدادات والصفحة الرئيسية',staff:'عرض الموظفين'};
const sectionPermissions={dashboard:'dashboard',products:'products',inventory:'inventory',orders:'orders',returns:'orders',waitlist:'orders',users:'users',finance:'reports',offers:'offers',catalog:'catalog',coupons:'coupons',reports:'reports',homepage:'settings',social:'settings',settings:'settings',staff:'staff',messages:'staff'};
function canAdminSection(section){const role=String(currentAdminUser?.role||'').toLowerCase();if(role==='owner'||role==='admin')return true;if(section==='messages')return role==='staff';return Array.isArray(currentAdminUser?.permissions)&&currentAdminUser.permissions.includes(sectionPermissions[section])}
function applyAdminPermissions(){navs.forEach(n=>n.hidden=!canAdminSection(n.dataset.s));document.querySelectorAll('[data-admin-permission]').forEach(el=>{const role=String(currentAdminUser?.role||'').toLowerCase(),p=el.dataset.adminPermission;el.hidden=!(role==='owner'||role==='admin'||(Array.isArray(currentAdminUser?.permissions)&&currentAdminUser.permissions.includes(p)))})}
function permissionChecks(selected=[]){const set=new Set(Array.isArray(selected)?selected:[]);return Object.entries(permissionLabels).map(([key,label])=>`<label style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #eadce3;border-radius:10px"><input type="checkbox" class="staffPerm" value="${key}" ${set.has(key)?'checked':''}> ${label}</label>`).join('')}
function selectedStaffPermissions(){return [...document.querySelectorAll('.staffPerm:checked')].map(x=>x.value)}
function staffPermissionText(x){if(x.role==='owner')return 'كامل — Owner';if(x.role==='admin')return 'كامل — Admin';const p=Array.isArray(x.permissions)?x.permissions:[];return p.length?p.map(k=>permissionLabels[k]||k).join('، '):'بدون صلاحيات'}
const navs=[...document.querySelectorAll('.nav')];navs.forEach(n=>n.onclick=()=>{if(!canAdminSection(n.dataset.s))return toast('ليس لديك صلاحية لهذا القسم');adminCatalogProductFilter=null;sec=n.dataset.s;navs.forEach(x=>x.classList.toggle('active',x===n));$('#title').textContent=titles[sec];load()});
function openAdminSection(section){
  if(!canAdminSection(section))return toast('ليس لديك صلاحية لهذا القسم');
  adminCatalogProductFilter=null;
  sec=section;
  navs.forEach(x=>x.classList.toggle('active',x.dataset.s===sec));
  $('#title').textContent=titles[sec];
  return load();
}
function table(h,rows){return rows.length?`<div class="tablewrap"><table class="table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<p>لا توجد بيانات.</p>'}
async function load(){try{if(sec==='dashboard')return dash();if(sec==='users')return users();if(sec==='products')return products();if(sec==='inventory')return inventory();if(sec==='orders')return orders();if(sec==='returns')return returnsAdmin();if(sec==='waitlist')return waitlist();if(sec==='finance')return finance();if(sec==='catalog')return catalog();if(sec==='coupons')return coupons();if(sec==='reports')return reports();if(sec==='social')return social();if(sec==='settings')return settings();if(sec==='messages')return loadStaffConversations();if(sec==='staff')return staff();if(sec==='offers')return offers();if(sec==='homepage')return homepage()}catch(e){toast(e.message)}}
async function dash(){let d=await api('/api/admin/dashboard'),x=d.dashboard;const stats=[
  ['العملاء',x.customers,'users'],
  ['المنتجات',x.products,'products'],
  ['الطلبات',x.orders,'orders'],
  ['المبيعات',M(x.sales),'finance'],
  ['قيد التنفيذ',x.pendingOrders,'orders'],
  ['مخزون منخفض',x.lowStock,'inventory']
];$('#sections').innerHTML=`<div class="cards">${stats.map(a=>`<button type="button" class="stat admin-stat-link" onclick="openAdminSection('${a[2]}')"><small>${a[0]}</small><b>${a[1]}</b></button>`).join('')}</div><div class="grid"><div class="card"><h2>تنبيهات</h2>${x.lowStock?`يوجد ${x.lowStock} منتج منخفض المخزون.`:'لا يوجد تنبيه مخزون ضمن الحد الحالي.'}</div><div class="card"><h2>اختصارات</h2>اضغطي على أي بطاقة في الأعلى للانتقال مباشرة إلى القسم المرتبط.</div></div>`}let adminUsersCache=[];
function renderUsersRows(){
  const box=$('#usersRows');if(!box)return;
  box.innerHTML=table(['الاسم','البريد','الهاتف','الجنس','العمر','الدور','النقاط','الحالة','الطلب',''],adminUsersCache.map(u=>{const active=u.isActive!==false;const owner=String(u.role||'').toLowerCase()==='owner';const until=u.orderingBlockUntil?new Date(u.orderingBlockUntil):null;const blockActive=u.orderingBlocked===true&&(!until||until.getTime()>Date.now());const blockText=blockActive?(until?'ممنوع حتى '+until.toLocaleDateString('ar'):'ممنوع من الطلب'):(u.orderingBlocked?'انتهى المنع':'مسموح');return `<tr data-admin-global-type="user" data-admin-global-id="${Number(u.id)}"><td>${E(u.name||'-')}</td><td>${E(u.email||'-')}</td><td>${E(u.phone||'-')}</td><td>${E(u.gender||'-')}</td><td>${u.age??'-'}</td><td>${E(u.role||'-')}</td><td>${Number(u.loyaltyPoints||0)}</td><td>${active?'فعال':'متوقف'}</td><td>${E(blockText)}</td><td>${owner?'<span class="small-note">المالك يُدار من إعدادات الحساب</span>':`<button class="btn" onclick="editUser(${Number(u.id)})">تعديل</button>`}</td></tr>`}));
}
async function userLiveSearch(){
  const search=String($('#uq')?.value||'').trim();
  try{const d=await api('/api/admin/users?search='+encodeURIComponent(search));adminUsersCache=d.users||[];renderUsersRows()}catch(e){toast(e.message)}
}
async function users(){
  const d=await api('/api/admin/users');
  adminUsersCache=d.users||[];
  $('#sections').innerHTML=`<div class="card"><h2>المستخدمون</h2><div class="toolbar"><input id="uq" class="field" placeholder="بحث مباشر بالاسم أو البريد أو الهاتف" oninput="liveDebounce('users',userLiveSearch,220)"></div><div id="usersRows"></div></div>`;
  renderUsersRows();
}
function adminDateTimeLocal(value){
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function toggleUserOrderBlockFields(){
  const blocked=!!$('#uorderblocked')?.checked;
  const box=$('#userOrderBlockFields');
  if(box)box.hidden=!blocked;
}
function orderBlockHistoryActionLabel(action){
  return ({blocked:'منع يدوي',unblocked:'فك المنع',updated:'تعديل المنع',auto_blocked:'منع تلقائي'})[String(action||'')]||String(action||'-');
}
async function loadUserOrderBlockHistory(id){
  const box=$('#userOrderBlockHistory');
  if(!box)return;
  try{
    const d=await api('/api/admin/users/'+id+'/order-block-history');
    const events=d.events||[];
    box.innerHTML='<b>سجل منع الطلب</b>'+(events.length?table(
      ['التاريخ','الإجراء','المصدر','السبب','ينتهي','بواسطة'],
      events.map(x=>`<tr><td>${x.createdAt?E(new Date(x.createdAt).toLocaleString('ar')):'-'}</td><td>${E(orderBlockHistoryActionLabel(x.action))}</td><td>${E(x.source||'-')}</td><td>${E(x.reason||'-')}</td><td>${x.blockedUntil?E(new Date(x.blockedUntil).toLocaleString('ar')):'دائم / غير محدد'}</td><td>${E(x.actorName||'-')}</td></tr>`)
    ):'<p class="small-note">لا يوجد سجل منع سابق لهذا المستخدم.</p>');
  }catch(e){
    box.innerHTML='<b>سجل منع الطلب</b><p class="small-note">'+E(e.message||'تعذر تحميل السجل')+'</p>';
  }
}
function editUser(id){
  const u=adminUsersCache.find(x=>Number(x.id)===Number(id));
  if(!u)return alert('المستخدم غير موجود في القائمة الحالية');
  const active=u.isActive!==false;
  modal('تعديل المستخدم',`<div class="formgrid">
    <input id="un" class="field" value="${E(u.name||'')}" placeholder="الاسم">
    <input id="ue" class="field" value="${E(u.email||'')}" placeholder="البريد">
    <input id="up" class="field" value="${E(u.phone||'')}" placeholder="الهاتف">
    <select id="ug" class="field"><option value="">غير محدد</option><option value="male" ${u.gender==='male'?'selected':''}>ذكر</option><option value="female" ${u.gender==='female'?'selected':''}>أنثى</option></select>
    <input id="ua" class="field" type="number" min="1" max="120" value="${u.age||''}" placeholder="العمر">
    <label class="toolbar"><input id="uactive" type="checkbox" ${active?'checked':''}> الحساب فعال</label>
    <div class="full user-order-block">
      <label class="toolbar"><input id="uorderblocked" type="checkbox" ${u.orderingBlocked===true?'checked':''} onchange="toggleUserOrderBlockFields()"> منع الزبون من إنشاء طلبات جديدة</label>
      <div id="userOrderBlockFields" ${u.orderingBlocked===true?'':'hidden'}>
        <label>سبب المنع — يظهر للإدارة فقط<textarea id="uorderblockreason" class="field" rows="2" placeholder="مثال: إلغاءات متكررة أو إساءة استخدام">${E(u.orderingBlockReason||'')}</textarea></label>
        <label>ينتهي بتاريخ ووقت — اتركه فارغًا للمنع الدائم<input id="uorderblockuntil" class="field" type="datetime-local" value="${E(adminDateTimeLocal(u.orderingBlockUntil))}"></label>
      </div>
    </div>
    <div id="userOrderBlockHistory" class="full notice">جاري تحميل سجل منع الطلب…</div>
    <div class="full notice">الدور الحالي: <b>${E(u.role||'customer')}</b>. تغيير أدوار الإدارة والموظفين يتم من قسم الموظفين والصلاحيات.</div>
    <label class="full">تعيين كلمة مرور جديدة — اختياري<input id="unewpass" class="field" type="password" minlength="12" autocomplete="new-password" placeholder="اتركها فارغة إن لم ترد تغيير كلمة المرور"></label>
  </div><div class="actions"><button class="btn primary" onclick="saveUser(${Number(u.id)})">حفظ</button></div>`);
  toggleUserOrderBlockFields();
  loadUserOrderBlockHistory(id);
}
async function saveUser(id){
  const nextPassword=$('#unewpass')?.value||'';
  if(nextPassword&&nextPassword.length<12)return alert('كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل');
  const body={
    name:$('#un').value.trim(),
    email:$('#ue').value.trim()||null,
    phone:$('#up').value.trim()||null,
    gender:$('#ug').value||null,
    is_active:!!$('#uactive').checked,
    ordering_blocked:!!$('#uorderblocked')?.checked,
    ordering_block_reason:$('#uorderblocked')?.checked?($('#uorderblockreason')?.value.trim()||null):null,
    ordering_block_until:$('#uorderblocked')?.checked&&$('#uorderblockuntil')?.value?new Date($('#uorderblockuntil').value).toISOString():null
  };
  if($('#ua').value)body.age=Number($('#ua').value);
  try{
    await api('/api/admin/users/'+id,{method:'PATCH',body:JSON.stringify(body)});
    if(nextPassword)await api('/api/admin/users/'+id+'/password',{method:'PATCH',body:JSON.stringify({newPassword:nextPassword})});
    closeModal();
    toast(nextPassword?'تم حفظ البيانات وتغيير كلمة المرور':'تم حفظ بيانات المستخدم');
    await users();
  }catch(e){alert(e.message||'تعذر حفظ المستخدم')}
}
let adminProductsCache=[];
let adminProductCategories=[];
let adminCatalogProductFilter=null;
function catalogProductMatches(p,filter=adminCatalogProductFilter){
  if(!filter)return true;
  const id=filter.kind==='category'?(p.categoryId??p.category_id):(p.brandId??p.brand_id);
  return String(id)===String(filter.id);
}
async function openCatalogProducts(kind,id){
  if(!canAdminSection('products'))return toast('ليس لديك صلاحية عرض المنتجات');
  const item=(kind==='category'?adminCategoryCache:adminBrandCache).find(x=>String(x.id)===String(id));
  if(!item)return;
  adminCatalogProductFilter={kind,id:item.id,name:item.name};
  sec='products';
  navs.forEach(x=>x.classList.toggle('active',x.dataset.s===sec));
  $('#title').textContent='منتجات '+item.name;
  try{await products();$('#sections').scrollIntoView({behavior:'smooth',block:'start'})}catch(e){toast(e.message)}
}
function clearCatalogProductFilter(){adminCatalogProductFilter=null;$('#title').textContent=titles.products;return products()}

function renderProductRows(){
  const box=$('#productRows');if(!box)return;
  const q=String($('#pq')?.value||'').trim().toLowerCase();
  const list=adminProductsCache.filter(p=>catalogProductMatches(p)).filter(p=>!q||[p.name,p.sku,p.barcode,p.productNumber,p.product_number,p.brand,p.category].filter(Boolean).join(' ').toLowerCase().includes(q));
  box.innerHTML=table(['المنتج','رقم المنتج','الباركود','السعر','المخزون','الحالة',''],list.map(p=>`<tr data-admin-global-type="product" data-admin-global-id="${Number(p.id)}"><td>${E(p.name)}</td><td>${E(p.productNumber||p.product_number||'-')}</td><td>${E(p.barcode||'-')}</td><td>${M(p.price)}</td><td>${p.stock??0}</td><td>${(p.isActive!==false&&p.is_active!==false)?'فعال':'متوقف'}</td><td><button class="btn" onclick='productForm(${E(JSON.stringify(p))})'>تعديل</button></td></tr>`));
}
async function products(){const[d,c]=await Promise.all([api('/api/admin/products'),api('/api/categories')]);adminProductsCache=d.products||[];adminProductCategories=c.categories||[];$('#sections').innerHTML=`<div class="card"><h2>${adminCatalogProductFilter?'منتجات '+E(adminCatalogProductFilter.name):'المنتجات'}</h2>${adminCatalogProductFilter?'<div class="toolbar"><button class="btn" onclick="openAdminSection(&quot;catalog&quot;)">الرجوع للفئات والبراندات</button><button class="btn" onclick="clearCatalogProductFilter()">كل المنتجات</button></div>':''}<div class="toolbar"><input id="pq" class="field" placeholder="بحث مباشر بالاسم أو رقم المنتج أو الباركود أو SKU أو البراند أو الفئة" oninput="renderProductRows()"><button class="btn" onclick="productForm()">+ منتج جديد</button></div><div id="productRows"></div></div>`;renderProductRows()}
function productForm(p={}){const selectedCategory=Number(p.categoryId??p.category_id)||0;const categoryOptions=`<option value="">اختيار الفئة</option>${adminProductCategories.map(c=>`<option value="${Number(c.id)}" ${Number(c.id)===selectedCategory?'selected':''}>${E(c.name)} — فئة ${Number(c.id)}</option>`).join('')}`;modal(p.id?'تعديل المنتج':'منتج جديد',`<div class="formgrid"><input id="pn" class="field" value="${E(p.name||'')}" placeholder="اسم المنتج"><label class="full">الفئة<select id="pc" class="field">${categoryOptions}</select></label><input id="pbarcode" class="field" value="${E(p.barcode||'')}" placeholder="الباركود (اختياري — يجب ألا يتكرر)"><label class="field">رقم المنتج<input class="field" readonly value="${E(p.productNumber||p.product_number||'')}" placeholder="يُنشأ تلقائيًا بعد الحفظ"></label><input id="pp" class="field" type="number" step=".01" value="${p.price??''}" placeholder="السعر"><input id="po" class="field" type="number" step=".01" value="${p.old_price??''}" placeholder="السعر القديم"><input id="ps" class="field" type="number" value="${p.stock??0}" placeholder="المخزون"><input id="pi" class="field full" value="${E(p.image_url||p.imageUrl||'')}" placeholder="رابط الصورة"><textarea id="pd" class="field full" rows="5" placeholder="الوصف">${E(p.description||'')}</textarea><div class="full">رقم المنتج يتكون من رقم الفئة وتسلسله داخلها، مثل 1-1 ثم 1-2.</div></div><div class="actions"><button class="btn primary" onclick="saveProduct(${p.id||0})">حفظ</button>${p.id?`<button class="btn" type="button" onclick="openStaffChatFor('product',${Number(p.id)})">💬 ملاحظة داخلية</button>`:''}</div>`)}
async function saveProduct(id){const categoryId=Number($('#pc').value);if(!categoryId){toast('اختاري فئة المنتج');return}const b={name:$('#pn').value,categoryId,barcode:$('#pbarcode').value,price:Number($('#pp').value),oldPrice:$('#po').value?Number($('#po').value):null,stock:Number($('#ps').value),imageUrl:$('#pi').value,description:$('#pd').value};await api(id?'/api/admin/products/'+id:'/api/admin/products',{method:id?'PUT':'POST',body:JSON.stringify(b)});closeModal();toast('تم حفظ المنتج');products()}
let adminInventoryCache=[],adminInventoryVariants=[],adminInventoryEditVariants=[];
function renderInventoryRows(){
  const box=$('#inventoryRows');if(!box)return;
  const q=String($('#inventorySearch')?.value||'').trim().toLowerCase();
  const list=adminInventoryCache.filter(x=>!q||[`${x.name||''}`,`${x.sku||''}`,`${x.category_name||''}`,`${x.brand_name||''}`,`${x.supplier_name||''}`].join(' ').toLowerCase().includes(q));
  box.innerHTML=table(['المنتج','SKU','الكمية','الفئة','البراند','المورد / التاجر',''],list.map(x=>`<tr data-admin-global-type="inventory" data-admin-global-id="${Number(x.id)}"><td>${E(x.name)}</td><td>${E(x.sku||'-')}</td><td>${x.stock??0}</td><td>${E(x.category_name||'-')}</td><td>${E(x.brand_name||'-')}</td><td>${E(x.supplier_name||'-')}</td><td><button class="btn" onclick="editInventoryProduct(${Number(x.id)})">تعديل المخزون</button></td></tr>`));
}
async function inventory(){
  const d=await api('/api/admin/inventory');
  adminInventoryCache=d.products||[];
  adminInventoryVariants=d.variants||[];
  $('#sections').innerHTML=`<div class="card"><h2>المخزون</h2><div class="toolbar"><input id="inventorySearch" class="field" placeholder="بحث مباشر بالمنتج أو SKU أو الفئة أو البراند أو المورد" oninput="renderInventoryRows()"><button class="btn" onclick="inventoryMovements()">تقرير حركات المخزون</button></div><div id="inventoryRows"></div></div>`;
  renderInventoryRows();
}
function captureInventoryVariants(){
  adminInventoryEditVariants=[...document.querySelectorAll('.inventoryVariantRow')].map(row=>({
    id:row.dataset.id||undefined,
    name:row.querySelector('.inventoryVariantName')?.value.trim()||'',
    stock:Math.max(0,Math.floor(Number(row.querySelector('.inventoryVariantStock')?.value||0)))
  })).filter(v=>v.name);
}
function renderInventoryVariantEditor(){
  const box=$('#inventoryVariantRows');if(!box)return;
  box.innerHTML=adminInventoryEditVariants.map((v,i)=>`<div class="toolbar inventoryVariantRow" data-id="${E(v.id||'')}"><input class="field compact-field inventoryVariantName" value="${E(v.name||'')}" placeholder="اللون / الخيار"><input class="field compact-field inventoryVariantStock" type="number" min="0" step="1" value="${Number(v.stock)||0}" placeholder="الكمية"><button class="btn danger" type="button" onclick="removeInventoryVariant(${i})">حذف</button></div>`).join('')||'<p class="small-note">لا توجد ألوان/خيارات. سيتم استخدام المخزون العام.</p>';
  const stock=$('#inventoryGeneralStock');
  if(stock)stock.disabled=adminInventoryEditVariants.length>0;
}
function addInventoryVariant(){captureInventoryVariants();adminInventoryEditVariants.push({name:'',stock:0});renderInventoryVariantEditor()}
function removeInventoryVariant(index){
  captureInventoryVariants();
  const row=adminInventoryEditVariants[index];
  if(row&&Number(row.stock)>0&&!confirm('هذا اللون/الخيار يحتوي على مخزون. حذفه سيصفر كميته ويسجل حركة مخزون. متابعة؟'))return;
  adminInventoryEditVariants.splice(index,1);
  renderInventoryVariantEditor();
}
function editInventoryProduct(id){
  const p=adminInventoryCache.find(x=>Number(x.id)===Number(id));if(!p)return;
  adminInventoryEditVariants=adminInventoryVariants.filter(v=>Number(v.product_id)===Number(id)&&v.is_active!==false).map(v=>({id:v.id,name:[v.color,v.size].filter(Boolean).join(' / ')||v.color||'',stock:Number(v.stock)||0}));
  modal('تعديل المخزون — '+E(p.name||''),`<div class="formgrid">
    <label>المورد / التاجر<input id="inventorySupplier" class="field compact-field" value="${E(p.supplier_name||'')}" placeholder="اسم المورد أو التاجر"></label>
    <label>المخزون العام<input id="inventoryGeneralStock" class="field compact-field" type="number" min="0" step="1" value="${Number(p.stock)||0}" ${adminInventoryEditVariants.length?'disabled':''}></label>
    <div class="full"><div class="toolbar"><b>الألوان / الخيارات والكميات</b><button class="btn" type="button" onclick="addInventoryVariant()">+ لون / خيار</button></div><div id="inventoryVariantRows"></div></div>
    <label class="full">ملاحظة حركة المخزون<input id="inventoryNote" class="field" placeholder="اختياري — مثال: جرد، توريد جديد، تصحيح كمية"></label>
  </div><div class="actions"><button class="btn primary" type="button" onclick="saveInventoryProduct(${Number(id)})">حفظ المخزون</button></div>`);
  renderInventoryVariantEditor();
}
async function saveInventoryProduct(id){
  captureInventoryVariants();
  const hasVariants=adminInventoryEditVariants.length>0;
  const body={
    supplierName:$('#inventorySupplier')?.value.trim()||'',
    note:$('#inventoryNote')?.value.trim()||'تعديل المخزون من لوحة التحكم'
  };
  if(hasVariants)body.variants=adminInventoryEditVariants.map(v=>({id:v.id,name:v.name,stock:Number(v.stock)||0}));
  else body.stock=Math.max(0,Math.floor(Number($('#inventoryGeneralStock')?.value||0)));
  try{
    await api('/api/admin/inventory/'+id,{method:'PATCH',body:JSON.stringify(body)});
    closeModal();
    toast('تم تحديث الكميات والألوان والمورد');
    await inventory();
  }catch(e){alert(e.message||'تعذر تحديث المخزون')}
}
let movementRequest = 0,adminMovementCache=[];
function inventoryMovements(){
  movementRequest++;
  adminMovementCache=[];
  $('#sections').innerHTML=`<div class="card"><h2>تقرير حركات المخزون</h2><button class="btn" onclick="inventory()">العودة للمخزون</button><div class="toolbar"><label>من <input id="mf" type="date" class="field" onchange="movementRun()"></label><label>إلى <input id="mtDate" type="date" class="field" onchange="movementRun()"></label><input id="movementSearch" class="field" placeholder="بحث مباشر بالمنتج أو SKU أو السبب أو رقم الطلب" oninput="renderMovementRows()"></div><div id="movementRows" aria-live="polite">اختاري تاريخ البداية والنهاية لعرض الحركات.</div></div>`;
  initDateInputs($('#sections'));
}
function movementReason(reason){
  const names={order_cancel_return:'إرجاع مخزون طلب ملغى',customer_return:'إرجاع من العميل',customer_exchange_return:'استبدال: إعادة القطعة',customer_exchange_out:'استبدال: صرف القطعة البديلة'};
  return names[reason]||(String(reason||'').startsWith('sale:')?'بيع: '+String(reason).slice(5).trim():reason||'-');
}
function renderMovementRows(){
  const target=$('#movementRows');if(!target)return;
  const q=String($('#movementSearch')?.value||'').trim().toLowerCase();
  const list=adminMovementCache.filter(x=>!q||[
    x.product_name||'',x.variant_sku||'',x.color||'',x.size||'',movementReason(x.reason),x.order_id||''
  ].join(' ').toLowerCase().includes(q));
  if(!adminMovementCache.length){target.textContent='لا توجد حركات ضمن الفترة المحددة.';return}
  if(!list.length){target.innerHTML='<p class="small-note">لا توجد حركات مطابقة للبحث.</p>';return}
  target.innerHTML=table(['التاريخ','المنتج','اللون / المقاس','SKU','تغير الكمية','السبب','رقم الطلب'],list.map(x=>`<tr><td>${E(new Date(x.created_at).toLocaleString('ar'))}</td><td>${E(x.product_name||'منتج محذوف')}</td><td>${E([x.color,x.size].filter(Boolean).join(' / ')||'-')}</td><td>${E(x.variant_sku||'-')}</td><td>${Number(x.quantity_change)>0?'+':''}${E(x.quantity_change)}</td><td>${E(movementReason(x.reason))}</td><td>${x.order_id?'#'+E(x.order_id):'-'}</td></tr>`));
}
async function movementRun(){
  const request=++movementRequest, target=$('#movementRows'), from=$('#mf')?.value, to=$('#mtDate')?.value;
  if(!target)return;
  if(!from||!to){adminMovementCache=[];target.textContent='اختاري تاريخ البداية والنهاية لعرض الحركات.';return}
  if(from>to){adminMovementCache=[];target.textContent='تاريخ البداية يجب أن يكون قبل النهاية أو مساوياً لها.';return}
  target.textContent='جاري تحميل الحركات…';
  try{
    const d=await api('/api/admin/inventory/movements?'+new URLSearchParams({from,to}));
    if(request!==movementRequest||$('#movementRows')!==target)return;
    adminMovementCache=d.movements||[];
    renderMovementRows();
  }catch(e){if(request===movementRequest&&$('#movementRows')===target){adminMovementCache=[];target.textContent=e.message}}
}
let adminOrdersCache=[];
function orderStatusLabel(status){return ({pending:'جديد',confirmed:'مؤكد',processing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',completed:'تم التجهيز',cancelled:'ملغي'})[String(status||'').toLowerCase()]||String(status||'-')}
function orderStatusOptions(selected){return [['pending','جديد'],['confirmed','مؤكد'],['processing','قيد التجهيز'],['shipped','تم الشحن'],['delivered','تم التسليم'],['completed','تم التجهيز'],['cancelled','ملغي']].map(([v,l])=>`<option value="${v}" ${String(selected||'')===v?'selected':''}>${l}</option>`).join('')}
function orderRegionLabel(region){return ({westbank:'الضفة',jerusalem:'القدس',inside:'الداخل'})[String(region||'').toLowerCase()]||region||'-'}
function renderOrderRows(){
  const box=$('#orderRows');if(!box)return;
  const q=String($('#orderSearch')?.value||'').trim().toLowerCase();
  const filtered=adminOrdersCache.filter(o=>!q||String(o.id).includes(q)||String(o.customer_name||'').toLowerCase().includes(q)||String(o.user_email||'').toLowerCase().includes(q)||String(o.user_phone||o.customer_phone||'').toLowerCase().includes(q));
  box.innerHTML=table(['رقم','العميل','الهاتف','الإجمالي','التوصيل','الحالة','التاريخ',''],filtered.map(o=>`<tr data-admin-global-type="order" data-admin-global-id="${Number(o.id)}"><td>#${o.id}</td><td>${E(o.customer_name||o.user_email||'-')}</td><td>${E(o.user_phone||o.customer_phone||'-')}</td><td>${M(o.total)} ₪</td><td>${o.shipping_waived?'معفى':M(o.shipping_cost||0)+' ₪'}</td><td>${orderStatusLabel(o.status)}</td><td>${new Date(o.created_at).toLocaleString('ar')}</td><td><button class="btn primary" onclick="openOrderDetails(${Number(o.id)})">إدارة</button><button class="btn" onclick="invoice(${Number(o.id)})">طباعة</button></td></tr>`));
}
async function orders(){
  const previousSearch=String($('#orderSearch')?.value||'');
  const status=$('#orderStatusFilter')?.value||'';
  const d=await api('/api/admin/orders'+(status?'?status='+encodeURIComponent(status):''));
  adminOrdersCache=d.orders||[];
  $('#sections').innerHTML=`<div class="card"><h2>الطلبات والفواتير</h2><div class="toolbar"><select id="orderStatusFilter" class="field" onchange="orders()"><option value="">كل الحالات</option>${orderStatusOptions(status)}</select><input id="orderSearch" class="field" value="${E(previousSearch)}" placeholder="بحث مباشر برقم الطلب أو العميل أو الهاتف" oninput="renderOrderRows()"></div><div id="orderRows"></div></div>`;
  renderOrderRows();
}
let adminGiftProducts=[];

function orderItemGiftLabel(i){
  return i?.is_gift===true||i?.isGift===true?'🎁 هدية':'';
}
function renderOrderGiftCardPreview(orderId,card,cost){
  if(typeof card==='string'){try{card=JSON.parse(card)}catch{card=null}}
  if(!card||typeof card!=='object')return '';
  const file=/^card-(?:0[1-9]|1[0-9]|2[01])\.jpg$/.test(String(card.file||''))?card.file:'card-01.jpg';
  const side=card.side==='left'?'left':'right';
  const encoded=encodeURIComponent(JSON.stringify(card)).replace(/'/g,'%27');
  return `<section class="full notice gift-card-order-summary" style="padding:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <b>🎁 بطاقة المعايدة — ${E(card.title||card.occasionLabel||'بطاقة هدية')}</b>
      <button class="btn primary" type="button" onclick="printOrderGiftCard(${Number(orderId)},'${encoded}')">🖨️ طباعة البطاقة</button>
    </div>
    <div style="position:relative;width:min(100%,480px);aspect-ratio:3/2;margin:0 auto 10px;overflow:hidden;border-radius:12px;background:#fffdf8">
      <img src="/gift-cards/assets/${file}" alt="معاينة بطاقة المعايدة" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div style="position:absolute;top:14%;${side==='left'?'left:7%;':'right:7%;'}width:42%;min-height:45%;padding:5px;display:flex;flex-direction:column;justify-content:center;text-align:center;color:#54263f;text-shadow:0 1px 1px #fff9;overflow:hidden">
        <strong style="font-size:clamp(11px,3.4vw,19px);margin-bottom:3px">${E(card.recipient||'')}</strong>
        <span style="font:clamp(11px,3.1vw,17px)/1.45 Georgia,Tahoma,serif;overflow-wrap:anywhere">${E(card.message||'')}</span>
        ${card.sender?`<small style="font-size:clamp(9px,2.3vw,13px);margin-top:4px;color:#76556a">من ${E(card.sender)}</small>`:''}
      </div>
      <div style="position:absolute;inset:auto 0 0;height:25%;display:flex;align-items:center;justify-content:flex-end;padding:0 3.2%;background:#fffdf8;border-top:1px solid #eadfe3">
        <img src="/gift-cards/assets/official-logo.png" alt="Ladies First" style="width:26%;height:72%;object-fit:cover;object-position:center 50%">
      </div>
    </div>
    <div>إلى: <b>${E(card.recipient||'-')}</b><br>الرسالة: ${E(card.message||'-')}${card.sender?'<br>من: '+E(card.sender):''}<br>رسوم البطاقة: <b>${M(cost||0)} ₪</b></div>
  </section>`;
}

async function openOrderDetails(id){
  const d=await api('/api/admin/orders/'+id),o=d.order||{},items=d.items||[],cancelled=String(o.status||'').toLowerCase()==='cancelled';
  const lockedGift=!['pending','confirmed','processing'].includes(String(o.status||'').toLowerCase());
  const payment=String(o.payment_method||'cash').toLowerCase()==='visa'?'Visa':'الدفع عند الاستلام';
  const autoPct=Math.max(0,Number(o.shipping_discount_percent||0)||0);
  const autoAmount=Math.max(0,Number(o.shipping_discount_amount||0)||0);
  const manualPct=Math.max(0,Number(o.shipping_manual_discount_percent||0)||0);
  const manualAmount=Math.max(0,Number(o.shipping_manual_discount_amount||0)||0);
  modal('إدارة الطلب #'+id,`<div class="formgrid">
    <div class="full notice"><b>حساب المستخدم:</b> ${E(o.user_name||'طلب ضيف')}${o.user_email?' — '+E(o.user_email):''}${o.user_phone?' — '+E(o.user_phone):''}<br><b>بيانات الاستلام بالطلب:</b> ${E(o.customer_name||'-')} — ${E(o.customer_phone||'-')}<br>${E(o.shipping_address||'-')}<br>الدفع: ${E(payment)} — التوصيل: ${E(orderRegionLabel(o.shipping_region))}</div>${Array.isArray(o.status_history)&&o.status_history.length?`<div class="full notice"><b>سجل الحالات:</b><br>${o.status_history.map(h=>E(orderStatusLabel(h.status))+' — '+E(new Date(h.changed_at).toLocaleString('ar-PS'))).join('<br>')}</div>`:''}
    <label>حالة الطلب<select id="orderStatusEdit" class="field" data-saved-status="${E(o.status||'')}" onchange="handleOrderStatusSelect(${Number(id)})" ${cancelled?'disabled':''}>${orderStatusOptions(o.status)}</select></label>
    <div id="orderCancellationFields" class="full cancellation-fields" ${String(o.status||'').toLowerCase()==='cancelled'?'':'hidden'}>
      <div class="formgrid">
        <label>مصدر الإلغاء<select id="orderCancelSource" class="field" ${cancelled?'disabled':''}><option value="">حدد المصدر</option><option value="customer" ${o.cancelled_source==='customer'?'selected':''}>الزبون طلب الإلغاء</option><option value="store" ${o.cancelled_source==='store'?'selected':''}>خطأ / سبب من المتجر</option><option value="admin" ${o.cancelled_source==='admin'?'selected':''}>قرار إداري / سبب آخر</option></select></label>
        <label>سبب الإلغاء<input id="orderCancelReason" class="field" value="${E(o.cancellation_reason||'')}" placeholder="ملاحظة مختصرة" ${cancelled?'disabled':''}></label>
      </div>
      <div class="small-note">فقط الإلغاء المنسوب للزبون يدخل في قاعدة المنع التلقائي. أخطاء المتجر لا تُحتسب عليه.</div>
    </div>
    <label>رسوم التوصيل الحالية<input class="field" value="${o.shipping_waived?'معفى':M(o.shipping_cost||0)+' ₪'}" disabled></label>

    <div class="full shipping-discount-admin">
      <b>خصم التوصيل</b>
      <div class="shipping-discount-summary">
        <span>الخصم التلقائي: <b>${M(autoPct)}%</b> (-${M(autoAmount)} ₪)</span>
        <span>الخصم اليدوي على هذا الطلب: <b>${M(manualPct)}%</b> (-${M(manualAmount)} ₪)</span>
      </div>
      <div class="toolbar">
        <input id="manualShippingPercent" class="field compact-field" type="number" min="0" max="100" step=".01" value="${manualPct}" placeholder="نسبة الخصم اليدوي %">
        <button class="btn primary" type="button" onclick="saveOrderShippingDiscount(${Number(id)},${autoPct})" ${cancelled?'disabled':''}>حفظ خصم التوصيل</button>
      </div>
      ${autoPct>0?'<div class="small-note warn-note">يوجد خصم توصيل تلقائي على هذا الطلب. عند إضافة خصم يدوي سيظهر تأكيد قبل جمع الخصمين.</div>':''}
    </div>

    <div class="full notice">${String(o.status||'').toLowerCase()==='completed'?'✅ تم تجهيز الطلبية.':'عند تجهيز الطلبية، اضغطي الزر لتحديث حالتها.'}${!['cancelled','shipped','delivered','completed'].includes(String(o.status||'').toLowerCase())?` <button class="btn primary" type="button" onclick="markOrderPrepared(${Number(id)})">أنا جهّزت الطلب</button>`:''}</div>
    <div class="full actions">
      <button class="btn" type="button" onclick="toggleOrderShipping(${Number(id)},${o.shipping_waived?'false':'true'})" ${cancelled?'disabled':''}>${o.shipping_waived?'إلغاء إعفاء التوصيل':'إعفاء من التوصيل'}</button>
      <button class="btn" type="button" onclick="openGiftPicker(${Number(id)})" ${lockedGift?'disabled':''}>🎁 إضافة هدية</button>
      <button class="btn" type="button" onclick="invoice(${Number(id)})">🧾 طباعة الفاتورة</button><button class="btn" type="button" onclick="openStaffChatFor('order',${Number(id)})">💬 ملاحظة داخلية</button>
    </div>
    ${lockedGift&&!cancelled?'<div class="full small-note">إضافة أو حذف الهدايا متاحة قبل شحن الطلب فقط.</div>':''}
    ${o.gift_card?renderOrderGiftCardPreview(id,o.gift_card,o.gift_card_cost):''}
    ${cancelled?'<div class="full notice">الطلب ملغي نهائيًا: تم إرجاع المخزون وعكس نقاط الولاء، لذلك لا يمكن إعادته لحالة نشطة.</div>':''}

    <div class="full">${table(['الصورة','المنتج','الخيار','الكمية','السعر','الإجمالي',''],items.map(i=>`<tr class="${i.is_gift?'gift-order-row':''}">
      <td>${i.image?`<img src="${E(i.image)}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:9px">`:'-'}</td>
      <td>${i.is_gift?'<span class="gift-badge">🎁 هدية</span><br>':''}${E(i.product_name||'-')}</td>
      <td>${E(i.variant_name||'-')}</td>
      <td>${Number(i.quantity)||0}</td>
      <td>${i.is_gift?'0.00':M(i.unit_price)} ₪</td>
      <td>${i.is_gift?'0.00':M(i.total)} ₪</td>
      <td>${i.is_gift&&!lockedGift?`<button class="btn danger" type="button" onclick="removeOrderGift(${Number(id)},${Number(i.id)})">حذف الهدية</button>`:''}</td>
    </tr>`))}</div>

    <div class="full invoiceTotals">
      <p>المجموع الفرعي: <b>${M(o.subtotal||0)} ₪</b></p>
      <p>خصم الكوبون: <b>-${M(o.coupon_discount||0)} ₪</b></p>
      <p>خصم Visa: <b>-${M(o.visa_discount||0)} ₪</b></p>
      <p>خصم الولاء: <b>-${M(o.loyalty_discount||0)} ₪</b></p>
      <p>التغليف: <b>${M(o.packaging_cost||0)} ₪</b></p>
      <p>رسوم التوصيل الأساسية: <b>${M(o.shipping_base_cost??o.shipping_cost??0)} ₪</b></p>
      ${o.gift_card?'<p>بطاقة معايدة: <b>'+M(o.gift_card_cost||0)+' ₪</b></p>':''}
      <p>خصم التوصيل التلقائي: <b>-${M(autoAmount)} ₪</b></p>
      <p>خصم التوصيل اليدوي: <b>-${M(manualAmount)} ₪</b></p>
      <p>التوصيل المستحق: <b>${o.shipping_waived?'معفى':M(o.shipping_cost||0)+' ₪'}</b></p>
      <p><b>الإجمالي: ${M(o.total)} ₪</b></p>
    </div>
  </div><div class="actions">${cancelled?'':`<button class="btn primary" onclick="saveOrderStatus(${Number(id)})">حفظ حالة الطلب</button>`}</div>`);
}

function printOrderGiftCard(orderId,encodedCard){
  const w=window.open('','_blank');
  if(!w)return alert('اسمحي بفتح نافذة الطباعة للبطاقة.');
  let card={};try{card=JSON.parse(decodeURIComponent(encodedCard||''))}catch(e){}
  const safeText=v=>String(v||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const file=/^card-(?:0[1-9]|1[0-9]|2[01])\.jpg$/.test(String(card.file||''))?card.file:'card-01.jpg';
  const image='/gift-cards/assets/'+file;
  const logo='/gift-cards/assets/official-logo.png';
  const side=card.side==='left'?'left':'right';
  w.document.open();
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بطاقة الطلب #${Number(orderId)}</title><style>
    @page{size:15cm 10cm;margin:0}
    *{box-sizing:border-box}html,body{margin:0;width:15cm;height:10cm;background:#fff;font-family:Tahoma,Arial,sans-serif}
    .card{position:relative;width:15cm;height:10cm;overflow:hidden;direction:rtl;color:#54263f}
    .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .copy{position:absolute;top:14%;${side==='left'?'left:7%;':'right:7%;'}width:42%;min-height:45%;padding:8px;display:flex;flex-direction:column;justify-content:center;text-align:center;text-shadow:0 1px 1px #fff9}
    .recipient{font-size:17pt;font-weight:bold;margin-bottom:4px}.message{font:16pt/1.6 Georgia,Tahoma,serif;overflow-wrap:anywhere}.from{font-size:11pt;margin-top:7px;color:#76556a}
    .logo{position:absolute;inset:auto 0 0;height:25%;background:#fffdf8;border-top:1px solid #eadfe3;display:flex;align-items:center;justify-content:flex-end;padding:0 3.2%}
    .logo img{width:26%;height:72%;object-fit:cover;object-position:center 50%}
    @media screen{body{margin:18px auto;box-shadow:0 5px 24px #0003}}
    @media print{html,body,.card{width:15cm;height:10cm;margin:0;box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><main class="card"><img class="bg" src="${image}" alt=""><section class="copy"><div class="recipient">${safeText(card.recipient)}</div><div class="message">${safeText(card.message)}</div>${card.sender?`<div class="from">من ${safeText(card.sender)}</div>`:''}</section><div class="logo"><img src="${logo}" alt="Ladies First"></div></main><script>Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))).then(()=>setTimeout(()=>window.print(),300));<\/script></body></html>`);
  w.document.close();
}
async function saveOrderShippingDiscount(id,autoPct){
  const percent=Number($('#manualShippingPercent')?.value||0);
  if(!Number.isFinite(percent)||percent<0||percent>100)return alert('أدخل نسبة بين 0 و100');
  let confirmStack=false;
  if(percent>0&&Number(autoPct)>0){
    confirmStack=confirm(`يوجد خصم توصيل تلقائي بنسبة ${M(autoPct)}%.\nهل تريد إضافة الخصم اليدوي فوقه على المبلغ المتبقي؟`);
    if(!confirmStack)return;
  }
  try{
    await api('/api/admin/orders/'+id+'/shipping-discount',{method:'PATCH',body:JSON.stringify({percent,confirmStack})});
    toast(percent>0?'تم تطبيق خصم التوصيل اليدوي':'تم إلغاء خصم التوصيل اليدوي');
    await openOrderDetails(id);
    await orders();
  }catch(e){
    if(e.code==='SHIPPING_AUTO_DISCOUNT_PRESENT'){
      if(confirm(e.message+'\n\nهل تريد المتابعة؟')){
        await api('/api/admin/orders/'+id+'/shipping-discount',{method:'PATCH',body:JSON.stringify({percent,confirmStack:true})});
        toast('تم تطبيق خصم التوصيل اليدوي');
        await openOrderDetails(id);
        await orders();
        return;
      }
    }
    alert(e.message||'تعذر تعديل خصم التوصيل');
  }
}

function giftProductImage(p){
  return p?.mainImages?.[0]||p?.images?.[0]||p?.imageUrl||p?.image_url||'';
}

async function openGiftPicker(orderId){
  try{
    const d=await api('/api/admin/products');
    adminGiftProducts=d.products||[];
    modal('إضافة هدية للطلب #'+orderId,`<div class="gift-picker">
      <p class="small-note">الهدية تُضاف بسعر بيع صفر للزبون، لكن تكلفتها تُحسب على الربح وتُخصم من المخزون.</p>
      <input id="giftSearch" class="field" placeholder="بحث مباشر باسم المنتج أو البراند أو SKU" oninput="renderGiftSearch(${Number(orderId)})">
      <div id="giftSearchResults" class="gift-search-results"></div>
      <div id="giftEditor"></div>
      <div id="giftMsg"></div>
    </div>`);
    renderGiftSearch(orderId);
  }catch(e){alert(e.message||'تعذر تحميل المنتجات')}
}

function renderGiftSearch(orderId){
  const box=$('#giftSearchResults');if(!box)return;
  const q=String($('#giftSearch')?.value||'').trim().toLowerCase();
  const list=adminGiftProducts.filter(p=>{
    const searchable=[p.name,p.brand,p.category,p.sku].filter(Boolean).join(' ').toLowerCase();
    const variants=Array.isArray(p.variants)?p.variants:[];
    const stock=variants.length?variants.reduce((s,v)=>s+Math.max(0,Number(v.stock)||0),0):Math.max(0,Number(p.stock)||0);
    return stock>0&&(!q||searchable.includes(q));
  }).slice(0,15);
  box.innerHTML=list.length?list.map(p=>{
    const img=giftProductImage(p),variants=Array.isArray(p.variants)?p.variants:[];
    const stock=variants.length?variants.reduce((s,v)=>s+Math.max(0,Number(v.stock)||0),0):Math.max(0,Number(p.stock)||0);
    return `<button type="button" class="gift-result" onclick="selectGiftProduct(${Number(orderId)},${Number(p.id)})">
      ${img?`<img src="${E(img)}" alt="">`:'<span class="gift-result-placeholder">🎁</span>'}
      <span><b>${E(p.name||'منتج')}</b><small>${E(p.brand||'')} — متوفر ${stock}</small></span>
    </button>`;
  }).join(''):'<p class="small-note">لا توجد منتجات متوفرة مطابقة.</p>';
}

function selectGiftProduct(orderId,productId){
  const p=adminGiftProducts.find(x=>Number(x.id)===Number(productId));if(!p)return;
  const variants=Array.isArray(p.variants)?p.variants:[];
  const variantField=variants.length?`<label>اللون / الخيار<select id="giftVariant" class="field">${variants.map(v=>`<option value="${Number(v.id)}" ${Number(v.stock)<=0?'disabled':''}>${E(v.name||v.color||'خيار')} — متوفر ${Number(v.stock)||0}</option>`).join('')}</select></label>`:'';
  $('#giftEditor').innerHTML=`<div class="card gift-selected">
    <b>🎁 ${E(p.name||'منتج')}</b>
    <div class="formgrid">${variantField}<label>الكمية<input id="giftQty" class="field" type="number" min="1" value="1"></label></div>
    <button type="button" class="btn primary" onclick="saveOrderGift(${Number(orderId)},${Number(productId)})">إضافة كهدية</button>
  </div>`;
}

async function saveOrderGift(orderId,productId){
  const quantity=Math.max(1,Math.floor(Number($('#giftQty')?.value||1)));
  const variantId=$('#giftVariant')?.value?Number($('#giftVariant').value):null;
  try{
    await api('/api/admin/orders/'+orderId+'/gifts',{method:'POST',body:JSON.stringify({productId,variantId,quantity})});
    toast('تمت إضافة الهدية وخصمها من المخزون');
    await openOrderDetails(orderId);
    await orders();
  }catch(e){alert(e.message||'تعذر إضافة الهدية')}
}

async function removeOrderGift(orderId,itemId){
  if(!confirm('حذف هذه الهدية من الطلب؟ ستعود الكمية للمخزون.'))return;
  try{
    await api('/api/admin/orders/'+orderId+'/gifts/'+itemId,{method:'DELETE'});
    toast('تم حذف الهدية وإعادة الكمية للمخزون');
    await openOrderDetails(orderId);
    await orders();
  }catch(e){alert(e.message||'تعذر حذف الهدية')}
}

async function handleOrderStatusSelect(id){
  const select=$('#orderStatusEdit');
  if(!select)return;
  toggleCancellationFields();
  if(select.value==='cancelled'||select.value===String(select.dataset.savedStatus||''))return;
  select.disabled=true;
  try{await saveOrderStatus(id)}
  finally{if(select.isConnected)select.disabled=false}
}
function toggleCancellationFields(){
  const box=$('#orderCancellationFields');
  if(box)box.hidden=$('#orderStatusEdit')?.value!=='cancelled';
}
async function saveOrderStatus(id){
  const status=$('#orderStatusEdit')?.value||'';
  const cancelSource=$('#orderCancelSource')?.value||'';
  const cancellationReason=$('#orderCancelReason')?.value.trim()||'';
  if(status==='cancelled'){
    if(!cancelSource)return alert('حدد مصدر الإلغاء حتى لا تُحتسب أخطاء المتجر على الزبون.');
    const labels={customer:'الزبون',store:'المتجر',admin:'الإدارة'};
    if(!confirm('تأكيد إلغاء الطلب؟ سيتم إرجاع الكميات للمخزون وعكس نقاط الولاء.\nمصدر الإلغاء: '+(labels[cancelSource]||cancelSource)))return;
  }
  try{
    const d=await api('/api/admin/orders/'+id+'/status',{method:'PATCH',body:JSON.stringify({status,cancelSource,cancellationReason})});
    if(d.autoBlockedCustomer){
      alert('تم إلغاء الطلب، ووصل الزبون إلى حد الإلغاءات المحدد لذلك تم منعه تلقائيًا من الطلب.');
    }else{
      toast(status==='delivered'?'تم تسجيل التسليم وإضافته إلى سجل تتبع الطلب':status==='completed'?'تم تحديث حالة الطلب إلى تم التجهيز':'تم تحديث الحالة وإضافتها إلى سجل تتبع الطلب');
    }
    closeModal();
    await orders();
  }catch(e){alert(e.message||'تعذر تحديث حالة الطلب');const select=$('#orderStatusEdit');if(select){select.value=select.dataset.savedStatus||'';toggleCancellationFields()}}
}
async function toggleOrderShipping(id,waived){
  const msg=waived?'تأكيد إعفاء هذا الطلب من رسوم التوصيل؟':'تأكيد إعادة رسوم التوصيل لهذا الطلب؟';
  if(!confirm(msg))return;
  try{await api('/api/admin/orders/'+id+'/shipping-waiver',{method:'PATCH',body:JSON.stringify({waived:!!waived})});toast(waived?'تم إعفاء الطلب من التوصيل':'تمت إعادة رسوم التوصيل');await openOrderDetails(id);await orders()}catch(e){alert(e.message||'تعذر تعديل رسوم التوصيل')}
}
const INVOICE_THANK_YOU_PHRASES=[
  "شكرًا لثقتكِ بنا، نتمنى لكِ لحظات جميلة مع اختياركِ 🌷",
  "اختياركِ أسعدنا، ونتمنى أن تعودي إلينا دائمًا 💕",
  "من القلب شكرًا لكِ، استمتعي بتفاصيلكِ الجميلة ✨",
  "طلبكِ وصل بكل حب، نتمنى أن يضيف يومًا جميلًا ليومكِ 🌸",
  "سعادتكِ هي أجمل ما في طلبكِ، شكرًا لاختياركِ لنا 💝",
  "كل قطعة تحمل لمسة جمال، نتمنى أن تحبي اختياركِ 🌹",
  "شكرًا لأنكِ جزء من حكايتنا، ننتظركِ دائمًا بكل حب 💗",
  "تستحقين كل ما هو جميل، شكرًا لثقتكِ بنا 🌼",
  "نتمنى أن يكون طلبكِ بداية لمزيد من اللحظات الحلوة 💐",
  "اختيار جميل من ذوق جميل، شكرًا لكِ 💖",
  "أرسلنا طلبكِ بمحبة، ونتمنى أن يصلكِ الفرح معه 🎀",
  "شكرًا لزيارتكِ متجرنا، نرجو أن نكون دائمًا عند حسن ظنكِ 🌷"
];
function invoiceThankYouPhrase(orderId){
  const id=Math.abs(Number(orderId)||0);
  return INVOICE_THANK_YOU_PHRASES[id%INVOICE_THANK_YOU_PHRASES.length];
}

async function invoice(id){
  const [d,publicLink,settingsData]=await Promise.all([
    api('/api/admin/orders/'+id),
    api('/api/admin/orders/'+id+'/public-link'),
    api('/api/admin/settings')
  ]);
  const o=d.order||{},items=d.items||[],settings=settingsData.settings||{};
  const site=location.origin,orderUrl=site+(publicLink.path||'/order/'+id);
  const payment=String(o.payment_method||'cash').toLowerCase()==='visa'?'Visa':'الدفع عند الاستلام';
  const region={westbank:'الضفة',jerusalem:'القدس',inside:'الداخل'}[String(o.shipping_region||'').toLowerCase()]||o.shipping_region||'-';
  const shipping=o.shipping_waived?'معفى':M(o.shipping_cost||0)+' ₪';
  const storeName=String(settings.store_name||'Ladies First');
  const thankYouPhrase=invoiceThankYouPhrase(id);
  const logo=safeMediaUrl(settings.store_logo||'');
  const autoAmount=Math.max(0,Number(o.shipping_discount_amount||0)||0);
  const manualAmount=Math.max(0,Number(o.shipping_manual_discount_amount||0)||0);
  const autoPct=Math.max(0,Number(o.shipping_discount_percent||0)||0);
  const manualPct=Math.max(0,Number(o.shipping_manual_discount_percent||0)||0);

  $('#print').innerHTML=`<div class="invoicePage">
    <div class="printhead">
      <div class="invoiceBrand">${logo&&logo!=='#'?`<img class="invoiceLogo" src="${E(logo)}" alt="${E(storeName)}">`:''}<h1>${E(storeName)}</h1></div>
      <div>فاتورة #${id}<br>${new Date(o.created_at).toLocaleString('ar')}</div>
    </div>
    <div class="invoiceCustomer">العميل: ${E(o.user_name||o.customer_name||'-')} — الهاتف: ${E(o.user_phone||o.customer_phone||'-')}<br>البريد: ${E(o.user_email||'-')} — منطقة التوصيل: ${E(region)} — طريقة الدفع: ${E(payment)}<br>العنوان: ${E(o.shipping_address||'-')}</div>
    ${table(['المنتج','الخيار','الكمية','السعر','الإجمالي'],items.map(i=>`<tr class="${i.is_gift?'gift-order-row':''}"><td>${i.is_gift?'🎁 هدية — ':''}${E(i.product_name||'-')}</td><td>${E(i.variant_name||'-')}</td><td>${i.quantity}</td><td>${i.is_gift?'0.00':M(i.unit_price)}</td><td>${i.is_gift?'0.00':M(i.total)}</td></tr>`))}
    <div class="invoiceThankYou">${E(thankYouPhrase)}</div>
    <div class="invoiceTotals compact">
      <span>المجموع الفرعي: <b>${M(o.subtotal||0)} ₪</b></span>
      <span>خصم الكوبون${o.coupon_code?' ('+E(o.coupon_code)+')':''}: <b>-${M(o.coupon_discount||0)} ₪</b></span>
      <span>خصم Visa: <b>-${M(o.visa_discount||0)} ₪</b></span>
      <span>خصم نقاط الولاء${Number(o.points_redeemed||0)>0?' ('+Number(o.points_redeemed)+' نقطة)':''}: <b>-${M(o.loyalty_discount||0)} ₪</b></span>
      <span>التغليف: <b>${M(o.packaging_cost||0)} ₪</b></span>
      ${o.gift_card?'<span>بطاقة معايدة: <b>'+M(o.gift_card_cost||0)+' ₪</b></span>':''}
      <span>رسوم التوصيل الأصلية: <b>${M(o.shipping_base_cost??o.shipping_cost??0)} ₪</b></span>
      <span>خصم التوصيل التلقائي${autoPct>0?' ('+M(autoPct)+'%)':''}: <b>-${M(autoAmount)} ₪</b></span>
      <span>خصم التوصيل اليدوي${manualPct>0?' ('+M(manualPct)+'%)':''}: <b>-${M(manualAmount)} ₪</b></span>
      <span>المستحق لشركة التوصيل: <b>${E(shipping)}</b></span>
      <span class="invoiceGrandTotal">الإجمالي النهائي: <b>${M(o.total)} ₪</b></span>
    </div>
    <div class="qrrow"><div><div id="qrsite"></div><b>الموقع</b></div><div><div id="qrorder"></div><b>تفاصيل الطلب</b></div></div>
    <div class="invoicePreparedBy">جهّز الطلبية: ${E(o.prepared_by_name||'لم يُسجّل بعد')}</div>
  </div>`;
  new QRCode($('#qrsite'),{text:site,width:88,height:88});
  new QRCode($('#qrorder'),{text:orderUrl,width:88,height:88});
  window.print();
}
function invoicePrompt(){let id=prompt('أدخل رقم الطلب');if(id)invoice(Number(id))}
let adminReturnRequests=[],adminReturnProducts=[];
function returnStatusLabel(status){return ({pending:'قيد المراجعة',approved:'مقبول',rejected:'مرفوض',completed:'مكتمل'})[String(status||'').toLowerCase()]||String(status||'-')}
function returnTypeLabel(type){return String(type||'').toLowerCase()==='exchange'?'استبدال':'إرجاع'}
function returnFeeLabel(payer){return ({customer:'العميل',store:'المتجر',waived:'معفى'})[String(payer||'customer').toLowerCase()]||'-'}
function renderReturnRows(){
  const box=$('#returnRows');if(!box)return;
  const q=String($('#returnSearch')?.value||'').trim().toLowerCase();
  const list=adminReturnRequests.filter(x=>!q||[
    x.id||'',x.order_id||'',x.customer_name||'',x.customer_phone||'',x.product_name||'',x.variant_name||'',x.reason||'',
    returnTypeLabel(x.request_type),returnStatusLabel(x.status),returnFeeLabel(x.fee_payer)
  ].join(' ').toLowerCase().includes(q));
  if(!list.length){box.innerHTML='<p class="small-note">لا توجد طلبات إرجاع/استبدال مطابقة.</p>';return}
  box.innerHTML=table(['الطلب','النوع','العميل','المنتج','الكمية','السبب','الرسوم','فرق السعر','الحالة',''],list.map(x=>`<tr data-admin-global-type="return" data-admin-global-id="${Number(x.id)}"><td>#${E(x.order_id||'-')}</td><td>${returnTypeLabel(x.request_type)}</td><td>${E(x.customer_name||'-')}<br><small>${E(x.customer_phone||'-')}</small></td><td>${x.image?`<img src="${E(x.image)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:6px">`:''}${E(x.product_name||'-')}<br><small>${E(x.variant_name||'-')}</small></td><td>${Number(x.quantity)||0}</td><td>${E(x.reason||'-')}</td><td>${returnFeeLabel(x.fee_payer)}${Number(x.service_fee)>0?'<br>'+M(x.service_fee)+' ₪':''}</td><td>${M(x.price_difference||0)} ₪</td><td>${returnStatusLabel(x.status)}</td><td><button class="btn primary" onclick="editReturnRequestById(${Number(x.id)})">إدارة</button>${x.status==='completed'?'<button class="btn" onclick="printReturnSettlement('+Number(x.id)+')">وصل التسوية</button>':''}</td></tr>`));
}
async function returnsAdmin(){
  const [d,p]=await Promise.all([api('/api/admin/returns'),api('/api/products')]);
  adminReturnRequests=d.requests||[];adminReturnProducts=p.products||[];
  $('#sections').innerHTML=`<div class="card"><h2>الإرجاع والاستبدال</h2><p>تُطبق مهلة 12 ساعة من الاستلام من الخادم. عند إكمال الطلب يقوم الـBackend بإرجاع/خصم المخزون تلقائيًا وتسجيل حركة المخزون.</p><div class="toolbar"><input id="returnSearch" class="field" placeholder="بحث مباشر برقم الطلب أو العميل أو الهاتف أو المنتج أو الحالة" oninput="renderReturnRows()"></div><div id="returnRows"></div></div>`;
  renderReturnRows();
}
function editReturnRequestById(id){const x=adminReturnRequests.find(r=>Number(r.id)===Number(id));if(x)editReturnRequest(x)}
function returnSettlementDirection(x){
  if(x.request_type==='return')return 'مستحق للزبون';
  if(x.exchange_settlement_direction==='customer_to_store')return 'على الزبون';
  if(x.exchange_settlement_direction==='store_to_customer')return 'مستحق للزبون';
  return 'لا يوجد فرق سعر';
}
function printReturnSettlement(id){
  const x=adminReturnRequests.find(r=>Number(r.id)===Number(id));
  if(!x||x.status!=='completed')return alert('وصل التسوية متاح للعملية المكتملة فقط');
  const type=returnTypeLabel(x.request_type),direction=returnSettlementDirection(x);
  const amount=x.request_type==='exchange'?Number(x.exchange_settlement_amount||0):Math.abs(Number(x.net_settlement||0));
  const settlementMethod=x.request_type==='exchange'?x.exchange_settlement_method:x.return_refund_method;
  const method=String(settlementMethod||'').replace('cash','نقدي').replace('transfer','تحويل').replace('visa','فيزا').replace('store_credit','رصيد متجر')||'-';
  const original=document.body.innerHTML;
  document.body.innerHTML=`<div class="invoicePage" dir="rtl"><h1>Ladies First</h1><h2>وصل تسوية ${E(type)} #${Number(x.id)}</h2><p>مرتبط بالفاتورة/الطلب الأصلي: <b>#${Number(x.order_id)}</b></p><hr><p>العميل: <b>${E(x.customer_name||'-')}</b></p><p>المنتج: <b>${E(x.product_name||'-')}</b> ${x.variant_name?'— '+E(x.variant_name):''}</p><p>الكمية: <b>${Number(x.quantity)||0}</b></p><p>السبب: <b>${E(x.reason||'-')}</b></p>${x.replacement_product_name?`<p>البديل: <b>${E(x.replacement_product_name)} ${E(x.replacement_variant_name||'')}</b></p>`:''}<hr><p>من يتحمل رسوم التوصيل: <b>${E(returnFeeLabel(x.fee_payer))}</b></p>${Number(x.service_fee||0)>0?`<p>رسوم على العميل: <b>${M(x.service_fee)} ₪</b></p>`:''}${Number(x.store_delivery_cost||0)>0?`<p>تكلفة توصيل تحملها Ladies First: <b>${M(x.store_delivery_cost)} ₪</b> — مصروف على المتجر</p>`:''}${x.request_type==='exchange'?`<p>فرق السعر: <b>${M(x.exchange_settlement_amount||0)} ₪ — ${E(direction)}</b></p><p>طريقة التسوية: <b>${E(method)}</b></p>`:`<p>قيمة البضاعة قبل الخصومات: <b>${M(x.returned_merchandise_value||0)} ₪</b></p>${Number(x.allocated_coupon_discount||0)>0?`<p>حصة خصم الكوبون: <b>-${M(x.allocated_coupon_discount)} ₪</b></p>`:''}${Number(x.allocated_visa_discount||0)>0?`<p>حصة خصم Visa: <b>-${M(x.allocated_visa_discount)} ₪</b></p>`:''}${Number(x.allocated_loyalty_discount||0)>0?`<p>حصة خصم الولاء: <b>-${M(x.allocated_loyalty_discount)} ₪</b> — تعاد النقاط حسب التسوية</p>`:''}<p>القيمة النقدية القابلة للإرجاع: <b>${M(x.refundable_cash_value||0)} ₪</b></p>`}<p class="invoiceTotal">صافي التسوية: <b>${M(amount)} ₪ — ${E(direction)}</b></p>${x.request_type==='return'?`<p>حالة رد المبلغ: <b>${E(x.return_refund_status==='settled'?'تم رد المبلغ':x.return_refund_status==='pending'?'معلّق':'لا يوجد مبلغ مستحق')}</b></p><p>طريقة الرد: <b>${E(method)}</b></p>${x.return_refund_reference?`<p>مرجع التسوية: <b>${E(x.return_refund_reference)}</b></p>`:''}`:''}<hr><small>هذا وصل تسوية مرتبط بالفاتورة الأصلية ولا يستبدلها.</small></div>`;
  window.print();
  document.body.innerHTML=original;
  location.reload();
}
function returnRequestImages(x){const images=Array.isArray(x.images)?x.images:[];return images.length?`<div class="full"><b>صور الزبون</b><div class="toolbar" style="flex-wrap:wrap">${images.map(url=>`<a href="${E(safeMediaUrl(url))}" target="_blank" rel="noopener"><img src="${E(safeMediaUrl(url))}" alt="صورة مرفقة" style="width:80px;height:80px;object-fit:cover;border-radius:10px"></a>`).join('')}</div></div>`:''}
function editReturnRequest(x){
  const isExchange=String(x.request_type||'').toLowerCase()==='exchange';
  modal('إدارة طلب '+returnTypeLabel(x.request_type)+' #'+x.id,`<div class="formgrid">
    <div class="full notice"><b>الطلب #${E(x.order_id)}</b> — ${E(x.customer_name||'-')} — ${E(x.customer_phone||'-')}<br><b>المنتج:</b> ${E(x.product_name||'-')} ${x.variant_name?'— '+E(x.variant_name):''} × ${Number(x.quantity)||0}<br><b>السبب:</b> ${E(x.reason||'-')}${x.notes?'<br><b>ملاحظات الزبون:</b> '+E(x.notes):''}</div>
    ${returnRequestImages(x)}
    <label>الحالة<select id="rrStatus" class="field"><option value="pending" ${x.status==='pending'?'selected':''}>قيد المراجعة</option><option value="approved" ${x.status==='approved'?'selected':''}>مقبول</option><option value="rejected" ${x.status==='rejected'?'selected':''}>مرفوض</option><option value="completed" ${x.status==='completed'?'selected':''}>مكتمل — تنفيذ المخزون</option></select></label>
    <label>من يتحمل الرسوم<select id="rrFeePayer" class="field" onchange="syncReturnFeeField()"><option value="customer" ${String(x.fee_payer||'customer')==='customer'?'selected':''}>العميل</option><option value="store" ${x.fee_payer==='store'?'selected':''}>المتجر</option><option value="waived" ${x.fee_payer==='waived'?'selected':''}>معفى</option></select></label>
    <label>رسوم الإرجاع/الاستبدال على العميل<input id="rrServiceFee" class="field" type="number" min="0" step=".01" value="${Number(x.service_fee)||0}"></label>
    <label>تكلفة شركة التوصيل على المتجر<input id="rrStoreDeliveryCost" class="field" type="number" min="0" step=".01" value="${Number(x.store_delivery_cost)||0}" placeholder="المبلغ الفعلي المدفوع لشركة التوصيل"></label>
    ${x.store_fault?'<div class="full notice"><b>خطأ من المتجر:</b> رسوم التوصيل على Ladies First ولا يجوز تحميلها للزبون.</div>':''}
    <label>سبب الرسوم<input id="rrFeeReason" class="field" value="${E(x.fee_reason||'')}" placeholder="مثال: تغيير رأي العميل"></label>
    <label class="full">ملاحظة الإدارة<textarea id="rrAdminNote" class="field" rows="3">${E(x.admin_note||'')}</textarea></label>
    ${isExchange?`<label>المنتج البديل<select id="rrReplacementProduct" class="field" onchange="updateReturnReplacementVariants()"><option value="">اختاري المنتج البديل</option>${adminReturnProducts.map(p=>`<option value="${E(p.id)}" ${String(p.id)===String(x.replacement_product_id||'')?'selected':''}>${E(p.name)} — ${M(p.price)} ₪</option>`).join('')}</select></label><label>اللون/الخيار البديل<select id="rrReplacementVariant" class="field"><option value="">بدون خيار</option></select></label><div class="full notice">فرق السعر يحسبه الخادم تلقائيًا: الموجب على الزبون، والسالب مستحق للزبون.</div><label>حالة تسوية فرق السعر<select id="rrExchangeSettlementStatus" class="field"><option value="pending" ${x.exchange_settlement_status==='pending'?'selected':''}>معلّق</option><option value="settled" ${x.exchange_settlement_status==='settled'?'selected':''}>تمت التسوية</option><option value="not_required" ${!x.exchange_settlement_status||x.exchange_settlement_status==='not_required'?'selected':''}>لا يوجد فرق</option></select></label><label>طريقة التسوية<select id="rrExchangeSettlementMethod" class="field"><option value="">اختاري</option><option value="cash" ${x.exchange_settlement_method==='cash'?'selected':''}>نقدي</option><option value="transfer" ${x.exchange_settlement_method==='transfer'?'selected':''}>تحويل</option><option value="visa" ${x.exchange_settlement_method==='visa'?'selected':''}>فيزا</option><option value="store_credit" ${x.exchange_settlement_method==='store_credit'?'selected':''}>رصيد متجر</option></select></label><div class="full notice">التسوية الحالية: ${x.exchange_settlement_direction==='customer_to_store'?'على الزبون':x.exchange_settlement_direction==='store_to_customer'?'للزبون':'لا يوجد'} ${Number(x.exchange_settlement_amount||0)>0?'— '+M(x.exchange_settlement_amount)+' ₪':''}</div>`:`<div class="full notice">مبلغ الاسترداد النقدي بعد الخصومات والرسوم: <b>${M(x.return_refund_amount||Math.max(0,Number(x.refundable_cash_value||0)-Number(x.service_fee||0)))} ₪</b></div><label>حالة رد المبلغ<select id="rrReturnRefundStatus" class="field"><option value="pending" ${x.return_refund_status==='pending'?'selected':''}>معلّق</option><option value="settled" ${x.return_refund_status==='settled'?'selected':''}>تم رد المبلغ</option><option value="not_required" ${!x.return_refund_status||x.return_refund_status==='not_required'?'selected':''}>لا يوجد مبلغ مستحق</option></select></label><label>طريقة رد المبلغ<select id="rrReturnRefundMethod" class="field"><option value="">اختاري</option><option value="cash" ${x.return_refund_method==='cash'?'selected':''}>نقدي</option><option value="transfer" ${x.return_refund_method==='transfer'?'selected':''}>تحويل</option><option value="visa" ${x.return_refund_method==='visa'?'selected':''}>Visa</option><option value="store_credit" ${x.return_refund_method==='store_credit'?'selected':''}>رصيد متجر</option></select></label><label class="full">مرجع التسوية<input id="rrReturnRefundReference" class="field" value="${E(x.return_refund_reference||'')}" placeholder="رقم تحويل / مرجع Visa / مرجع رصيد المتجر"></label>`}
  </div><div class="actions"><button class="btn primary" onclick="saveReturnRequest(${Number(x.id)})">حفظ وتنفيذ</button></div>`);
  syncReturnFeeField();
  if(isExchange)updateReturnReplacementVariants(String(x.replacement_variant_id||''));
}
function syncReturnFeeField(){const payer=$('#rrFeePayer')?.value||'customer',fee=$('#rrServiceFee');if(!fee)return;fee.disabled=payer!=='customer';if(payer!=='customer')fee.value='0'}
function updateReturnReplacementVariants(selectedId=''){
  const productId=$('#rrReplacementProduct')?.value||'',sel=$('#rrReplacementVariant');if(!sel)return;
  const p=adminReturnProducts.find(x=>String(x.id)===String(productId)),variants=Array.isArray(p?.variants)?p.variants:[];
  sel.innerHTML='<option value="">بدون خيار</option>'+variants.filter(v=>v&&v.is_active!==false).map(v=>{const label=v.name||v.color||v.size||'خيار';const stock=Number(v.stock)||0;return `<option value="${E(v.id)}" ${String(v.id)===String(selectedId)?'selected':''} ${stock<=0?'disabled':''}>${E(label)} — متوفر ${stock}</option>`}).join('');
}
async function saveReturnRequest(id){
  const status=$('#rrStatus').value,feePayer=$('#rrFeePayer').value;
  if(status==='completed'&&!confirm('تأكيد الإكمال؟ سيتم تنفيذ حركة المخزون نهائيًا على الخادم.'))return;
  const body={status,adminNote:$('#rrAdminNote').value,feePayer,serviceFee:feePayer==='customer'?Math.max(0,Number($('#rrServiceFee').value)||0):0,storeDeliveryCost:feePayer==='store'?Math.max(0,Number($('#rrStoreDeliveryCost')?.value)||0):0,feeReason:$('#rrFeeReason').value};
  const refundStatus=$('#rrReturnRefundStatus');
  if(refundStatus){body.returnRefundStatus=refundStatus.value||'not_required';body.returnRefundMethod=$('#rrReturnRefundMethod')?.value||'';body.returnRefundReference=$('#rrReturnRefundReference')?.value.trim()||''}
  const replacement=$('#rrReplacementProduct');
  if(replacement){
    if(['approved','completed'].includes(status)&&!replacement.value)return alert('حددي المنتج البديل قبل اعتماد الاستبدال');
    if(replacement.value)body.replacementProductId=Number(replacement.value);
    const variant=$('#rrReplacementVariant')?.value||'';body.replacementVariantId=variant?Number(variant):null;
    body.exchangeSettlementStatus=$('#rrExchangeSettlementStatus')?.value||'not_required';
    body.exchangeSettlementMethod=$('#rrExchangeSettlementMethod')?.value||'';
  }
  try{await api('/api/admin/returns/'+id,{method:'PATCH',body:JSON.stringify(body)});closeModal();toast('تم تحديث طلب الإرجاع/الاستبدال');await returnsAdmin()}catch(e){alert(e.message)}
}
async function finance(){const today=new Date().toISOString().slice(0,10),month=today.slice(0,8)+'01';$('#sections').innerHTML=`<div class="card"><h2>الحسابات</h2><div class="toolbar"><button class="btn" onclick="financeRange('today')">اليوم</button><button class="btn" onclick="financeRange('month')">هذا الشهر</button><label>من <input id="ff" type="date" class="field" value="${month}" onchange="financeRun()"></label><label>إلى <input id="ft" type="date" class="field" value="${today}" onchange="financeRun()"></label></div><div id="financeSummary"></div></div>`;await financeRun()}
function financeRange(mode){const today=new Date().toISOString().slice(0,10),from=mode==='today'?today:today.slice(0,8)+'01';if($('#ff'))$('#ff').value=from;if($('#ft'))$('#ft').value=today;financeRun()}
async function financeRun(){const from=$('#ff')?.value,to=$('#ft')?.value,target=$('#financeSummary');if(!target||!from||!to)return;if(from>to){target.textContent='تاريخ البداية يجب أن يكون قبل النهاية أو مساوياً لها.';return}target.textContent='جاري تحميل الحسابات…';try{const d=await api('/api/admin/reports/sales?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)),s=d.summary||{};target.innerHTML=`<div class="cards"><div class="stat">الطلبات<b>${s.orders||0}</b></div><div class="stat">صافي المبيعات<b>${M(s.sales)} ₪</b></div><div class="stat">صافي تكلفة البضاعة<b>${M(s.cost)} ₪</b></div><div class="stat">تكلفة الهدايا<b>${M(s.giftCost||0)} ₪</b></div><div class="stat">صافي الربح<b>${M(s.profit)} ₪</b></div><div class="stat">المرتجعات النقدية الفعلية<b>${M(s.returnsValue)} ₪</b></div><div class="stat">قيمة المرتجعات قبل الخصومات<b>${M(s.returnsGrossValue)} ₪</b></div><div class="stat">فرق الاستبدال<b>${M(s.exchangeDifference)} ₪</b></div><div class="stat">رسوم الإرجاع/الاستبدال<b>${M(s.returnServiceFees)} ₪</b></div><div class="stat">توصيل أخطاء المتجر<b>${M(s.storeDeliveryCost)} ₪</b></div><div class="stat">الملغاة<b>${s.cancelled||0}</b></div></div><div class="notice">الحساب يعتمد على تكلفة الشراء المحفوظة مع كل منتج وقت الطلب، والطلبات الملغاة لا تدخل في المبيعات أو الربح.</div>`}catch(e){target.textContent=e.message||'تعذر تحميل الحسابات'}}
let adminCategoryCache=[],adminBrandCache=[];
function renderCatalogRows(){
  const cq=String($('#categorySearch')?.value||'').trim().toLowerCase();
  const bq=String($('#brandSearch')?.value||'').trim().toLowerCase();
  const cbox=$('#categoryRows'),bbox=$('#brandRows');
  if(cbox)cbox.innerHTML=table(['الاسم'],adminCategoryCache.filter(x=>!cq||String(x.name||'').toLowerCase().includes(cq)).map(x=>`<tr data-admin-global-type="category" data-admin-global-id="${Number(x.id)}"><td><button type="button" class="catalog-product-link" onclick="openCatalogProducts('category',${Number(x.id)})">${E(x.name)}</button></td></tr>`));
  if(bbox)bbox.innerHTML=table(['الاسم'],adminBrandCache.filter(x=>!bq||String(x.name||'').toLowerCase().includes(bq)).map(x=>`<tr data-admin-global-type="brand" data-admin-global-id="${Number(x.id)}"><td><button type="button" class="catalog-product-link" onclick="openCatalogProducts('brand',${Number(x.id)})">${E(x.name)}</button></td></tr>`));
}
async function catalog(){
  const[c,b]=await Promise.all([api('/api/categories'),api('/api/brands')]);
  adminCategoryCache=c.categories||[];
  adminBrandCache=b.brands||[];
  $('#sections').innerHTML=`<div class="grid"><div class="card"><h2>التصنيفات</h2><div class="toolbar catalog-add-row"><input id="categorySearch" class="field compact-field" placeholder="بحث مباشر بالفئة" oninput="renderCatalogRows()"><input id="cn" class="field compact-field" placeholder="اسم الفئة الجديدة"><button class="btn primary" onclick="addCat()">إضافة</button></div><div id="categoryRows"></div></div><div class="card"><h2>البراندات</h2><div class="toolbar catalog-add-row"><input id="brandSearch" class="field compact-field" placeholder="بحث مباشر بالبراند" oninput="renderCatalogRows()"><input id="bn" class="field compact-field" placeholder="اسم البراند الجديد"><button class="btn primary" onclick="addBrand()">إضافة</button></div><div id="brandRows"></div></div></div>`;
  renderCatalogRows();
}
async function addCat(){await api('/api/admin/categories',{method:'POST',body:JSON.stringify({name:$('#cn').value})});catalog()}
async function addBrand(){await api('/api/admin/brands',{method:'POST',body:JSON.stringify({name:$('#bn').value})});catalog()}
let adminCouponsCache=[];

function couponDateValue(value){
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function couponDateIso(value,endOfDay=false){
  const raw=String(value||'').trim();
  if(!raw)return null;
  const d=new Date(raw+(endOfDay?'T23:59:59.999':'T00:00:00.000'));
  return Number.isNaN(d.getTime())?null:d.toISOString();
}

function couponStatus(x){
  const now=Date.now();
  if(x.is_active===false)return {key:'disabled',label:'معطل'};
  if(x.starts_at&&new Date(x.starts_at).getTime()>now)return {key:'scheduled',label:'مجدول'};
  if(x.expires_at&&new Date(x.expires_at).getTime()<now)return {key:'expired',label:'منتهي'};
  const max=Math.max(0,Number(x.max_uses||0)||0),used=Math.max(0,Number(x.used_count||0)||0);
  if(max>0&&used>=max)return {key:'exhausted',label:'مستنفد'};
  return {key:'active',label:'فعال'};
}

function renderCouponRows(){
  const box=$('#couponRows');
  if(!box)return;
  const q=String($('#couponSearch')?.value||'').trim().toLowerCase();
  const list=adminCouponsCache.filter(x=>!q||String(x.code||'').toLowerCase().includes(q));
  if(!list.length){
    box.innerHTML='<p class="small-note">لا توجد كوبونات مطابقة.</p>';
    return;
  }
  box.innerHTML=table(
    ['الكود','الخصم','الحد الأدنى','الاستخدامات','لكل زبون','الصلاحية','الحالة',''],
    list.map(x=>{
      const s=couponStatus(x);
      const max=Math.max(0,Number(x.max_uses||0)||0);
      const used=Math.max(0,Number(x.used_count||0)||0);
      const per=Math.max(0,Number(x.max_uses_per_customer||0)||0);
      const start=x.starts_at?couponDateValue(x.starts_at):'—';
      const end=x.expires_at?couponDateValue(x.expires_at):'—';
      const type=String(x.discount_type||'percent')==='fixed'?'₪':'%';
      return `<tr data-admin-global-type="coupon" data-admin-global-id="${Number(x.id)}">
        <td><b>${E(x.code)}</b></td>
        <td>${M(x.discount_value)} ${type}</td>
        <td>${M(x.minimum_amount||x.min_order||0)} ₪</td>
        <td>${used} / ${max||'∞'}</td>
        <td>${per||'∞'}</td>
        <td><small>من: ${E(start)}<br>إلى: ${E(end)}</small></td>
        <td><span class="coupon-status coupon-${s.key}">${E(s.label)}</span></td>
        <td><div class="toolbar coupon-actions">
          <button class="btn" type="button" onclick="couponForm(${Number(x.id)})">تعديل</button>
          <button class="btn" type="button" onclick="toggleCoupon(${Number(x.id)},${x.is_active!==false?'false':'true'})">${x.is_active!==false?'تعطيل':'تفعيل'}</button>
          <button class="btn danger" type="button" onclick="deleteCoupon(${Number(x.id)})">حذف</button>
        </div></td>
      </tr>`;
    })
  );
}

async function coupons(){
  const d=await api('/api/admin/coupons');
  adminCouponsCache=d.coupons||[];
  $('#sections').innerHTML=`<div class="card"><h2>أكواد الخصم</h2>
    <p class="small-note">الحد الأدنى = أقل قيمة للطلب تسمح باستخدام الكوبون. القيمة 0 تعني بدون حد أدنى. والرقم 0 في حدود الاستخدام يعني بدون حد.</p>
    <div class="toolbar coupon-toolbar">
      <input id="couponSearch" class="field compact-field" placeholder="بحث مباشر بكود الخصم" oninput="renderCouponRows()">
      <button class="btn primary" type="button" onclick="couponForm()">+ كوبون جديد</button>
    </div>
    <div id="couponRows"></div>
  </div>`;
  renderCouponRows();
}

function couponForm(id){
  const x=id?adminCouponsCache.find(c=>Number(c.id)===Number(id)):null;
  const editing=!!x;
  modal(editing?'تعديل كود الخصم':'كوبون جديد',`<div class="formgrid coupon-form">
    <label>كود الخصم
      <input id="cc" class="field compact-field" value="${E(x?.code||'')}" placeholder="مثال: LADIES10" ${editing?'disabled':''}>
    </label>
    <label>نوع الخصم
      <select id="ct" class="field compact-field">
        <option value="percent" ${String(x?.discount_type||'percent')==='percent'?'selected':''}>نسبة مئوية %</option>
        <option value="fixed" ${String(x?.discount_type||'')==='fixed'?'selected':''}>مبلغ ثابت ₪</option>
      </select>
    </label>
    <label>قيمة الخصم
      <input id="cv" class="field compact-field" type="number" min="0" step=".01" value="${E(x?.discount_value??'')}" placeholder="القيمة">
    </label>
    <label>الحد الأدنى للطلب
      <input id="cm" class="field compact-field" type="number" min="0" step=".01" value="${E(x?.minimum_amount??x?.min_order??0)}" placeholder="0 = بدون حد">
    </label>
    <label>أقصى عدد استخدامات إجمالي
      <input id="cx" class="field compact-field" type="number" min="0" step="1" value="${E(x?.max_uses??0)}" placeholder="0 = غير محدود">
    </label>
    <label>أقصى مرات لنفس الزبون
      <input id="cpu" class="field compact-field" type="number" min="0" step="1" value="${E(x?.max_uses_per_customer??0)}" placeholder="0 = غير محدود">
    </label>
    <label>يبدأ من
      <input id="cs" class="field compact-field lf-date" type="date" value="${E(couponDateValue(x?.starts_at))}">
    </label>
    <label>ينتهي بتاريخ
      <input id="ce" class="field compact-field lf-date" type="date" value="${E(couponDateValue(x?.expires_at))}">
    </label>
    ${editing?`<label class="full"><input id="ca" type="checkbox" ${x?.is_active!==false?'checked':''}> الكوبون فعال</label>`:''}
  </div>
  <div class="actions">
    <button class="btn primary" type="button" onclick="${editing?`saveCouponEdit(${Number(x.id)})`:'saveCoupon()'}">حفظ</button>
  </div>`);
  initDateInputs?.();
}

function couponPayload(){
  const type=$('#ct')?.value||'percent';
  const value=Math.max(0,Number($('#cv')?.value||0));
  if(type==='percent'&&value>100)throw new Error('النسبة المئوية لا يمكن أن تتجاوز 100%');
  const startsAt=couponDateIso($('#cs')?.value,false);
  const expiresAt=couponDateIso($('#ce')?.value,true);
  if(startsAt&&expiresAt&&new Date(expiresAt)<new Date(startsAt))throw new Error('تاريخ انتهاء الكوبون يجب أن يكون بعد تاريخ البداية');
  return {
    discount_type:type,
    discount_value:value,
    minimum_amount:Math.max(0,Number($('#cm')?.value||0)),
    max_uses:Math.max(0,Math.floor(Number($('#cx')?.value||0))),
    max_uses_per_customer:Math.max(0,Math.floor(Number($('#cpu')?.value||0))),
    starts_at:startsAt,
    expires_at:expiresAt
  };
}

async function saveCoupon(){
  try{
    const code=String($('#cc')?.value||'').trim().toUpperCase();
    if(!code)return alert('أدخل كود الخصم');
    const payload={code,...couponPayload()};
    await api('/api/admin/coupons',{method:'POST',body:JSON.stringify(payload)});
    closeModal();
    await coupons();
    toast('تم إنشاء الكوبون');
  }catch(e){alert(e.message||'تعذر إنشاء الكوبون')}
}

async function saveCouponEdit(id){
  try{
    const payload={...couponPayload(),is_active:!!$('#ca')?.checked};
    await api('/api/admin/coupons/'+id,{method:'PATCH',body:JSON.stringify(payload)});
    closeModal();
    await coupons();
    toast('تم تحديث الكوبون');
  }catch(e){alert(e.message||'تعذر تعديل الكوبون')}
}

async function toggleCoupon(id,active){
  try{
    await api('/api/admin/coupons/'+id,{method:'PATCH',body:JSON.stringify({is_active:!!active})});
    await coupons();
    toast(active?'تم تفعيل الكوبون':'تم تعطيل الكوبون');
  }catch(e){alert(e.message||'تعذر تغيير حالة الكوبون')}
}

async function deleteCoupon(id){
  const x=adminCouponsCache.find(c=>Number(c.id)===Number(id));
  if(!confirm(`حذف كود الخصم "${x?.code||id}" نهائيًا؟`))return;
  try{
    await api('/api/admin/coupons/'+id,{method:'DELETE'});
    await coupons();
    toast('تم حذف الكوبون');
  }catch(e){alert(e.message||'تعذر حذف الكوبون')}
}

async function salesReports(){let t=new Date().toISOString().slice(0,10);$('#sections').innerHTML=`<div class="card"><h2>تقارير المبيعات والأرباح</h2><div class="toolbar"><input id="rf" type="date" class="field" value="${t}" onchange="reportRun()"><input id="rt" type="date" class="field" value="${t}" onchange="reportRun()"></div><div id="rr"></div></div>`;reportRun()}async function reportRun(){let d=await api('/api/admin/reports/sales?from='+$('#rf').value+'&to='+$('#rt').value),s=d.summary||{};$('#rr').innerHTML=`<div class="cards"><div class="stat">الطلبات<b>${s.orders||0}</b></div><div class="stat">صافي المبيعات<b>${M(s.sales)}</b></div><div class="stat">صافي التكلفة<b>${M(s.cost)}</b></div><div class="stat">صافي الربح<b>${M(s.profit)}</b></div><div class="stat">المرتجعات<b>${M(s.returnsValue)}</b></div><div class="stat">فرق الاستبدال<b>${M(s.exchangeDifference)}</b></div><div class="stat">الملغاة<b>${s.cancelled||0}</b></div></div>`+table(['التاريخ','الطلبات','المبيعات','التكلفة','الربح'],(d.rows||[]).map(x=>`<tr><td>${x.date}</td><td>${x.orders}</td><td>${M(x.sales)}</td><td>${M(x.cost)}</td><td>${M(x.profit)}</td></tr>`))}
let adminPackagingOptions=[];
function capturePackagingOptions(){adminPackagingOptions=[...document.querySelectorAll('.packagingAdminRow')].map((row,i)=>({id:row.dataset.id||('package-'+(i+1)),nameAr:row.querySelector('.pkgAr').value.trim(),nameEn:row.querySelector('.pkgEn').value.trim(),price:Math.max(0,Number(row.querySelector('.pkgPrice').value)||0),active:row.querySelector('.pkgActive').checked})).filter(x=>x.nameAr||x.nameEn)}
function renderPackagingAdmin(){const box=$('#packagingAdminRows');if(!box)return;box.innerHTML=adminPackagingOptions.map((x,i)=>`<div class="card packagingAdminRow" data-id="${E(x.id||('package-'+(i+1)))}"><div class="formgrid"><input class="field pkgAr" value="${E(x.nameAr||'')}" placeholder="اسم التغليف بالعربية"><input class="field pkgEn" value="${E(x.nameEn||'')}" placeholder="English name"><input class="field pkgPrice" type="number" min="0" step=".01" value="${Number(x.price)||0}" placeholder="السعر"><label><input class="pkgActive" type="checkbox" ${x.active===false?'':'checked'}> فعال</label></div><button class="btn" type="button" onclick="removePackagingOption(${i})">حذف</button></div>`).join('')||'<p>لا توجد خيارات تغليف.</p>'}
function addPackagingOption(){capturePackagingOptions();adminPackagingOptions.push({id:'package-'+Date.now(),nameAr:'تغليف جديد',nameEn:'New wrapping',price:0,active:true});renderPackagingAdmin()}
function removePackagingOption(i){capturePackagingOptions();adminPackagingOptions.splice(i,1);renderPackagingAdmin()}
async function uploadStoreLogo(input){
  const file=input?.files?.[0];
  if(!file)return;
  try{
    const url=await adminUploadProductImage(file);
    const field=$('#storeLogoUrl'),preview=$('#storeLogoPreview');
    if(field)field.value=url;
    if(preview){preview.src=url;preview.hidden=false}
    toast('تم رفع الشعار. اضغط حفظ كل الإعدادات لاعتماده.');
  }catch(e){alert(e.message||'تعذر رفع الشعار')}
  finally{if(input)input.value=''}
}
async function settings(){let [d,staffMessageData]=await Promise.all([api('/api/admin/settings'),api('/api/admin/settings/staff-message').catch(()=>({message:{},eligible:0,seen:0}))]),s=d.settings||{},staffMessage=staffMessageData.message||{},storefrontMessage=normalizeStorefrontMessage(s.storefront_general_message),isOwner=String(currentAdminUser?.role||'').toLowerCase()==='owner',canPublishStaffMessage=['owner','admin'].includes(String(currentAdminUser?.role||'').toLowerCase());adminPackagingOptions=Array.isArray(s.packaging_options)?s.packaging_options.map(x=>({...x})):[{id:'clear-ribbon',nameAr:'تغليف شفاف مع شبرة',nameEn:'Clear wrapping with ribbon',price:5,active:true},{id:'paper-ribbon',nameAr:'تغليف ورقي مع شبرة',nameEn:'Paper wrapping with ribbon',price:15,active:true}];$('#sections').innerHTML=`<div class="grid"><div class="card"><h2>الإعدادات</h2><div class="formgrid"><input id="stn" class="field" value="${E(s.store_name||'Ladies First')}" placeholder="اسم المتجر"><label>الكتابة أسفل اسم المتجر<input id="storeDescription" class="field" maxlength="80" value="${E(s.store_description??'ONLINE STORE')}" placeholder="ONLINE STORE"><small>تظهر تحت اسم المتجر في رأس الصفحة.</small></label><label class="full">شعار المتجر والفاتورة<small>غيّري الشعار من هنا؛ يستطيع الزبون الضغط عليه في المتجر لتكبيره.</small><input id="storeLogoFile" type="file" accept="image/png,image/jpeg,image/webp" onchange="uploadStoreLogo(this)" style="display:block;margin-top:8px"><input id="storeLogoUrl" type="hidden" value="${E(s.store_logo||'')}"><img id="storeLogoPreview" src="${E(s.store_logo||'')}" alt="" ${s.store_logo?'':'hidden'} style="width:82px;height:82px;object-fit:contain;border:1px solid #eadce3;border-radius:12px;margin-top:8px"></label><input id="stp" class="field" value="${E(s.phone||'')}" placeholder="الهاتف"><input id="stw" class="field" value="${E(s.whatsapp||s.whatsapp_number||'00972562499924')}" placeholder="WhatsApp"><input id="cur" class="field" value="${E(s.currency||'₪')}" placeholder="العملة"><textarea id="rp" class="field full" rows="5" placeholder="سياسة الاستبدال">${E(s.return_policy||'')}</textarea></div></div><div class="card"><h2>رسوم التوصيل</h2><p>هذه الأسعار يعتمدها الـBackend عند إنشاء الطلب.</p><div class="formgrid"><label>الضفة<input id="shipWestbank" class="field" type="number" min="0" step=".01" value="${Number(s.shipping_fees?.westbank??20)}"></label><label>القدس<input id="shipJerusalem" class="field" type="number" min="0" step=".01" value="${Number(s.shipping_fees?.jerusalem??35)}"></label><label>الداخل<input id="shipInside" class="field" type="number" min="0" step=".01" value="${Number(s.shipping_fees?.inside??70)}"></label><label>خصم توصيل الضفة %<input id="shipDiscountWestbank" class="field" type="number" min="0" max="100" step=".1" value="${Number(s.shipping_discount_percentages?.westbank??0)}"></label><label>خصم توصيل القدس %<input id="shipDiscountJerusalem" class="field" type="number" min="0" max="100" step=".1" value="${Number(s.shipping_discount_percentages?.jerusalem??0)}"></label><label>خصم توصيل الداخل %<input id="shipDiscountInside" class="field" type="number" min="0" max="100" step=".1" value="${Number(s.shipping_discount_percentages?.inside??0)}"></label></div><p>رسوم التوصيل مبالغ محصّلة لصالح شركة التوصيل ولا تدخل ضمن ربح المتجر.</p></div><div class="card"><h2>بطاقات المعايدة</h2><p>حددي سعر البطاقة، ويمكن جعلها مجانية تلقائيًا عندما يبلغ مجموع المنتجات الحد المحدد. اتركي الحد صفرًا لإيقاف العرض المجاني.</p><div class="formgrid"><label>سعر البطاقة (₪)<input id="giftCardPrice" class="field" type="number" min="0" step=".01" value="${Number(s.gift_card_price??0)}"></label><label>مجموع المنتجات المطلوب للمجانية (₪)<input id="giftCardFreeThreshold" class="field" type="number" min="0" step=".01" value="${Number(s.gift_card_free_threshold??0)}"><small>0 = لا توجد مجانية تلقائية</small></label></div></div><div class="card"><h2>نقاط الولاء</h2><label class="toolbar"><input id="loyaltyEnabled" type="checkbox" ${s.loyalty_enabled===false?'':'checked'}> تفعيل برنامج الولاء</label><label class="toolbar"><input id="loyaltyRedeem" type="checkbox" ${s.loyalty_redeem_enabled===false?'':'checked'}> السماح باستبدال النقاط عند الدفع</label><div class="formgrid"><label>طريقة الكسب<select id="loyaltyMode" class="field"><option value="amount" ${String(s.loyalty_earning_mode||'amount')==='amount'?'selected':''}>حسب قيمة الطلب</option><option value="order" ${String(s.loyalty_earning_mode||'amount')==='order'?'selected':''}>عدد ثابت لكل طلب</option></select></label><label>نقاط لكل 1 ₪<input id="loyaltyRate" class="field" type="number" min="0" step=".01" value="${Number(s.loyalty_points_per_currency??1)}"></label><label>نقاط لكل طلب<input id="loyaltyPerOrder" class="field" type="number" min="0" step="1" value="${Number(s.loyalty_points_per_order??10)}"></label><label>قيمة النقطة بالشيكل<input id="loyaltyPointValue" class="field" type="number" min="0" step=".01" value="${Number(s.loyalty_point_value??0.1)}"></label><label>خصم Visa %<input id="visaDiscount" class="field" type="number" min="0" max="100" step=".1" value="${Number(s.visa_discount_percent??0)}"></label></div></div><div class="card"><h2>خيارات تغليف الهدايا</h2><p>الأسعار هنا هي الأسعار المعتمدة في الفاتورة والـBackend.</p><div id="packagingAdminRows"></div><button class="btn" type="button" onclick="addPackagingOption()">+ خيار تغليف</button></div><div class="card"><h2>أتمتة السلة وواتساب</h2><label class="toolbar"><input id="abandonedWa" type="checkbox" ${s.abandoned_cart_whatsapp_enabled===true?'checked':''}> تفعيل تذكير السلة المتروكة بعد 7 أيام</label><label class="toolbar"><input id="lowStockWa" type="checkbox" ${s.low_stock_whatsapp_enabled===true?'checked':''}> تفعيل تنبيه المنتجات القريبة من النفاد داخل السلة</label><label class="toolbar"><input id="waitlistWaAuto" type="checkbox" ${s.waitlist_whatsapp_auto_enabled===true?'checked':''}> إرسال واتساب تلقائيًا لطلبات قائمة التوفر عند رجوع المخزون</label><p>لقائمة التوفر: يمكنك الإرسال يدويًا من قسم قائمة التوفر، أو تفعيل الإرسال التلقائي هنا. يتأكد الخادم من توفر الصنف قبل الإرسال.</p><p>تنبيهات السلة الأخرى لا ترسل إلا للعملاء الموافقين على رسائل واتساب من حسابهم.</p><div class="actions"><button class="btn" onclick="cartReminders()">عرض التنبيهات المستحقة</button></div></div><div class="card"><h2>الرسائل العامة</h2>
  <h3>رسالة واجهة المستخدمين</h3>
  <label class="toolbar"><input id="storefrontMessageEnabled" type="checkbox" ${storefrontMessage.active?'checked':''}> إظهار الرسالة على واجهة المتجر</label>
  <textarea id="storefrontGeneralMessageText" class="field" rows="3" placeholder="مثال: عرض خاص، تنبيه توصيل، أو إعلان عام">${E(storefrontMessage.message)}</textarea><div class="actions"><button class="btn primary" type="button" onclick="publishStorefrontGeneralMessage()">نشر رسالة الزبائن</button></div><p class="small-note">تظهر في الشريط العلوي للمتجر خلال دقيقة، أو فور تحديث الصفحة.</p>
  <hr>
  <h3>رسالة الموظفين عند تسجيل الدخول</h3>
  <div class="small-note">الحالة: <b>${staffMessage.active?'فعالة':'متوقفة'}</b> — شاهدها <b>${Number(staffMessageData.seen||0)}</b> من <b>${Number(staffMessageData.eligible||0)}</b> حساب مستهدف فعال.</div>
  <div class="toolbar staff-message-targets" ${canPublishStaffMessage?'':'hidden'}>
    <b>إرسال إلى:</b>
    <label><input type="checkbox" class="staffMessageTarget" value="owner" ${(staffMessage.targetRoles||['owner','admin','staff']).includes('owner')?'checked':''}> Owner</label>
    <label><input type="checkbox" class="staffMessageTarget" value="admin" ${(staffMessage.targetRoles||['owner','admin','staff']).includes('admin')?'checked':''}> Admin</label>
    <label><input type="checkbox" class="staffMessageTarget" value="staff" ${(staffMessage.targetRoles||['owner','admin','staff']).includes('staff')?'checked':''}> الموظفون</label>
  </div>
  ${staffMessage.message?`<div class="notice staff-message-preview">${E(staffMessage.message).replace(/\n/g,'<br>')}</div>`:''}
  <textarea id="staffGeneralMessageText" class="field" rows="3" placeholder="اكتب رسالة جديدة للموظفين" ${canPublishStaffMessage?'':'hidden'}></textarea>
  <div class="actions" ${canPublishStaffMessage?'':'hidden'}><button class="btn primary" type="button" onclick="publishStaffGeneralMessage()">نشر رسالة جديدة</button>${staffMessage.version?`<button class="btn" type="button" onclick="toggleStaffGeneralMessage(${staffMessage.active?'false':'true'})">${staffMessage.active?'إيقاف الرسالة':'إعادة تفعيل الرسالة'}</button>`:''}</div>
<p class="small-note" ${canPublishStaffMessage?'hidden':''}>النشر والتفعيل متاحان للمالك أو Admin فقط.</p>
<details class="staff-message-history" ${canPublishStaffMessage?'':'hidden'}><summary>سجل الرسائل السابقة (${(staffMessageData.history||[]).length})</summary>${(staffMessageData.history||[]).length?(staffMessageData.history||[]).map(item=>`<article class="notice" style="margin-top:10px"><b>${E(new Date(item.createdAt).toLocaleString('ar-PS'))}</b> — ${item.active?'فعالة':'متوقفة'} — قرأها ${Number(item.readCount||0)} حساب<div style="margin-top:6px;white-space:pre-wrap">${E(item.message||'')}</div><small>موجهة إلى: ${E((item.targetRoles||[]).join('، '))}${item.createdBy?' — نشرها '+E(item.createdBy):''}</small></article>`).join(''):'<p class="small-note">لا توجد رسائل سابقة.</p>'}</details>
</div>
<div class="card maintenance-admin-card" ${isOwner?'':'hidden'}><h2>وضع الطوارئ / الصيانة</h2>
  <label class="toolbar"><input id="maintenanceMode" type="checkbox" data-current="${s.maintenance_mode===true?'true':'false'}" ${s.maintenance_mode===true?'checked':''}> إيقاف واجهة المتجر مؤقتًا</label>
  <textarea id="maintenanceMessage" class="field" rows="3" placeholder="الرسالة التي تظهر للزوار أثناء الإيقاف">${E(s.maintenance_message||'المتجر متوقف مؤقتًا للصيانة. سنعود قريبًا.')}</textarea>
  <p class="small-note">لوحة التحكم تبقى متاحة للإدارة. والـBackend يمنع إنشاء طلبات جديدة أثناء وضع الصيانة حتى لو حاول شخص تجاوز الواجهة.</p>
</div>
<div class="card"><h2>منع الطلب بعد الإلغاءات</h2><label class="toolbar"><input id="cancelAutoBlockEnabled" type="checkbox" ${s.customer_cancel_auto_block_enabled===true?'checked':''}> تفعيل المنع التلقائي عند تكرار إلغاء الزبون للطلبات</label><div class="formgrid"><label>عدد إلغاءات الزبون قبل المنع<input id="cancelAutoBlockThreshold" class="field" type="number" min="1" step="1" value="${Math.max(1,Number(s.customer_cancel_auto_block_threshold??3)||3)}"></label><label>مدة المنع بالأيام<input id="cancelAutoBlockDays" class="field" type="number" min="0" step="1" value="${Math.max(0,Number(s.customer_cancel_auto_block_days??0)||0)}"></label></div><p class="small-note">0 أيام = منع دائم حتى تلغيه الإدارة يدويًا. لا تدخل إلغاءات خطأ المتجر في هذا العدد.</p></div><div class="card"><h2>أمان الحساب</h2><p>تغيير كلمة المرور يتطلب كلمة المرور الحالية. الحد الأدنى 12 خانة.</p><div class="formgrid"><input id="cpCurrent" class="field" type="password" placeholder="كلمة المرور الحالية"><input id="cpNew" class="field" type="password" minlength="12" placeholder="كلمة المرور الجديدة"></div><div class="actions"><button class="btn primary" onclick="changeOwnPassword()">تغيير كلمة المرور</button></div><hr><h3>🔐 الدخول بالبصمة / قفل الجهاز</h3><div id="adminPasskeyStatus" class="notice">جاري التحقق من حالة البصمة…</div><div class="actions"><button class="btn" type="button" onclick="enableAdminPasskey()">تفعيل بصمة هذا الجهاز</button></div></div></div><div class="actions"><button class="btn primary" onclick="saveSettings()">حفظ كل الإعدادات</button></div>`;renderPackagingAdmin();loadAdminPasskeyStatus()}
async function loadAdminPasskeyStatus(){const el=$('#adminPasskeyStatus');if(!el)return;if(!window.LFPasskeys?.supported()){el.textContent='البصمة غير مدعومة على هذا الجهاز أو المتصفح.';return}try{const d=await api('/api/passkeys/status'),list=d.credentials||[];el.innerHTML=list.length?'البصمة مفعلة على '+list.length+' جهاز/مفتاح.'+list.map(x=>`<div class="toolbar"><span>${E(x.label||'هذا الجهاز')}</span><button class="btn" type="button" onclick="removeAdminPasskey('${E(x.id)}')">حذف</button></div>`).join(''):'لم يتم تفعيل بصمة دخول لهذا الحساب بعد.'}catch(e){el.textContent=e.message||'تعذر تحميل حالة البصمة'}}
async function enableAdminPasskey(){if(!window.LFPasskeys?.supported())return alert('هذا الجهاز أو المتصفح لا يدعم تسجيل الدخول بالبصمة.');try{const options=await api('/api/passkeys/register/options',{method:'POST',body:'{}'}),credential=await window.LFPasskeys.createCredential(options);await api('/api/passkeys/register/verify',{method:'POST',body:JSON.stringify({challengeId:options.challengeId,credential,label:'جهاز الإدارة'})});toast('تم تفعيل الدخول بالبصمة');await loadAdminPasskeyStatus()}catch(e){alert(e?.name==='NotAllowedError'?'تم إلغاء طلب البصمة أو انتهت المهلة.':(e.message||'تعذر تفعيل البصمة'))}}
async function removeAdminPasskey(id){if(!confirm('حذف هذه البصمة من حساب الإدارة؟'))return;try{await api('/api/passkeys/'+encodeURIComponent(id),{method:'DELETE'});toast('تم حذف البصمة');await loadAdminPasskeyStatus()}catch(e){alert(e.message||'تعذر حذف البصمة')}}
async function saveSettings(){
  capturePackagingOptions();
  const maintenanceEl=$('#maintenanceMode');
  if(maintenanceEl?.checked&&maintenanceEl.dataset.current!=='true'&&!confirm('تأكيد تفعيل وضع الطوارئ؟ سيتوقف المتجر عن استقبال الطلبات فور حفظ الإعدادات، بينما تبقى لوحة التحكم متاحة.'))return;
  const body={
    store_name:$('#stn').value,
    store_logo:$('#storeLogoUrl')?.value||'',
    store_description:String($('#storeDescription')?.value??'').trim().slice(0,80),
    phone:$('#stp').value,
    whatsapp:$('#stw').value,
    whatsapp_number:$('#stw').value,
    currency:$('#cur').value,
    return_policy:$('#rp').value,
    storefront_general_message:{active:!!$('#storefrontMessageEnabled')?.checked,message:String($('#storefrontGeneralMessageText')?.value||'').trim().slice(0,2000)},
    abandoned_cart_whatsapp_enabled:!!$('#abandonedWa')?.checked,
    low_stock_whatsapp_enabled:!!$('#lowStockWa')?.checked,
    waitlist_whatsapp_auto_enabled:!!$('#waitlistWaAuto')?.checked,
    customer_cancel_auto_block_enabled:!!$('#cancelAutoBlockEnabled')?.checked,
    customer_cancel_auto_block_threshold:Math.max(1,Math.floor(Number($('#cancelAutoBlockThreshold')?.value)||3)),
    customer_cancel_auto_block_days:Math.max(0,Math.floor(Number($('#cancelAutoBlockDays')?.value)||0)),
    loyalty_enabled:!!$('#loyaltyEnabled')?.checked,
    loyalty_redeem_enabled:!!$('#loyaltyRedeem')?.checked,
    loyalty_earning_mode:$('#loyaltyMode').value==='order'?'order':'amount',
    loyalty_points_per_currency:Math.max(0,Number($('#loyaltyRate').value)||0),
    loyalty_points_per_order:Math.max(0,Math.floor(Number($('#loyaltyPerOrder').value)||0)),
    loyalty_point_value:Math.max(0,Number($('#loyaltyPointValue').value)||0),
    visa_discount_percent:Math.min(100,Math.max(0,Number($('#visaDiscount').value)||0)),
    shipping_fees:{westbank:Math.max(0,Number($('#shipWestbank').value)||0),jerusalem:Math.max(0,Number($('#shipJerusalem').value)||0),inside:Math.max(0,Number($('#shipInside').value)||0)},
    shipping_discount_percentages:{westbank:Math.min(100,Math.max(0,Number($('#shipDiscountWestbank').value)||0)),jerusalem:Math.min(100,Math.max(0,Number($('#shipDiscountJerusalem').value)||0)),inside:Math.min(100,Math.max(0,Number($('#shipDiscountInside').value)||0))},
    gift_card_price:Math.max(0,Number($('#giftCardPrice')?.value)||0),
    gift_card_free_threshold:Math.max(0,Number($('#giftCardFreeThreshold')?.value)||0),
    packaging_options:adminPackagingOptions
  };
  if(String(currentAdminUser?.role||'').toLowerCase()==='owner'){
    body.maintenance_mode=!!maintenanceEl?.checked;
    body.maintenance_message=String($('#maintenanceMessage')?.value||'').trim().slice(0,1000);
  }
  await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(body)});
  if(maintenanceEl)maintenanceEl.dataset.current=maintenanceEl.checked?'true':'false';
  toast('تم حفظ الإعدادات');
}
async function cartReminders(){const d=await api('/api/admin/cart-reminders');const abandoned=d.abandoned||[],low=d.lowStock||[];modal('تنبيهات السلة',`<div class="cards"><div class="stat">سلات متروكة<b>${abandoned.length}</b></div><div class="stat">قرب نفاد<b>${low.length}</b></div></div><h3>بعد 7 أيام</h3>${table(['العميل','الهاتف','القطع','آخر نشاط'],abandoned.map(x=>`<tr><td>${E(x.name||'-')}</td><td>${E(x.phone||'-')}</td><td>${x.itemCount||0}</td><td>${x.lastActivityAt?new Date(x.lastActivityAt).toLocaleString('ar'):'-'}</td></tr>`))}<h3>منتجات قربت تخلص</h3>${table(['العميل','الهاتف','المنتجات'],low.map(x=>`<tr><td>${E(x.name||'-')}</td><td>${E(x.phone||'-')}</td><td>${(x.lowStockItems||[]).map(i=>E((i.productName||'منتج')+' — متوفر '+i.stock)).join('<br>')}</td></tr>`))}`)}
const SOCIAL_ADMIN_META={
  whatsapp:{label:'WhatsApp',icon:'fa-brands fa-whatsapp'},
  instagram:{label:'Instagram',icon:'fa-brands fa-instagram'},
  snapchat:{label:'Snapchat',icon:'fa-brands fa-snapchat'},
  facebook:{label:'Facebook',icon:'fa-brands fa-facebook'},
  tiktok:{label:'TikTok',icon:'fa-brands fa-tiktok'}
};
function normalizeSocialEntry(value){
  let current=value;
  for(let i=0;i<4;i++){
    if(typeof current==='string')return {url:current,enabled:true};
    if(!current||typeof current!=='object')return {url:'',enabled:true};
    const enabled=current.enabled!==false;
    if(typeof current.url==='string')return {url:current.url,enabled};
    if(typeof current.href==='string')return {url:current.href,enabled};
    if(current.url&&typeof current.url==='object'){current={...current.url,enabled};continue}
    return {url:'',enabled};
  }
  return {url:'',enabled:true};
}
async function social(){
  const d=await api('/api/admin/settings'),raw=d.settings?.social_links||d.settings?.social||{};
  const entries={};
  Object.keys(SOCIAL_ADMIN_META).forEach(k=>entries[k]=normalizeSocialEntry(raw[k]));
  $('#sections').innerHTML=`<div class="card"><h2>مواقع التواصل</h2><p>كل منصة تظهر باسمها وشعارها الرسمي، والرابط المحفوظ هنا هو نفسه الذي يظهر في واجهة المتجر.</p><div class="social-admin-list">${Object.entries(SOCIAL_ADMIN_META).map(([k,m])=>`<div class="social-admin-row"><div class="social-admin-name"><i class="${m.icon}" aria-hidden="true"></i><b>${m.label}</b></div><input id="s_${k}" class="field compact-field" value="${E(entries[k].url)}" placeholder="رابط ${m.label}"><label class="social-active"><input id="e_${k}" type="checkbox" ${entries[k].enabled?'checked':''}> فعال</label></div>`).join('')}</div><button class="btn primary" onclick="saveSocial()">حفظ</button></div>`;
}
async function saveSocial(){
  const social_links={};
  Object.keys(SOCIAL_ADMIN_META).forEach(k=>social_links[k]={url:String($('#s_'+k)?.value||'').trim(),enabled:!!$('#e_'+k)?.checked});
  await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({social_links})});
  toast('تم حفظ مواقع التواصل');
  await social();
}
let adminStaffCache=[];
function renderStaffRows(){
  const box=$('#staffRows');if(!box)return;
  const q=String($('#staffSearch')?.value||'').trim().toLowerCase();
  const isOwner=String(currentAdminUser?.role||'').toLowerCase()==='owner';
  const list=adminStaffCache.filter(x=>!q||[
    x.name||'',x.email||'',x.phone||'',x.role||'',staffPermissionText(x)
  ].join(' ').toLowerCase().includes(q));
  box.innerHTML=table(['الاسم','البريد','الهاتف','الجنس','الدور','الصلاحيات','الحالة',''],list.map(x=>`<tr data-admin-global-type="staff" data-admin-global-id="${Number(x.id)}"><td>${E(x.name)}</td><td>${E(x.email)}</td><td>${E(x.phone||'-')}</td><td>${x.gender==='male'?'ذكر':x.gender==='female'?'أنثى':'-'}</td><td>${E(x.role)}</td><td>${E(staffPermissionText(x))}</td><td>${x.is_active?'فعال':'متوقف'}</td><td>${isOwner&&x.role!=='owner'?`<button class="btn" onclick='editStaff(${E(JSON.stringify(x))})'>تعديل الصلاحيات</button>`:''}</td></tr>`));
}
async function staff(){
  const d=await api('/api/admin/staff'),isOwner=String(currentAdminUser?.role||'').toLowerCase()==='owner';
  adminStaffCache=d.staff||[];
  $('#sections').innerHTML=`<div class="card"><h2>الموظفون والصلاحيات</h2><div class="toolbar"><input id="staffSearch" class="field" placeholder="بحث مباشر بالاسم أو البريد أو الهاتف أو الدور" oninput="renderStaffRows()">${isOwner?'<button class="btn primary" onclick="staffForm()">+ موظف</button>':''}</div><div id="staffRows"></div></div>`;
  renderStaffRows();
}
function staffForm(){modal('موظف جديد',`<div class="formgrid"><input id="sn" class="field" placeholder="الاسم"><input id="se" class="field" placeholder="البريد"><input id="sp" class="field" placeholder="الهاتف"><select id="sg" class="field"><option value="">الجنس</option><option value="female">أنثى</option><option value="male">ذكر</option></select><input id="sw" class="field" type="password" minlength="12" placeholder="كلمة المرور — 12 خانة على الأقل"><select id="sr" class="field"><option value="staff">موظف بصلاحيات محددة</option><option value="admin">Admin — كل الصلاحيات</option></select></div><p class="small-note">يُستخدم الجنس لاختيار صيغة المخاطبة المناسبة داخل لوحة التحكم لهذا الحساب.</p><h3>صلاحيات الموظف</h3><div class="formgrid">${permissionChecks([])}</div><div class="actions"><button class="btn primary" onclick="saveStaff()">حفظ</button></div>`)}
async function saveStaff(){const password=$('#sw').value||'';if(password.length<12)return alert('كلمة المرور يجب أن تكون 12 خانة على الأقل');await api('/api/admin/staff',{method:'POST',body:JSON.stringify({name:$('#sn').value,email:$('#se').value,phone:$('#sp').value,gender:$('#sg').value,password,role:$('#sr').value,permissions:selectedStaffPermissions()})});closeModal();toast('تم إنشاء الموظف');staff()}
function editStaff(x){modal('تعديل صلاحيات '+E(x.name||''),`<div class="formgrid"><select id="esr" class="field"><option value="staff" ${x.role==='staff'?'selected':''}>موظف بصلاحيات محددة</option><option value="admin" ${x.role==='admin'?'selected':''}>Admin — كل الصلاحيات</option></select><select id="esg" class="field"><option value="">الجنس</option><option value="female" ${x.gender==='female'?'selected':''}>أنثى</option><option value="male" ${x.gender==='male'?'selected':''}>ذكر</option></select><label style="display:flex;gap:8px;align-items:center"><input id="esa" type="checkbox" ${x.is_active?'checked':''}> الحساب فعال</label></div><p class="small-note">تغيير الجنس يغيّر صيغة المخاطبة في لوحة التحكم عند تسجيل دخول هذا الموظف.</p><h3>الصلاحيات</h3><div class="formgrid">${permissionChecks(x.permissions||[])}</div><div class="actions"><button class="btn primary" onclick="saveStaffEdit(${Number(x.id)})">حفظ التعديلات</button></div>`)}
async function saveStaffEdit(id){await api('/api/admin/staff/'+id,{method:'PATCH',body:JSON.stringify({role:$('#esr').value,gender:$('#esg').value,is_active:!!$('#esa').checked,permissions:selectedStaffPermissions()})});closeModal();toast('تم تحديث الصلاحيات');staff()}
async function offers(){let preview={recipients:0,configured:false};try{preview=await api('/api/admin/whatsapp-campaigns/preview')}catch{}$('#sections').innerHTML=`<div class="card"><h2>العروض والحملات</h2><p>الإرسال يتم فقط للعملاء الذين وافقوا على رسائل واتساب. المستلمون الحاليون: <b>${preview.recipients||0}</b>. حالة الربط: <b>${preview.configured?'جاهز':'غير مكتمل'}</b>.</p><div class="formgrid"><input id="ot" class="field" placeholder="عنوان العرض"><input id="ol" class="field" placeholder="رابط العرض"><textarea id="om" class="field full" rows="5" placeholder="رسالة الحملة"></textarea></div><div class="actions"><button class="btn" onclick="previewCampaign()">تحديث عدد المستلمين</button><button class="btn primary" onclick="sendCampaign()" ${preview.configured?'':'disabled'}>إرسال واتساب للموافقين</button></div><div id="campaignResult"></div></div>`}
async function previewCampaign(){const d=await api('/api/admin/whatsapp-campaigns/preview');$('#campaignResult').innerHTML=`<div class="notice">المستلمون الموافقون حاليًا: <b>${d.recipients||0}</b> — الربط: <b>${d.configured?'جاهز':'غير مكتمل'}</b></div>`}
async function sendCampaign(){const title=$('#ot')?.value.trim()||'',message=$('#om')?.value.trim()||'',link=$('#ol')?.value.trim()||'';if(!title||!message)return alert('أدخل عنوان العرض ورسالة الحملة');const p=await api('/api/admin/whatsapp-campaigns/preview');if(!p.configured)return alert('ربط WhatsApp Business أو قالب الحملة غير مكتمل');if(!p.recipients)return alert('لا يوجد عملاء موافقون على رسائل واتساب حاليًا');if(!confirm('سيتم إرسال الحملة إلى '+p.recipients+' عميل موافق. متابعة؟'))return;$('#campaignResult').innerHTML='<div class="notice">جاري الإرسال...</div>';try{const d=await api('/api/admin/whatsapp-campaigns',{method:'POST',body:JSON.stringify({title,message,link,confirm:true})}),r=d.result||{};$('#campaignResult').innerHTML=`<div class="success">تم الإرسال: ${r.sent||0} — فشل: ${r.failed||0} — المستلمون: ${r.recipients||0}</div>`}catch(e){$('#campaignResult').innerHTML=`<div class="notice">${E(e.message||'تعذر إرسال الحملة')}</div>`}}
function homepage(){$('#sections').innerHTML='<div class="card"><h2>الصفحة الرئيسية</h2><p>إدارة البنرات والمحتوى وTop 5 والأكثر مبيعًا تحتاج ربط مخطط المحتوى الفعلي الموجود في قاعدة البيانات، ولن أضيف تخزينًا وهميًا.</p></div>'}
function waitStatusLabel(s){return s==='notified'?'تم الإشعار':s==='closed'?'مغلق':'بانتظار التوفر'}
let adminWaitlistCache=[];
function renderWaitlistRows(){
  const box=$('#waitlistRows');if(!box)return;
  box.innerHTML=table(['المنتج','الزبون','الهاتف','الخيار','الحالة','التاريخ','الإجراء'],adminWaitlistCache.map(x=>`<tr data-admin-global-type="waitlist" data-admin-global-id="${Number(x.id)}"><td><button class="btn" onclick="window.open('/#product-${Number(x.productId)}','_blank')">${x.productImage?`<img src="${E(x.productImage)}" alt="" style="width:42px;height:42px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:6px">`:''}${E(x.productName||'منتج')}</button></td><td>${E(x.name||'-')}</td><td>${E(x.phone||'-')}</td><td>${E(x.variant||'-')}</td><td>${waitStatusLabel(x.status)}</td><td>${x.createdAt?new Date(x.createdAt).toLocaleString('ar'):'-'}</td><td><div class="actions">${x.status==='waiting'?`<button class="btn primary" type="button" onclick="sendWaitlistWhatsApp(${Number(x.id)})" ${x.isAvailable===true?'':'disabled title="يتفعّل التذكير عند رجوع الصنف أو الخيار للمخزون"'}>تذكير عبر واتساب</button>${x.isAvailable===true?'':'<small class="waitlist-stock-note">يتفعّل عند توفر المنتج</small>'}<button class="btn" type="button" onclick="setWaitlistStatus(${Number(x.id)},'notified')">تسجيل إشعار يدوي</button>`:''}<button class="btn" onclick="setWaitlistStatus(${Number(x.id)},'${x.status==='closed'?'waiting':'closed'}')">${x.status==='closed'?'إعادة فتح':'إغلاق'}</button></div></td></tr>`));
  const labels=['المنتج','الزبون','الهاتف','الخيار','الحالة','التاريخ','الإجراء'];
  box.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>cell.dataset.label=labels[i]||''));
}
async function fetchWaitlistRows(){
  const status=$('#wls')?.value||'',search=$('#wlq')?.value||'';
  const d=await api('/api/admin/waitlist?status='+encodeURIComponent(status)+'&search='+encodeURIComponent(search));
  adminWaitlistCache=d.requests||[];
  renderWaitlistRows();
}
async function waitlist(){
  $('#sections').innerHTML=`<div class="card"><h2>قائمة التوفر</h2><p>اضغط «تذكير عبر واتساب» بجانب طلب الزبون بعد رجوع المنتج أو الخيار للمخزون. للإرسال التلقائي: الإعدادات ← أتمتة السلة وواتساب.</p><div class="toolbar"><input id="wlq" class="field" placeholder="بحث مباشر بالمنتج أو الاسم أو الهاتف" oninput="liveDebounce('waitlist',fetchWaitlistRows,220)"><select id="wls" class="field" onchange="fetchWaitlistRows()"><option value="">كل الحالات</option><option value="waiting">بانتظار التوفر</option><option value="notified">تم الإشعار</option><option value="closed">مغلق</option></select></div><div id="waitlistRows">جاري التحميل…</div></div>`;
  await fetchWaitlistRows();
}
async function sendWaitlistWhatsApp(id){
  if(!confirm('إرسال رسالة واتساب لهذا الزبون الآن؟ سيتم الإرسال فقط إذا الصنف/الخيار متوفر فعلًا.'))return;
  try{
    await api('/api/admin/waitlist/'+id+'/notify-whatsapp',{method:'POST',body:'{}'});
    toast('تم إرسال رسالة التوفر عبر واتساب');
    await fetchWaitlistRows();
  }catch(e){alert(e.message||'تعذر إرسال رسالة التوفر')}
}
async function setWaitlistStatus(id,status){await api('/api/admin/waitlist/'+id,{method:'PATCH',body:JSON.stringify({status})});toast(status==='notified'?'تم تسجيل الإشعار':'تم تحديث طلب التوفر');waitlist()}
function modal(t,b){$('#mt').textContent=adminGenderText(t);$('#mb').innerHTML=b;$('#modal').classList.add('open');initDateInputs($('#modal'));applyAdminGenderCopy($('#modal'))}function closeModal(){$('#modal').classList.remove('open')}
(async()=>{const token=localStorage.getItem('lf_admin_token');if(token){await showApp()}else{showLogin()}})()


async function markOrderPrepared(id){const select=$('#orderStatusEdit');if(select)select.value='completed';else return alert('تعذر فتح حالة الطلب');await saveOrderStatus(id)}
let staffActivityPage=1;
async function reports(){await salesReports();const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jerusalem'});$('#sections').insertAdjacentHTML('beforeend',`<div class="card"><h2>تقرير حركات الموظفين</h2><p>يسجّل الإضافات والتعديلات والحذف وإجراءات الطلبات ابتداءً من تفعيل هذا التقرير.</p><div class="toolbar"><label>من<input id="activityFrom" type="date" class="field" value="${today}" onchange="staffActivityRun(1)"></label><label>إلى<input id="activityTo" type="date" class="field" value="${today}" onchange="staffActivityRun(1)"></label><select id="activityEmployee" class="field" onchange="staffActivityRun(1)"><option value="">كل الموظفين</option></select></div><div id="staffActivityResults"></div></div>`);await staffActivityRun(1)}
async function staffActivityRun(page=1){const root=$('#staffActivityResults');if(!root)return;const selected=$('#activityEmployee').value;root.textContent='جاري تحميل الحركات…';try{const d=await api('/api/admin/reports/staff-activity?from='+encodeURIComponent($('#activityFrom').value)+'&to='+encodeURIComponent($('#activityTo').value)+'&employee='+encodeURIComponent(selected)+'&page='+page);if(!root.isConnected)return;staffActivityPage=d.page;$('#activityEmployee').innerHTML='<option value="">كل الموظفين</option>'+d.employees.map(x=>`<option value="${Number(x.id)}" ${String(x.id)===selected?'selected':''}>${E(x.name||'موظف #'+x.id)}</option>`).join('');const resources={orders:'الطلبات',products:'المنتجات',users:'العملاء',inventory:'المخزون',settings:'الإعدادات',coupons:'الكوبونات',waitlist:'قائمة التوفر',staff:'الموظفون',uploads:'رفع الصور',categories:'الفئات',brands:'البراندات',returns:'الإرجاع والاستبدال'};root.innerHTML='<p>عدد الحركات: '+Number(d.total)+'</p>'+table(['الوقت','الموظف','القسم','الحركة','رقم السجل','النتيجة'],d.rows.map(x=>`<tr><td>${E(new Date(x.created_at).toLocaleString('ar-PS'))}</td><td>${E(x.actor_name)}</td><td>${E(resources[x.resource]||x.resource)}</td><td>${E(staffActivityLabel(x))}</td><td>${x.target_id?Number(x.target_id):'—'}</td><td>${Number(x.status_code)<400?'تم بنجاح':'لم يكتمل'} (${Number(x.status_code)})</td></tr>`))+'<div class="actions"><button class="btn" onclick="staffActivityRun('+Math.max(1,d.page-1)+')" '+(d.page<=1?'disabled':'')+'>السابق</button><span>صفحة '+Number(d.page)+'</span><button class="btn" onclick="staffActivityRun('+(d.page+1)+')" '+(d.page*50>=d.total?'disabled':'')+'>التالي</button></div>'}catch(e){root.textContent=e.message}}

function staffActivityLabel(x){const suffix=String(x.action||'').split('/').pop();const labels={preparation:'تجهيز الطلبية',status:'تغيير الحالة',gifts:x.method==='DELETE'?'حذف هدية':'إضافة هدية','shipping-discount':'تعديل خصم التوصيل','shipping-waiver':'تعديل إعفاء التوصيل','notify-whatsapp':'إرسال تذكير التوفر عبر واتساب',image:'رفع صورة',video:'رفع فيديو','ordering-block':'تعديل منع الطلبات','password':'تغيير كلمة المرور','read':'تسجيل قراءة رسالة'};return labels[suffix]||({POST:'إضافة / تنفيذ إجراء',PUT:'تعديل',PATCH:'تعديل',DELETE:'حذف'}[x.method]||'إجراء إداري')}

// Cross-section live search, loaded only from sections the current admin can access.
let adminGlobalSearchIndexCache={key:'',loadedAt:0,entries:[],promise:null};
let adminGlobalSearchTimer=null;
function adminGlobalSearchKey(){return [String(currentAdminUser?.role||''),...(Array.isArray(currentAdminUser?.permissions)?currentAdminUser.permissions:[])].sort().join('|')}
function adminGlobalNormalize(value){return String(value??'').toLocaleLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/(^|\s)ال(?=[\u0600-\u06FF])/g,'$1').replace(/\s+/g,' ').trim()}
function adminGlobalFieldLabel(key){
  const name=String(key||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').toLowerCase();
  const groups=[[/shipping|deliver|freight|transport|area|region/,'التوصيل الشحن النقل المنطقة'],[/phone|mobile|contact/,'الهاتف التواصل'],[/customer|user|recipient|name/,'الزبون العميل الاسم'],[/price|amount|total|cost|fee|discount|sale/,'السعر الإجمالي التكلفة الرسوم الخصم'],[/product|variant|sku|barcode|brand|category/,'المنتج الخيار المخزون الباركود البراند الفئة'],[/status|state|payment|method/,'الحالة الدفع الطريقة'],[/address|city|country|postal/,'العنوان المدينة الدولة'],[/message|note|reason|description|content/,'الرسالة الملاحظة السبب الوصف'],[/date|time|created|updated|expiry|expires/,'التاريخ الوقت'],[/coupon|code|offer|campaign/,'الكوبون الكود العرض'],[/stock|quantity|qty|inventory/,'المخزون الكمية'],[/point|loyalty/,'النقاط نقاط الولاء']];
  return name+' '+groups.filter(([pattern])=>pattern.test(name)).map(([,label])=>label).join(' ');
}
function adminGlobalFlatten(value,key='',depth=0){
  if(depth>5||value==null)return '';
  if(/^(image|imageurl|image_url|avatar|video|media|password|password_hash|token|secret|credential|permissions)$/i.test(key))return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value))return value.slice(0,100).map(item=>adminGlobalFlatten(item,'',depth+1)).filter(Boolean).join(' ');
  if(typeof value==='object')return Object.entries(value).map(([childKey,childValue])=>[adminGlobalFieldLabel(childKey),adminGlobalFlatten(childValue,childKey,depth+1)].filter(Boolean).join(' ')).filter(Boolean).join(' ');
  return '';
}
function adminGlobalEntry(section,type,id,title,record,detail=''){
  const flat=adminGlobalFlatten(record);
  return {section,type,id,title:String(title||'').trim()||'نتيجة',detail:String(detail||flat).replace(/\s+/g,' ').trim().slice(0,240),search:adminGlobalNormalize([title,flat].join(' ')),data:record};
}
const ADMIN_GLOBAL_SECTION_TERMS={
dashboard:'الرئيسية لوحة التحكم ملخص الإحصائيات',
users:'المستخدمون الزبائن العملاء الاسم الهاتف البريد الإلكتروني الحسابات',
products:'المنتجات المنتج السعر الصورة الاسم البراند الفئة الباركود رقم المنتج الوصف العروض السريعة',
inventory:'المخزون الكمية المنتج المورد التاجر اللون المقاس SKU حركات المخزون',
orders:'الطلبات الطلبات والفواتير الطلب رقم الطلب العميل الزبون الهاتف العنوان الحالة الدفع التوصيل النقل الشحن رسوم التوصيل بطاقة هدية معايدة',
returns:'الإرجاع الاستبدال طلب إرجاع تبديل استرداد استبدال المنتج الرسوم',
waitlist:'قائمة التوفر انتظار التوفر المنتج الزبون الهاتف إشعار',
finance:'الحسابات المالية المبيعات الربح التكلفة رسوم التوصيل خصم التوصيل النقل المصروفات',
offers:'العروض الحملات خصم واتساب إرسال العرض منتج سعر العرض',
catalog:'الفئات التصنيفات البراندات العلامات التجارية الفئة البراند',
coupons:'أكواد الخصم كوبون كود خصم نسبة قيمة الحد الأدنى',
reports:'التقارير تقرير المبيعات الأرباح الموظفين حركات الموظفين المخزون الطلبات',
homepage:'الصفحة الرئيسية السلايدر البنرات الصور الرئيسية المحتوى',
social:'مواقع التواصل واتساب إنستغرام فيسبوك تيك توك سناب شات الروابط',
settings:'الإعدادات التوصيل الشحن النقل رسوم التوصيل خصم التوصيل البطاقة بطاقة المعايدة الطباعة واتساب نقاط الولاء التغليف الهدايا',
staff:'الموظفون الموظفين الصلاحيات الموظف الحساب الدور البريد الهاتف',
messages:'المحادثات الرسائل ملاحظات داخلية رسالة موظف محادثة الطلب المنتج'
};
function adminGlobalSectionEntries(){return Object.entries(ADMIN_GLOBAL_SECTION_TERMS).filter(([section])=>canAdminSection(section)).map(([section,terms])=>adminGlobalEntry(section,'section',section,titles[section]||section,{section,terms},terms))}
async function loadAdminGlobalSearchIndex(){
  const key=adminGlobalSearchKey(),now=Date.now(),cache=adminGlobalSearchIndexCache;
  if(cache.key===key&&cache.entries.length&&now-cache.loadedAt<60000)return cache.entries;
  if(cache.key===key&&cache.promise)return cache.promise;
  const jobs=[];
  const request=(permission,url,read)=>{if(canAdminSection(permission))jobs.push(api(url).then(data=>read(data)||[]).catch(()=>[]))};
  request('products','/api/admin/products',d=>(d.products||[]).map(x=>adminGlobalEntry('products','product',x.id,x.name||('منتج #'+x.id),x,[x.brand,x.category,x.sku,x.barcode,x.productNumber||x.product_number].filter(Boolean).join(' · '))));
  request('orders','/api/admin/orders',d=>(d.orders||[]).map(x=>adminGlobalEntry('orders','order',x.id,'طلب #'+x.id+' · '+(x.customer_name||x.user_email||'عميل'),x,[x.customer_phone||x.user_phone,x.status,x.total?'الإجمالي '+x.total+' ₪':'',(x.items||[]).map(i=>i.productName||i.product_name||'').join('، ')].filter(Boolean).join(' · '))));
  request('users','/api/admin/users',d=>(d.users||[]).map(x=>adminGlobalEntry('users','user',x.id,x.name||x.email||('مستخدم #'+x.id),x,[x.phone,x.email,x.role].filter(Boolean).join(' · '))));
  request('inventory','/api/admin/inventory',d=>[...(d.products||[]).map(x=>adminGlobalEntry('inventory','inventory',x.id,x.name||('منتج #'+x.id),x,[x.sku,x.category_name,x.brand_name,x.supplier_name,'المخزون '+(x.stock??0)].filter(Boolean).join(' · '))),...(d.variants||[]).map(x=>adminGlobalEntry('inventory','inventory',x.product_id,x.product_name||('منتج #'+x.product_id),x,[x.color,x.size,x.sku,'المخزون '+(x.stock??0)].filter(Boolean).join(' · ')))]);
  request('returns','/api/admin/returns',d=>(d.requests||[]).map(x=>adminGlobalEntry('returns','return',x.id,'طلب إرجاع #'+(x.order_id||x.id)+' · '+(x.product_name||'منتج'),x,[x.customer_name,x.customer_phone,x.variant_name,x.reason,x.status].filter(Boolean).join(' · '))));
  request('waitlist','/api/admin/waitlist?status=&search=',d=>(d.requests||[]).map(x=>adminGlobalEntry('waitlist','waitlist',x.id,x.productName||x.product_name||'طلب توفر',x,[x.name,x.phone,x.variant,x.status].filter(Boolean).join(' · '))));
  request('coupons','/api/admin/coupons',d=>(d.coupons||[]).map(x=>adminGlobalEntry('coupons','coupon',x.id,x.code||('كوبون #'+x.id),x,[x.discount_value,x.discount_type,x.minimum_amount,x.status].filter(Boolean).join(' · '))));
  request('staff','/api/admin/staff',d=>(d.staff||[]).map(x=>adminGlobalEntry('staff','staff',x.id,x.name||x.email||('موظف #'+x.id),x,[x.email,x.phone,x.role].filter(Boolean).join(' · '))));
  request('catalog','/api/categories',d=>(d.categories||[]).map(x=>adminGlobalEntry('catalog','category',x.id,'فئة · '+(x.name||''),x,x.name||'')));
  request('catalog','/api/brands',d=>(d.brands||[]).map(x=>adminGlobalEntry('catalog','brand',x.id,'براند · '+(x.name||''),x,x.name||'')));
  request('settings','/api/admin/settings',d=>Object.entries(d.settings||{}).map(([key,value])=>adminGlobalEntry('settings','setting',key,key,{key,value},adminGlobalFlatten(value))));
  request('dashboard','/api/admin/dashboard',d=>[adminGlobalEntry('dashboard','dashboard','dashboard','ملخص لوحة التحكم',d.dashboard||d)]);
  if(canAdminSection('messages'))jobs.push(api('/api/staff-conversations').then(d=>(d.conversations||[]).map(x=>adminGlobalEntry('messages','message',x.id,x.other_name||'محادثة داخلية',x,[x.context_label,x.last_message].filter(Boolean).join(' · ')))).catch(()=>[]));
  cache.key=key;cache.promise=Promise.all(jobs).then(groups=>{cache.entries=groups.flat().concat(adminGlobalSectionEntries());cache.loadedAt=Date.now();cache.promise=null;return cache.entries}).catch(error=>{cache.promise=null;throw error});
  return cache.promise;
}
function renderAdminGlobalSearchResults(query,entries){
  const box=document.getElementById('adminGlobalSearchResults');if(!box)return;
  const tokens=adminGlobalNormalize(query).split(' ').filter(Boolean);
  const matches=entries.filter(item=>tokens.every(token=>item.search.includes(token))).sort((a,b)=>{const q=adminGlobalNormalize(query);return Number(b.search.startsWith(q))-Number(a.search.startsWith(q))}).slice(0,35);
  box.innerHTML=matches.length?matches.map((item,index)=>`<button class="admin-global-result" type="button" onclick="openAdminGlobalSearchResult(${index})"><span class="admin-global-result-main"><b>${E(item.title)}</b><small>${E(item.detail||item.section)}</small></span><span class="admin-global-result-section">${E(titles[item.section]||item.section)}</span></button>`).join(''):'<div class="admin-global-search-empty">لا توجد نتائج مطابقة في الأقسام المتاحة لحسابك.</div>';
  box.hidden=false;window.adminGlobalSearchVisibleResults=matches;
}
function adminGlobalSearchInput(){
  clearTimeout(adminGlobalSearchTimer);
  const input=document.getElementById('adminGlobalSearch'),box=document.getElementById('adminGlobalSearchResults');
  const query=String(input?.value||'').trim();
  if(!query){if(box)box.hidden=true;input?.setAttribute('aria-expanded','false');return}
  if(query.length<2){if(box){box.innerHTML='<div class="admin-global-search-empty">اكتب حرفين على الأقل للبحث في اللوحة.</div>';box.hidden=false;input?.setAttribute('aria-expanded','true')}return}
  if(box){box.innerHTML='<div class="admin-global-search-empty">جاري البحث في أقسام لوحة التحكم…</div>';box.hidden=false;input?.setAttribute('aria-expanded','true')}
  adminGlobalSearchTimer=setTimeout(async()=>{try{const entries=await loadAdminGlobalSearchIndex();if(String(input?.value||'').trim()===query)renderAdminGlobalSearchResults(query,entries)}catch{if(box){box.innerHTML='<div class="admin-global-search-empty">تعذر تحميل نتائج البحث الآن.</div>';box.hidden=false;input?.setAttribute('aria-expanded','true')}}},250);
}
function focusAdminGlobalRecordRow(item){
  const record=item.data||{},type=String(item.type||''),id=String(item.id??'').trim();
  const allRows=[...document.querySelectorAll('#sections [data-admin-global-type][data-admin-global-id]')];
  let target=allRows.find(row=>row.dataset.adminGlobalType===type&&row.dataset.adminGlobalId===id)||null;
  if(!target&&id){
    target=allRows.find(row=>row.dataset.adminGlobalId===id&&(!item.section||row.closest('#sections')===document.querySelector('#sections')))||null;
  }
  if(!target&&type==='order'&&id){
    target=[...document.querySelectorAll('#orderRows tbody tr')].find(row=>{
      const firstCell=String(row.cells?.[0]?.textContent||'').trim();
      return firstCell==='#'+id||firstCell===id;
    })||null;
  }
  if(!target){
    const values=[
      item.title,record.name,record.productName,record.product_name,record.code,
      record.customer_name,record.customer_phone,record.phone,record.email,
      record.variant,record.variant_name,record.order_id
    ].filter(value=>value!==undefined&&value!==null&&String(value).trim().length>1)
      .map(value=>adminGlobalNormalize(value));
    let scoreBest=0;
    for(const row of document.querySelectorAll('#sections tbody tr')){
      const text=adminGlobalNormalize(row.innerText||row.textContent||'');
      let score=values.reduce((sum,value)=>sum+(text.includes(value)?Math.min(value.length,40):0),0);
      if(type==='order'&&id&&new RegExp('(^|\\s)#?'+id+'(\\s|$)').test(String(row.innerText||row.textContent||'')))score+=100;
      if(score>scoreBest){target=row;scoreBest=score}
    }
  }
  if(!target){toast('فتحت القسم، لكن لم أجد صفّ النتيجة. حدّث القائمة وحاول مرة ثانية.');return false}
  document.querySelectorAll('#sections .admin-global-row-focus').forEach(row=>{row.classList.remove('admin-global-row-focus');row.removeAttribute('aria-current')});
  target.classList.add('admin-global-row-focus');
  target.setAttribute('aria-current','true');
  target.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
  setTimeout(()=>{target.classList.remove('admin-global-row-focus');target.removeAttribute('aria-current')},5000);
  return true;
}
function focusAdminGlobalSetting(item){
  const key=String(item.data?.key||item.id||'').trim();
  const normalizedKey=adminGlobalNormalize(key).replace(/[.\s-]/g,'_');
  const fields=[...document.querySelectorAll('#sections input,#sections select,#sections textarea,#sections button')];
  const directId=ADMIN_GLOBAL_SETTING_FIELD_IDS[normalizedKey]||ADMIN_GLOBAL_SETTING_FIELD_IDS[normalizedKey.replace(/_+/g,'_')];
  const target=(directId?document.getElementById(directId):null)||fields.find(field=>{
    const normalizedField=adminGlobalNormalize(field.id||'').replace(/[.\s-]/g,'_');
    return normalizedField===normalizedKey||adminGlobalNormalize(field.dataset.settingKey||'').replace(/[.\s-]/g,'_')===normalizedKey;
  });
  const clearFocus=()=>document.querySelectorAll('#sections .admin-global-row-focus').forEach(node=>{node.classList.remove('admin-global-row-focus');node.removeAttribute('aria-current')});
  const highlight=anchor=>{
    if(!anchor)return false;
    clearFocus();
    anchor.classList.add('admin-global-row-focus');
    anchor.setAttribute('aria-current','true');
    anchor.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
    setTimeout(()=>{anchor.classList.remove('admin-global-row-focus');anchor.removeAttribute('aria-current')},5000);
    return true;
  };
  if(target){
    const anchor=target.closest('label')||target.closest('.card')||target;
    highlight(anchor);
    if(/INPUT|SELECT|TEXTAREA/.test(target.tagName))target.focus({preventScroll:true});
    return true;
  }
  const hint=ADMIN_GLOBAL_SETTING_CARD_HINTS.find(([pattern])=>pattern.test(key)||pattern.test(String(item.title||''))||pattern.test(String(item.detail||'')));
  if(hint){
    const card=[...document.querySelectorAll('#sections .card')].find(node=>adminGlobalNormalize(node.querySelector('h2,h3')?.textContent||'').includes(adminGlobalNormalize(hint[1])));
    if(highlight(card))return true;
  }
  const fieldsContainer=document.querySelector('#sections .grid');
  if(highlight(fieldsContainer))return true;
  toast('تم فتح قسم الإعدادات، لكن لم أتمكن من مطابقة هذا الإعداد بحقل محدد.');
  return false;
}
async function openAdminGlobalSearchResult(index){
  const item=window.adminGlobalSearchVisibleResults?.[index];if(!item)return;
  const box=document.getElementById('adminGlobalSearchResults');if(box)box.hidden=true;
  const input=document.getElementById('adminGlobalSearch');if(input)input.blur();
  if(!canAdminSection(item.section))return toast('ليس لديك صلاحية لهذا القسم');
  if(item.type==='order'){
    const status=$('#orderStatusFilter'),search=$('#orderSearch');
    if(status)status.value='';
    if(search)search.value='';
  }
  await openAdminSection(item.section);
  if(item.type==='section')return;
  if(item.type==='setting')return focusAdminGlobalSetting(item);
  if(item.type==='message'){
    await openStaffConversation(Number(item.id));
    const thread=document.querySelector('#staffChatMessages')||document.querySelector('.staff-chat-layout');
    if(thread){thread.classList.add('admin-global-row-focus');thread.scrollIntoView({behavior:'smooth',block:'center'})}
    return;
  }
  focusAdminGlobalRecordRow(item);
}

function applyAdminGlobalSearch(){adminGlobalSearchInput()}
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const box=document.getElementById('adminGlobalSearchResults');if(box){box.hidden=true;document.getElementById('adminGlobalSearch')?.setAttribute('aria-expanded','false')}}});
document.addEventListener('click',event=>{const wrap=document.querySelector('.admin-global-search-wrap');const box=document.getElementById('adminGlobalSearchResults');if(box&&!wrap?.contains(event.target)){box.hidden=true;document.getElementById('adminGlobalSearch')?.setAttribute('aria-expanded','false')}});
function adminScrollToEdge(edge){
  const modal=document.getElementById('modal');
  const panel=modal?.classList.contains('open')?modal.querySelector('.modal-card'):null;
  if(panel){panel.scrollTo({top:edge==='top'?0:panel.scrollHeight,behavior:'smooth'});return}
  const scroller=document.scrollingElement||document.documentElement;
  window.scrollTo({top:edge==='top'?0:scroller.scrollHeight,behavior:'smooth'});
}
