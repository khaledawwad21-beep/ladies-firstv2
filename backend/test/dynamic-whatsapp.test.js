"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../../frontend/index.html"), "utf8");

test("store WhatsApp links use the configured store number", () => {
  assert.match(app, /storeCommerceSettings=\{visaDiscountPercent:0,.*whatsappNumber:/);
  assert.match(app, /whatsappNumber:'00972562499924'/);
  assert.match(app, /if\(digits\.startsWith\('00'\)\)digits=digits\.slice\(2\)/);
  assert.match(app, /function storeWhatsAppDigits\(/);
  assert.match(app, /function storeWhatsAppHref\(/);
  assert.match(app, /st\.whatsapp_number\|\|st\.whatsapp/);
  assert.match(app, /return storeWhatsAppHref\(lines\.join/);
  assert.doesNotMatch(app, /wa\.me\/972562499924\?text=/);
});

test("floating and bottom WhatsApp buttons are updated together", () => {
  assert.match(html, /id="whatsappFloat"/);
  assert.match(html, /id="bottomWhatsLink"/);
  assert.match(app, /\['whatsappFloat','bottomWhatsLink'\]/);
  assert.match(app, /updateStoreWhatsAppLinks\(\)/);
});
