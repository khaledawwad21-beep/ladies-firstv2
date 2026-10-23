"use strict";

function normalizeFavoriteIds(raw) {
  if (!Array.isArray(raw)) return [];
  const ids = [];
  const seen = new Set();
  for (const value of raw.slice(0, 200)) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function initAccountState(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created
    ON user_favorites(user_id, created_at DESC)
  `);
}

function registerAccountStateRoutes(app, deps) {
  const { db, requireAuth, transaction } = deps;

  app.get("/api/account/favorites", requireAuth, async (req, res) => {
    try {
      const result = await db(
        `
        SELECT f.product_id AS "productId"
        FROM user_favorites f
        JOIN products p ON p.id = f.product_id
        WHERE f.user_id = $1
          AND p.is_active = TRUE
        ORDER BY f.created_at DESC, f.product_id DESC
        `,
        [req.user.id]
      );

      return res.json({
        ok: true,
        favorites: result.rows.map(row => Number(row.productId))
      });
    } catch (error) {
      console.error("[ACCOUNT FAVORITES GET]", error);
      return res.status(500).json({
        ok: false,
        message: "تعذر تحميل المفضلة"
      });
    }
  });

  app.put("/api/account/favorites", requireAuth, async (req, res) => {
    try {
      const requested = normalizeFavoriteIds(
        req.body?.favorites ??
        req.body?.productIds ??
        []
      );

      const favorites = await transaction(async client => {
        await client.query(
          "DELETE FROM user_favorites WHERE user_id = $1",
          [req.user.id]
        );

        if (requested.length) {
          await client.query(
            `
            INSERT INTO user_favorites (user_id, product_id, created_at)
            SELECT $1, p.id, NOW()
            FROM products p
            WHERE p.id = ANY($2::bigint[])
              AND p.is_active = TRUE
            ON CONFLICT (user_id, product_id) DO NOTHING
            `,
            [req.user.id, requested]
          );
        }

        const saved = await client.query(
          `
          SELECT product_id AS "productId"
          FROM user_favorites
          WHERE user_id = $1
          ORDER BY created_at DESC, product_id DESC
          `,
          [req.user.id]
        );

        return saved.rows.map(row => Number(row.productId));
      });

      return res.json({
        ok: true,
        favorites
      });
    } catch (error) {
      console.error("[ACCOUNT FAVORITES SAVE]", error);
      return res.status(500).json({
        ok: false,
        message: "تعذر حفظ المفضلة"
      });
    }
  });
}

module.exports = {
  normalizeFavoriteIds,
  initAccountState,
  registerAccountStateRoutes
};
