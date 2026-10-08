"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const adminSource = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const serverSource = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const { sendDeliveredThankYou } = require("../src/whatsapp-automation");

const phraseSource = adminSource.match(/const INVOICE_THANK_YOU_PHRASES=[\s\S]*?function invoiceThankYouPhrase\(orderId\)\{[\s\S]*?\n\}/);
assert.ok(phraseSource, "invoice phrase selector exists");
const invoicePhraseFor = vm.runInNewContext(phraseSource[0] + "\ninvoiceThankYouPhrase");

test("invoice phrase remains stable when reprinted and changes for the next invoice", () => {
  assert.equal(invoicePhraseFor(41), invoicePhraseFor(41));
  assert.notEqual(invoicePhraseFor(41), invoicePhraseFor(42));
  assert.equal(invoicePhraseFor(41), invoicePhraseFor(41 + 12));
});

function makeDb(order, claimed = new Set()) {
  const writes = [];
  const db = async (sql, params = []) => {
    if (sql.includes("FROM orders o")) return { rowCount: order ? 1 : 0, rows: order ? [order] : [] };
    if (sql.includes("FROM settings WHERE key = 'whatsapp_number'")) return { rowCount: 1, rows: [{ phone: "00972562499924" }] };
    if (sql.includes("INSERT INTO order_delivery_followups")) {
      const orderId = Number(params[0]);
      if (claimed.has(orderId)) return { rowCount: 0, rows: [] };
      claimed.add(orderId);
      writes.push({ sql, params });
      return { rowCount: 1, rows: [{ order_id: orderId }] };
    }
    if (sql.includes("UPDATE order_delivery_followups")) {
      writes.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
    throw new Error("Unexpected database query: " + sql);
  };
  db.writes = writes;
  return db;
}

const config = {
  accessToken: "token",
  phoneNumberId: "phone-id",
  language: "ar",
  deliveredTemplate: "order_delivered_thank_you"
};

function sampleOrder(overrides = {}) {
  return {
    id: 41,
    user_id: 9,
    customer_name: "سارة",
    customer_phone: "0562499924",
    user_name: "سارة",
    user_phone: "0562499924",
    whatsapp_opt_in: true,
    ...overrides
  };
}

test("delivery thank-you sends a feedback link once to the opted-in account phone", async () => {
  const db = makeDb(sampleOrder());
  const sent = [];
  const options = {
    config,
    sendTemplate: async (...args) => {
      sent.push(args);
      return { id: "wamid.test" };
    }
  };
  const first = await sendDeliveredThankYou(db, 41, options);
  const second = await sendDeliveredThankYou(db, 41, options);
  assert.equal(first.sent, true);
  assert.equal(second.reason, "already_attempted");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0][3].slice(0, 2), ["سارة", "41"]);
  assert.match(sent[0][3][2], /https:\/\/wa\.me\/972562499924\?/);
  assert.match(decodeURIComponent(sent[0][3][2]), /ملاحظة/);
  assert.equal(db.writes.at(-1).params[0], "wamid.test");
  assert.match(decodeURIComponent(sent[0][3][2]), /#41/);
});

test("delivery thank-you skips customers without WhatsApp opt-in", async () => {
  const db = makeDb(sampleOrder({ whatsapp_opt_in: false }));
  let sends = 0;
  const result = await sendDeliveredThankYou(db, 41, {
    config,
    sendTemplate: async () => { sends++; return { id: "never" }; }
  });
  assert.equal(result.reason, "not_opted_in");
  assert.equal(sends, 0);
  assert.equal(db.writes.length, 0);
});

test("delivery thank-you skips when the order phone differs from the opted-in account phone", async () => {
  const db = makeDb(sampleOrder({ customer_phone: "0561111111" }));
  const result = await sendDeliveredThankYou(db, 41, {
    config,
    sendTemplate: async () => { throw new Error("should not send"); }
  });
  assert.equal(result.reason, "phone_mismatch");
  assert.equal(db.writes.length, 0);
});

test("delivery route only queues the message on the first delivered transition", () => {
  assert.match(serverSource, /isNewDelivery:oldStatus!==\"delivered\"&&newStatus===\"delivered\"/);
  assert.match(serverSource, /if\(result\.isNewDelivery\)[\s\S]*sendDeliveredThankYou/);
});


test("invoice printing removes the admin shell page before the invoice", () => {
  const css = fs.readFileSync(path.join(__dirname, "../../frontend/admin.css"), "utf8");
  const printHardening = css.slice(css.indexOf("/* Invoice print hardening"));
  assert.match(printHardening, /@media print\{\s*\.shell\{display:none!important\}/);
  assert.match(css, /\.print\{display:block!important\}/);
});
