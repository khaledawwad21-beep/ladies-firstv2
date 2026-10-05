"use strict";

/* Product editor enhancement: upload real files to the backend instead of requiring transient image URLs. */
window.productForm = function productForm(p={}) {
  const currentImage = p.image_url || p.image || '';
  modal(p.id?'تعديل المنتج':'منتج جديد',`<div class="formgrid">
    <input id="pn" class="field" value="${E(p.name||'')}" placeholder="اسم المنتج">
    <input id="pp" class="field" type="number" step=".01" value="${p.price??''}" placeholder="السعر">
    <input id="po" class="field" type="number" step=".01" value="${p.old_price??''}" placeholder="السعر القديم">
    <input id="ps" class="field" type="number" value="${p.stock??0}" placeholder="المخزون">
    <input id="pi" class="field full" value="${E(currentImage)}" placeholder="رابط صورة موجود (اختياري)">
    <label class="field full">صورة المنتج<input id="pfile" type="file" accept="image/*" style="display:block;margin-top:8px"></label>
    ${currentImage?`<div class="full"><img src="${E(currentImage)}" alt="صورة المنتج" style="max-width:140px;max-height:140px;object-fit:cover;border-radius:12px"></div>`:''}
    <textarea id="pd" class="field full" rows="5" placeholder="الوصف">${E(p.description||'')}</textarea>
  </div><div class="actions"><button class="btn primary" type="button" onclick="saveProduct(${p.id||0})">حفظ المنتج</button></div>`);
};

window.saveProduct = async function saveProduct(id) {
  const button = document.querySelector('#modalBox .btn.primary');
  if (button) button.disabled = true;
  try {
    const fd = new FormData();
    fd.append('name', $('#pn').value.trim());
    fd.append('price', $('#pp').value || '0');
    fd.append('oldPrice', $('#po').value || '');
    fd.append('stock', $('#ps').value || '0');
    fd.append('description', $('#pd').value || '');
    const existing = $('#pi').value.trim();
    if (existing) fd.append('imageUrl', existing);
    const file = $('#pfile').files && $('#pfile').files[0];
    if (file) fd.append('image', file);

    const token = localStorage.getItem('lf_admin_token') || '';
    const headers = token ? {Authorization:'Bearer '+token} : {};
    const response = await fetch(id?'/api/admin/products/'+id:'/api/admin/products', {
      method:id?'PUT':'POST', headers, body:fd
    });
    let data={}; try{data=await response.json()}catch{}
    if(response.status===401){localStorage.removeItem('lf_admin_token');showLogin();throw Error(data.message||'انتهت جلسة الدخول')}
    if(!response.ok||data.ok===false)throw Error(data.message||('HTTP '+response.status));
    closeModal(); toast('تم حفظ المنتج والصورة'); await products();
  } catch(e) {
    alert(e.message||'تعذر حفظ المنتج');
  } finally {
    if (button) button.disabled = false;
  }
};
