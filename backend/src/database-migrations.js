"use strict";

const { transaction } = require("./db");

async function migrateDatabase() {
  await transaction(async (client) => {
    const column = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders'
        AND column_name = 'loyalty_points_reversed' LIMIT 1
    `);

    if (!column.rowCount) {
      await client.query(`ALTER TABLE orders ADD COLUMN loyalty_points_reversed BOOLEAN NOT NULL DEFAULT FALSE`);
    } else if (column.rows[0].data_type !== "boolean") {
      await client.query(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed DROP DEFAULT`);
      await client.query(`
        ALTER TABLE orders ALTER COLUMN loyalty_points_reversed TYPE BOOLEAN
        USING (CASE WHEN loyalty_points_reversed IS NULL THEN FALSE
          WHEN loyalty_points_reversed::text IN ('1','true','t','yes','y') THEN TRUE ELSE FALSE END)
      `);
    }
    await client.query(`UPDATE orders SET loyalty_points_reversed = FALSE WHERE loyalty_points_reversed IS NULL`);
    await client.query(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed SET DEFAULT FALSE`);
    await client.query(`ALTER TABLE orders ALTER COLUMN loyalty_points_reversed SET NOT NULL`);

    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku) WHERE sku IS NOT NULL`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products(slug) WHERE slug IS NOT NULL`);

    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image TEXT`);
    await client.query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await client.query(`ALTER TABLE order_items ALTER COLUMN total_price SET DEFAULT 0`);
    await client.query(`UPDATE order_items SET total = COALESCE(NULLIF(total,0), total_price, unit_price * quantity, 0)`);
    await client.query(`UPDATE order_items SET total_price = COALESCE(NULLIF(total_price,0), total, unit_price * quantity, 0)`);

    await client.query(`ALTER TABLE loyalty_points_transactions ADD COLUMN IF NOT EXISTS note TEXT`);

    const verified = await client.query(`
      SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders'
        AND column_name = 'loyalty_points_reversed' LIMIT 1
    `);
    const schema = verified.rows[0];
    if (!schema || schema.data_type !== "boolean" || schema.is_nullable !== "NO") {
      throw new Error("orders.loyalty_points_reversed schema migration did not complete safely");
    }

    const productColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='products'
        AND column_name IN ('sku','slug','image')
    `);
    if (productColumns.rowCount !== 3) throw new Error("products production schema is incomplete");
  });
}

module.exports = { migrateDatabase };
