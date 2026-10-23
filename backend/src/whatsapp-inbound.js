"use strict";

// Official WhatsApp Business Cloud API inbound webhook. Disabled unless
// configured; it never masquerades as a working bot for plain wa.me links.
const express = require("express");
const crypto = require("node:crypto");

const OPTIONS = [
  ["product", "استفسار عن منتج"],
  ["order", "متابعة طلب"],
  ["delivery", "التوصيل والمناطق"],
  ["returns", "تبديل أو إرجاع"],
  ["offers", "العروض والكوبونات"],
  ["complaint", "شكوى أو ملاحظة"],
  ["other", "استفسار آخر"]
];

function env(name) {
  return String(process.env[name] || "").trim();
}

function validSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || !secret || !/^sha256=[a-f0-9]{64}$/i.test(String(signature || ""))) {
    return false;
  }
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function findPurpose(body) {
  const value = String(body || "").slice(0, 1000);
  const found = OPTIONS.find(([, label]) => value.includes("الغرض: " + label));
  return found ? found[0] : "other";
}

function replyText(purpose) {
  const response = {
    product: "وصلنا استفسارك عن المنتج. اكتب اسم المنتج أو أرسل رابطه والصورة إن أمكن، وفريقنا بيتابع معك.",
    order: "وصلنا طلب متابعة الأوردر. اكتب رقم الطلب فقط، وفريقنا بيتحقق من حالته وبيرد عليك.",
    delivery: "وصلنا استفسارك عن التوصيل. خبرنا بالمنطقة، وبنوضح لك رسوم ووقت التوصيل المتاح.",
    returns: "وصلنا طلب التبديل أو الإرجاع. اكتب رقم الطلب وتاريخ الاستلام، وفريقنا بيراجع طلبك وفق سياسة المتجر.",
    offers: "وصلنا سؤالك عن العروض والكوبونات. خبرنا شو المنتج أو الفئة اللي بتهمك.",
    complaint: "وصلتنا ملاحظتك وبنعتذر عن أي إزعاج. احكِ لنا التفاصيل حتى يتابع معك فريق خدمة العملاء.",
    other: "أهلاً وسهلاً! خبرنا كيف بنقدر نساعدك وفريق Ladies First بيتابع رسالتك."
  };
  return "أهلاً وسهلاً في Ladies First 🌷\n" +
    (response[purpose] || response.other) +
    "\nهذه رسالة استلام تلقائية، وليست تأكيدًا لإتمام أي طلب. 🌸";
}

function incomingMessages(payload, expectedPhoneId = "") {
  const list = [];
  if (!payload || payload.object !== "whatsapp_business_account") return list;
  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (change.field !== "messages") continue;
      const value = change.value || {};
      if (expectedPhoneId && String(value.metadata?.phone_number_id || "") !== expectedPhoneId) continue;
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        const id = String(message.id || "").slice(0, 250);
        const from = String(message.from || "");
        const text = message.type === "text" ? String(message.text?.body || "")
          : message.type === "interactive" ? String(
            message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ""
          ) : "";
        if (!id || !/^\d{8,15}$/.test(from) || !text) continue;
        list.push({ id, from, purpose: findPurpose(text) });
        if (list.length >= 10) return list;
      }
    }
  }
  return list;
}

async function initWhatsAppInbound(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS whatsapp_inbound_auto_replies (
      message_id VARCHAR(250) PRIMARY KEY,
      sender_phone VARCHAR(20) NOT NULL,
      purpose VARCHAR(32) NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'received',
      provider_reply_id VARCHAR(250)
    )
  `);
  await db(`CREATE INDEX IF NOT EXISTS whatsapp_inbound_auto_replies_sender_idx
    ON whatsapp_inbound_auto_replies(sender_phone, responded_at DESC)`);
}

async function sendSessionReply(item, options) {
  const { db, accessToken, phoneNumberId, apiVersion, fetchImpl = fetch } = options;
  try {
    const claimed = await db(
      `INSERT INTO whatsapp_inbound_auto_replies
        (message_id,sender_phone,purpose) VALUES ($1,$2,$3)
       ON CONFLICT (message_id) DO NOTHING RETURNING message_id`,
      [item.id, item.from, item.purpose]
    );
    if (!claimed.rowCount) return "duplicate";
    const recent = await db(
      `SELECT 1 FROM whatsapp_inbound_auto_replies
       WHERE sender_phone=$1 AND status='sent'
         AND responded_at >= NOW() - INTERVAL '5 minutes' LIMIT 1`,
      [item.from]
    );
    if (recent.rowCount) {
      await db(`UPDATE whatsapp_inbound_auto_replies SET status='throttled'
        WHERE message_id=$1`, [item.id]);
      return "throttled";
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: item.from,
        type: "text",
        text: { preview_url: false, body: replyText(item.purpose) }
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`WhatsApp response status ${response.status}`);
    const data = await response.json();
    await db(
      `UPDATE whatsapp_inbound_auto_replies
       SET status='sent', responded_at=NOW(), provider_reply_id=$2
       WHERE message_id=$1`,
      [item.id, String(data?.messages?.[0]?.id || "").slice(0, 250) || null]
    );
    return "sent";
  } catch (error) {
    await db(`UPDATE whatsapp_inbound_auto_replies SET status='failed'
      WHERE message_id=$1`, [item.id]).catch(() => {});
    throw error;
  }
}

function registerWhatsAppInboundRoutes(app, { db }) {
  // Mounted BEFORE generic express.json to verify signature on exact raw bytes.
  app.get("/api/whatsapp/inbound", (req, res) => {
    const token = env("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
    const provided = String(req.query["hub.verify_token"] || "");
    const valid = token.length >= 16 &&
      Buffer.byteLength(token) === Buffer.byteLength(provided) &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(provided));
    if (valid && req.query["hub.mode"] === "subscribe") {
      return res.status(200).type("text/plain").send(String(req.query["hub.challenge"] || ""));
    }
    return res.sendStatus(403);
  });

  app.post("/api/whatsapp/inbound", express.raw({ type: "application/json", limit: "100kb" }), (req, res) => {
    const appSecret = env("WHATSAPP_APP_SECRET");
    const accessToken = env("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
    if (!appSecret || !accessToken || !phoneNumberId || env("WHATSAPP_AUTO_REPLY_ENABLED") !== "true") {
      return res.sendStatus(503);
    }
    if (!validSignature(req.body, req.get("x-hub-signature-256"), appSecret)) {
      return res.sendStatus(401);
    }
    let payload;
    try { payload = JSON.parse(req.body.toString("utf8")); }
    catch { return res.sendStatus(400); }
    const items = incomingMessages(payload, phoneNumberId);
    res.sendStatus(200);
    // Respond asynchronously; Meta's webhook must be acknowledged promptly.
    // Persistent message IDs prevent duplicate automated replies on retries.
    for (const item of items) {
      void sendSessionReply(item, {
        db, accessToken, phoneNumberId,
        apiVersion: env("WHATSAPP_API_VERSION") || "v23.0"
      }).catch(error => console.error("[WA INBOUND]", error.message));
    }
  });
}

module.exports = {
  OPTIONS,
  validSignature,
  findPurpose,
  replyText,
  incomingMessages,
  initWhatsAppInbound,
  sendSessionReply,
  registerWhatsAppInboundRoutes
};
