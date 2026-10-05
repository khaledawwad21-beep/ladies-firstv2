"use strict";

/* Product editor enhancement: persist uploaded images first, then save product JSON. */
function adminImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

async function adminUploadProductImage(file) {
  if (!file) return "";
  const token = localStorage.getItem("lf_admin_token") || "";
  if (!token) throw new Error("يجب تسجيل الدخول أولاً");
  const data = await adminImageDataUrl(file);
  const response = await fetch("/api/admin/uploads/image", {
    method: "POST",
    headers: {"Content-Type":"application/json", Authorization:"Bearer "+token},
    body: JSON.stringify({data, filename:file.name || "product-image"})
  });
  let payload={}; try { payload=await response.json(); } catch {}
  if (response.status === 401) { localStorage.removeItem("lf_admin_token"); showLogin(); }
  if (!response.ok || payload.ok === false) throw new Error(payload.message || "تعذر رفع الصورة");
  if (!payload.url) throw new Error("لم يرجع الخادم رابط الصورة");
  return payload.url;
}

window.productForm = function productForm(p={}) {
  const currentImage = p.image_url || p.image || (Array.isArray(p.images) ? p.images[0] : "") || "";
  modal(p.id?"تعديل المنتج":"منتج جديد",`<div class="formgrid">
    <input id="pn" class="field" value="${E(p.name||"")}" placeholder="اسم المنتج">
    <input id="pp" class="field" type="number" step=".01" value="${p.price??""}" placeholder="السعر">
    <input id="po" class="field" type="number" step=".01" value="${p.old_price??""}" placeholder="السعر القديم">
    <input id="ps" class="field" type="number" min="0" value="${p.stock??0}" placeholder="المخزون">
    <input id="pi" class="field full" value="${E(currentImage)}" placeholder="رابط صورة موجود (اختياري)">
    <label class="field full">صورة المنتج<input id="pfile" type="file" accept="image/png,image/jpeg" style="display:block;margin-top:8px"></label>
    ${currentImage?`<div class="full"><img src="${E(currentImage)}" alt="صورة المنتج" style="max-width:140px;max-height:140px;object-fit:cover;border-radius:12px"></div>`:""}
    <textarea id="pd" class="field full" rows="5" placeholder="الوصف">${E(p.description||"")}</textarea>
  </div><div class="actions"><button class="btn primary" type="button" onclick="saveProduct(${p.id||0})">حفظ المنتج</button></div>`);
};

window.saveProduct = async function saveProduct(id) {
  const button = document.querySelector("#modalBox .btn.primary");
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    const name = $("#pn").value.trim();
    if (!name) throw new Error("اسم المنتج مطلوب");
    const file = $("#pfile").files && $("#pfile").files[0];
    let imageUrl = $("#pi").value.trim();
    if (file) imageUrl = await adminUploadProductImage(file);
    if (!id && !imageUrl) throw new Error("اختاري صورة رئيسية واحدة على الأقل");

    const body = {
      name,
      price: Number($("#pp").value || 0),
      oldPrice: $("#po").value ? Number($("#po").value) : null,
      stock: Number($("#ps").value || 0),
      description: $("#pd").value || ""
    };
    if (imageUrl) body.mainImages = [imageUrl];

    const token = localStorage.getItem("lf_admin_token") || "";
    if (!token) throw new Error("يجب تسجيل الدخول أولاً");
    const response = await fetch(id?"/api/admin/products/"+id:"/api/admin/products", {
      method:id?"PUT":"POST",
      headers:{"Content-Type":"application/json", Authorization:"Bearer "+token},
      body:JSON.stringify(body)
    });
    let data={}; try { data=await response.json(); } catch {}
    if(response.status===401){localStorage.removeItem("lf_admin_token");showLogin();}
    if(!response.ok||data.ok===false)throw new Error(data.message||("HTTP "+response.status));
    closeModal(); toast("تم حفظ المنتج والصورة"); await products();
  } catch(e) {
    alert(e.message||"تعذر حفظ المنتج");
  } finally {
    if (button) button.disabled = false;
  }
};
