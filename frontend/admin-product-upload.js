"use strict";

const ADMIN_IMAGE_TARGET_BYTES = Math.floor(2.5 * 1024 * 1024);
const ADMIN_IMAGE_MAX_DIMENSION = 2400;
const ADMIN_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function adminImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function adminLoadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر فتح الصورة للضغط"));
    };
    image.src = url;
  });
}

function adminCanvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error("تعذر ضغط الصورة"));
      resolve(blob);
    }, type, quality);
  });
}

async function adminPrepareProductImage(file) {
  if (!ADMIN_IMAGE_TYPES.has(String(file?.type || "").toLowerCase())) {
    throw new Error("صيغة الصورة غير مدعومة. استخدمي PNG أو JPG أو WebP.");
  }

  if (Number(file.size || 0) > 0 && file.size <= ADMIN_IMAGE_TARGET_BYTES) {
    return adminImageDataUrl(file);
  }

  const image = await adminLoadImage(file);
  const sourceWidth = Number(image.naturalWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.height || 0);
  if (!sourceWidth || !sourceHeight) throw new Error("أبعاد الصورة غير صالحة");

  const initialScale = Math.min(
    1,
    ADMIN_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  let width = Math.max(1, Math.round(sourceWidth * initialScale));
  let height = Math.max(1, Math.round(sourceHeight * initialScale));
  let quality = 0.9;
  let blob = null;

  for (let attempt = 0; attempt < 9; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("تعذر تجهيز الصورة للرفع");
    context.drawImage(image, 0, 0, width, height);

    blob = await adminCanvasBlob(canvas, "image/webp", quality);
    if (blob.size <= ADMIN_IMAGE_TARGET_BYTES) break;

    if (quality > 0.65) {
      quality = Math.max(0.65, quality - 0.08);
    } else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      quality = 0.82;
    }
  }

  if (!blob || blob.size > ADMIN_IMAGE_TARGET_BYTES) {
    throw new Error("تعذر ضغط الصورة لحجم مناسب. جرّبي صورة بأبعاد أقل.");
  }

  return adminImageDataUrl(blob);
}

