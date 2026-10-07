"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const workflow = fs.readFileSync(path.join(__dirname, "../../.github/workflows/production-regression.yml"), "utf8");
const {
  normalizeRecipient,
  buildTemplatePayload
} = require("../src/whatsapp-automation");

test("WhatsApp recipient normalization keeps digits only", () => {
  assert.equal(normalizeRecipient("+970 56-249-9924"), "970562499924");
  assert.equal(normalizeRecipient("123"), "");
});

test("WhatsApp template payload is provider-ready", () => {
  const body = buildTemplatePayload("+970562499924", "abandoned_cart", "ar", ["سيدتي"]);
  assert.equal(body.messaging_product, "whatsapp");
  assert.equal(body.to, "970562499924");
  assert.equal(body.template.name, "abandoned_cart");
});

test("production startup wires and starts WhatsApp automation", () => {
  const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  const start = fs.readFileSync(path.join(__dirname, "../src/start.js"), "utf8");
  assert.match(server, /initWhatsAppAutomation\(db\)/);
  assert.match(server, /registerWhatsAppAutomationRoutes\(app/);
  assert.match(start, /startWhatsAppAutomation\(db\)/);
});


test("admin campaign routes require explicit confirmation and opt-in recipient source", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/whatsapp-automation.js"), "utf8");
  assert.match(source, /\/api\/admin\/whatsapp-campaigns\/preview/);
  assert.match(source, /\/api\/admin\/whatsapp-campaigns/);
  assert.match(source, /whatsapp_opt_in = TRUE/);
  assert.match(source, /req\.body\?\.confirm !== true/);
  assert.match(source, /WHATSAPP_CAMPAIGN_TEMPLATE/);
});


test("CI executes isolated WhatsApp automation PostgreSQL E2E", () => {
  assert.match(workflow, /Run isolated WhatsApp automation E2E/);
  assert.match(workflow, /whatsapp-automation-e2e\.integration\.test\.js/);
});

test("WhatsApp automation supports an injectable sender without changing production default", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/whatsapp-automation.js"), "utf8");
  assert.match(source, /sender = typeof options\.sendTemplate === "function" \? options\.sendTemplate : sendTemplate/);
  assert.match(source, /processAbandoned\(db, config, context, result, sender\)/);
  assert.match(source, /processLowStock\(db, config, context, result, sender\)/);
  assert.match(source, /processWaitlist\(db, config, result, sender\)/);
});


test("waitlist WhatsApp supports manual send and optional automatic mode",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../src/whatsapp-automation.js"),"utf8");
  const admin=fs.readFileSync(path.join(__dirname,"../../frontend/admin.js"),"utf8");
  assert.match(source,/waitlist_whatsapp_auto_enabled/);
  assert.match(source,/\/api\/admin\/waitlist\/:id\/notify-whatsapp/);
  assert.match(source,/sendWaitlistNotification/);
  assert.match(source,/runWaitlistRestockNotifications/);
  assert.match(admin,/sendWaitlistWhatsApp/);
  assert.match(admin,/id="waitlistWaAuto"/);
});
