"use strict";

function cleanText(value, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeCartItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw.slice(0, 100)) {
    const productId = Number(item?.productId ?? item?.id);
    const qty = Number(item?.qty ?? item?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) continue;
    const variant = cleanText(item?.variant ?? item?.variantName ?? "", 120);
    const key = productId + ":" + variant;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ productId, qty, variant });
  }
  return out;
}

async function initCartTracking(db) {
  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in
    BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_updated_at
    TIMESTAMPTZ
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS cart_snapshots (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      item_count INTEGER NOT NULL DEFAULT 0,
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS cart_snapshots_activity_idx
    ON cart_snapshots(last_activity_at)
  `);
}

async function getReminderSettings(db) {
  const result = await db(`
    SELECT key, value
    FROM settings
    WHERE key IN (
      'abandoned_cart_whatsapp_enabled',
      'low_stock_whatsapp_enabled'
    )
  `);
  const settings = {
    abandonedCartEnabled: false,
    lowStockEnabled: false
  };
  for (const row of result.rows) {
    const value = row.value === true || row.value === "true" || row.value === 1 || row.value === "1";
    if (row.key === "abandoned_cart_whatsapp_enabled") settings.abandonedCartEnabled = value;
    if (row.key === "low_stock_whatsapp_enabled") settings.lowStockEnabled = value;
  }
  return settings;
}

function stockForItem(item, productMap, variantMap) {
  const product = productMap.get(Number(item.productId));
  if (!product) return null;
  const variantName = cleanText(item.variant, 120);
  if (variantName) {
    const variants = variantMap.get(Number(item.productId)) || [];
    const v = variants.find(x =>
      cleanText(x.color, 120) === variantName ||
      cleanText(x.size, 120) === variantName
    );
    if (v) return Number(v.stock || 0);
  }
  return Number(product.stock || 0);
}

function registerCartTrackingRoutes(app, deps) {
  const { db, requireAuth, requireAdmin } = deps;

  app.put("/api/cart/snapshot", requireAuth, async (req, res) => {
    try {
      const items = normalizeCartItems(req.body?.items);
      if (!items.length) {
        await db("DELETE FROM cart_snapshots WHERE user_id = $1", [req.user.id]);
        return res.json({ ok: true, cleared: true });
      }

      await db(
        `
        INSERT INTO cart_snapshots
          (user_id, items, item_count, last_activity_at, updated_at)
        VALUES
          ($1, $2::jsonb, $3, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          items = EXCLUDED.items,
          item_count = EXCLUDED.item_count,
          last_activity_at = NOW(),
          updated_at = NOW()
        `,
        [req.user.id, JSON.stringify(items), items.reduce((n, x) => n + x.qty, 0)]
      );

      return res.json({ ok: true, items, itemCount: items.reduce((n, x) => n + x.qty, 0) });
    } catch (error) {
      console.error("[CART SNAPSHOT SAVE]", error);
      return res.status(500).json({ ok: false, message: "تعذر حفظ حالة السلة" });
    }
  });

  app.get("/api/cart/snapshot", requireAuth, async (req, res) => {
    try {
      const result = await db(
        `
        SELECT
          items,
          item_count AS "itemCount",
          last_activity_at AS "lastActivityAt"
        FROM cart_snapshots
        WHERE user_id = $1
        LIMIT 1
        `,
        [req.user.id]
      );
      return res.json({
        ok: true,
        snapshot: result.rows[0] || null
      });
    } catch (error) {
      console.error("[CART SNAPSHOT GET]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل حالة السلة" });
    }
  });

  app.delete("/api/cart/snapshot", requireAuth, async (req, res) => {
    try {
      await db("DELETE FROM cart_snapshots WHERE user_id = $1", [req.user.id]);
      return res.json({ ok: true });
    } catch (error) {
      console.error("[CART SNAPSHOT CLEAR]", error);
      return res.status(500).json({ ok: false, message: "تعذر مسح حالة السلة" });
    }
  });

  app.get("/api/admin/cart-reminders", requireAdmin, async (req, res) => {
    try {
      const settings = await getReminderSettings(db);
      const snapshots = await db(`
        SELECT
          c.user_id AS "userId",
          c.items,
          c.item_count AS "itemCount",
          c.last_activity_at AS "lastActivityAt",
          u.name,
          u.phone,
          u.whatsapp_opt_in AS "whatsappOptIn"
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
          (Array.isArray(row.items) ? row.items : []).map(x => Number(x.productId)).filter(Number.isInteger)
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
          `SELECT product_id, color, size, stock FROM product_variants WHERE product_id = ANY($1::bigint[]) AND is_active = TRUE`,
          [productIds]
        );
        for (const v of variants.rows) {
          const id = Number(v.product_id);
          if (!variantMap.has(id)) variantMap.set(id, []);
          variantMap.get(id).push(v);
        }
      }

      const now = Date.now();
      const abandonedCutoff = now - 7 * 24 * 60 * 60 * 1000;
      const abandoned = [];
      const lowStock = [];

      for (const row of snapshots.rows) {
        const items = Array.isArray(row.items) ? row.items : [];
        const base = {
          userId: Number(row.userId),
          name: row.name,
          phone: row.phone,
          itemCount: Number(row.itemCount || 0),
          lastActivityAt: row.lastActivityAt,
          items
        };

        if (new Date(row.lastActivityAt).getTime() <= abandonedCutoff) {
          abandoned.push({
            ...base,
            message: "💕 سيدتي، لاحظنا أن في سلتك منتجات بانتظارك. إذا بتحبي كمّلي طلبك قبل ما تخلص الكمية 🌸"
          });
        }

        const low = items
          .map(item => {
            const stock = stockForItem(item, productMap, variantMap);
            const product = productMap.get(Number(item.productId));
            return stock !== null && stock > 0 && stock <= 3
              ? { ...item, stock, productName: product?.name || "منتج" }
              : null;
          })
          .filter(Boolean);

        if (low.length) {
          lowStock.push({
            ...base,
            lowStockItems: low,
            message: "💕 سيدتي، في منتجات بسلتك قربت تخلص. استغلي الفرصة قبل نفاد الكمية 🌸"
          });
        }
      }

      return res.json({
        ok: true,
        settings,
        abandoned,
        lowStock
      });
    } catch (error) {
      console.error("[CART REMINDERS]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل تنبيهات السلة" });
    }
  });
}

module.exports = {
  initCartTracking,
  registerCartTrackingRoutes,
  normalizeCartItems,
  stockForItem
};
