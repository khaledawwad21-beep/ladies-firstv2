const $=s=>document.querySelector(s),E=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),M=v=>Number(v||0).toFixed(2);let sec='dashboard';
async function api(u,o={}){
  const token=localStorage.getItem('lf_admin_token')||'';
  const headers={'Content-Type':'application/json',...(o.headers||{})};
  if(token) headers.Authorization='Bearer '+token;
  let r=await fetch(u,{...o,headers});
  let d={}; try{d=await r.json()}catch{}
  if(r.status===401){
    localStorage.removeItem('lf_admin_token');
    localStorage.removeItem('lf_admin_user');
    showLogin();
    throw Error(d.message||'انتهت جلسة الدخول');
  }
  if(!r.ok||d.ok===false)throw Error(d.message||('HTTP '+r.status));
  return d;
}
function showLogin(){
  $('#app').hidden=true;
  $('#login').hidden=false;
}
function showApp(){
  $('#login').hidden=true;
  $('#app').hidden=false;
}
async function adminLogin(){
  const contact=$('#loginContact').value.trim();
  const password=$('#loginPassword').value;
  const msg=$('#loginMsg');
  msg.textContent='';
  if(!contact||!password){msg.textContent='أدخل بيانات الدخول كاملة';return}
  try{
    const d=await fetch('/api/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contact,password})
    }).then(async r=>{
      const x=await r.json().catch(()=>({}));
      if(!r.ok||x.ok===false) throw Error(x.message||'تعذر تسجيل الدخول');
      return x;
    });
    if(!['owner','admin','staff'].includes(d.user?.role)){
      throw Error('هذا الحساب ليس حساب إدارة');
    }
    localStorage.setItem('lf_admin_token',d.token);
    localStorage.setItem('lf_admin_user',JSON.stringify(d.user));
    showApp();
    await load()
  }catch(e){msg.textContent=e.message}
}
function logout(){
  localStorage.removeItem('lf_admin_token');
  localStorage.removeItem('lf_admin_user');
  showLogin();
}
function toast(x){let t=$('#toast');t.textContent=x;t.style.cssText='display:block;position:fixed;bottom:18px;left:18px;background:#63345e;color:white;padding:12px 16px;border-radius:10px;z-index:20';setTimeout(()=>t.style.display='none',2500)}
const titles={dashboard:'الرئيسية',users:'المستخدمون',products:'المنتجات',inventory:'المخزون',orders:'الطلبات والفواتير',finance:'الحسابات',offers:'العروض والحملات',catalog:'التصنيفات والعلامات',coupons:'الكوبونات',reports:'التقارير',homepage:'الصفحة الرئيسية',social:'مواقع التواصل',settings:'الإعدادات',staff:'الموظفون والصلاحيات'};
const navs=[...document.querySelectorAll('.nav')];navs.forEach(n=>n.onclick=()=>{sec=n.dataset.s;navs.forEach(x=>x.classList.toggle('active',x===n));$('#title').textContent=titles[sec];load()});
function table(h,rows){return rows.length?`<div class="tablewrap"><table class="table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<p>لا توجد بيانات.</p>'}
async function load(){try{if(sec==='dashboard')return dash();if(sec==='users')return users();if(sec==='products')return products();if(sec==='inventory')return inventory();if(sec==='orders')return orders();if(sec==='finance')return finance();if(sec==='catalog')return catalog();if(sec==='coupons')return coupons();if(sec==='reports')return reports();if(sec==='social')return social();if(sec==='settings')return settings();if(sec==='staff')return staff();if(sec==='offers')return offers();if(sec==='homepage')return homepage()}catch(e){toast(e.message)}}
async function dash(){let d=await api('/api/admin/dashboard'),x=d.dashboard;$('#sections').innerHTML=`<div class="cards">${[['العملاء',x.customers],['المنتجات',x.products],['الطلبات',x.orders],['المبيعات',M(x.sales)],['قيد التنفيذ',x.pendingOrders],['مخزون منخفض',x.lowStock]].map(a=>`<div class="stat"><small>${a[0]}</small><b>${a[1]}</b></div>`).join('')}</div><div class="grid"><div class="card"><h2>تنبيهات</h2>${x.lowStock?`يوجد ${x.lowStock} منتج منخفض المخزون.`:'لا يوجد تنبيه مخزون ضمن الحد الحالي.'}</div><div class="card"><h2>ملاحظة</h2>هذه الواجهة مرتبطة بالـAPI الموجود حاليًا ولن تغيّر بيانات الموقع بدون طلب صريح.</div></div>`}
async function users(){let q=encodeURIComponent($('#uq')?.value||''),d=await api('/api/admin/users?search='+q);$('#sections').innerHTML=`<div class="card"><h2>المستخدمون</h2><div class="toolbar"><input id="uq" class="field" placeholder="بحث بالاسم أو البريد أو الهاتف" value="${E(decodeURIComponent(q))}"><button class="btn primary" onclick="users()">بحث</button></div>${table(['الاسم','البريد','الهاتف','الجنس','العمر','الدور','الحالة',''],(d.users||[]).map(u=>`<tr><td>${E(u.name)}</td><td>${E(u.email)}</td><td>${E(u.phone||'-')}</td><td>${E(u.gender||'-')}</td><td>${u.age||'-'}</td><td>${E(u.role)}</td><td>${u.is_active?'فعال':'متوقف'}</td><td><button class="btn" onclick='editUser(${JSON.stringify(u)})'>تعديل</button></td></tr>`))}</div>`}
function editUser(u){modal('تعديل المستخدم',`<div class="formgrid"><input id="un" class="field" value="${E(u.name)}" placeholder="الاسم"><input id="ue" class="field" value="${E(u.email)}" placeholder="البريد"><input id="up" class="field" value="${E(u.phone||'')}" placeholder="الهاتف"><select id="ug" class="field"><option value="">غير محدد</option><option value="male" ${u.gender==='male'?'selected':''}>ذكر</option><option value="female" ${u.gender==='female'?'selected':''}>أنثى</option></select><input id="ua" class="field" type="number" value="${u.age||''}" placeholder="العمر"></div><div class="actions"><button class="btn primary" onclick="saveUser(${u.id})">حفظ</button></div>`)}
async function saveUser(id){await api('/api/admin/users/'+id,{method:'PATCH',body:JSON.stringify({name:$('#un').value,email:$('#ue').value,phone:$('#up').value,gender:$('#ug').value||null,age:$('#ua').value?Number($('#ua').value):null})});closeModal();toast('تم الحفظ');users()}
async function products(){let d=await api('/api/products');$('#sections').innerHTML=`<div class="card"><h2>المنتجات</h2><div class="toolbar"><input id="pq" class="field" placeholder="بحث"><button class="btn" onclick="productForm()">+ منتج جديد</button></div>${table(['المنتج','السعر','المخزون','الحالة',''],(d.products||[]).filter(p=>(p.name||'').includes($('#pq')?.value||'')).map(p=>`<tr><td>${E(p.name)}</td><td>${M(p.price)}</td><td>${p.stock??0}</td><td>${p.is_active?'فعال':'متوقف'}</td><td><button class="btn" onclick='productForm(${JSON.stringify(p)})'>تعديل</button></td></tr>`))}</div>`}
function productForm(p={}){
  modal(p.id?'تعديل المنتج':'منتج جديد',`
    <div class="formgrid">
      <input id="pn" class="field" value="${E(p.name||'')}" placeholder="اسم المنتج">
      <input id="pp" class="field" type="number" step=".01" value="${p.price??''}" placeholder="السعر">
      <input id="po" class="field" type="number" step=".01" value="${p.old_price??''}" placeholder="السعر القديم">
      <input id="ps" class="field" type="number" value="${p.stock??0}" placeholder="المخزون">
      <input id="pi" class="field full" value="${E(p.image_url||p.image||'')}" placeholder="رابط الصورة">
      <textarea id="pd" class="field full" rows="5" placeholder="الوصف">${E(p.description||'')}</textarea>
      <div class="full muted">الفيديوهات تحتاج حقول/Endpoint مخصص في قاعدة البيانات؛ لن نخزن بيانات وهمية.</div>
    </div>
    <div class="actions">
      <button class="btn primary" onclick="saveProduct(${p.id||0})">حفظ</button>
      ${p.id?`<button class="btn" onclick="variants(${p.id})">الألوان والمقاسات</button>`:''}
    </div>`);
}
async function saveProduct(id){let b={name:$('#pn').value,price:Number($('#pp').value),oldPrice:$('#po').value?Number($('#po').value):null,stock:Number($('#ps').value),imageUrl:$('#pi').value,description:$('#pd').value};await api(id?'/api/admin/products/'+id:'/api/admin/products',{method:id?'PUT':'POST',body:JSON.stringify(b)});closeModal();toast('تم حفظ المنتج');products()}

async function variants(productId){
  try{
    const d=await api('/api/admin/inventory');
    const rows=(d.variants||[]).filter(v=>Number(v.product_id)===Number(productId));
    modal('الألوان والمقاسات',`
      <div class="toolbar">
        <button class="btn primary" onclick="variantForm(${productId})">+ إضافة خيار</button>
      </div>
      ${table(['اللون','المقاس','SKU','السعر','المخزون','الحالة',''],rows.map(v=>`
        <tr><td>${E(v.color||'-')}</td><td>${E(v.size||'-')}</td><td>${E(v.sku||'-')}</td>
        <td>${M(v.price)}</td><td>${v.stock??0}</td><td>${v.is_active?'فعال':'متوقف'}</td>
        <td><button class="btn" onclick='variantForm(${productId},${JSON.stringify(v)})'>تعديل</button></td></tr>`))}
    `);
  }catch(e){toast(e.message)}
}
function variantForm(productId,v={}){
  modal(v.id?'تعديل الخيار':'خيار جديد',`
    <div class="formgrid">
      <input id="vc" class="field" value="${E(v.color||'')}" placeholder="اللون">
      <input id="vs" class="field" value="${E(v.size||'')}" placeholder="المقاس">
      <input id="vk" class="field" value="${E(v.sku||'')}" placeholder="SKU">
      <input id="vp" class="field" type="number" step=".01" value="${v.price??''}" placeholder="السعر">
      <input id="vn" class="field" type="number" min="0" value="${v.stock??0}" placeholder="المخزون">
    </div>
    <div class="actions"><button class="btn primary" onclick="saveVariant(${productId},${v.id||0})">حفظ</button></div>`);
}
async function saveVariant(productId,id){
  const body={color:$('#vc').value,size:$('#vs').value,sku:$('#vk').value,price:$('#vp').value?Number($('#vp').value):null,stock:Number($('#vn').value||0)};
  await api(id?'/api/admin/variants/'+id:'/api/admin/products/'+productId+'/variants',{method:id?'PUT':'POST',body:JSON.stringify(body)});
  toast('تم حفظ الخيار'); variants(productId);
}
async function inventory(){let d=await api('/api/admin/inventory'),p=d.products||[];$('#sections').innerHTML=`<div class="card"><h2>المخزون</h2>${table(['المنتج','SKU','الكمية','السعر','التصنيف',''],p.map(x=>`<tr><td>${E(x.name)}</td><td>${E(x.sku||'-')}</td><td>${x.stock??0}</td><td>${M(x.price)}</td><td>${E(x.category_name||'-')}</td><td><button class="btn" onclick="stock(${x.id},${x.stock||0})">تعديل</button></td></tr>`))}</div>`}
function stock(id,n){modal('تعديل المخزون',`<input id="sn" class="field" type="number" min="0" value="${n}"><div class="actions"><button class="btn primary" onclick="saveStock(${id})">حفظ</button></div>`)}async function saveStock(id){await api('/api/admin/inventory/'+id,{method:'PATCH',body:JSON.stringify({stock:Number($('#sn').value)})});closeModal();toast('تم تحديث المخزون');inventory()}
async function orders(){
  let d=await api('/api/admin/orders');
  const statuses=['pending','confirmed','processing','shipped','delivered','completed','cancelled'];
  const labels={pending:'قيد الانتظار',confirmed:'مؤكد',processing:'قيد التجهيز',shipped:'تم الشحن',delivered:'تم التسليم',completed:'مكتمل',cancelled:'ملغى'};
  $('#sections').innerHTML=`<div class="card"><h2>الطلبات والفواتير</h2>${table(
    ['رقم','العميل','الهاتف','الإجمالي','الحالة','التاريخ',''],
    (d.orders||[]).map(o=>`<tr>
      <td>#${o.id}</td><td>${E(o.user_name||o.user_email||'-')}</td><td>${E(o.user_phone||'-')}</td>
      <td>${M(o.total)}</td>
      <td><select class="field status-select" onchange="changeOrderStatus(${o.id},this.value)">
        ${statuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${labels[s]}</option>`).join('')}
      </select></td>
      <td>${new Date(o.created_at).toLocaleString('ar')}</td>
      <td><button class="btn" onclick="invoice(${o.id})">عرض/طباعة</button></td>
    </tr>`))}</div>`;
}
async function changeOrderStatus(id,status){
  try{
    await api('/api/admin/orders/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})});
    toast(status==='cancelled'?'تم إلغاء الطلب وإرجاع المخزون حسب نظام الطلبات':'تم تحديث حالة الطلب');
    orders();
  }catch(e){toast(e.message);orders()}
}
async function invoice(id){let d=await api('/api/admin/orders/'+id),o=d.order,items=d.items||[];let site=location.origin,orderUrl=site+'/order/'+id;$('#print').innerHTML=`<div class="printhead"><h1>Ladies First</h1><div>فاتورة #${id}<br>${new Date(o.created_at).toLocaleString('ar')}</div></div><p>العميل: ${E(o.user_name||'-')}<br>الهاتف: ${E(o.user_phone||'-')}<br>البريد: ${E(o.user_email||'-')}</p>${table(['المنتج','الخيار','الكمية','السعر','الإجمالي'],items.map(i=>`<tr><td>${E(i.product_name||'-')}</td><td>${E(i.variant_name||'-')}</td><td>${i.quantity}</td><td>${M(i.unit_price)}</td><td>${M(i.total)}</td></tr>`))}<p><b>الإجمالي النهائي: ${M(o.total)}</b></p><div class="qrrow"><div><div id="qrsite"></div><b>زوروا موقعنا</b></div><div><div id="qrorder"></div><b>تفاصيل طلبك</b></div></div>`;new QRCode($('#qrsite'),{text:site,width:145,height:145});new QRCode($('#qrorder'),{text:orderUrl,width:145,height:145});window.print()}
function invoicePrompt(){let id=prompt('أدخل رقم الطلب');if(id)invoice(Number(id))}async function finance(){let d=await api('/api/admin/dashboard');$('#sections').innerHTML=`<div class="grid"><div class="card"><h2>الحسابات الحالية</h2><p>إجمالي المبيعات المسجلة: <b>${M(d.dashboard.sales)}</b></p><p>الطلبات: <b>${d.dashboard.orders}</b></p></div><div class="card"><h2>تنبيه محاسبي</h2>صافي الربح الحقيقي يحتاج ربط تكلفة الشراء والمصاريف والمرتجعات في طبقة الحسابات قبل اعتماده محاسبيًا.</div></div>`}
async function catalog(){let[c,b]=await Promise.all([api('/api/categories'),api('/api/brands')]);$('#sections').innerHTML=`<div class="grid"><div class="card"><h2>التصنيفات</h2><div class="toolbar"><input id="cn" class="field"><button class="btn primary" onclick="addCat()">إضافة</button></div>${table(['الاسم'],(c.categories||[]).map(x=>`<tr><td>${E(x.name)}</td></tr>`))}</div><div class="card"><h2>العلامات</h2><div class="toolbar"><input id="bn" class="field"><button class="btn primary" onclick="addBrand()">إضافة</button></div>${table(['الاسم'],(b.brands||[]).map(x=>`<tr><td>${E(x.name)}</td></tr>`))}</div></div>`}async function addCat(){await api('/api/admin/categories',{method:'POST',body:JSON.stringify({name:$('#cn').value})});catalog()}async function addBrand(){await api('/api/admin/brands',{method:'POST',body:JSON.stringify({name:$('#bn').value})});catalog()}
async function coupons(){let d=await api('/api/admin/coupons');$('#sections').innerHTML=`<div class="card"><h2>الكوبونات</h2><button class="btn primary" onclick="couponForm()">+ كوبون</button>${table(['الكود','النوع','القيمة','الحالة'],(d.coupons||[]).map(x=>`<tr><td>${E(x.code)}</td><td>${E(x.discount_type)}</td><td>${x.discount_value}</td><td>${x.is_active?'فعال':'متوقف'}</td></tr>`))}</div>`}function couponForm(){modal('كوبون جديد',`<div class="formgrid"><input id="cc" class="field" placeholder="الكود"><select id="ct" class="field"><option value="percent">نسبة</option><option value="fixed">مبلغ</option></select><input id="cv" class="field" type="number" step=".01" placeholder="القيمة"><input id="cm" class="field" type="number" step=".01" placeholder="الحد الأدنى"><input id="cx" class="field" type="number" placeholder="أقصى استخدامات"></div><div class="actions"><button class="btn primary" onclick="saveCoupon()">حفظ</button></div>`)}async function saveCoupon(){await api('/api/admin/coupons',{method:'POST',body:JSON.stringify({code:$('#cc').value,discountType:$('#ct').value,discountValue:Number($('#cv').value),minimumAmount:Number($('#cm').value||0),maxUses:Number($('#cx').value||0)})});closeModal();coupons()}
async function reports(){let t=new Date().toISOString().slice(0,10);$('#sections').innerHTML=`<div class="card"><h2>التقارير</h2><div class="toolbar"><input id="rf" type="date" class="field" value="${t}"><input id="rt" type="date" class="field" value="${t}"><button class="btn primary" onclick="reportRun()">عرض</button></div><div id="rr"></div></div>`}async function reportRun(){let d=await api('/api/admin/reports/sales?from='+$('#rf').value+'&to='+$('#rt').value),s=d.summary||{};$('#rr').innerHTML=`<div class="cards"><div class="stat">الطلبات<b>${s.orders||0}</b></div><div class="stat">المبيعات<b>${M(s.sales)}</b></div><div class="stat">الملغاة<b>${s.cancelled||0}</b></div></div>`+table(['التاريخ','الطلبات','المبيعات'],(d.rows||[]).map(x=>`<tr><td>${x.date}</td><td>${x.orders}</td><td>${M(x.sales)}</td></tr>`))}
async function settings(){let d=await api('/api/admin/settings'),s=d.settings||{};$('#sections').innerHTML=`<div class="card"><h2>الإعدادات</h2><div class="formgrid"><input id="stn" class="field" value="${E(s.store_name||'Ladies First')}" placeholder="اسم المتجر"><input id="stp" class="field" value="${E(s.phone||'')}" placeholder="الهاتف"><input id="stw" class="field" value="${E(s.whatsapp||'0562499924')}" placeholder="WhatsApp"><input id="cur" class="field" value="${E(s.currency||'₪')}" placeholder="العملة"><textarea id="rp" class="field full" rows="5" placeholder="سياسة الاستبدال">${E(s.return_policy||'')}</textarea></div><div class="actions"><button class="btn primary" onclick="saveSettings()">حفظ</button></div></div>`}async function saveSettings(){await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({store_name:$('#stn').value,phone:$('#stp').value,whatsapp:$('#stw').value,currency:$('#cur').value,return_policy:$('#rp').value})});toast('تم حفظ الإعدادات')}
async function social(){let d=await api('/api/admin/settings'),s=d.settings?.social||{};$('#sections').innerHTML=`<div class="card"><h2>مواقع التواصل</h2>${['whatsapp','instagram','snapchat','facebook','tiktok'].map(k=>`<div class="toolbar"><input id="s_${k}" class="field" value="${E(s[k]?.url||s[k]||'')}" placeholder="${k} URL"><label><input id="e_${k}" type="checkbox" ${s[k]?.enabled===false?'':'checked'}> فعال</label></div>`).join('')}<button class="btn primary" onclick="saveSocial()">حفظ</button></div>`}async function saveSocial(){let social={};['whatsapp','instagram','snapchat','facebook','tiktok'].forEach(k=>social[k]={url:$('#s_'+k).value,enabled:$('#e_'+k).checked});await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({social})});toast('تم حفظ مواقع التواصل')}
async function staff(){let d=await api('/api/admin/staff');$('#sections').innerHTML=`<div class="card"><h2>الموظفون والصلاحيات</h2><button class="btn primary" onclick="staffForm()">+ موظف</button>${table(['الاسم','البريد','الهاتف','الدور','الحالة'],(d.staff||[]).map(x=>`<tr><td>${E(x.name)}</td><td>${E(x.email)}</td><td>${E(x.phone||'-')}</td><td>${E(x.role)}</td><td>${x.is_active?'فعال':'متوقف'}</td></tr>`))}</div>`}function staffForm(){modal('موظف جديد',`<div class="formgrid"><input id="sn" class="field" placeholder="الاسم"><input id="se" class="field" placeholder="البريد"><input id="sp" class="field" placeholder="الهاتف"><input id="sw" class="field" type="password" placeholder="كلمة المرور"><select id="sr" class="field"><option value="staff">staff</option><option value="admin">admin</option></select></div><div class="actions"><button class="btn primary" onclick="saveStaff()">حفظ</button></div>`)}async function saveStaff(){await api('/api/admin/staff',{method:'POST',body:JSON.stringify({name:$('#sn').value,email:$('#se').value,phone:$('#sp').value,password:$('#sw').value,role:$('#sr').value})});closeModal();staff()}
function offers(){$('#sections').innerHTML='<div class="card"><h2>العروض والحملات</h2><p>واجهة إعداد الحملة موجودة هنا. الإرسال الجماعي عبر WhatsApp يحتاج ربط WhatsApp Business/API في الـBackend قبل تشغيله فعليًا.</p><div class="formgrid"><input id="ot" class="field" placeholder="عنوان العرض"><input id="ol" class="field" placeholder="رابط العرض"><textarea id="om" class="field full" rows="5" placeholder="رسالة الحملة"></textarea></div></div>'}function homepage(){$('#sections').innerHTML='<div class="card"><h2>الصفحة الرئيسية</h2><p>إدارة البنرات والمحتوى وTop 5 والأكثر مبيعًا تحتاج ربط مخطط المحتوى الفعلي الموجود في قاعدة البيانات، ولن أضيف تخزينًا وهميًا.</p></div>'}
function modal(t,b){$('#mt').textContent=t;$('#mb').innerHTML=b;$('#modal').classList.add('open')}function closeModal(){$('#modal').classList.remove('open')}
if(localStorage.getItem('lf_admin_token')){showApp();load()}else{showLogin()}
