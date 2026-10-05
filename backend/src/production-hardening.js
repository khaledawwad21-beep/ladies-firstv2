"use strict";

const express = require("express");
const { db } = require("./db");

const MIN_PASSWORD_LENGTH = 12;

function passwordPolicy(req, res, next) {
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      ok: false,
      code: "PASSWORD_TOO_SHORT",
      message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} خانة على الأقل`
    });
  }
  next();
}

function createPreStoreRouter() {
  const router = express.Router();
  router.use(express.json({ limit: "5mb" }));
  router.use(express.urlencoded({ extended: true, limit: "5mb" }));
  router.post("/api/auth/register", passwordPolicy);
  router.post("/api/auth/bootstrap-owner", passwordPolicy);
  return router;
}

async function hardenProductionSchema() {
  /*
   * Older builds created loyalty_points_reversed as INTEGER although runtime
   * code uses it as a boolean flag. Convert safely for existing databases and
   * keep new deployments compatible until the monolith migration is split.
   */
  const column = await db(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'loyalty_points_reversed'
    LIMIT 1
  `);

  if (column.rowCount && column.rows[0].data_type !== "boolean") {
    await db(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed DROP DEFAULT`);
    await db(`
      ALTER TABLE orders
      ALTER COLUMN loyalty_points_reversed TYPE BOOLEAN
      USING (COALESCE(loyalty_points_reversed, 0) <> 0)
    `);
    await db(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed SET DEFAULT FALSE`);
    await db(`UPDATE orders SET loyalty_points_reversed = FALSE WHERE loyalty_points_reversed IS NULL`);
    await db(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed SET NOT NULL`);
  }

  await db(`ALTER TABLE loyalty_points_transactions ADD COLUMN IF NOT EXISTS note TEXT`);
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  createPreStoreRouter,
  hardenProductionSchema
};
