"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("customer auth has explicit login and signup modes", () => {
  assert.match(app, /accountActionMode='login'/);
  assert.match(app, /setAccountActionMode\('login'\)/);
  assert.match(app, /setAccountActionMode\('register'\)/);
  assert.match(app, /lfLoginAccount\(/);
  assert.match(app, /lfRegisterAccount\(/);
  assert.match(app, /\/api\/auth\/login/);
  assert.match(app, /\/api\/auth\/register/);
});

test("email login keeps the contact field visible and only hides country tools", () => {
  assert.match(app, /accountCountryTools/);
  assert.match(app, /tools\.style\.display=accountMode==='email'\?'none':'flex'/);
  assert.doesNotMatch(app, /accountPhoneBox[^\n]*style\.display=mode==='email'\?'none':'block'/);
});

test("customer auth consistently requires 12-character passwords", () => {
  assert.match(app, /password\.length<12/);
  assert.match(app, /minlength="12"/);
  assert.doesNotMatch(app, /password\.length<8/);
  assert.doesNotMatch(app, /minlength="4"/);
});

test("signed-in customer can change password from account", () => {
  assert.match(app, /async function changeAccountPassword\(/);
  assert.match(app, /\/api\/auth\/password/);
  assert.match(app, /accountCurrentPassword/);
  assert.match(app, /accountNewPassword/);
});
