"use strict";

function cleanText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizeStatus(value) {
  const status = cleanText(value).toLowerCase();
  return ["waiting", "notified", "closed"].includes(status) ? status : null;
}

async function initWaitlist(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS waitlist_requests (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      variant_name TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT waitlist_status_valid CHECK (status IN ('waiting','notified','closed'))
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS waitlist_product_status_idx
      ON waitlist_requests(product_id, status, created_at DESC)
  `);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS waitlist_active_unique
      ON waitlist_requests(product_id, phone, COALESCE(variant_name, ''))
      WHERE status = 'waiting'
  `);
}

function registerWaitlistRoutes(app, deps) {
  const { db, requireAdmin, requireAuth, optionalAuth, normalizePhone } = deps;

  app.post("/api/waitlist", optionalAuth, async (req, res) => {
    try {
      const productId = Number(req.body?.productId);
      const customerName = cleanText(req.body?.name || req.user?.name);
      const phone = normalizePhone(req.body?.phone || req.user?.phone);
      const variantName = cleanText(req.body?.variant || "") || null;

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ ok: false, message: "رقم المنتج غير صحيح" });
      }

      if (!customerName || !phone) {
        return res.status(400).json({
          ok: false,
          message: "الاسم ورقم واتساب مطلوبان للتسجيل في قائمة التوفر"
        });
      }

      const productResult = await db(
        `SELECT id, name, image_url, is_active FROM products WHERE id = $1 LIMIT 1`,
        [productId]
      );

      const product = productResult.rows[0];
      if (!product || product.is_active === false) {
        return res.status(404).json({ ok: false, message: "المنتج غير موجود" });
      }

      const inserted = await db(
        `
        INSERT INTO waitlist_requests
          (product_id, user_id, customer_name, phone, variant_name)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING
          id,
          product_id AS "productId",
          customer_name AS "name",
          phone,
          variant_name AS "variant",
          status,
          created_at AS "createdAt"
        `,
        [productId, req.user?.id || null, customerName, phone, variantName]
      );

      let row = inserted.rows[0];
      const alreadyWaiting = !row;

      if (!row) {
        const existing = await db(
          `
          SELECT
            id,
            product_id AS "productId",
            customer_name AS "name",
            phone,
            variant_name AS "variant",
            status,
            created_at AS "createdAt"
          FROM waitlist_requests
          WHERE product_id = $1
            AND phone = $2
            AND COALESCE(variant_name, '') = COALESCE($3, '')
            AND status = 'waiting'
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [productId, phone, variantName]
        );
        row = existing.rows[0];
      }

      return res.status(alreadyWaiting ? 200 : 201).json({
        ok: true,
        alreadyWaiting,
        request: row,
        product: {
          id: product.id,
          name: product.name,
          image: product.image_url || null
        }
      });
    } catch (error) {
      console.error("[WAITLIST ADD]", error);
      return res.status(500).json({ ok: false, message: "تعذر التسجيل في قائمة التوفر" });
    }
  });

  app.get("/api/waitlist/mine", requireAuth, async (req, res) => {
    try {
      const result = await db(
        `
        SELECT
          w.id,
          w.product_id AS "productId",
          p.name AS "productName",
          COALESCE(
            (
              SELECT pi.image_url
              FROM product_images pi
              WHERE pi.product_id=p.id
              ORDER BY pi.is_primary DESC,pi.sort_order,pi.id
              LIMIT 1
            ),
            p.image_url
          ) AS "productImage",
          w.variant_name AS "variant",
          w.status,
          w.notified_at AS "notifiedAt",
          w.created_at AS "createdAt",
          w.updated_at AS "updatedAt"
        FROM waitlist_requests w
        JOIN products p ON p.id=w.product_id
        WHERE w.user_id=$1
        ORDER BY w.created_at DESC,w.id DESC
        LIMIT 100
        `,
        [req.user.id]
      );

      return res.json({
        ok: true,
        requests: result.rows
      });
    } catch (error) {
      console.error("[WAITLIST MINE]", error);
      return res.status(500).json({
        ok: false,
        message: "تعذر تحميل سجل التوفر"
      });
    }
  });

  app.get("/api/admin/waitlist", requireAdmin, async (req, res) => {
    try {
      const status = normalizeStatus(req.query?.status || "") || "";
      const search = cleanText(req.query?.search || "");
      const params = [];
      const where = [];

      if (status) {
        params.push(status);
        where.push(`w.status = $${params.length}`);
      }

      if (search) {
        params.push(`%${search}%`);
        where.push(`(
          w.customer_name ILIKE $${params.length}
          OR w.phone ILIKE $${params.length}
          OR p.name ILIKE $${params.length}
        )`);
      }

      const result = await db(
        `
        SELECT
          w.id,
          w.product_id AS "productId",
          p.name AS "productName",
          p.image_url AS "productImage",
          w.customer_name AS "name",
          w.phone,
          w.variant_name AS "variant",
          w.status,
          (
            CASE
              WHEN w.variant_name IS NULL THEN (
                p.stock > 0 OR EXISTS (
                  SELECT 1 FROM product_variants v
                  WHERE v.product_id=p.id
                    AND v.is_active=TRUE
                    AND v.stock>0
                )
              )
              ELSE EXISTS (
                SELECT 1 FROM product_variants v
                WHERE v.product_id=p.id
                  AND v.is_active=TRUE
                  AND v.stock>0
                  AND (
                    v.color=w.variant_name
                    OR v.size=w.variant_name
                    OR CONCAT_WS(' / ',v.color,v.size)=w.variant_name
                  )
              )
            END
          ) AS "isAvailable",
          w.notified_at AS "notifiedAt",
          w.created_at AS "createdAt"
        FROM waitlist_requests w
        JOIN products p ON p.id = w.product_id
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY
          CASE w.status WHEN 'waiting' THEN 0 WHEN 'notified' THEN 1 ELSE 2 END,
          w.created_at DESC
        LIMIT 500
        `,
        params
      );

      return res.json({ ok: true, requests: result.rows });
    } catch (error) {
      console.error("[WAITLIST ADMIN LIST]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل قائمة التوفر" });
    }
  });

  app.patch("/api/admin/waitlist/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = normalizeStatus(req.body?.status);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, message: "رقم الطلب غير صحيح" });
      }

      if (!status) {
        return res.status(400).json({ ok: false, message: "حالة قائمة التوفر غير صحيحة" });
      }

      const result = await db(
        `
        UPDATE waitlist_requests
        SET
          status = $1,
          notified_at = CASE
            WHEN $1 = 'notified' THEN COALESCE(notified_at, NOW())
            WHEN $1 = 'waiting' THEN NULL
            ELSE notified_at
          END,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          product_id AS "productId",
          customer_name AS "name",
          phone,
          variant_name AS "variant",
          status,
          notified_at AS "notifiedAt",
          created_at AS "createdAt"
        `,
        [status, id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ ok: false, message: "طلب التوفر غير موجود" });
      }

      return res.json({ ok: true, request: result.rows[0] });
    } catch (error) {
      console.error("[WAITLIST ADMIN UPDATE]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحديث قائمة التوفر" });
    }
  });
}

module.exports = {
  initWaitlist,
  registerWaitlistRoutes,
  normalizeStatus
};
