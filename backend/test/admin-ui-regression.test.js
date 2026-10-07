"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const store=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
const adminHtml=fs.readFileSync(path.join(__dirname,"../../frontend/admin.html"),"utf8");
const adminOffers=fs.readFileSync(path.join(__dirname,"../../frontend/admin-offers.js"),"utf8");
const adminHome=fs.readFileSync(path.join(__dirname,"../../frontend/admin-homepage.js"),"utf8");
const productAdmin=fs.readFileSync(path.join(__dirname,"../../frontend/admin-product-upload.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const orderBlockHistory=fs.readFileSync(path.join(__dirname,"../src/order-block-history.js"),"utf8");

test("admin dashboard cards navigate to their sections",()=>{
  assert.match(admin,/function openAdminSection\(/);
  assert.match(admin,/admin-stat-link/);
  assert.match(admin,/\['العملاء',x\.customers,'users'\]/);
  assert.match(admin,/\['مخزون منخفض',x\.lowStock,'inventory'\]/);
  assert.match(admin,/onclick="openAdminSection\('\$\{a\[2\]\}'\)"/);
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

test("staff gender is persisted for gender-aware admin copy",()=>{
  assert.match(server,/INSERT INTO users[\s\S]*gender/);
  assert.match(server,/UPDATE users[\s\S]*gender = \$4/);
  assert.match(admin,/id="sg"/);
  assert.match(admin,/id="esg"/);
  assert.match(admin,/gender:\$\('#sg'\)\.value/);
  assert.match(admin,/gender:\$\('#esg'\)\.value/);
});

test("customer order blocking exposes an audit history in the user editor",()=>{
  assert.match(orderBlockHistory,/customer_order_block_events/);
  assert.match(server,/order-block-history/);
  assert.match(admin,/order-block-history/);
  assert.match(admin,/function loadUserOrderBlockHistory\(/);
  assert.match(admin,/سجل منع الطلب/);
});

test("staff announcements can target owner admin or staff roles",()=>{
  assert.match(admin,/staffMessageTarget/);
  assert.match(admin,/targetRoles/);
  assert.match(admin,/إرسال إلى:/);
});

test("staff, categories and brands use live search",()=>{
  assert.match(admin,/بحث مباشر بالاسم أو البريد أو الهاتف أو الدور/);
  assert.match(admin,/function renderStaffRows\(/);
  assert.match(admin,/بحث مباشر بالفئة/);
  assert.match(admin,/بحث مباشر بالبراند/);
  assert.match(admin,/function renderCatalogRows\(/);
});

test("returns and inventory movements use live search",()=>{
  assert.match(admin,/بحث مباشر برقم الطلب أو العميل أو الهاتف أو المنتج أو الحالة/);
  assert.match(admin,/function renderReturnRows\(/);
  assert.match(admin,/بحث مباشر بالمنتج أو SKU أو السبب أو رقم الطلب/);
  assert.match(admin,/function renderMovementRows\(/);
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

test("social settings stay normalized and inactive or empty links stay hidden on storefront",()=>{
  assert.match(admin,/function normalizeSocialEntry\(/);
  assert.match(admin,/fa-brands fa-whatsapp/);
  assert.match(admin,/fa-brands fa-instagram/);
  assert.match(admin,/social_links\[k\]=\{url:String/);
  assert.match(store,/if\(st\.social_links&&typeof st\.social_links==='object'\)save\('lf_social_links',st\.social_links\)/);
  assert.match(store,/function renderSocialLinks\(\)/);
  assert.match(store,/\.filter\(x=>x\.enabled!==false&&String\(x\.url\|\|''\)\.trim\(\)\)/);
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
