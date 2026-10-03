const $=s=>document.querySelector(s),E=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),M=v=>Number(v||0).toFixed(2);
let sec='dashboard', token=localStorage.getItem('lf_admin_token')||'';

const titles={dashboard:'الرئيسية',users:'المستخدمون',products:'المنتجات',inventory:'المخزون',orders:'الطلبات والفواتير',finance:'الحسابات',offers:'العروض والحملات',catalog:'التصنيفات والعلامات',coupons:'الكوبونات',reports:'التقارير',homepage:'الصفحة الرئيسية',social:'مواقع التواصل',settings:'الإعدادات',staff:'الموظفون والصلاحيات'};

async function api(url,opts={}){
  const headers={'Content-Type':'application/json',...(opts.headers||{})};
  if(token) headers.Authorization='Bearer '+token;
  const r=await fetch(url,{...opts,headers});
  let d={}; try{d=await r.json()}catch{}
  if(r.status===401){logout(false);throw Error('انتهت جلسة الدخول');}
  if(!r.ok||d.ok===false) throw Error(d.message||('HTTP '+r.status));
  return d;
}
function toast(msg){const t=$('#toast');t.innerHTML='<div class="toast">'+E(msg)+'</div>';setTimeout(()=>t.innerHTML='',2600)}
function table(head,rows){return rows.length?'<div class="tablewrap"><table class="table"><thead><tr>'+head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':'<p class="muted">لا توجد بيانات.</p>'}
function modal(t,b){$('#mt').textContent=t;$('#mb').innerHTML=b;$('#modal').classList.add('open')}
function closeModal(){$('#modal').classList.remove('open')}
function escJson(v){return JSON.stringify(v).replace(/</g,'\\u003c')}

async function adminLogin(){
  const contact=$('#loginContact').value.trim(),password=$('#loginPassword').value;
  $('#loginMsg').textContent='';
  try{
    const d=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact,password})});
    const j=await d.json();
    if(!d.ok) throw Error(j.message||'بيانات الدخول غير صحيحة');
    if(!['owner','admin','staff'].includes(String(j.user?.role||''))) throw Error('هذا الحساب ليس حساب إدارة');
    token=j.token; localStorage.setItem('lf_admin_token',token);
    showApp(); toast('تم تسجيل الدخول');
  }catch(e){$('#loginMsg').textContent=e.message}
}
function logout(show=true){token='';localStorage.removeItem('lf_admin_token');$('#app').hidden=true;$('#login').hidden=false;if(show)$('#loginMsg').textContent='تم تسجيل الخروج'}
function showApp(){$('#login').hidden=true;$('#app').hidden=false;load()}
if(token) showApp(); else {$('#login').hidden=false;$('#app').hidden=true}

document.querySelectorAll('.nav[data-s]').forEach(n=>n.onclick=()=>{sec=n.dataset.s;document.querySelectorAll('.nav[data-s]').forEach(x=>x.classList.toggle('active',x===n));$('#title').textContent=titles[sec];load()});

async function load(){
  try{
    const f={dashboard,dashboard_users:users,users,products,inventory,orders,finance,offers,catalog,coupons,reports,homepage,social,settings,staff};
    await (f[sec]||f.dashboard)();
  }catch(e){toast(e.message)}
}

async function dashboard(){
  const d=await api('/api/admin/dashboard'),x=d.dashboard||{};
  $('#sections').innerHTML='<div class="cards">'+[['العملاء',x.customers],['المنتجات',x.products],['الطلبات',x.orders],['المبيعات',M(x.sales)],['قيد التنفيذ',x.pendingOrders],['مخزون منخفض',x.lowStock]].map(a=>'<div class="stat"><small>'+a[0]+'</small><b>'+a[1]+'</b></div>').join('')+'</div><br><div class="grid"><div class="card"><h2>تنبيهات المخزون</h2><p>'+((x.lowStock||0)>0?'يوجد '+x.lowStock+' منتج منخفض المخزون.':'لا يوجد منتج منخفض المخزون ضمن الحد الحالي.')+'</p></div><div class="card"><h2>إدارة سريعة</h2><div class="actions"><button class="btn" onclick="sec=\'orders\';load()">الطلبات</button><button class="btn" onclick="sec=\'products\';load()">المنتجات</button><button class="btn" onclick="sec=\'users\';load()">المستخدمون</button><button class="btn" onclick="sec=\'inventory\';load()">المخزون</button></div></div></div>';
}

