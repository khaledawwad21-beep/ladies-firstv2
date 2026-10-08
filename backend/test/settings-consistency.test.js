"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { validateHomepageSettings } = require("../src/homepage-settings");
const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("social links use the production settings key and safe URLs", () => {
  const clean = validateHomepageSettings({
    social_links: {
      whatsapp: { url: "https://wa.me/970000000000", enabled: true },
      instagram: { url: "", enabled: false }
    }
  });
  assert.equal(clean.social_links.whatsapp.url, "https://wa.me/970000000000");
  assert.equal(clean.social_links.instagram.enabled, false);
  assert.throws(
    () => validateHomepageSettings({
      social_links: { facebook: { url: "javascript:alert(1)", enabled: true } }
    }),
    /رابط التواصل/
  );
  assert.match(admin, /settings\?\.social_links\|\|d\.settings\?\.social/);
  assert.match(admin, /JSON\.stringify\(\{social_links\}\)/);
});

test("storefront shows all active social platforms and marks missing URLs", () => {
  assert.match(app, /Object\.values\(links\)\.filter\(x=>x\.enabled!==false\)/);
  assert.match(app, /String\(x\.url\|\|''\)\.trim\(\)/);
  assert.match(app, /is-unconfigured/);
  assert.match(app, /الرابط غير مضاف بعد/);
  assert.doesNotMatch(app, /href="javascript:/);
});

test("WhatsApp number is configurable and no longer reset on startup or public reads", () => {
  assert.match(server, /'whatsapp_number'[\s\S]*ON CONFLICT\(key\)[\s\S]*DO NOTHING/);
  assert.match(server, /'00972562499924'/);
  assert.ok(server.includes("VALUES ('phone', '\"00972562499924\"'::jsonb)"));
  assert.match(server, /UPDATE settings[\s\S]*WHERE key IN \('phone', 'whatsapp_number', 'whatsapp'\)/);
  assert.doesNotMatch(server, /settings\.whatsapp_number\s*=\s*"0562499924"/);
  assert.match(server, /settings\.whatsapp_number\s*=\s*[\s\S]*settings\.whatsapp_number\s*\|\|[\s\S]*settings\.whatsapp/);
  assert.match(admin, /whatsapp_number:\$\('#stw'\)\.value/);
});

test("changing an existing password enforces the agreed 12 characters", () => {
  assert.match(server, /newPassword\.length < 12/);
  assert.match(server, /كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل/);
  assert.doesNotMatch(server, /newPassword\.length < 6/);
});
