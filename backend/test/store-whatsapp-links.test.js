"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const index=fs.readFileSync(path.join(__dirname,"../../frontend/index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");

test("storefront WhatsApp buttons are not hardcoded in HTML",()=>{
  assert.doesNotMatch(index,/https:\/\/wa\.me\/972562499924/);
  assert.match(index,/id="whatsappFloat" href="#"/);
  assert.match(index,/id="bottomWhatsLink" href="#"/);
});

test("storefront WhatsApp links use settings-aware helper",()=>{
  assert.match(app,/function storeWhatsAppHref\(/);
  assert.match(app,/function updateStoreWhatsAppLinks\(/);
  assert.match(app,/st\.whatsapp_number\|\|st\.whatsapp/);
  assert.match(app,/updateStoreWhatsAppLinks\(\);renderSocialLinks\(\)/);
});
