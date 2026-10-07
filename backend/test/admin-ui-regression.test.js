"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const adminHtml=fs.readFileSync(path.join(__dirname,"../../frontend/admin.html"),"utf8");
const adminOffers=fs.readFileSync(path.join(__dirname,"../../frontend/admin-offers.js"),"utf8");
const adminHome=fs.readFileSync(path.join(__dirname,"../../frontend/admin-homepage.js"),"utf8");
const productAdmin=fs.readFileSync(path.join(__dirname,"../../frontend/admin-product-upload.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");

test("admin dashboard cards navigate to their sections",()=>{
  assert.match(admin,/function openAdminSection\(/);
  assert.match(admin,/admin-stat-link/);
  assert.match(admin,/openAdminSection\('users'\)/);
  assert.match(admin,/openAdminSection\('inventory'\)/);
});

test("admin search fields are live without search buttons",()=>{
  assert.match(admin,/بحث مباشر بالاسم أو البريد أو الهاتف/);
  assert.match(admin,/oninput="liveDebounce\('users'/);
  assert.match(admin,/بحث مباشر برقم الطلب أو العميل أو الهاتف/);
  assert.match(admin,/oninput="renderOrderRows\(\)"/);
  assert.match(admin,/بحث مباشر بالمنتج أو الاسم أو الهاتف/);
  assert.match(admin,/liveDebounce\('waitlist'/);
  assert.match(admin,/بحث مباشر بالمنتج أو SKU أو الفئة أو البراند/);
});

test("all date inputs receive the shared picker behavior",()=>{
  assert.match(admin,/function initDateInputs\(/);
  assert.match(admin,/input\[type="date"\]/);
  assert.match(admin,/showPicker/);
  assert.match(admin,/MutationObserver/);
});

test("offers use live visual product search and can edit sale price",()=>{
  assert.match(adminOffers,/offerRenderSearch/);
  assert.match(adminOffers,/offer-result/);
  assert.match(adminOffers,/سعر العرض/);
  assert.match(adminOffers,/السعر الأصلي/);
  assert.match(adminOffers,/salePrice/);
  assert.match(adminOffers,/originalPrice/);
});

test("slider and product media support multi-file selection",()=>{
  assert.match(adminHome,/type="file" multiple/);
  assert.match(adminHome,/adminUploadMany\(selected\)/);
  assert.match(productAdmin,/pMainFiles/);
  assert.match(productAdmin,/pSubFiles/);
  assert.match(productAdmin,/multiple accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(productAdmin,/pVideoFiles/);
});

test("admin product status reflects backend active state",()=>{
  assert.match(server,/p\.is_active AS "isActive"/);
  assert.match(productAdmin,/id="pactive"/);
  assert.match(productAdmin,/active:\s*!!\$\("#pactive"\)\.checked/);
});

test("social admin normalizes object-shaped settings and shows official platform icon classes",()=>{
  assert.match(admin,/function normalizeSocialEntry\(/);
  assert.match(admin,/fa-brands fa-whatsapp/);
  assert.match(admin,/fa-brands fa-instagram/);
  assert.doesNotMatch(adminHtml,/admin\.js\?v=20261006/);
});


test("inventory editor manages supplier colors and quantities together",()=>{
  assert.match(admin,/function editInventoryProduct\(/);
  assert.match(admin,/inventorySupplier/);
  assert.match(admin,/inventoryVariantName/);
  assert.match(admin,/inventoryVariantStock/);
  assert.match(admin,/supplierName/);
  assert.match(server,/supplier_name/);
  assert.match(server,/بيانات الألوان\/الخيارات غير صالحة أو مكررة/);
});
