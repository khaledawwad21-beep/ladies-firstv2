"use strict";

const { db } = require("./db");

async function migrateDatabase() {
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

module.exports = { migrateDatabase };
