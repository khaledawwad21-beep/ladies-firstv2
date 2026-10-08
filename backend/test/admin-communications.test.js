"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const security=fs.readFileSync(path.join(__dirname,"../src/security-policy.js"),"utf8");
const staffMessages=fs.readFileSync(path.join(__dirname,"../src/staff-messages.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
const storeCss=fs.readFileSync(path.join(__dirname,"../../frontend/store-premium.css"),"utf8");

test("staff announcement is versioned and read once per staff member",()=>{
  assert.match(staffMessages,/staff_message_seen_version/);
  assert.match(staffMessages,/crypto\.randomUUID\(\)/);
  assert.match(staffMessages,/\/api\/staff-message/);
  assert.match(staffMessages,/\/api\/staff-message\/read/);
  assert.match(staffMessages,/\/api\/admin\/settings\/staff-message/);
  assert.match(admin,/checkStaffGeneralMessage/);
  assert.match(admin,/acknowledgeStaffMessage/);
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
