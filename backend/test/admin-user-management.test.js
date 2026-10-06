"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");

test("admin user UI uses sanitized active and loyalty fields",()=>{
  assert.match(admin,/u\.isActive!==false/);
  assert.match(admin,/u\.loyaltyPoints/);
  assert.doesNotMatch(admin,/u\.is_active\?'فعال':'متوقف'/);
});

test("admin can edit customer profile, status and optional password",()=>{
  assert.match(admin,/id="uactive"/);
  assert.match(admin,/id="unewpass"/);
  assert.match(admin,/\/api\/admin\/users\/'\+id\+'\/password/);
  assert.match(admin,/is_active:!!\$\('#uactive'\)\.checked/);
  assert.match(admin,/nextPassword\.length<12/);
});

test("owner account is protected from generic user administration",()=>{
  assert.match(server,/لا يمكن تعديل حساب المالك من إدارة المستخدمين/);
  assert.match(server,/لا يمكن تغيير كلمة مرور المالك من إدارة المستخدمين/);
  assert.match(server,/لا يمكن إيقاف أو تفعيل حساب المالك من إدارة المستخدمين/);
});

test("role changes through generic user route require owner role",()=>{
  assert.match(server,/req\.body\.role !== undefined/);
  assert.match(server,/تغيير دور المستخدم متاح للمالك فقط/);
});
