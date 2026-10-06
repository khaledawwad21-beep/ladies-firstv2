"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
