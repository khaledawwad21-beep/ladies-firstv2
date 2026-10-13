"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
const settings = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const naya = fs.readFileSync(path.join(__dirname, "../src/naya-ai.js"), "utf8");
const contact = fs.readFileSync(path.join(__dirname, "../../frontend/whatsapp-contact.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const automation = fs.readFileSync(path.join(__dirname, "../src/whatsapp-automation.js"), "utf8");

test("official WhatsApp number is +970562499924 throughout store contacts", () => {
  assert.match(app, /whatsappNumber:'\+970562499924'/);
  assert.match(admin, /s\.whatsapp_number\|\|s\.whatsapp\|\|'\+970562499924'/);
  assert.match(contact, /return '970562499924'/);
  assert.match(naya, /digits="970"\+digits\.slice\(1\)/);
  assert.match(naya, /digits==="972562499924"\)digits="970562499924"/);
  assert.match(automation, /storedStorePhone === "972562499924"/);
  assert.match(settings, /SET value = '"\+970562499924"'::jsonb/);
  assert.match(settings, /'00972562499924'\)/);
  assert.doesNotMatch(app, /whatsappNumber:'00972562499924'/);
});

test("store formatter routes legacy contact variants to 970 and preserves international numbers", () => {
  const fn = app.match(/function storeWhatsAppDigits\(value=storeCommerceSettings\.whatsappNumber\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(fn, "storeWhatsAppDigits implementation not found");
  const formatter = vm.runInNewContext(
    "const storeCommerceSettings={whatsappNumber:'+970562499924'};" +
    fn +
    "\nstoreWhatsAppDigits",
  );
  for (const legacy of [
    "+970562499924",
    "00970562499924",
    "0562499924",
    "00972562499924",
    "+972562499924",
  ]) {
    assert.equal(formatter(legacy), "970562499924", legacy);
  }
  assert.equal(formatter(), "970562499924");
  assert.equal(formatter("+447123456789"), "447123456789");
  assert.equal(formatter("invalid"), "970562499924");
});
