"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  OFFICIAL_PHONE, OFFICIAL_WHATSAPP_DIGITS, OFFICIAL_WHATSAPP_URL,
  applyOfficialContactSettings
} = require("../src/official-contact");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const storefront = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("official contact is +970 for business and owner accounts", () => {
  assert.equal(OFFICIAL_PHONE, "+970562499924");
  assert.equal(OFFICIAL_WHATSAPP_DIGITS, "970562499924");
  assert.equal(OFFICIAL_WHATSAPP_URL, "https://wa.me/970562499924");
  assert.match(storefront, /whatsappNumber:'\+970562499924'/);
  assert.match(admin, /id="osPhone" class="field" value="\+970562499924" readonly/);
  assert.match(server, /SET phone = '\+970562499924'/);
  assert.match(server, /WHERE role = 'owner' OR is_owner = TRUE/);
  assert.match(server, /NOT EXISTS \(\s*SELECT 1 FROM users AS conflicting_account/);
  assert.match(admin, /async function confirmOwnerOfficialPhone/);
});

test("store contact settings cannot be replaced with an old or unrelated number", () => {
  const outgoing = applyOfficialContactSettings({
    phone: "+972562499924",
    whatsapp_number: "00972562499924",
    whatsapp: "0599999999",
    shipping_fees: { westbank: 20 },
    social_links: {
      whatsapp: { url: "https://wa.me/972562499924", enabled: true },
      instagram: { url: "https://instagram.com/example", enabled: false }
    },
  });
  assert.equal(outgoing.phone, OFFICIAL_PHONE);
  assert.equal(outgoing.whatsapp_number, OFFICIAL_PHONE);
  assert.equal(outgoing.whatsapp, OFFICIAL_PHONE);
  assert.equal(outgoing.social_links.whatsapp.url, OFFICIAL_WHATSAPP_URL);
  assert.equal(outgoing.social_links.instagram.url, "https://instagram.com/example");
  assert.equal(outgoing.shipping_fees.westbank, 20);
  assert.equal(outgoing.social_links.whatsapp.enabled, true);
});

test("contact settings conversion does not rewrite user or order details", () => {
  const data = {
    user: { phone: "+970599000011" },
    orders: [{ customer_phone: "+970599000012" }],
    whatsapp_number: "+972562499924"
  };
  const clean = applyOfficialContactSettings(data);
  assert.equal(clean.whatsapp_number, OFFICIAL_PHONE);
  assert.equal(clean.user.phone, "+970599000011");
  assert.equal(clean.orders[0].customer_phone, "+970599000012");
  assert.deepEqual(data.user, clean.user);
  assert.match(server, /WHERE key IN \('phone', 'whatsapp_number', 'whatsapp'\)/);
});
