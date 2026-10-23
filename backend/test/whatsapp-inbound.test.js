"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  validSignature, findPurpose, replyText, incomingMessages, sendSessionReply
} = require("../src/whatsapp-inbound");

test("WhatsApp webhook signature validates exact signed bytes", () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = "test-signing-secret";
  const valid = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(validSignature(body, valid, secret), true);
  assert.equal(validSignature(Buffer.from("{}"), valid, secret), false);
  assert.equal(validSignature(body, "sha256=" + "0".repeat(64), secret), false);
  assert.equal(validSignature(body, "invalid", secret), false);
  assert.equal(validSignature(body, valid, ""), false);
});

test("customer topic routing recognizes menu reasons and stays neutral for unknown", () => {
  assert.equal(findPurpose("الغرض: متابعة طلب\nأريد الاستفسار"), "order");
  assert.equal(findPurpose("الغرض: تبديل أو إرجاع"), "returns");
  assert.equal(findPurpose("السلام عليكم"), "other");
  assert.match(replyText("order"), /رقم الطلب/);
  assert.doesNotMatch(replyText("order"), /تم شحن طلبك/);
  assert.match(replyText("returns"), /سياسة المتجر/);
});

test("inbound parsing ignores bad sender, wrong business, statuses and non-text", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [{ changes: [
      { field: "messages", value: {
        metadata: { phone_number_id: "correct" },
        statuses: [{ id: "status1" }],
        messages: [
          { id: "wamid.1", from: "972599123456", type: "text", text: { body: "الغرض: التوصيل والمناطق" } },
          { id: "wamid.2", from: "attacker", type: "text", text: { body: "test" } },
          { id: "wamid.3", from: "972599123456", type: "image" }
        ]
      } },
      { field: "messages", value: {
        metadata: { phone_number_id: "wrong" },
        messages: [{ id: "wamid.4", from: "972599123456", type: "text", text: { body: "test" } }]
      } }
    ] }]
  };
  assert.deepEqual(incomingMessages(payload, "correct"), [
    { id: "wamid.1", from: "972599123456", purpose: "delivery" }
  ]);
});

test("reply handler sends one WhatsApp message and deduplicates replay", async () => {
  const stored = new Set();
  const calls = [];
  const db = async (sql, params) => {
    if (sql.includes("INSERT INTO")) {
      if (stored.has(params[0])) return { rowCount: 0, rows: [] };
      stored.add(params[0]);
      return { rowCount: 1, rows: [{ message_id: params[0] }] };
    }
    if (sql.includes("SELECT 1")) return { rowCount: 0, rows: [] };
    return { rowCount: 1, rows: [] };
  };
  const options = {
    db, accessToken: "test", phoneNumberId: "phone-id", apiVersion: "v23.0",
    fetchImpl: async (url, request) => {
      calls.push({ url, request });
      return { ok: true, json: async () => ({ messages: [{ id: "wamid.out" }] }) };
    }
  };
  const incoming = { id: "wamid.in", from: "972599123456", purpose: "product" };
  assert.equal(await sendSessionReply(incoming, options), "sent");
  assert.equal(await sendSessionReply(incoming, options), "duplicate");
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].request.body).to, "972599123456");
});
