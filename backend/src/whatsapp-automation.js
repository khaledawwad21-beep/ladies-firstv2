"use strict";

const { stockForItem } = require("./cart-tracking");

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function getWhatsAppConfig() {
  return {
    accessToken: env("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: env("WHATSAPP_API_VERSION", "v23.0"),
    language: env("WHATSAPP_TEMPLATE_LANGUAGE", "ar"),
    abandonedTemplate: env("WHATSAPP_ABANDONED_TEMPLATE"),
    lowStockTemplate: env("WHATSAPP_LOW_STOCK_TEMPLATE"),
    waitlistTemplate: env("WHATSAPP_WAITLIST_TEMPLATE")
  };
}

function normalizeRecipient(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}

function buildTemplatePayload(phone, templateName, language, parameters = []) {
  const to = normalizeRecipient(phone);
  if (!to || !templateName) return null;
  const template = {
    name: templateName,
    language: { code: language || "ar" }
  };
  if (parameters.length) {
    template.components = [{
      type: "body",
      parameters: parameters.map(value => ({
        type: "text",
        text: String(value ?? "").slice(0, 900)
      }))
    }];
  }
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template
  };
}

async function initWhatsAppAutomation(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS whatsapp_automation_log (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      waitlist_id BIGINT REFERENCES waitlist_requests(id) ON DELETE SET NULL,
      reminder_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      template_name TEXT,
      status TEXT NOT NULL,
      provider_message_id TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS whatsapp_automation_recent_idx
    ON whatsapp_automation_log(reminder_type, user_id, sent_at DESC)
  `);
}

async function settingEnabled(db, key) {
  const result = await db(
    `SELECT value FROM settings WHERE key = $1 LIMIT 1`,
    [key]
  );
  if (!result.rowCount) return false;
  const value = result.rows[0].value;
  return value === true || value === "true" || value === 1 || value === "1";
}

async function sentRecently(db, userId, type, hours) {
  const result = await db(
    `
    SELECT id
    FROM whatsapp_automation_log
    WHERE user_id = $1
      AND reminder_type = $2
      AND status = 'sent'
      AND sent_at >= NOW() - ($3::text || ' hours')::interval
    LIMIT 1
    `,
    [userId, type, String(hours)]
  );
  return result.rowCount > 0;
}

async function sendTemplate(config, phone, templateName, parameters) {
  const payload = buildTemplatePayload(phone, templateName, config.language, parameters);
  if (!payload) throw new Error("WhatsApp recipient/template is invalid");
  const response = await fetch(
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    }
  );
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const message = data?.error?.message || `WhatsApp HTTP ${response.status}`;
    throw new Error(message);
  }
  return {
    id: data?.messages?.[0]?.id || null,
    data
  };
}

async function logResult(db, entry) {
  await db(
    `
    INSERT INTO whatsapp_automation_log
      (user_id, waitlist_id, reminder_type, recipient, template_name, status,
       provider_message_id, error_message, sent_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $6 = 'sent' THEN NOW() ELSE NULL END)
    `,
    [
      entry.userId || null,
      entry.waitlistId || null,
      entry.type,
      entry.recipient,
      entry.templateName || null,
      entry.status,
      entry.providerMessageId || null,
      entry.errorMessage || null
    ]
  );
}

async function cartContext(db) {
  const snapshots = await db(`
    SELECT
      c.user_id AS "userId",
      c.items,
      c.item_count AS "itemCount",
      c.last_activity_at AS "lastActivityAt",
      u.name,
      u.phone
    FROM cart_snapshots c
    JOIN users u ON u.id = c.user_id
    WHERE u.whatsapp_opt_in = TRUE
      AND u.phone IS NOT NULL
      AND c.item_count > 0
    ORDER BY c.last_activity_at ASC
    LIMIT 500
  `);

  const productIds = [...new Set(
    snapshots.rows.flatMap(row =>
      (Array.isArray(row.items) ? row.items : [])
        .map(item => Number(item.productId))
        .filter(Number.isInteger)
    )
  )];

  const productMap = new Map();
  const variantMap = new Map();
  if (productIds.length) {
    const products = await db(
      `SELECT id, name, stock FROM products WHERE id = ANY($1::bigint[])`,
      [productIds]
    );
    for (const p of products.rows) productMap.set(Number(p.id), p);

    const variants = await db(
      `SELECT product_id, color, size, stock
       FROM product_variants
       WHERE product_id = ANY($1::bigint[]) AND is_active = TRUE`,
      [productIds]
    );
    for (const v of variants.rows) {
      const id = Number(v.product_id);
      if (!variantMap.has(id)) variantMap.set(id, []);
      variantMap.get(id).push(v);
    }
  }
  return { snapshots: snapshots.rows, productMap, variantMap };
}

async function processAbandoned(db, config, context, result) {
  if (!config.abandonedTemplate) return;
  if (!(await settingEnabled(db, "abandoned_cart_whatsapp_enabled"))) return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const row of context.snapshots) {
    if (new Date(row.lastActivityAt).getTime() > cutoff) continue;
    if (await sentRecently(db, row.userId, "abandoned_cart", 168)) continue;
    try {
      const sent = await sendTemplate(
        config,
        row.phone,
        config.abandonedTemplate,
        [row.name || "سيدتي"]
      );
      await logResult(db, {
        userId: row.userId,
        type: "abandoned_cart",
        recipient: normalizeRecipient(row.phone),
        templateName: config.abandonedTemplate,
        status: "sent",
        providerMessageId: sent.id
      });
      result.sent++;
    } catch (error) {
      await logResult(db, {
        userId: row.userId,
        type: "abandoned_cart",
        recipient: normalizeRecipient(row.phone),
        templateName: config.abandonedTemplate,
        status: "failed",
        errorMessage: String(error.message || error).slice(0, 800)
      });
      result.failed++;
    }
  }
}

async function processLowStock(db, config, context, result) {
  if (!config.lowStockTemplate) return;
  if (!(await settingEnabled(db, "low_stock_whatsapp_enabled"))) return;
  for (const row of context.snapshots) {
    const items = Array.isArray(row.items) ? row.items : [];
    const low = items.map(item => {
      const stock = stockForItem(item, context.productMap, context.variantMap);
      const product = context.productMap.get(Number(item.productId));
      return stock !== null && stock > 0 && stock <= 3
        ? { stock, name: product?.name || "منتج" }
        : null;
    }).filter(Boolean);
    if (!low.length) continue;
    if (await sentRecently(db, row.userId, "low_stock_cart", 24)) continue;
    const productText = low.map(x => `${x.name} (${x.stock})`).join("، ").slice(0, 700);
    try {
      const sent = await sendTemplate(
        config,
        row.phone,
        config.lowStockTemplate,
        [row.name || "سيدتي", productText]
      );
      await logResult(db, {
        userId: row.userId,
        type: "low_stock_cart",
        recipient: normalizeRecipient(row.phone),
        templateName: config.lowStockTemplate,
        status: "sent",
        providerMessageId: sent.id
      });
      result.sent++;
    } catch (error) {
      await logResult(db, {
        userId: row.userId,
        type: "low_stock_cart",
        recipient: normalizeRecipient(row.phone),
        templateName: config.lowStockTemplate,
        status: "failed",
        errorMessage: String(error.message || error).slice(0, 800)
      });
      result.failed++;
    }
  }
}

async function processWaitlist(db, config, result) {
  if (!config.waitlistTemplate) return;
  const waiting = await db(`
    SELECT
      w.id,
      w.customer_name AS "name",
      w.phone,
      w.variant_name AS "variant",
      p.id AS "productId",
      p.name AS "productName",
      p.stock
    FROM waitlist_requests w
    JOIN products p ON p.id = w.product_id
    WHERE w.status = 'waiting'
      AND p.is_active = TRUE
      AND (
        (
          w.variant_name IS NULL
          AND (
            p.stock > 0
            OR EXISTS (
              SELECT 1 FROM product_variants v
              WHERE v.product_id = p.id
                AND v.is_active = TRUE
                AND v.stock > 0
            )
          )
        )
        OR
        (
          w.variant_name IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM product_variants v
            WHERE v.product_id = p.id
              AND v.is_active = TRUE
              AND v.stock > 0
              AND (v.color = w.variant_name OR v.size = w.variant_name)
          )
        )
      )
    ORDER BY w.created_at ASC
    LIMIT 200
  `);

  for (const row of waiting.rows) {
    const duplicate = await db(
      `SELECT id FROM whatsapp_automation_log
       WHERE waitlist_id = $1
         AND reminder_type = 'waitlist_restock'
         AND status = 'sent'
       LIMIT 1`,
      [row.id]
    );
    if (duplicate.rowCount) continue;
    try {
      const sent = await sendTemplate(
        config,
        row.phone,
        config.waitlistTemplate,
        [row.name || "سيدتي", row.productName || "المنتج"]
      );
      await db(
        `UPDATE waitlist_requests
         SET status = 'notified', notified_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'waiting'`,
        [row.id]
      );
      await logResult(db, {
        waitlistId: row.id,
        type: "waitlist_restock",
        recipient: normalizeRecipient(row.phone),
        templateName: config.waitlistTemplate,
        status: "sent",
        providerMessageId: sent.id
      });
      result.sent++;
    } catch (error) {
      await logResult(db, {
        waitlistId: row.id,
        type: "waitlist_restock",
        recipient: normalizeRecipient(row.phone),
        templateName: config.waitlistTemplate,
        status: "failed",
        errorMessage: String(error.message || error).slice(0, 800)
      });
      result.failed++;
    }
  }
}

let activeRun = null;

async function runWhatsAppAutomation(db) {
  if (activeRun) return activeRun;
  activeRun = (async () => {
    const config = getWhatsAppConfig();
    const result = { configured: false, sent: 0, failed: 0, skipped: false };
    if (!config.accessToken || !config.phoneNumberId) {
      result.skipped = true;
      return result;
    }
    result.configured = true;
    const context = await cartContext(db);
    await processAbandoned(db, config, context, result);
    await processLowStock(db, config, context, result);
    await processWaitlist(db, config, result);
    return result;
  })();
  try {
    return await activeRun;
  } finally {
    activeRun = null;
  }
}

function startWhatsAppAutomation(db) {
  const config = getWhatsAppConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    console.log("[WHATSAPP] automation inactive: provider credentials not configured");
    return null;
  }
  const minutes = Math.max(15, Number(env("WHATSAPP_AUTOMATION_INTERVAL_MINUTES", "60")) || 60);
  const run = () => runWhatsAppAutomation(db).catch(error =>
    console.error("[WHATSAPP AUTOMATION]", error)
  );
  setTimeout(run, 15000).unref?.();
  const timer = setInterval(run, minutes * 60 * 1000);
  timer.unref?.();
  console.log(`[WHATSAPP] automation active every ${minutes} minutes`);
  return timer;
}

function registerWhatsAppAutomationRoutes(app, deps) {
  const { db, requireAdmin } = deps;

  app.get("/api/admin/whatsapp-automation/status", requireAdmin, async (req, res) => {
    try {
      const config = getWhatsAppConfig();
      const recent = await db(`
        SELECT reminder_type, status, COUNT(*)::int AS count
        FROM whatsapp_automation_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY reminder_type, status
        ORDER BY reminder_type, status
      `);
      return res.json({
        ok: true,
        configured: Boolean(config.accessToken && config.phoneNumberId),
        templates: {
          abandoned: Boolean(config.abandonedTemplate),
          lowStock: Boolean(config.lowStockTemplate),
          waitlist: Boolean(config.waitlistTemplate)
        },
        recent: recent.rows
      });
    } catch (error) {
      return res.status(500).json({ ok: false, message: "تعذر تحميل حالة واتساب" });
    }
  });

  app.post("/api/admin/whatsapp-automation/run", requireAdmin, async (req, res) => {
    try {
      const result = await runWhatsAppAutomation(db);
      return res.json({ ok: true, result });
    } catch (error) {
      console.error("[WHATSAPP MANUAL RUN]", error);
      return res.status(500).json({ ok: false, message: "تعذر تشغيل أتمتة واتساب" });
    }
  });
}

module.exports = {
  getWhatsAppConfig,
  normalizeRecipient,
  buildTemplatePayload,
  initWhatsAppAutomation,
  runWhatsAppAutomation,
  startWhatsAppAutomation,
  registerWhatsAppAutomationRoutes
};
