"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const security=fs.readFileSync(path.join(__dirname,"../src/security-policy.js"),"utf8");
const staffMessages=fs.readFileSync(path.join(__dirname,"../src/staff-messages.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const staffConversations=fs.readFileSync(path.join(__dirname,"../../frontend/admin-conversations.js"),"utf8");
const productWrite=fs.readFileSync(path.join(__dirname,"../src/product-write.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
const storeCss=fs.readFileSync(path.join(__dirname,"../../frontend/store-premium.css"),"utf8");
const adminHtml=fs.readFileSync(path.join(__dirname,"../../frontend/admin.html"),"utf8");
const indexHtml=fs.readFileSync(path.join(__dirname,"../../frontend/index.html"),"utf8");

test("product identifiers are unique and generated within their category",()=>{
  assert.match(server,/ADD COLUMN IF NOT EXISTS barcode TEXT/);
  assert.match(server,/idx_products_barcode_unique/);
  assert.match(server,/product_category_sequences/);
  assert.match(server,/product_number/);
  assert.match(productWrite,/productSequence/);
  assert.match(productWrite,/ON CONFLICT/);
  assert.match(productWrite,/هذا الباركود مستخدم لمنتج آخر/);
  assert.match(admin,/id="pbarcode"/);
  assert.match(admin,/productNumber/);
  assert.match(staffConversations,/staffChatNewConversationDraft/);
});
test("staff announcement is versioned and read once per staff member",()=>{
  assert.match(staffMessages,/staff_message_seen_version/);
  assert.match(staffMessages,/staff_general_message_reads/);
  assert.match(staffMessages,/staff_general_message_history/);
  assert.match(staffMessages,/crypto\.randomUUID\(\)/);
  assert.match(staffMessages,/\/api\/staff-message/);
  assert.match(staffMessages,/\/api\/staff-message\/read/);
  assert.match(staffMessages,/\/api\/admin\/settings\/staff-message/);
  assert.match(admin,/checkStaffGeneralMessage/);
  assert.match(admin,/acknowledgeStaffMessage/);
  assert.match(admin,/this\.dataset\.messageVersion/);
  assert.match(admin,/data-message-version/);
  assert.match(admin,/سجل الرسائل السابقة/);
  assert.match(admin,/openStaffChatFor/);
  assert.match(staffConversations,/staffChatComposerIsFocused/);
  assert.match(staffConversations,/staffChatDrafts/);
  assert.match(staffConversations,/staffChatContextSearch/);
  assert.match(staffConversations,/بحث مباشر/);
  assert.match(staffConversations,/productNumber/);
  assert.match(staffConversations,/staffChatNewConversationDraft/);
  assert.match(staffConversations,/staffChatCaptureNewConversationDraft/);
});

test("staff announcements reach active employee sessions and use employee-specific greeting copy",()=>{
  assert.match(admin,/startStaffMessagePolling/);
  assert.match(admin,/checkStaffGeneralMessage/);
  assert.match(admin,/adminGender\(\)/);
  assert.match(admin,/في فريق Ladies First/);
});

test("storefront announcement has a separate publish action and refreshes active visitors",()=>{
  assert.match(admin,/publishStorefrontGeneralMessage/);
  assert.match(admin,/لم يتم تأكيد حفظ الرسالة/);
  assert.match(app,/refreshStorefrontAnnouncement/);
  assert.match(app,/setInterval\(refreshStorefrontAnnouncement,60000\)/);
});

test("changed message scripts use fresh cache versions",()=>{
  assert.match(adminHtml,/admin\.js\?v=20261008-9/);
  assert.match(adminHtml,/admin-conversations\.js\?v=20261008-5/);
  assert.match(adminHtml,/admin-product-upload\.js\?v=20261008-1/);
  assert.match(adminHtml,/data-s="messages"/);
  assert.match(indexHtml,/app\.js\?v=20261009-4/);
});

test("storefront public announcement is exposed through safe public settings",()=>{
  assert.match(security,/storefront_general_message/);
  assert.match(admin,/storefrontMessageEnabled/);
  assert.match(app,/storefrontGeneralMessage/);
  assert.match(app,/renderStoreTopBar/);
});

test("maintenance mode blocks checkout on backend and renders a blocking storefront screen",()=>{
  assert.match(security,/maintenance_mode/);
  assert.match(server,/MAINTENANCE_MODE/);
  assert.match(server,/getSetting\("maintenance_mode"/);
  assert.match(admin,/id="maintenanceMode"/);
  assert.match(app,/function renderMaintenanceMode\(/);
  assert.match(app,/maintenanceOverlay/);
  assert.match(storeCss,/\.maintenanceOverlay/);
});