async function users(){
  const q=encodeURIComponent($('#uq')?.value||''),d=await api('/api/admin/users?search='+q);
  $('#sections').innerHTML='<div class="card"><h2>المستخدمون</h2><div class="toolbar"><input id="uq" class="field" placeholder="بحث بالاسم أو البريد أو الهاتف" value="'+E(decodeURIComponent(q))+'"><button class="btn primary" onclick="users()">بحث</button></div>'+table(['الاسم','البريد','الهاتف','الجنس','العمر','الدور','الحالة',''],(d.users||[]).map(u=>'<tr><td>'+E(u.name)+'</td><td>'+E(u.email)+'</td><td>'+E(u.phone||'-')+'</td><td>'+E(u.gender||'-')+'</td><td>'+E(u.age??'-')+'</td><td>'+E(u.role)+'</td><td>'+(u.is_active?'فعال':'متوقف')+'</td><td><button class="btn" onclick="editUser('+escJson(u)+')">تعديل</button></td></tr>'))+'</div>';
}
function editUser(u){
  modal('تعديل المستخدم','<div class="formgrid"><input id="un" class="field" value="'+E(u.name)+'" placeholder="الاسم"><input id="ue" class="field" value="'+E(u.email||'')+'" placeholder="البريد"><input id="up" class="field" value="'+E(u.phone||'')+'" placeholder="الهاتف"><select id="ug" class="field"><option value="">غير محدد</option><option value="male" '+(u.gender==='male'?'selected':'')+'>ذكر</option><option value="female" '+(u.gender==='female'?'selected':'')+'>أنثى</option></select><input id="ua" class="field" type="number" value="'+E(u.age??'')+'" placeholder="العمر"><select id="us" class="field"><option value="1" '+(u.is_active?'selected':'')+'>فعال</option><option value="0" '+(!u.is_active?'selected':'')+'>متوقف</option></select><input id="upw" class="field full" type="password" placeholder="كلمة مرور جديدة — اتركها فارغة إن لم ترد تغييرها"></div><div class="actions"><button class="btn primary" onclick="saveUser('+u.id+')">حفظ</button></div>');
}
async function saveUser(id){
  await api('/api/admin/users/'+id,{method:'PATCH',body:JSON.stringify({name:$('#un').value,email:$('#ue').value,phone:$('#up').value,gender:$('#ug').value||null,age:$('#ua').value?Number($('#ua').value):null})});
  await api('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({is_active:$('#us').value==='1'})});
  if($('#upw').value) await api('/api/admin/users/'+id+'/password',{method:'PATCH',body:JSON.stringify({password:$('#upw').value})});
  closeModal();toast('تم حفظ المستخدم وتحديث الحالة');users();
}

async function products(){
  const d=await api('/api/products'),arr=d.products||[];
  const q=$('#pq')?.value||'';
  $('#sections').innerHTML='<div class="card"><h2>المنتجات</h2><div class="toolbar"><input id="pq" class="field" placeholder="بحث بالاسم" value="'+E(q)+'"><button class="btn primary" onclick="products()">بحث</button><button class="btn" onclick="productForm()">+ منتج جديد</button></div>'+table(['المنتج','السعر','المخزون','الحالة',''],arr.filter(p=>(p.name||'').toLowerCase().includes(q.toLowerCase())).map(p=>'<tr><td>'+E(p.name)+'</td><td>'+M(p.price)+'</td><td>'+E(p.stock??0)+'</td><td>'+(p.is_active?'فعال':'متوقف')+'</td><td><button class="btn" onclick="productForm('+escJson(p)+')">تعديل</button> <button class="btn" onclick="variants('+p.id+')">الألوان/المقاسات</button></td></tr>'))+'</div>';
}
async function productForm(p={}){
  const [c,b]=await Promise.all([api('/api/categories'),api('/api/brands')]);
  modal(p.id?'تعديل المنتج':'منتج جديد','<div class="formgrid"><input id="pn" class="field" value="'+E(p.name||'')+'" placeholder="اسم المنتج"><input id="psku" class="field" value="'+E(p.sku||'')+'" placeholder="SKU"><input id="pp" class="field" type="number" step=".01" value="'+E(p.price??'')+'" placeholder="السعر"><input id="po" class="field" type="number" step=".01" value="'+E(p.old_price??'')+'" placeholder="السعر القديم"><input id="pst" class="field" type="number" value="'+E(p.stock??0)+'" placeholder="المخزون"><input id="pi" class="field" value="'+E(p.image_url||p.image||'')+'" placeholder="رابط الصورة"><select id="pc" class="field"><option value="">بدون تصنيف</option>'+(c.categories||[]).map(x=>'<option value="'+x.id+'" '+(String(p.category_id)===String(x.id)?'selected':'')+'>'+E(x.name)+'</option>').join('')+'</select><select id="pb" class="field"><option value="">بدون علامة</option>'+(b.brands||[]).map(x=>'<option value="'+x.id+'" '+(String(p.brand_id)===String(x.id)?'selected':'')+'>'+E(x.name)+'</option>').join('')+'</select><textarea id="pd" class="field full" rows="5" placeholder="الوصف">'+E(p.description||'')+'</textarea></div><div class="actions"><button class="btn primary" onclick="saveProduct('+Number(p.id||0)+')">حفظ</button></div>');
}
async function saveProduct(id){
  const b={name:$('#pn').value,sku:$('#psku').value,price:Number($('#pp').value||0),old_price:$('#po').value?Number($('#po').value):null,stock:Number($('#pst').value||0),image:$('#pi').value,category_id:$('#pc').value?Number($('#pc').value):null,brand_id:$('#pb').value?Number($('#pb').value):null,description:$('#pd').value};
  await api(id?'/api/admin/products/'+id:'/api/admin/products',{method:id?'PUT':'POST',body:JSON.stringify(b)});
  closeModal();toast('تم حفظ المنتج');products();
}
async function variants(productId){
  const d=await api('/api/admin/products/'+productId+'/variants'),rows=d.variants||[];
  modal('خيارات المنتج', '<div class="toolbar"><button class="btn primary" onclick="variantForm('+productId+')">+ لون/مقاس</button></div>'+table(['اللون','المقاس','SKU','السعر','المخزون','الحالة',''],rows.map(v=>'<tr><td>'+E(v.color||'-')+'</td><td>'+E(v.size||'-')+'</td><td>'+E(v.sku||'-')+'</td><td>'+M(v.price??0)+'</td><td>'+E(v.stock??0)+'</td><td>'+(v.is_active===false?'متوقف':'فعال')+'</td><td><button class="btn" onclick="variantForm('+productId+','+escJson(v)+')">تعديل</button></td></tr>')));
}
function variantForm(productId,v={}){
  modal(v.id?'تعديل الخيار':'إضافة خيار','<div class="formgrid"><input id="vc" class="field" value="'+E(v.color||'')+'" placeholder="اللون"><input id="vs" class="field" value="'+E(v.size||'')+'" placeholder="المقاس"><input id="vk" class="field" value="'+E(v.sku||'')+'" placeholder="SKU"><input id="vp" class="field" type="number" step=".01" value="'+E(v.price??'')+'" placeholder="سعر خاص — اختياري"><input id="vst" class="field" type="number" value="'+E(v.stock??0)+'" placeholder="المخزون"><select id="va" class="field"><option value="true" '+(v.is_active!==false?'selected':'')+'>فعال</option><option value="false" '+(v.is_active===false?'selected':'')+'>متوقف</option></select></div><div class="actions"><button class="btn primary" onclick="saveVariant('+productId+','+Number(v.id||0)+')">حفظ</button></div>');
}
async function saveVariant(productId,id){
  const b={color:$('#vc').value,size:$('#vs').value,sku:$('#vk').value,price:$('#vp').value?Number($('#vp').value):null,stock:Number($('#vst').value||0),is_active:$('#va').value==='true'};
  await api(id?'/api/admin/variants/'+id:'/api/admin/products/'+productId+'/variants',{method:id?'PUT':'POST',body:JSON.stringify(b)});
  toast('تم حفظ الخيار');variants(productId);
}

async function inventory(){
  const d=await api('/api/admin/inventory');
  $('#sections').innerHTML='<div class="card"><h2>المخزون</h2>'+table(['المنتج','SKU','الكمية','السعر','التصنيف',''],(d.products||[]).map(x=>'<tr><td>'+E(x.name)+'</td><td>'+E(x.sku||'-')+'</td><td class="'+(Number(x.stock)<=5?'low':'')+'">'+E(x.stock??0)+'</td><td>'+M(x.price)+'</td><td>'+E(x.category_name||'-')+'</td><td><button class="btn" onclick="stock('+x.id+','+Number(x.stock||0)+')">تعديل</button></td></tr>'))+'</div>';
}
function stock(id,n){modal('تعديل المخزون','<input id="sn" class="field" type="number" min="0" value="'+n+'"><div class="actions"><button class="btn primary" onclick="saveStock('+id+')">حفظ</button></div>')}
async function saveStock(id){await api('/api/admin/inventory/'+id,{method:'PATCH',body:JSON.stringify({stock:Number($('#sn').value)})});closeModal();toast('تم تحديث المخزون');inventory()}

async function orders(){
  const d=await api('/api/admin/orders');
  const statuses=['pending','confirmed','processing','shipped','delivered','completed','cancelled'];
  $('#sections').innerHTML='<div class="card"><h2>الطلبات والفواتير</h2>'+table(['رقم','العميل','الهاتف','الإجمالي','الحالة','التاريخ',''],(d.orders||[]).map(o=>'<tr><td>#'+o.id+'</td><td>'+E(o.user_name||o.user_email||'-')+'</td><td>'+E(o.user_phone||'-')+'</td><td>'+M(o.total)+'</td><td><select class="field" onchange="changeOrderStatus('+o.id+',this.value)">'+statuses.map(s=>'<option value="'+s+'" '+(s===o.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td>'+new Date(o.created_at).toLocaleString('ar')+'</td><td><button class="btn" onclick="invoice('+o.id+')">فاتورة</button> <button class="btn" onclick="orderDetails('+o.id+')">تفاصيل</button></td></tr>'))+'</div>';
}
async function changeOrderStatus(id,status){await api('/api/admin/orders/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})});toast('تم تحديث حالة الطلب');orders()}
async function orderDetails(id){const d=await api('/api/admin/orders/'+id),o=d.order,items=d.items||[];modal('تفاصيل الطلب #'+id,'<p>العميل: '+E(o.user_name||'-')+'<br>الهاتف: '+E(o.user_phone||'-')+'<br>البريد: '+E(o.user_email||'-')+'<br>الحالة: '+E(o.status)+'</p>'+table(['المنتج','الخيار','الكمية','السعر','الإجمالي'],items.map(i=>'<tr><td>'+E(i.product_name||'-')+'</td><td>'+E(i.variant_name||'-')+'</td><td>'+i.quantity+'</td><td>'+M(i.unit_price)+'</td><td>'+M(i.total||i.total_price)+'</td></tr>')))}
async function invoice(id){
  const d=await api('/api/admin/orders/'+id),o=d.order,items=d.items||[],site=location.origin,orderUrl=site+'/order/'+id;
  $('#print').innerHTML='<div class="printhead"><h1>Ladies First</h1><div>فاتورة #'+id+'<br>'+new Date(o.created_at).toLocaleString('ar')+'</div></div><p>العميل: '+E(o.user_name||'-')+'<br>الهاتف: '+E(o.user_phone||'-')+'<br>البريد: '+E(o.user_email||'-')+'</p>'+table(['المنتج','الخيار','الكمية','السعر','الإجمالي'],items.map(i=>'<tr><td>'+E(i.product_name||'-')+'</td><td>'+E(i.variant_name||'-')+'</td><td>'+i.quantity+'</td><td>'+M(i.unit_price)+'</td><td>'+M(i.total||i.total_price)+'</td></tr>'))+'<p><b>الإجمالي النهائي: '+M(o.total)+'</b></p><div class="qrrow"><div><div id="qrsite"></div><b>زوروا موقعنا</b></div><div><div id="qrorder"></div><b>تفاصيل طلبك</b></div></div>';
  new QRCode($('#qrsite'),{text:site,width:145,height:145});new QRCode($('#qrorder'),{text:orderUrl,width:145,height:145});window.print();
}
function invoicePrompt(){const id=prompt('أدخل رقم الطلب');if(id)invoice(Number(id))}

async function finance(){const d=await api('/api/admin/dashboard');$('#sections').innerHTML='<div class="grid"><div class="card"><h2>ملخص الحسابات</h2><p>المبيعات: <b>'+M(d.dashboard?.sales)+'</b></p><p>الطلبات: <b>'+E(d.dashboard?.orders||0)+'</b></p></div><div class="card"><h2>مهم</h2><p class="muted">هذه شاشة ملخص فقط. لا تعتبر صافي الربح محاسبيًا حتى نضيف دفتر القيود والمصاريف والمشتريات والمرتجعات.</p></div></div>'}

async function catalog(){
  const [c,b]=await Promise.all([api('/api/categories'),api('/api/brands')]);
  $('#sections').innerHTML='<div class="grid"><div class="card"><h2>التصنيفات</h2><div class="toolbar"><input id="cn" class="field" placeholder="اسم التصنيف"><button class="btn primary" onclick="addCat()">إضافة</button></div>'+table(['الاسم'],(c.categories||[]).map(x=>'<tr><td>'+E(x.name)+'</td></tr>'))+'</div><div class="card"><h2>العلامات</h2><div class="toolbar"><input id="bn" class="field" placeholder="اسم العلامة"><button class="btn primary" onclick="addBrand()">إضافة</button></div>'+table(['الاسم'],(b.brands||[]).map(x=>'<tr><td>'+E(x.name)+'</td></tr>'))+'</div></div>';
}
async function addCat(){await api('/api/admin/categories',{method:'POST',body:JSON.stringify({name:$('#cn').value})});toast('تمت الإضافة');catalog()}
async function addBrand(){await api('/api/admin/brands',{method:'POST',body:JSON.stringify({name:$('#bn').value})});toast('تمت الإضافة');catalog()}

async function coupons(){
  const d=await api('/api/admin/coupons');
  $('#sections').innerHTML='<div class="card"><h2>الكوبونات</h2><button class="btn primary" onclick="couponForm()">+ كوبون</button>'+table(['الكود','النوع','القيمة','الحالة'],(d.coupons||[]).map(x=>'<tr><td>'+E(x.code)+'</td><td>'+E(x.discount_type||x.type)+'</td><td>'+E(x.discount_value??x.value??0)+'</td><td>'+(x.is_active?'فعال':'متوقف')+'</td></tr>'))+'</div>';
}
function couponForm(){modal('كوبون جديد','<div class="formgrid"><input id="cc" class="field" placeholder="الكود"><select id="ct" class="field"><option value="percent">نسبة</option><option value="fixed">مبلغ</option></select><input id="cv" class="field" type="number" step=".01" placeholder="القيمة"><input id="cm" class="field" type="number" step=".01" placeholder="الحد الأدنى"><input id="cx" class="field" type="number" placeholder="أقصى استخدامات"></div><div class="actions"><button class="btn primary" onclick="saveCoupon()">حفظ</button></div>')}
async function saveCoupon(){await api('/api/admin/coupons',{method:'POST',body:JSON.stringify({code:$('#cc').value,discountType:$('#ct').value,discountValue:Number($('#cv').value),minimumAmount:Number($('#cm').value||0),maxUses:Number($('#cx').value||0)})});closeModal();toast('تم حفظ الكوبون');coupons()}

async function reports(){
  const t=new Date().toISOString().slice(0,10);
  $('#sections').innerHTML='<div class="card"><h2>التقارير</h2><div class="toolbar"><input id="rf" type="date" class="field" value="'+t+'"><input id="rt" type="date" class="field" value="'+t+'"><button class="btn primary" onclick="reportRun()">عرض</button></div><div id="rr"></div></div>';
}
async function reportRun(){const d=await api('/api/admin/reports/sales?from='+$('#rf').value+'&to='+$('#rt').value),s=d.summary||{};$('#rr').innerHTML='<div class="cards"><div class="stat"><small>الطلبات</small><b>'+E(s.orders||0)+'</b></div><div class="stat"><small>المبيعات</small><b>'+M(s.sales)+'</b></div><div class="stat"><small>الملغاة</small><b>'+E(s.cancelled||0)+'</b></div></div>'+table(['التاريخ','الطلبات','المبيعات'],(d.rows||[]).map(x=>'<tr><td>'+E(x.date)+'</td><td>'+E(x.orders)+'</td><td>'+M(x.sales)+'</td></tr>'))}

async function settings(){
  const d=await api('/api/admin/settings'),s=d.settings||{};
  $('#sections').innerHTML='<div class="card"><h2>الإعدادات</h2><div class="formgrid"><input id="stn" class="field" value="'+E(s.store_name||'Ladies First')+'" placeholder="اسم المتجر"><input id="stp" class="field" value="'+E(s.phone||'')+'" placeholder="الهاتف"><input id="stw" class="field" value="'+E(s.whatsapp||'0562499924')+'" placeholder="WhatsApp"><input id="cur" class="field" value="'+E(s.currency||'₪')+'" placeholder="العملة"><textarea id="rp" class="field full" rows="5" placeholder="سياسة الاستبدال">'+E(s.return_policy||'')+'</textarea></div><div class="actions"><button class="btn primary" onclick="saveSettings()">حفظ</button></div></div>';
}
async function saveSettings(){await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({store_name:$('#stn').value,phone:$('#stp').value,whatsapp:$('#stw').value,currency:$('#cur').value,return_policy:$('#rp').value})});toast('تم حفظ الإعدادات')}

async function social(){
  const d=await api('/api/admin/settings'),s=d.settings?.social||{};
  $('#sections').innerHTML='<div class="card"><h2>مواقع التواصل</h2>'+['whatsapp','instagram','snapchat','facebook','tiktok'].map(k=>'<div class="toolbar"><input id="s_'+k+'" class="field" value="'+E(s[k]?.url||s[k]||'')+'" placeholder="'+k+' URL"><label><input id="e_'+k+'" type="checkbox" '+(s[k]?.enabled===false?'':'checked')+'> فعال</label></div>').join('')+'<button class="btn primary" onclick="saveSocial()">حفظ</button></div>';
}
async function saveSocial(){const social={};['whatsapp','instagram','snapchat','facebook','tiktok'].forEach(k=>social[k]={url:$('#s_'+k).value,enabled:$('#e_'+k).checked});await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({social})});toast('تم حفظ مواقع التواصل')}

async function staff(){
  const d=await api('/api/admin/staff');
  $('#sections').innerHTML='<div class="card"><h2>الموظفون والصلاحيات</h2><button class="btn primary" onclick="staffForm()">+ موظف</button>'+table(['الاسم','البريد','الهاتف','الدور','الحالة'],(d.staff||[]).map(x=>'<tr><td>'+E(x.name)+'</td><td>'+E(x.email)+'</td><td>'+E(x.phone||'-')+'</td><td>'+E(x.role)+'</td><td>'+(x.is_active?'فعال':'متوقف')+'</td></tr>'))+'</div>';
}
function staffForm(){modal('موظف جديد','<div class="formgrid"><input id="sn" class="field" placeholder="الاسم"><input id="se" class="field" placeholder="البريد"><input id="sp" class="field" placeholder="الهاتف"><input id="sw" class="field" type="password" placeholder="كلمة المرور"><select id="sr" class="field"><option value="staff">staff</option><option value="admin">admin</option></select></div><div class="actions"><button class="btn primary" onclick="saveStaff()">حفظ</button></div>')}
async function saveStaff(){await api('/api/admin/staff',{method:'POST',body:JSON.stringify({name:$('#sn').value,email:$('#se').value,phone:$('#sp').value,password:$('#sw').value,role:$('#sr').value})});closeModal();toast('تم إنشاء الموظف');staff()}

function offers(){$('#sections').innerHTML='<div class="card"><h2>العروض والحملات</h2><p class="muted">هذه الشاشة تجهيز إداري فقط. لا يوجد في الـBackend الحالي Endpoint لحفظ حملة تسويقية مستقلة أو إرسال WhatsApp جماعي؛ لذلك لن نخزن بيانات وهمية.</p></div>'}
function homepage(){$('#sections').innerHTML='<div class="card"><h2>الصفحة الرئيسية</h2><p class="muted">Top 5 والأكثر مبيعًا متوفران كتقارير، لكن إدارة البنرات والمحتوى تحتاج Endpoint/CMS مستقل. لن أضيف تخزينًا وهميًا.</p></div>'}