async function adminUploadProductImage(file) {
  if (!file) return "";
  const token = localStorage.getItem("lf_admin_token") || "";
  if (!token) throw new Error("يجب تسجيل الدخول أولاً");
  const data = await adminPrepareProductImage(file);
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

let adminProductDraft = null;

function adminProductImages(p) {
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const mains = Array.isArray(p.mainImages) && p.mainImages.length
    ? p.mainImages.filter(Boolean)
    : images.slice(0, 1);
  const subs = Array.isArray(p.subImages)
    ? p.subImages.filter(Boolean)
    : images.slice(mains.length || 1);
  if (!mains.length && (p.image_url || p.image)) mains.push(p.image_url || p.image);
  return {mains, subs};
}

function adminRenderExistingImages() {
  const box = $("#productExistingImages");
  if (!box || !adminProductDraft) return;
  const group = (items, kind, label) => `<div class="full"><b>${label}</b><div class="toolbar" style="align-items:flex-start;flex-wrap:wrap">${items.map((url,index)=>`<div style="position:relative"><img src="${E(url)}" alt="" style="width:86px;height:86px;object-fit:cover;border-radius:10px"><button type="button" class="btn" style="display:block;margin-top:4px" onclick="adminRemoveExistingImage('${kind}',${index})">حذف</button></div>`).join("")||"<small>لا توجد صور.</small>"}</div></div>`;
  box.innerHTML = group(adminProductDraft.mainImages, "main", "الصور الرئيسية")
    + group(adminProductDraft.subImages, "sub", "الصور الإضافية");
}

window.adminRemoveExistingImage = function(kind, index) {
  if (!adminProductDraft) return;
  const list = kind === "main" ? adminProductDraft.mainImages : adminProductDraft.subImages;
  list.splice(index, 1);
  adminRenderExistingImages();
};

function adminCaptureVariants() {
  if (!adminProductDraft) return;
  adminProductDraft.variants = [...document.querySelectorAll(".productVariantRow")].map((row,index)=>({
    id: row.dataset.id || undefined,
    name: row.querySelector(".variantName").value.trim(),
    stock: Number(row.querySelector(".variantStock").value || 0),
    _index:index
  })).filter(v=>v.name);
}

function adminRenderVariants() {
  const box=$("#productVariants");
  if(!box||!adminProductDraft)return;
  box.innerHTML=adminProductDraft.variants.map((v,i)=>`<div class="toolbar productVariantRow" data-id="${E(v.id||"")}"><input class="field variantName" value="${E(v.name||"")}" placeholder="اللون / الخيار"><input class="field variantStock" type="number" min="0" value="${Number(v.stock)||0}" placeholder="المخزون"><button class="btn" type="button" onclick="adminRemoveVariant(${i})">حذف</button></div>`).join("")||"<small>لا توجد ألوان/خيارات. سيُستخدم المخزون العام.</small>";
}
window.adminAddVariant=function(){adminCaptureVariants();adminProductDraft.variants.push({name:"",stock:0});adminRenderVariants();};
window.adminRemoveVariant=function(index){adminCaptureVariants();adminProductDraft.variants.splice(index,1);adminRenderVariants();};

window.productForm = async function productForm(p={}) {
  const {mains,subs}=adminProductImages(p);
  const metadata=p.metadata||{};
  let categories=[],brands=[];
  try{
    const [c,b]=await Promise.all([api("/api/categories"),api("/api/brands")]);
    categories=c.categories||[];brands=b.brands||[];
  }catch{}
  adminProductDraft={
    id:p.id||0,
    mainImages:[...mains],
    subImages:[...subs],
    variants:(p.variants||[]).map(v=>({id:v.id,name:v.name||v.color||"",stock:Number(v.stock)||0})),
    videos:Array.isArray(metadata.videos)?[...metadata.videos]:[]
  };
  modal(p.id?"تعديل المنتج":"منتج جديد",`<div class="formgrid">
    <input id="pn" class="field" value="${E(p.name||"")}" placeholder="اسم المنتج">
    <input id="pp" class="field" type="number" min="0" step=".01" value="${p.price??""}" placeholder="سعر البيع">
    <input id="po" class="field" type="number" min="0" step=".01" value="${p.old_price??p.oldPrice??""}" placeholder="السعر القديم">
    <input id="pcost" class="field" type="number" min="0" step=".01" value="${p.cost_price??p.cost??0}" placeholder="تكلفة الشراء">
    <label>الفئة<input id="pcat" class="field" list="pcatList" value="${E(p.category||p.cat||"")}" placeholder="اختاري أو اكتبي فئة جديدة"><datalist id="pcatList">${categories.map(x=>`<option value="${E(x.name)}"></option>`).join("")}</datalist></label>
    <label>البراند<input id="pbrand" class="field" list="pbrandList" value="${E(p.brand||"")}" placeholder="اختاري أو اكتبي براند جديد"><datalist id="pbrandList">${brands.map(x=>`<option value="${E(x.name)}"></option>`).join("")}</datalist></label>
    <input id="ps" class="field" type="number" min="0" value="${p.stock??0}" placeholder="المخزون العام">
    <label class="full">صور رئيسية جديدة<input id="pMainFiles" type="file" multiple accept="image/png,image/jpeg,image/webp" style="display:block;margin-top:8px"></label>
    <label class="full">صور إضافية جديدة<input id="pSubFiles" type="file" multiple accept="image/png,image/jpeg,image/webp" style="display:block;margin-top:8px"></label>
    <div id="productExistingImages" class="full"></div>
    <textarea id="pd" class="field full" rows="5" placeholder="وصف المنتج">${E(p.description||p.desc||"")}</textarea>
    <label class="full">روابط فيديوهات المنتج — رابط بكل سطر<textarea id="pvideos" class="field" rows="4" placeholder="https://youtube.com/...">${E(adminProductDraft.videos.join("\n"))}</textarea></label>
    <div class="full"><div class="toolbar"><b>الألوان / الخيارات والمخزون لكل واحد</b><button type="button" class="btn" onclick="adminAddVariant()">+ إضافة لون/خيار</button></div><div id="productVariants"></div></div>
  </div><div class="actions"><button class="btn primary" type="button" onclick="saveProduct(${p.id||0})">حفظ المنتج</button></div>`);
  adminRenderExistingImages();
  adminRenderVariants();
};

async function adminUploadMany(files) {
  const result=[];
  for(const file of [...(files||[])]) result.push(await adminUploadProductImage(file));
  return result;
}

window.saveProduct = async function saveProduct(id) {
  const button = document.querySelector("#modalBox .btn.primary");
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    const name = $("#pn").value.trim();
    if (!name) throw new Error("اسم المنتج مطلوب");
    adminCaptureVariants();

    const newMains=await adminUploadMany($("#pMainFiles")?.files);
    const newSubs=await adminUploadMany($("#pSubFiles")?.files);
    const mainImages=[...adminProductDraft.mainImages,...newMains];
    const subImages=[...adminProductDraft.subImages,...newSubs];
    if (!mainImages.length) throw new Error("اختاري صورة رئيسية واحدة على الأقل");
    if(mainImages.length+subImages.length>40)throw new Error("الحد الأقصى 40 صورة للمنتج");

    const videos=$("#pvideos").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(videos.length>8)throw new Error("الحد الأقصى 8 فيديوهات للمنتج");

    const body = {
      name,
      price: Number($("#pp").value || 0),
      oldPrice: $("#po").value ? Number($("#po").value) : null,
      cost_price: Number($("#pcost").value || 0),
      stock: Number($("#ps").value || 0),
      category: $("#pcat").value.trim(),
      brand: $("#pbrand").value.trim(),
      description: $("#pd").value || "",
      mainImages,
      subImages,
      variants: adminProductDraft.variants.map(v=>({id:v.id,name:v.name,stock:Number(v.stock)||0})),
      metadata:{videos}
    };

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
    closeModal(); toast("تم حفظ المنتج بكل التفاصيل"); await products();
  } catch(e) {
    alert(e.message||"تعذر حفظ المنتج");
  } finally {
    if (button) button.disabled = false;
  }
};
