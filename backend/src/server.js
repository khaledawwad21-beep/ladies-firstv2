"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const {
  db,
  transaction,
  getDatabaseStatus,
  closeDatabase
} = require("./db");

const {
  hashPassword,
  verifyPassword,
  createToken,
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireOwner,
  normalizeEmail,
  normalizePhone,
  normalizeContact,
  sanitizeUser,
  getGenderGreeting
} = require("./auth");

const { validateHomepageSettings } = require("./homepage-settings");
const {
  normalizePermissions,
  initAdminPermissions,
  createAdminPermissionGuard
} = require("./admin-permissions");

const app = express();

const PORT = Number(process.env.PORT || 10000);

const ROOT_DIR = path.join(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const UPLOADS_DIR = path.join(FRONTEND_DIR, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {
    recursive: true
  });
}

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(require("./security-policy").createSecurityPolicy());

app.use(
  express.json({
    limit: "5mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb"
  })
);

app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);

app.use(
  "/api/admin",
  createAdminPermissionGuard(db, requireAuth)
);

/* =========================================================
   HELPERS
========================================================= */

function number(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function integer(value, fallback = 0) {
  const n = Number(value);

  return Number.isInteger(n)
    ? n
    : fallback;
}

function money(value) {
  return Math.round(
    number(value, 0) * 100
  ) / 100;
}

function createHttpError(status, code, message) {
  const error = new Error(message || "حدث خطأ");
  error.status = Number(status) || 500;
  error.code = code || "HTTP_ERROR";
  return error;
}

function stockAvailabilityMessage(stock) {
  const available = Math.max(0, Number(stock) || 0);
  return available <= 0
    ? "💕 عذرًا سيدتي، خلصت الكمية🌸"
    : "💕 عذرًا سيدتي، المتوفر حاليًا " + available + " قطع … يمكنك إضافة عدد القطع المتاحة " + available + " قطع كحد أقصى.";
}

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function nullableText(value) {
  const text = cleanText(value);

  return text || null;
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function publicUser(user) {
  return sanitizeUser(user);
}

function productIdFromRequest(req) {
  const id = integer(
    req.params.id,
    NaN
  );

  return Number.isInteger(id)
    ? id
    : null;
}

function normalizePaymentMethod(value) {
  const method =
    cleanText(value)
      .toLowerCase();

  if (
    method === "visa" ||
    method === "card" ||
    method === "credit_card"
  ) {
    return "visa";
  }

  return "cash";
}

function percent(value) {
  return Math.max(
    0,
    Math.min(
      100,
      number(value, 0)
    )
  );
}

function calculateLoyaltyPoints(
  amount,
  pointsPerCurrency
) {
  const total =
    Math.max(
      0,
      money(amount)
    );

  const rate =
    Math.max(
      0,
      number(
        pointsPerCurrency,
        1
      )
    );

  return Math.max(
    0,
    Math.floor(
      total * rate
    )
  );
}

function parseJson(value, fallback = {}) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  try {
    return JSON.parse(
      String(value)
    );
  } catch {
    return fallback;
  }
}

function getSettingValue(
  row,
  fallback = null
) {
  if (!row) {
    return fallback;
  }

  return row.value !== undefined
    ? row.value
    : fallback;
}

async function getSetting(
  key,
  fallback = null,
  client = null
) {
  const executor =
    client || {
      query: db
    };

  const result =
    await executor.query(
      `
      SELECT value
      FROM settings
      WHERE key = $1
      LIMIT 1
      `,
      [key]
    );

  if (!result.rows.length) {
    return fallback;
  }

  return getSettingValue(
    result.rows[0],
    fallback
  );
}

async function setSetting(
  key,
  value,
  client = null
) {
  const executor =
    client || {
      query: db
    };

  await executor.query(
    `
    INSERT INTO settings
      (
        key,
        value,
        updated_at
      )
    VALUES
      (
        $1,
        $2::jsonb,
        NOW()
      )
    ON CONFLICT(key)
    DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
    `,
    [
      key,
      JSON.stringify(value)
    ]
  );
}

function getShippingValue(
  settings,
  body
) {
  if (
    body &&
    body.shipping !== undefined
  ) {
    return Math.max(
      0,
      money(body.shipping)
    );
  }

  return Math.max(
    0,
    money(
      settings?.shipping_fee ??
      settings?.shippingFee ??
      0
    )
  );
}

function getPackagingValue(
  settings,
  body
) {
  if (
    body &&
    body.packaging !== undefined
  ) {
    return Math.max(
      0,
      money(body.packaging)
    );
  }

  return Math.max(
    0,
    money(
      settings?.packaging_fee ??
      settings?.packagingFee ??
      0
    )
  );
}

function ensurePositiveQuantity(
  value
) {
  const quantity =
    integer(
      value,
      NaN
    );

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity <= 0
  ) {
    throw new Error(
      "كمية المنتج غير صحيحة"
    );
  }

  return quantity;
}

function stockError() {
  const error =
    new Error(
      stockAvailabilityMessage(0)
    );

  error.code =
    "OUT_OF_STOCK";

  return error;
}

function priceMismatchError() {
  const error =
    new Error(
      "تغير سعر أحد المنتجات، يرجى تحديث السلة"
    );

  error.code =
    "PRICE_CHANGED";

  return error;
}

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initDatabase() {
  const status =
    await getDatabaseStatus();

  if (!status.configured) {
    console.warn(
      "[DB] DATABASE_URL is not configured."
    );

    return;
  }

  await db(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      gender TEXT,
      age INTEGER,
      role TEXT NOT NULL DEFAULT 'customer',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      is_owner BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_owner
    BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS loyalty_points
    INTEGER NOT NULL DEFAULT 0
  `);

  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active
    BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await db(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS ordering_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ordering_block_reason TEXT,
      ADD COLUMN IF NOT EXISTS ordering_block_until TIMESTAMPTZ
  `);

  await require("./order-block-history").initOrderBlockHistory(db);
  await initAdminPermissions(db);
  await require("./auth").initSessionSecurity(db);

  await db(`
    CREATE TABLE IF NOT EXISTS categories (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS brands (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      logo_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      old_price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      category_id BIGINT
        REFERENCES categories(id)
        ON DELETE SET NULL,
      brand_id BIGINT
        REFERENCES brands(id)
        ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock
    INTEGER NOT NULL DEFAULT 0
  `);

  await db(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sku
    TEXT
  `);

  await require('./product-media').initMedia();
  await require('./waitlist').initWaitlist(db);
  await require('./cart-tracking').initCartTracking(db);
  await require('./account-state').initAccountState(db);
  await require('./whatsapp-automation').initWhatsAppAutomation(db);
  await require('./passkeys').initPasskeys(db);
  await require('./password-recovery').initPasswordRecovery(db);
  await require('./staff-messages').initStaffMessages(db);
  await db(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name TEXT`);
  await db(`ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);

  await db(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  const categorySeeds = [
    { name: "ساعات ستاتي", slug: "womens-watches", image: "/category-images/womens-watches.jpg", aliases: ["ساعات ستاتي", "ساعات"] },
    { name: "ساعات رجالي", slug: "mens-watches", image: "/category-images/mens-watches.jpg", aliases: ["ساعات رجالي"] },
    { name: "مكياج", slug: "makeup", image: "/category-images/makeup.jpg", aliases: ["مكياج"] },
    { name: "اكسسوارات", slug: "accessories", image: "/category-images/accessories.jpg", aliases: ["اكسسوارات", "إكسسوارات"] },
    { name: "شنط", slug: "bags", image: "/category-images/bags.jpg", aliases: ["شنط"] },
    { name: "عطور", slug: "perfumes", image: "/category-images/perfume.jpg", aliases: ["عطور", "عطر"] }
  ];
  for (const category of categorySeeds) {
    const existing = await db(
      `SELECT id FROM categories WHERE slug = $1 OR name = ANY($2::text[]) ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END, id LIMIT 1`,
      [category.slug, category.aliases]
    );
    if (existing.rows.length) {
      await db(
        `UPDATE categories SET name = $1, slug = $2, image_url = $3, is_active = TRUE, updated_at = NOW() WHERE id = $4`,
        [category.name, category.slug, category.image, existing.rows[0].id]
      );
    } else {
      await db(
        `INSERT INTO categories (name, slug, image_url, is_active, created_at, updated_at) VALUES ($1, $2, $3, TRUE, NOW(), NOW()) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url, is_active = TRUE, updated_at = NOW()`,
        [category.name, category.slug, category.image]
      );
    }
  }

  await db(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await db(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,
      sku TEXT UNIQUE,
      color TEXT,
      size TEXT,
      price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS product_images (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS is_primary
    BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,

      user_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

      status TEXT NOT NULL
        DEFAULT 'pending',

      subtotal NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      discount NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      shipping NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      packaging NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      total NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      payment_method TEXT
        NOT NULL DEFAULT 'cash',

      visa_discount NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      loyalty_points_awarded INTEGER
        NOT NULL DEFAULT 0,

      loyalty_points_reversed BOOLEAN
        NOT NULL DEFAULT FALSE,

      customer_name TEXT,

      customer_phone TEXT,

      shipping_address TEXT,

      notes TEXT,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method
    TEXT NOT NULL DEFAULT 'cash'
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS visa_discount
    NUMERIC(12,2) NOT NULL DEFAULT 0
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS loyalty_points_awarded
    INTEGER NOT NULL DEFAULT 0
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS loyalty_points_reversed
    BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_name
    TEXT
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_phone
    TEXT
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS shipping_address
    TEXT
  `);

  await db(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS notes
    TEXT
  `);

  await db(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_region TEXT,
      ADD COLUMN IF NOT EXISTS shipping_waived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS shipping_base_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_manual_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_manual_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,

      order_id BIGINT NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

      product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,

      variant_id BIGINT
        REFERENCES product_variants(id)
        ON DELETE RESTRICT,

      product_name TEXT NOT NULL,

      variant_name TEXT,

      product_image TEXT,

      quantity INTEGER NOT NULL,

      unit_price NUMERIC(12,2)
        NOT NULL,

      purchase_price NUMERIC(12,2),

      total_price NUMERIC(12,2)
        NOT NULL
    )
  `);

  await db(`
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS product_image
    TEXT
  `);

  await db(`
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS purchase_price
    NUMERIC(12,2)
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS coupons (
      id BIGSERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL
        DEFAULT 'percent',
      discount_value NUMERIC(12,2)
        NOT NULL DEFAULT 0,
      min_order NUMERIC(12,2)
        NOT NULL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id BIGSERIAL PRIMARY KEY,

      variant_id BIGINT
        REFERENCES product_variants(id)
        ON DELETE SET NULL,

      product_id BIGINT
        REFERENCES products(id)
        ON DELETE SET NULL,

      quantity_change INTEGER NOT NULL,

      reason TEXT,

      order_id BIGINT
        REFERENCES orders(id)
        ON DELETE SET NULL,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  /* Keep existing production databases compatible with the current API. */
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_source TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`);

  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_region TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_waived BOOLEAN NOT NULL DEFAULT FALSE`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_manual_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_manual_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0`);

  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image TEXT`);
  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_gift BOOLEAN NOT NULL DEFAULT FALSE`);
  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS minimum_amount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`);
  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses_per_customer INTEGER NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await db(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      request_type TEXT NOT NULL CHECK (request_type IN ('return','exchange')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      reason_code TEXT,
      reason TEXT NOT NULL,
      notes TEXT,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','completed')),
      admin_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db(`CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id)`);
  await db(`CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id)`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS reason_code TEXT`);
  await db(`
    UPDATE return_requests
    SET reason_code=CASE
      WHEN reason_code IS NOT NULL AND reason_code<>'' THEN reason_code
      WHEN LOWER(reason) LIKE '%تالف%' OR LOWER(reason) LIKE '%damaged%' OR LOWER(reason) LIKE '%defective%' THEN 'store_damaged'
      WHEN LOWER(reason) LIKE '%مختلف عن الطلب%' OR LOWER(reason) LIKE '%منتج خاطئ%' OR LOWER(reason) LIKE '%wrong item%' THEN 'store_wrong_item'
      WHEN LOWER(reason) LIKE '%ناقص%' OR LOWER(reason) LIKE '%missing item%' THEN 'store_missing_item'
      WHEN LOWER(reason) LIKE '%المقاس%' OR LOWER(reason) LIKE '%اللون%' THEN 'customer_size_color'
      ELSE 'other'
    END
    WHERE reason_code IS NULL OR reason_code=''
  `);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_product_name TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_variant_name TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_unit_price NUMERIC(12,2)`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS fee_payer TEXT NOT NULL DEFAULT 'customer'`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS service_fee NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS fee_reason TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS price_difference NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS returned_merchandise_value NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS returned_cost_value NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS net_settlement NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS store_delivery_cost NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS store_fault BOOLEAN NOT NULL DEFAULT FALSE`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS loyalty_award_reversed INTEGER NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS loyalty_redeem_refunded INTEGER NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS coupon_released BOOLEAN NOT NULL DEFAULT FALSE`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS exchange_settlement_direction TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS exchange_settlement_amount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS exchange_settlement_method TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS exchange_settlement_status TEXT NOT NULL DEFAULT 'not_required'`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS exchange_settled_at TIMESTAMPTZ`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS allocated_coupon_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS allocated_visa_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS allocated_loyalty_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refundable_cash_value NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_refund_status TEXT NOT NULL DEFAULT 'not_required'`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_refund_method TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_refund_reference TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS return_refund_settled_at TIMESTAMPTZ`);

  await db(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

      PRIMARY KEY (
        user_id,
        product_id
      )
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,

      value JSONB NOT NULL
        DEFAULT '{}'::jsonb,

      updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
      id BIGSERIAL PRIMARY KEY,

      user_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,

      order_id BIGINT
        REFERENCES orders(id)
        ON DELETE SET NULL,

      transaction_type TEXT NOT NULL,

      points INTEGER NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  await db(`ALTER TABLE loyalty_points_transactions ADD COLUMN IF NOT EXISTS note TEXT`);

  await db(`CREATE UNIQUE INDEX IF NOT EXISTS loyalty_return_award_reversal_once ON loyalty_points_transactions(order_id, note) WHERE transaction_type='return_award_reversal'`);
  await db(`CREATE UNIQUE INDEX IF NOT EXISTS loyalty_return_redeem_refund_once ON loyalty_points_transactions(order_id, note) WHERE transaction_type='return_redeem_refund'`);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      loyalty_points_award_once
    ON loyalty_points_transactions(order_id)
    WHERE transaction_type =
      'order_award'
  `);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      loyalty_points_reversal_once
    ON loyalty_points_transactions(order_id)
    WHERE transaction_type =
      'order_reversal'
  `);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS loyalty_points_redeem_refund_once
    ON loyalty_points_transactions(order_id)
    WHERE transaction_type = 'redeem_refund'
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'visa_discount_percent',
        '0'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'loyalty_points_per_currency',
        '1'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings (key, value) VALUES
      ('loyalty_enabled', 'true'::jsonb),
      ('loyalty_redeem_enabled', 'true'::jsonb),
      ('loyalty_point_value', '0.1'::jsonb),
      ('loyalty_earning_mode', '"amount"'::jsonb),
      ('loyalty_points_per_order', '10'::jsonb)
    ON CONFLICT(key) DO NOTHING
  `);

  await db(`
    INSERT INTO settings (key, value)
    VALUES (
      'packaging_options',
      '[{"id":"clear-ribbon","nameAr":"تغليف شفاف مع شبرة","nameEn":"Clear wrapping with ribbon","price":5,"active":true},{"id":"paper-ribbon","nameAr":"تغليف ورقي مع شبرة","nameEn":"Paper wrapping with ribbon","price":15,"active":true}]'::jsonb
    )
    ON CONFLICT(key) DO NOTHING
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'shipping_fee',
        '0'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'shipping_fees',
        '{"westbank":20,"jerusalem":35,"inside":70}'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings (key, value)
    VALUES ('shipping_discount_percentages','{"westbank":0,"jerusalem":0,"inside":0}'::jsonb)
    ON CONFLICT(key) DO NOTHING
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'packaging_fee',
        '0'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      (
        'whatsapp_number',
        '"0562499924"'::jsonb
      )
    ON CONFLICT(key)
    DO NOTHING
  `);

  await db(`
    INSERT INTO settings (key, value)
    SELECT 'social_links', value
    FROM settings
    WHERE key = 'social'
    ON CONFLICT(key) DO NOTHING
  `);

  console.log(
    "[DB] Database initialized successfully."
  );
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      const status =
        await getDatabaseStatus();

      res.json({
        ok: true,
        server: true,
        database:
          status.connected,
        databaseConfigured:
          status.configured,
        serverTime:
          status.serverTime || null
      });
    } catch (error) {
      console.error(
        "[HEALTH]",
        error
      );

      res.status(503).json({
        ok: false,
        server: true,
        database: false
      });
    }
  }
);

/* =========================================================
   SETUP STATUS
========================================================= */

app.get(
  "/api/setup/status",
  async (req, res) => {
    try {
      const result = await db(`
        SELECT id
        FROM users
        WHERE is_owner = TRUE
           OR role = 'owner'
        LIMIT 1
      `);

      return res.json({
        ok: true,
        setupRequired: result.rows.length === 0
      });
    } catch (error) {
      console.error("[SETUP STATUS]", error);
      return res.status(500).json({
        ok: false,
        message: "تعذر التحقق من حالة الإعداد"
      });
    }
  }
);

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        gender,
        age
      } = req.body || {};

      const cleanName =
        cleanText(name);

      const cleanEmail =
        normalizeEmail(email);

      const cleanPhone =
        normalizePhone(phone);

      if (
        !cleanName ||
        !password
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "الاسم وكلمة المرور مطلوبان"
        });
      }

      if (
        String(password).length < 12
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "كلمة المرور يجب أن تكون 12 خانة على الأقل"
        });
      }

      if (
        !cleanEmail &&
        !cleanPhone
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "أدخلي البريد الإلكتروني أو رقم الهاتف"
        });
      }

      const existing =
        await db(
          `
          SELECT id
          FROM users
          WHERE
            (
              $1::text IS NOT NULL
              AND email = $1
            )
            OR
            (
              $2::text IS NOT NULL
              AND phone = $2
            )
          LIMIT 1
          `,
          [
            cleanEmail,
            cleanPhone
          ]
        );

      if (
        existing.rows.length
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "هذا البريد أو رقم الهاتف مسجل مسبقاً"
        });
      }

      const passwordHash =
        await hashPassword(
          password
        );

      const ageNumber =
        age === undefined ||
        age === null ||
        age === ""
          ? null
          : integer(
              age,
              null
            );

      const result =
        await db(
          `
          INSERT INTO users
            (
              name,
              email,
              phone,
              password_hash,
              gender,
              age
            )
          VALUES
            (
              $1,$2,$3,
              $4,$5,$6
            )
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            permissions,
            loyalty_points,
            is_active,
            created_at,
            updated_at
          `,
          [
            cleanName,
            cleanEmail,
            cleanPhone,
            passwordHash,
            nullableText(gender),
            ageNumber
          ]
        );

      const user =
        result.rows[0];

      const token =
        createToken(user);

      res.status(201).json({
        ok: true,
        user:
          publicUser(user),
        token,
        greeting:
          getGenderGreeting(
            user.gender
          )
      });
    } catch (error) {
      console.error(
        "[REGISTER]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء الحساب حالياً"
      });
    }
  }
);

/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const contact =
        normalizeContact(
          req.body?.contact ??
          req.body?.email ??
          req.body?.phone ??
          req.body?.identifier
        );

      const password =
        req.body?.password;

      if (
        !contact ||
        !password
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "بيانات الدخول غير مكتملة"
        });
      }

      const result =
        await db(
          `
          SELECT *
          FROM users
          WHERE
            email = $1
            OR phone = $1
          LIMIT 1
          `,
          [contact]
        );

      if (
        !result.rows.length
      ) {
        return res.status(401).json({
          ok: false,
          message:
            "بيانات الدخول غير صحيحة"
        });
      }

      const user =
        result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          ok: false,
          message:
            "هذا الحساب غير مفعل"
        });
      }

      const valid =
        await verifyPassword(
          password,
          user.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          ok: false,
          message:
            "بيانات الدخول غير صحيحة"
        });
      }

      const token =
        createToken(user);

      res.json({
        ok: true,
        user:
          publicUser(user),
        token,
        greeting:
          getGenderGreeting(
            user.gender
          )
      });
    } catch (error) {
      console.error(
        "[LOGIN]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تسجيل الدخول حالياً"
      });
    }
  }
);

app.post("/api/auth/logout", requireAuth, async (req, res, next) => {
  try {
    await db("UPDATE users SET session_version=session_version+1 WHERE id=$1", [req.user.id]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

/* =========================================================
   AUTH - CURRENT USER
========================================================= */

app.get(
  "/api/auth/me",
  optionalAuth,
  async (req, res) => {
    try {
      if (!req.user) {
        return res.json({
          ok: true,
          user: null
        });
      }

      const result =
        await db(
          `
          SELECT
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            permissions,
            loyalty_points,
            whatsapp_opt_in,
            whatsapp_opt_in_updated_at,
            is_active,
            created_at,
            updated_at
          FROM users
          WHERE
            id = $1
            AND is_active = TRUE
          LIMIT 1
          `,
          [req.user.id]
        );

      if (
        !result.rows.length
      ) {
        return res.json({
          ok: true,
          user: null
        });
      }

      const user =
        result.rows[0];

      res.json({
        ok: true,
        user:
          publicUser(user),
        greeting:
          getGenderGreeting(
            user.gender
          )
      });
    } catch (error) {
      console.error(
        "[AUTH ME]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الحساب"
      });
    }
  }
);

/* =========================================================
   OWNER BOOTSTRAP
   لا يوجد اسم مستخدم أو كلمة مرور افتراضية.
   يتم إنشاء المالك فقط بالبيانات التي يرسلها صاحب المتجر.
========================================================= */

app.post(
  "/api/auth/bootstrap-owner",
  async (req, res) => {
    try {
      const existing =
        await db(
          `
          SELECT id
          FROM users
          WHERE
            is_owner = TRUE
            OR role = 'owner'
          LIMIT 1
          `
        );

      if (
        existing.rows.length
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "تم إنشاء حساب المالك مسبقاً"
        });
      }

      const {
        name,
        email,
        phone,
        password,
        gender,
        age
      } = req.body || {};

      const cleanName =
        cleanText(name);

      const cleanEmail =
        normalizeEmail(email);

      const cleanPhone =
        normalizePhone(phone);

      if (
        !cleanName ||
        !password ||
        (
          !cleanEmail &&
          !cleanPhone
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "الاسم ووسيلة الدخول وكلمة المرور مطلوبة"
        });
      }

      if (
        String(password).length < 12
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "كلمة مرور المالك يجب أن تكون 12 خانة على الأقل"
        });
      }

      const passwordHash =
        await hashPassword(
          password
        );

      const result =
        await db(
          `
          INSERT INTO users
            (
              name,
              email,
              phone,
              password_hash,
              gender,
              age,
              role,
              is_owner,
              is_active
            )
          VALUES
            (
              $1,$2,$3,$4,
              $5,$6,'owner',
              TRUE,TRUE
            )
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            loyalty_points,
            is_active,
            created_at,
            updated_at
          `,
          [
            cleanName,
            cleanEmail,
            cleanPhone,
            passwordHash,
            nullableText(gender),
            age === "" ||
            age === null ||
            age === undefined
              ? null
              : integer(
                  age,
                  null
                )
          ]
        );

      const user =
        result.rows[0];

      const token =
        createToken(user);

      res.status(201).json({
        ok: true,
        user:
          publicUser(user),
        token,
        greeting:
          getGenderGreeting(
            user.gender
          )
      });
    } catch (error) {
      console.error(
        "[BOOTSTRAP OWNER]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء حساب المالك"
      });
    }
  }
);

/* =========================================================
   CATEGORIES
========================================================= */

app.get(
  "/api/categories",
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            id,
            name,
            slug,
            image_url AS "imageUrl"
          FROM categories
          WHERE
            is_active = TRUE
          ORDER BY
            name ASC
        `);

      res.json({
        ok: true,
        categories:
          result.rows
      });
    } catch (error) {
      console.error(
        "[CATEGORIES]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الأقسام"
      });
    }
  }
);

/* =========================================================
   BRANDS
========================================================= */

app.get(
  "/api/brands",
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            id,
            name,
            slug,
            logo_url AS "logoUrl"
          FROM brands
          WHERE
            is_active = TRUE
          ORDER BY
            name ASC
        `);

      res.json({
        ok: true,
        brands:
          result.rows
      });
    } catch (error) {
      console.error(
        "[BRANDS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الماركات"
      });
    }
  }
);

/* =========================================================
   PRODUCT QUERY
========================================================= */

async function getProducts(
  where = "",
  params = [],
  order =
    "p.created_at DESC",
  includeInactive = false
) {
  const result =
    await db(
      `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.description,
        p.price,
        p.old_price AS "oldPrice",
        p.old_price,
        p.cost_price,
        p.supplier_name AS "supplierName",
        p.supplier_name,
        p.metadata,
        (SELECT name FROM categories WHERE id = p.category_id) AS category,
        (SELECT name FROM brands WHERE id = p.brand_id) AS brand,
        COALESCE((SELECT json_agg(image_url ORDER BY sort_order, id) FROM product_images WHERE product_id=p.id AND is_primary=TRUE), '[]'::json) AS "mainImages",
        COALESCE((SELECT json_agg(image_url ORDER BY sort_order, id) FROM product_images WHERE product_id=p.id AND is_primary=FALSE), '[]'::json) AS "subImages",
        p.stock,
        p.image_url AS "imageUrl",
        p.category_id AS "categoryId",
        p.brand_id AS "brandId",
        p.is_active AS "isActive",
        p.is_active,
        p.is_featured AS "isFeatured",
        p.is_best_seller AS "isBestSeller",
        p.created_at AS "createdAt",

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', v.id,
                'sku', v.sku,
                'color', v.color,
                'name', v.color,
                'size', v.size,
                'price', v.price,
                'stock', v.stock
              )
              ORDER BY v.id
            )
            FROM product_variants v
            WHERE
              v.product_id = p.id
              AND v.is_active = TRUE
          ),
          '[]'::json
        ) AS variants,

        COALESCE(
          (
            SELECT json_agg(
              pi.image_url
              ORDER BY
                pi.sort_order,
                pi.id
            )
            FROM product_images pi
            WHERE
              pi.product_id = p.id
          ),
          '[]'::json
        ) AS images

      FROM products p

      WHERE
        ${includeInactive ? "TRUE" : "p.is_active = TRUE"}
        ${where}

      ORDER BY
        ${order}
      `,
      params
    );

  return result.rows;
}

/* =========================================================
   PRODUCTS
========================================================= */

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const search =
        cleanText(
          req.query.search ??
          req.query.q
        );

      const category =
        integer(
          req.query.category,
          NaN
        );

      const brand =
        integer(
          req.query.brand,
          NaN
        );

      const sort =
        cleanText(
          req.query.sort
        );

      const conditions = [];
      const params = [];

      if (search) {
        params.push(
          `%${search}%`
        );

        conditions.push(`
          (
            p.name ILIKE $${params.length}
            OR
            COALESCE(
              p.description,
              ''
            ) ILIKE $${params.length}
          )
        `);
      }

      if (
        Number.isInteger(
          category
        )
      ) {
        params.push(
          category
        );

        conditions.push(
          `p.category_id = $${params.length}`
        );
      }

      if (
        Number.isInteger(
          brand
        )
      ) {
        params.push(
          brand
        );

        conditions.push(
          `p.brand_id = $${params.length}`
        );
      }

      const where =
        conditions.length
          ? `AND ${conditions.join(
              " AND "
            )}`
          : "";

      let order =
        "p.created_at DESC";

      if (
        sort ===
        "price_asc"
      ) {
        order =
          "p.price ASC";
      } else if (
        sort ===
        "price_desc"
      ) {
        order =
          "p.price DESC";
      } else if (
        sort === "name"
      ) {
        order =
          "p.name ASC";
      }

      const products =
        await getProducts(
          where,
          params,
          order
        );

      res.json({
        ok: true,
        products
      });
    } catch (error) {
      console.error(
        "[PRODUCTS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المنتجات"
      });
    }
  }
);
/* =========================================================
   ADMIN - CREATE PRODUCT
========================================================= */

require('./product-media').registerMedia(app);
require('./product-write').registerProductWrites(app, getProducts);
require('./product-offers').registerProductOffers(app);

/* =========================================================
   SINGLE PRODUCT
========================================================= */

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const id =
        productIdFromRequest(req);

      if (!id) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المنتج غير صحيح"
        });
      }

      const products =
        await getProducts(
          "AND p.id = $1",
          [id]
        );

      if (!products.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المنتج غير موجود"
        });
      }

      const product =
        products[0];

      const recommendations =
        await getProducts(
          `
          AND p.id <> $1
          AND (
            (
              $2::bigint IS NOT NULL
              AND p.category_id = $2
            )
            OR
            (
              $3::bigint IS NOT NULL
              AND p.brand_id = $3
            )
          )
          `,
          [
            id,
            product.categoryId,
            product.brandId
          ]
        );

      res.json({
        ok: true,
        product,
        recommendations:
          recommendations.slice(
            0,
            8
          )
      });
    } catch (error) {
      console.error(
        "[PRODUCT]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المنتج"
      });
    }
  }
);

require("./best-sellers").registerBestSellers(app);

/* =========================================================
   HOME
========================================================= */

app.get(
  "/api/store/home",
  async (req, res) => {
    try {
      const products =
        await getProducts();

      const featured =
        products.filter(
          (p) =>
            p.isFeatured
        ).slice(0, 20);

      const offers =
        products
          .filter(
            (p) =>
              p.oldPrice !== null &&
              Number(
                p.oldPrice
              ) >
                Number(
                  p.price
                )
          )
          .sort(
            (a, b) =>
              (
                Number(
                  b.oldPrice
                ) -
                Number(
                  b.price
                )
              ) -
              (
                Number(
                  a.oldPrice
                ) -
                Number(
                  a.price
                )
              )
          )
          .slice(0, 20);

      const bestResult =
        await db(`
          SELECT
            oi.product_id AS id,
            SUM(
              oi.quantity
            )::INTEGER AS quantity
          FROM order_items oi
          INNER JOIN orders o
            ON o.id = oi.order_id
          WHERE
            o.created_at >=
              NOW() -
              INTERVAL '7 days'
            AND COALESCE(oi.is_gift,FALSE)=FALSE
            AND LOWER(
              o.status
            ) NOT IN (
              'cancelled',
              'canceled'
            )
          GROUP BY
            oi.product_id
          ORDER BY
            quantity DESC
          LIMIT 5
        `);

      const bestIds =
        bestResult.rows.map(
          (x) =>
            Number(x.id)
        );

      const productMap =
        new Map(
          products.map(
            (p) => [
              Number(p.id),
              p
            ]
          )
        );

      const topFive =
        bestIds
          .map(
            (id) =>
              productMap.get(id)
          )
          .filter(Boolean);

      const bestSellers =
        products
          .filter(
            (p) =>
              p.isBestSeller
          )
          .slice(0, 20);

      const settingsResult =
        await db(`
          SELECT
            key,
            value
          FROM settings
        `);

      const settings = {};

      for (
        const row
          of settingsResult.rows
      ) {
        settings[row.key] =
          parseJson(
            row.value,
            row.value
          );
      }

      res.json({
        ok: true,
        products,
        featured,
        offers,
        topFive,
        bestSellers,
        completeLook:
          topFive.slice(0, 8),
        settings
      });
    } catch (error) {
      console.error(
        "[HOME]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الصفحة الرئيسية"
      });
    }
  }
);

/* =========================================================
   SETTINGS - PUBLIC
========================================================= */

app.get(
  "/api/settings",
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            key,
            value
          FROM settings
          ORDER BY key
        `);

      const settings = {};

      for (
        const row
          of result.rows
      ) {
        if (!require("./security-policy").PUBLIC_SETTINGS.has(row.key)) continue;
        settings[row.key] =
          parseJson(
            row.value,
            row.value
          );
      }

      settings.whatsapp_number =
        settings.whatsapp_number ||
        settings.whatsapp ||
        "0562499924";

      if (
        !settings.social_links &&
        settings.social &&
        typeof settings.social === "object"
      ) {
        settings.social_links =
          settings.social;
      }

      res.json({
        ok: true,
        settings
      });
    } catch (error) {
      console.error(
        "[SETTINGS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الإعدادات"
      });
    }
  }
);

/* =========================================================
   FAVORITES
========================================================= */

app.get(
  "/api/favorites",
  requireAuth,
  async (req, res) => {
    try {
      const result =
        await db(
          `
          SELECT
            product_id AS "productId"
          FROM favorites
          WHERE
            user_id = $1
          ORDER BY
            created_at DESC
          `,
          [req.user.id]
        );

      res.json({
        ok: true,
        favorites:
          result.rows
      });
    } catch (error) {
      console.error(
        "[FAVORITES]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المفضلة"
      });
    }
  }
);

app.post(
  "/api/favorites/:productId",
  requireAuth,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.params.productId,
          NaN
        );

      if (
        !Number.isInteger(
          productId
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المنتج غير صحيح"
        });
      }

      await db(
        `
        INSERT INTO favorites
          (
            user_id,
            product_id
          )
        VALUES
          ($1,$2)
        ON CONFLICT DO NOTHING
        `,
        [
          req.user.id,
          productId
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "[FAVORITE ADD]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر إضافة المنتج للمفضلة"
      });
    }
  }
);

app.delete(
  "/api/favorites/:productId",
  requireAuth,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.params.productId,
          NaN
        );

      await db(
        `
        DELETE FROM favorites
        WHERE
          user_id = $1
          AND product_id = $2
        `,
        [
          req.user.id,
          productId
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "[FAVORITE DELETE]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر إزالة المنتج من المفضلة"
      });
    }
  }
);

/* =========================================================
   نهاية الجزء 1/3
========================================================= */
/* =========================================================
   ORDERS
   ========================================================= */

app.post(
  "/api/orders",
  optionalAuth,
  async (req, res) => {
    const userId = req.user?.id || null;

    const items = Array.isArray(req.body.items)
      ? req.body.items
      : [];

    if (!items.length) {
      return res.status(400).json({
        ok: false,
        message: "السلة فارغة"
      });
    }

    const paymentMethod = normalizePaymentMethod(
      req.body.payment_method ||
      req.body.paymentMethod ||
      "cash"
    );

    if (!["cash", "visa"].includes(paymentMethod)) {
      return res.status(400).json({
        ok: false,
        message: "طريقة الدفع غير صالحة"
      });
    }

    const customerName =
      cleanText(
        req.body.customer_name ||
        req.body.customerName ||
        "",
        200
      );

    const customerPhone =
      cleanText(
        req.body.customer_phone ||
        req.body.customerPhone ||
        "",
        100
      );

    const shippingAddress =
      cleanText(
        req.body.shipping_address ||
        req.body.shippingAddress ||
        "",
        1000
      );

    const notes =
      cleanText(
        req.body.notes || "",
        2000
      );

    if (!customerName) {
      return res.status(400).json({
        ok: false,
        message: "الاسم مطلوب"
      });
    }

    if (!customerPhone) {
      return res.status(400).json({
        ok: false,
        message: "رقم الهاتف مطلوب"
      });
    }

    try {
      const result =
        await transaction(async (client) => {
          const maintenanceMode=(await getSetting("maintenance_mode",false,client))===true;
          if(maintenanceMode){
            const maintenanceMessage=cleanText(
              await getSetting("maintenance_message","المتجر متوقف مؤقتًا للصيانة. يرجى المحاولة لاحقًا.",client),
              1000
            );
            throw createHttpError(
              503,
              "MAINTENANCE_MODE",
              maintenanceMessage || "المتجر متوقف مؤقتًا للصيانة. يرجى المحاولة لاحقًا."
            );
          }

          const phoneKey=String(customerPhone||"").replace(/\D/g,"");
          const blockedUser=await client.query(
            `SELECT id,ordering_block_reason,ordering_block_until
             FROM users
             WHERE ordering_blocked=TRUE
               AND (ordering_block_until IS NULL OR ordering_block_until > NOW())
               AND (
                 ($1::bigint IS NOT NULL AND id=$1)
                 OR ($2<>'' AND regexp_replace(COALESCE(phone,''),'[^0-9]','','g')=$2)
               )
             ORDER BY CASE WHEN id=$1 THEN 0 ELSE 1 END,id
             LIMIT 1`,
            [userId,phoneKey]
          );
          if(blockedUser.rowCount){
            throw createHttpError(
              403,
              "ORDERING_BLOCKED",
              "عذرًا، لا يمكن إتمام طلب جديد لهذا الحساب حاليًا. يرجى التواصل مع المتجر للمساعدة."
            );
          }

          let subtotal = 0;
          let couponDiscount = 0;
          let visaDiscount = 0;

          const normalizedItems = [];
          const seenCartLines = new Set();

          for (const item of items) {
            const productId =
              integer(
                item.productId ??
                item.product_id,
                NaN
              );

            if (!Number.isFinite(productId)) {
              throw createHttpError(
                400,
                "INVALID_PRODUCT",
                "منتج غير صالح"
              );
            }

            const rawVariantId =
              item.variantId ??
              item.variant_id ??
              null;

            const variantId =
              rawVariantId !== null &&
              rawVariantId !== undefined &&
              rawVariantId !== ""
                ? integer(
                    rawVariantId,
                    NaN
                  )
                : null;

            if (
              rawVariantId !== null &&
              rawVariantId !== undefined &&
              rawVariantId !== "" &&
              !Number.isFinite(variantId)
            ) {
              throw createHttpError(
                400,
                "INVALID_VARIANT",
                "الخيار المحدد غير صالح"
              );
            }

            const quantity =
              integer(
                item.quantity ??
                item.qty,
                0
              );

            /*
             * Never allow the same product/variant to be submitted as
             * separate cart lines. Otherwise two stock deductions can
             * bypass the user's intended single-line quantity guard.
             */
            const cartLineKey =
              `${productId}:${variantId === null ? "product" : variantId}`;

            if (seenCartLines.has(cartLineKey)) {
              throw createHttpError(
                400,
                "DUPLICATE_CART_LINE",
                "يوجد منتج مكرر في السلة، يرجى تحديث السلة والمحاولة مرة أخرى"
              );
            }

            seenCartLines.add(cartLineKey);

            if (
              quantity <= 0 ||
              quantity > 100000
            ) {
              throw createHttpError(
                400,
                "INVALID_QUANTITY",
                "الكمية غير صالحة"
              );
            }

            const productResult =
              await client.query(
                `
                SELECT
                  p.*,
                  c.name AS category_name,
                  b.name AS brand_name
                FROM products p
                LEFT JOIN categories c
                  ON c.id = p.category_id
                LEFT JOIN brands b
                  ON b.id = p.brand_id
                WHERE p.id = $1
                FOR UPDATE OF p
                `,
                [productId]
              );

            if (!productResult.rowCount) {
              throw createHttpError(
                404,
                "PRODUCT_NOT_FOUND",
                "المنتج غير موجود"
              );
            }

            const product =
              productResult.rows[0];

            if (
              product.is_active === false
            ) {
              throw createHttpError(
                400,
                "PRODUCT_UNAVAILABLE",
                "هذا المنتج غير متوفر حالياً"
              );
            }

            let variant = null;
            let currentPrice =
              Number(product.price || 0);

            let stockSource =
              "product";

            let stockId =
              product.id;

            if (variantId !== null) {
              const variantResult =
                await client.query(
                  `
                  SELECT *
                  FROM product_variants
                  WHERE id = $1
                    AND product_id = $2
                  FOR UPDATE
                  `,
                  [
                    variantId,
                    productId
                  ]
                );

              if (
                !variantResult.rowCount
              ) {
                throw createHttpError(
                  400,
                  "INVALID_VARIANT",
                  "الخيار المحدد غير متوفر لهذا المنتج"
                );
              }

              variant =
                variantResult.rows[0];

              if (
                variant.is_active === false
              ) {
                throw createHttpError(
                  400,
                  "VARIANT_UNAVAILABLE",
                  "هذا الخيار غير متوفر حالياً"
                );
              }

              if (
                variant.price !== null &&
                variant.price !== undefined
              ) {
                currentPrice =
                  Number(
                    variant.price
                  );
              }

              stockSource =
                "variant";

              stockId =
                variant.id;
            }

            if (
              !Number.isFinite(
                currentPrice
              ) ||
              currentPrice < 0
            ) {
              throw createHttpError(
                400,
                "INVALID_PRICE",
                "سعر المنتج غير صالح"
              );
            }

            /*
             * السعر القادم من المتصفح للمراجعة فقط.
             * السعر الحقيقي دائماً من قاعدة البيانات.
             */
            const clientPrice =
              Number(
                item.unitPrice ??
                item.unit_price ??
                item.price
              );

            if (
              Number.isFinite(
                clientPrice
              ) &&
              Math.abs(
                clientPrice -
                  currentPrice
              ) > 0.01
            ) {
              throw createHttpError(
                409,
                "PRICE_CHANGED",
                "تغير سعر أحد المنتجات، يرجى تحديث السلة والمحاولة مرة أخرى"
              );
            }

            const availableStock =
              Math.max(
                0,
                Number(
                  variant
                    ? variant.stock
                    : product.stock
                ) || 0
              );

            if (quantity > availableStock) {
              throw createHttpError(
                409,
                "OUT_OF_STOCK",
                stockAvailabilityMessage(
                  availableStock
                )
              );
            }

            let stockUpdate;

            if (
              stockSource ===
              "variant"
            ) {
              stockUpdate =
                await client.query(
                  `
                  UPDATE product_variants
                  SET stock = stock - $1,
                      updated_at = NOW()
                  WHERE id = $2
                    AND stock >= $1
                  RETURNING id, stock
                  `,
                  [
                    quantity,
                    stockId
                  ]
                );
            } else {
              stockUpdate =
                await client.query(
                  `
                  UPDATE products
                  SET stock = stock - $1,
                      updated_at = NOW()
                  WHERE id = $2
                    AND stock >= $1
                  RETURNING id, stock
                  `,
                  [
                    quantity,
                    stockId
                  ]
                );
            }

            if (
              !stockUpdate.rowCount
            ) {
              throw createHttpError(
                409,
                "OUT_OF_STOCK",
                stockAvailabilityMessage(0)
              );
            }

            const remainingStock =
              Number(
                stockUpdate.rows[0]
                  .stock || 0
              );

            const lineTotal =
              currentPrice *
              quantity;

            subtotal +=
              lineTotal;

            normalizedItems.push({
              productId,
              variantId,
              productName:
                product.name || "",
              variantName:
                variant
                  ? [
                      variant.color,
                      variant.size
                    ]
                      .filter(Boolean)
                      .join(" / ")
                  : "",
              image:
                product.image ||
                product.image_url ||
                null,
              quantity,
              unitPrice:
                currentPrice,
              total:
                lineTotal,
              purchasePrice:
                Number(
                  product.purchase_price ||
                  product.cost_price ||
                  0
                ),
              remainingStock
            });
          }

          /*
           * Coupon
           */
          const couponCode =
            cleanText(
              req.body.coupon_code ||
              req.body.couponCode ||
              "",
              100
            ).toUpperCase();

          if (couponCode) {
            const couponResult =
              await client.query(
                `
                SELECT *
                FROM coupons
                WHERE UPPER(code) = $1
                  AND is_active = TRUE
                  AND (
                    starts_at IS NULL
                    OR starts_at <= NOW()
                  )
                  AND (
                    expires_at IS NULL
                    OR expires_at >= NOW()
                  )
                FOR UPDATE
                `,
                [couponCode]
              );

            if (
              !couponResult.rowCount
            ) {
              throw createHttpError(
                400,
                "INVALID_COUPON",
                "الكوبون غير صالح أو منتهي"
              );
            }

            const coupon =
              couponResult.rows[0];

            const maxUses =
              Number(
                coupon.max_uses || 0
              );

            const usedCount =
              Number(
                coupon.used_count || 0
              );

            if (
              maxUses > 0 &&
              usedCount >= maxUses
            ) {
              throw createHttpError(
                400,
                "COUPON_EXHAUSTED",
                "انتهت استخدامات الكوبون"
              );
            }

            const maxUsesPerCustomer =
              Math.max(
                0,
                Number(
                  coupon.max_uses_per_customer ||
                  0
                ) || 0
              );

            if (maxUsesPerCustomer > 0) {
              let usageResult;

              if (userId) {
                usageResult =
                  await client.query(
                    `
                    SELECT COUNT(*)::int AS count
                    FROM orders
                    WHERE UPPER(COALESCE(coupon_code,'')) = $1
                      AND user_id = $2
                      AND COALESCE(LOWER(status),'') NOT IN ('cancelled','canceled','ملغي')
                    `,
                    [
                      couponCode,
                      userId
                    ]
                  );
              } else {
                const phoneKey =
                  String(
                    customerPhone || ""
                  ).replace(/\D/g, "");

                usageResult =
                  await client.query(
                    `
                    SELECT COUNT(*)::int AS count
                    FROM orders
                    WHERE UPPER(COALESCE(coupon_code,'')) = $1
                      AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g') = $2
                      AND COALESCE(LOWER(status),'') NOT IN ('cancelled','canceled','ملغي')
                    `,
                    [
                      couponCode,
                      phoneKey
                    ]
                  );
              }

              const customerUses =
                Number(
                  usageResult.rows[0]?.count ||
                  0
                );

              if (
                customerUses >=
                maxUsesPerCustomer
              ) {
                throw createHttpError(
                  400,
                  "COUPON_CUSTOMER_LIMIT",
                  "تم استخدام هذا الكوبون الحد الأقصى المسموح لهذا الزبون"
                );
              }
            }

            const minimumAmount =
              Number(
                coupon.minimum_amount ||
                coupon.min_order_amount ||
                coupon.min_order ||
                0
              );

            if (
              subtotal <
              minimumAmount
            ) {
              throw createHttpError(
                400,
                "COUPON_MINIMUM",
                `الحد الأدنى لاستخدام الكوبون هو ${minimumAmount}`
              );
            }

            const couponType =
              String(
                coupon.discount_type ||
                coupon.type ||
                "percent"
              ).toLowerCase();

            const couponValue =
              Number(
                coupon.discount_value ??
                coupon.value ??
                0
              );

            if (
              !["fixed", "percent"].includes(couponType) ||
              !Number.isFinite(couponValue) ||
              couponValue < 0 ||
              (couponType === "percent" && couponValue > 100)
            ) {
              throw createHttpError(
                400,
                "INVALID_COUPON_VALUE",
                "قيمة الكوبون غير صالحة"
              );
            }

            if (
              couponType ===
              "fixed"
            ) {
              couponDiscount =
                Math.min(
                  subtotal,
                  Math.max(
                    0,
                    couponValue
                  )
                );
            } else {
              couponDiscount =
                Math.min(
                  subtotal,
                  Math.max(
                    0,
                    subtotal *
                      (couponValue /
                        100)
                  )
                );
            }

            await client.query(
              `
              UPDATE coupons
              SET used_count =
                    COALESCE(
                      used_count,
                      0
                    ) + 1
              WHERE id = $1
              `,
              [coupon.id]
            );
          }

          /*
           * Visa discount
           */
          let visaDiscountPercent =
            0;

          if (
            paymentMethod ===
            "visa"
          ) {
            visaDiscountPercent =
              Number(
                await getSetting(
                  "visa_discount_percent",
                  0,
                  client
                )
              ) || 0;

            visaDiscountPercent =
              Math.max(
                0,
                Math.min(
                  100,
                  visaDiscountPercent
                )
              );

            const discountBase =
              Math.max(
                0,
                subtotal -
                  couponDiscount
              );

            visaDiscount =
              discountBase *
              (visaDiscountPercent /
                100);
          }

          const shippingRegion = cleanText(req.body.shippingRegion || req.body.shipping_region || "westbank", 30).toLowerCase();
          const shippingFeesRaw = await getSetting(
            "shipping_fees",
            { westbank: 20, jerusalem: 35, inside: 70 },
            client
          );
          const shippingFees = {
            westbank: Math.max(0, money(shippingFeesRaw?.westbank ?? 20)),
            jerusalem: Math.max(0, money(shippingFeesRaw?.jerusalem ?? 35)),
            inside: Math.max(0, money(shippingFeesRaw?.inside ?? 70))
          };
          if (!Object.prototype.hasOwnProperty.call(shippingFees, shippingRegion)) {
            throw createHttpError(400,"BAD_SHIPPING_REGION","منطقة التوصيل غير صالحة");
          }
          const shippingDiscountsRaw = await getSetting("shipping_discount_percentages",{westbank:0,jerusalem:0,inside:0},client);
          const shippingDiscountPercent = Math.max(0,Math.min(100,Number(shippingDiscountsRaw?.[shippingRegion])||0));
          const shippingBaseCost = shippingFees[shippingRegion];
          const shippingDiscountAmount = money(shippingBaseCost * shippingDiscountPercent / 100);
          const shippingWaived = req.body.shippingWaived === true && req.user && ["owner","admin"].includes(String(req.user.role||"").toLowerCase());
          const shipping = shippingWaived ? 0 : money(Math.max(0,shippingBaseCost-shippingDiscountAmount));

          /* Packaging price is authoritative on the server. The browser only sends option ids per item. */
          const packagingOptionsRaw = await getSetting("packaging_options", [], client);
          const packagingOptions = Array.isArray(packagingOptionsRaw) ? packagingOptionsRaw : [];
          const packagingById = new Map(packagingOptions.filter(x=>x&&x.active!==false&&x.id!=null).map(x=>[String(x.id),x]));
          let packaging = 0;
          for (let idx=0; idx<normalizedItems.length; idx++) {
            const requestedId = cleanText(req.body.items?.[idx]?.packagingId || req.body.items?.[idx]?.packaging_id || "",100);
            if (!requestedId) continue;
            const option = packagingById.get(String(requestedId));
            if (!option) throw createHttpError(400,"BAD_PACKAGING","خيار التغليف غير صالح أو غير فعال");
            packaging += Math.max(0,money(option.price||0)) * normalizedItems[idx].quantity;
          }
          packaging = money(packaging);

          const requestedPoints = Math.max(0, integer(req.body.pointsToRedeem ?? req.body.points_to_redeem ?? 0, 0));
          const loyaltyEnabled = (await getSetting("loyalty_enabled", true, client)) !== false;
          const redeemEnabled = (await getSetting("loyalty_redeem_enabled", true, client)) !== false;
          const pointValue = Math.max(0, Number(await getSetting("loyalty_point_value", 0.1, client)) || 0);
          let pointsRedeemed = 0;
          let loyaltyDiscount = 0;
          if (userId && requestedPoints > 0 && loyaltyEnabled && redeemEnabled) {
            const ur = await client.query("SELECT loyalty_points FROM users WHERE id=$1 FOR UPDATE",[userId]);
            const balance = Number(ur.rows[0]?.loyalty_points || 0);
            pointsRedeemed = Math.min(requestedPoints, balance);
            loyaltyDiscount = Math.min(pointsRedeemed * pointValue, Math.max(0, subtotal - couponDiscount - visaDiscount));
          }

          const total = Math.max(0, subtotal - couponDiscount - visaDiscount - loyaltyDiscount + shipping + packaging);

          const pointsRate = Math.max(0, Number(await getSetting("loyalty_points_per_currency", 1, client)) || 0);
          const earningModeRaw = String(await getSetting("loyalty_earning_mode", "amount", client) || "amount").toLowerCase();
          const earningMode = earningModeRaw === "order" ? "order" : "amount";
          const pointsPerOrder = Math.max(0, integer(await getSetting("loyalty_points_per_order", 10, client), 10));
          const pointsBase = Math.max(0, subtotal - couponDiscount - visaDiscount - loyaltyDiscount);
          const loyaltyPoints = userId && loyaltyEnabled
            ? (earningMode === "order" ? pointsPerOrder : calculateLoyaltyPoints(pointsBase, pointsRate))
            : 0;

          /*
           * Snapshot data داخل الطلب.
           */
          const orderResult =
            await client.query(
              `
              INSERT INTO orders (
                user_id,
                customer_name,
                customer_phone,
                shipping_address,
                notes,
                subtotal,
                coupon_discount,
                coupon_code,
                shipping_cost,
                shipping_region,
                shipping_waived,
                shipping_base_cost,
                shipping_discount_percent,
                shipping_discount_amount,
                packaging_cost,
                loyalty_discount,
                points_redeemed,
                total,
                payment_method,
                visa_discount,
                loyalty_points_awarded,
                loyalty_points_reversed,
                status,
                created_at,
                updated_at
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21,
                FALSE,
                'pending',
                NOW(),
                NOW()
              )
              RETURNING *
              `,
              [
                userId,
                customerName,
                customerPhone,
                shippingAddress,
                notes,
                subtotal,
                couponDiscount,
                couponCode || null,
                shipping,
                shippingRegion,
                shippingWaived,
                shippingBaseCost,
                shippingDiscountPercent,
                shippingDiscountAmount,
                packaging,
                loyaltyDiscount,
                pointsRedeemed,
                total,
                paymentMethod,
                visaDiscount,
                loyaltyPoints
              ]
            );

          const order =
            orderResult.rows[0];

          if (pointsRedeemed > 0) {
            await client.query(`UPDATE users SET loyalty_points=GREATEST(0,COALESCE(loyalty_points,0)-$1),updated_at=NOW() WHERE id=$2`,[pointsRedeemed,userId]);
            await client.query(`INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note,created_at) VALUES($1,$2,$3,'redeem',$4,NOW())`,[userId,order.id,-pointsRedeemed,`استبدال نقاط في الطلب #${order.id}`]);
          }

          for (
            const item of normalizedItems
          ) {
            await client.query(
              `
              INSERT INTO order_items (
                order_id,
                product_id,
                variant_id,
                product_name,
                variant_name,
                image,
                quantity,
                unit_price,
                total,
                purchase_price,
                created_at
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                NOW()
              )
              `,
              [
                order.id,
                item.productId,
                item.variantId,
                item.productName,
                item.variantName,
                item.image,
                item.quantity,
                item.unitPrice,
                item.total,
                item.purchasePrice
              ]
            );
          }

          /*
           * Loyalty ledger:
           * القيد الفريد يمنع منح النقاط مرتين
           * لنفس الطلب.
           */
          if (
            loyaltyPoints > 0
          ) {
            const ledgerResult =
              await client.query(
                `
                INSERT INTO loyalty_points_transactions (
                  user_id,
                  order_id,
                  points,
                  transaction_type,
                  note,
                  created_at
                )
                VALUES (
                  $1,
                  $2,
                  $3,
                  'order_award',
                  $4,
                  NOW()
                )
                ON CONFLICT DO NOTHING
                RETURNING id
                `,
                [
                  userId,
                  order.id,
                  loyaltyPoints,
                  `نقاط طلب #${order.id}`
                ]
              );

            if (
              ledgerResult.rowCount
            ) {
              await client.query(
                `
                UPDATE users
                SET loyalty_points =
                  COALESCE(
                    loyalty_points,
                    0
                  ) + $1,
                  updated_at = NOW()
                WHERE id = $2
                `,
                [
                  loyaltyPoints,
                  userId
                ]
              );
            }
          }

          for (const item of normalizedItems) {
            await client.query(
              `
              INSERT INTO inventory_movements (
                product_id,
                variant_id,
                quantity_change,
                reason,
                order_id,
                created_at
              )
              VALUES ($1,$2,$3,$4,$5,NOW())
              `,
              [
                item.productId,
                item.variantId,
                -item.quantity,
                `sale: ${item.productName || ""}`,
                order.id
              ]
            );
          }

          return {
            order,
            items:
              normalizedItems,
            couponDiscount,
            visaDiscount,
            shipping,
            packaging,
            total,
            loyaltyPoints
          };
        });

      return res.status(201).json({
        ok: true,
        message:
          "تم إنشاء الطلب بنجاح",
        order: result.order,
        items: result.items,
        subtotal:
          Number(
            result.order.subtotal
          ),
        couponDiscount:
          Number(
            result.couponDiscount
          ),
        visaDiscount:
          Number(
            result.visaDiscount
          ),
        shipping:
          Number(
            result.shipping
          ),
        packaging:
          Number(
            result.packaging
          ),
        total:
          Number(
            result.total
          ),
        paymentMethod,
        loyaltyPoints:
          Number(
            result.loyaltyPoints
          )
      });
    } catch (error) {
      console.error(
        "[ORDERS POST]",
        error
      );

      if (
        error.status &&
        error.message
      ) {
        return res.status(
          error.status
        ).json({
          ok: false,
          code:
            error.code ||
            "ORDER_ERROR",
          message:
            error.message
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء الطلب حالياً"
      });
    }
  }
);


/* =========================================================
   USER ORDERS
   ========================================================= */

app.get(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const ordersResult =
        await db(
          `
          SELECT
            o.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'productId', oi.product_id,
                  'variantId', oi.variant_id,
                  'productName', oi.product_name,
                  'variantName', oi.variant_name,
                  'image', oi.image,
                  'quantity', oi.quantity,
                  'unitPrice', oi.unit_price,
                  'total', oi.total,
                  'purchasePrice',
                    oi.purchase_price,
                  'isGift',
                    COALESCE(oi.is_gift,FALSE)
                )
                ORDER BY oi.id
              )
              FILTER (
                WHERE oi.id IS NOT NULL
              ),
              '[]'::json
            ) AS items
          FROM orders o
          LEFT JOIN order_items oi
            ON oi.order_id = o.id
          WHERE o.user_id = $1
          GROUP BY o.id
          ORDER BY
            o.created_at DESC
          `,
          [req.user.id]
        );

      return res.json({
        ok: true,
        orders:
          ordersResult.rows
      });
    } catch (error) {
      console.error(
        "[ORDERS GET]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الطلبات"
      });
    }
  }
);


/* =========================================================
   SINGLE USER ORDER
   ========================================================= */

app.get(
  "/api/orders/:id",
  requireAuth,
  async (req, res) => {
    const orderId =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(
        orderId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم الطلب غير صالح"
      });
    }

    try {
      const orderResult =
        await db(
          `
          SELECT *
          FROM orders
          WHERE id = $1
            AND user_id = $2
          `,
          [
            orderId,
            req.user.id
          ]
        );

      if (
        !orderResult.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "الطلب غير موجود"
        });
      }

      const itemsResult =
        await db(
          `
          SELECT *
          FROM order_items
          WHERE order_id = $1
          ORDER BY id
          `,
          [orderId]
        );

      const returnsResult=await db(
        `SELECT id,order_item_id,request_type,quantity,reason,status,admin_note,
                replacement_product_name,replacement_variant_name,replacement_unit_price,
                fee_payer,service_fee,store_delivery_cost,store_fault,price_difference,
                exchange_settlement_direction,exchange_settlement_amount,
                exchange_settlement_method,exchange_settlement_status,
                return_refund_amount,return_refund_status,return_refund_method,return_refund_reference,return_refund_settled_at,
                completed_at,created_at
         FROM return_requests
         WHERE order_id=$1 AND user_id=$2
         ORDER BY created_at DESC,id DESC`,
        [orderId,req.user.id]
      );

      return res.json({
        ok: true,
        order:
          orderResult.rows[0],
        items:
          itemsResult.rows,
        returns:
          returnsResult.rows
      });
    } catch (error) {
      console.error(
        "[ORDER GET]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الطلب"
      });
    }
  }
);


/* =========================================================
   RETURNS / EXCHANGES — 12 hours from delivery
   ========================================================= */

app.post("/api/returns", requireAuth, async (req,res)=>{
  const orderId=integer(req.body.orderId,NaN), orderItemId=integer(req.body.orderItemId,NaN);
  const quantity=integer(req.body.quantity,NaN);
  const requestType=cleanText(req.body.requestType||"").toLowerCase();
  const reasonCode=cleanText(req.body.reasonCode||"").toLowerCase();
  const reason=cleanText(req.body.reason||"");
  const notes=cleanText(req.body.notes||"");
  const images=Array.isArray(req.body.images)?req.body.images.slice(0,5):[];
  if(images.some(value=>!require("./security-policy").safeImageUrl(value)))return res.status(400).json({ok:false,message:"رابط صورة الإرجاع غير صالح"});
  if(!Number.isFinite(orderId)||!Number.isFinite(orderItemId)||!Number.isFinite(quantity)||quantity<1)
    return res.status(400).json({ok:false,message:"بيانات طلب الإرجاع/الاستبدال غير مكتملة"});
  if(!["return","exchange"].includes(requestType))
    return res.status(400).json({ok:false,message:"اختاري إرجاع أو استبدال"});
  const allowedReasonCodes=["store_damaged","store_wrong_item","store_missing_item","customer_size_color","customer_changed_mind","other"];
  if(!allowedReasonCodes.includes(reasonCode))return res.status(400).json({ok:false,message:"اختاري سبب الإرجاع/الاستبدال من القائمة"});
  if(!reason)return res.status(400).json({ok:false,message:"سبب الطلب مطلوب"});
  try{
    const result=await transaction(async client=>{
      const o=await client.query(`SELECT * FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE`,[orderId,req.user.id]);
      if(!o.rowCount)throw createHttpError(404,"ORDER_NOT_FOUND","الطلب غير موجود");
      const order=o.rows[0];
      if(!["delivered","completed"].includes(String(order.status||"").toLowerCase()))
        throw createHttpError(400,"NOT_DELIVERED","يمكن تقديم الإرجاع أو الاستبدال بعد استلام الطلب فقط");
      const deliveredAt=order.delivered_at||order.updated_at;
      if(!deliveredAt || Date.now()-new Date(deliveredAt).getTime()>12*60*60*1000)
        throw createHttpError(400,"RETURN_WINDOW_EXPIRED","انتهت مهلة الإرجاع/الاستبدال (12 ساعة من الاستلام)");
      const item=await client.query(`SELECT * FROM order_items WHERE id=$1 AND order_id=$2`,[orderItemId,orderId]);
      if(!item.rowCount)throw createHttpError(404,"ITEM_NOT_FOUND","المنتج غير موجود في هذا الطلب");
      if(item.rows[0].is_gift===true)throw createHttpError(400,"GIFT_NOT_RETURNABLE","الهدية المجانية لا تدخل ضمن الإرجاع أو الاستبدال");
      const purchasedQty=Number(item.rows[0].quantity||0);
      const reserved=await client.query(
        `SELECT COALESCE(SUM(quantity),0)::int AS qty
         FROM return_requests
         WHERE order_item_id=$1 AND status IN ('pending','approved','completed')`,
        [orderItemId]
      );
      const alreadyRequested=Math.max(0,Number(reserved.rows[0]?.qty||0));
      const remainingQty=Math.max(0,purchasedQty-alreadyRequested);
      if(quantity>remainingQty)throw createHttpError(400,"BAD_QTY",remainingQty>0?`الكمية المتاحة للإرجاع/الاستبدال هي ${remainingQty} فقط`:"تم استخدام كامل كمية هذا المنتج في طلبات إرجاع/استبدال سابقة");
      const ins=await client.query(`INSERT INTO return_requests(order_id,user_id,order_item_id,request_type,quantity,reason_code,reason,notes,images) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
        [orderId,req.user.id,orderItemId,requestType,quantity,reasonCode,reason,notes,JSON.stringify(images)]);
      return ins.rows[0];
    });
    res.status(201).json({ok:true,request:result,message:"تم إرسال طلبك للمراجعة"});
  }catch(error){console.error("[RETURN CREATE]",error);res.status(error.status||500).json({ok:false,message:error.message||"تعذر إرسال الطلب"});}
});

app.get("/api/returns",requireAuth,async(req,res)=>{
  try{const r=await db(`SELECT rr.*,oi.product_name,oi.variant_name,oi.image FROM return_requests rr JOIN order_items oi ON oi.id=rr.order_item_id WHERE rr.user_id=$1 ORDER BY rr.created_at DESC`,[req.user.id]);res.json({ok:true,requests:r.rows});}
  catch(e){console.error("[RETURNS GET]",e);res.status(500).json({ok:false,message:"تعذر تحميل طلبات الإرجاع"});}
});

app.get("/api/admin/returns",requireAdmin,async(req,res)=>{
  try{const r=await db(`SELECT rr.*,o.customer_name,o.customer_phone,oi.product_name,oi.variant_name,oi.image,oi.product_id,oi.variant_id FROM return_requests rr JOIN orders o ON o.id=rr.order_id JOIN order_items oi ON oi.id=rr.order_item_id ORDER BY rr.created_at DESC`);res.json({ok:true,requests:r.rows});}
  catch(e){console.error("[ADMIN RETURNS]",e);res.status(500).json({ok:false,message:"تعذر تحميل طلبات الإرجاع"});}
});

app.patch("/api/admin/returns/:id",requireAdmin,async(req,res)=>{
  const id=integer(req.params.id,NaN),status=cleanText(req.body.status||"").toLowerCase(),adminNote=cleanText(req.body.adminNote||"");
  if(!Number.isFinite(id)||!["pending","approved","rejected","completed"].includes(status))return res.status(400).json({ok:false,message:"بيانات الحالة غير صالحة"});
  try{
    const result=await transaction(async client=>{
      const q=await client.query(`SELECT rr.*,oi.product_id,oi.variant_id,oi.unit_price,oi.purchase_price,o.subtotal,o.coupon_discount,o.visa_discount,o.loyalty_discount,o.coupon_code,o.loyalty_points_awarded,o.points_redeemed,o.user_id AS order_user_id FROM return_requests rr JOIN order_items oi ON oi.id=rr.order_item_id JOIN orders o ON o.id=rr.order_id WHERE rr.id=$1 FOR UPDATE`,[id]);
      if(!q.rowCount)throw createHttpError(404,"RETURN_NOT_FOUND","الطلب غير موجود");
      const rr=q.rows[0], completing=status==="completed"&&rr.status!=="completed";
      if(String(rr.status||"").toLowerCase()==="completed" && status!=="completed")
        throw createHttpError(409,"RETURN_COMPLETED_FINAL","طلب الإرجاع/الاستبدال المكتمل نهائي ولا يمكن تغيير حالته بعد تنفيذ المخزون");
      const canonicalStoreFaultCodes=new Set(["store_damaged","store_wrong_item","store_missing_item"]);
      const storeFault=canonicalStoreFaultCodes.has(String(rr.reason_code||"").toLowerCase());
      let requestedFeePayer=cleanText(req.body.feePayer??rr.fee_payer??"customer",20).toLowerCase();
      if(storeFault)requestedFeePayer="store";
      if(!["customer","store","waived"].includes(requestedFeePayer))throw createHttpError(400,"BAD_FEE_PAYER","حددي من يتحمل رسوم الإرجاع/الاستبدال");
      const serviceFee=requestedFeePayer==="customer"?Math.max(0,money(req.body.serviceFee??rr.service_fee??0)):0;
      const storeDeliveryCost=requestedFeePayer==="store"?Math.max(0,money(req.body.storeDeliveryCost??rr.store_delivery_cost??0)):0;
      const feeReason=cleanText(req.body.feeReason??rr.fee_reason??"",500);
      let priceDifference=Number(rr.price_difference||0);
      let replacementProductId=rr.replacement_product_id,replacementVariantId=rr.replacement_variant_id,replacementProductName=rr.replacement_product_name,replacementVariantName=rr.replacement_variant_name,replacementUnitPrice=rr.replacement_unit_price;
      if(rr.request_type==="exchange" && ["approved","completed"].includes(status)){
        replacementProductId=integer(req.body.replacementProductId??replacementProductId,NaN);
        replacementVariantId=req.body.replacementVariantId?integer(req.body.replacementVariantId,NaN):null;
        if(!Number.isFinite(replacementProductId))throw createHttpError(400,"EXCHANGE_REPLACEMENT_REQUIRED","حددي المنتج البديل");
        const pq=await client.query("SELECT id,name,price,stock FROM products WHERE id=$1 FOR UPDATE",[replacementProductId]);
        if(!pq.rowCount)throw createHttpError(404,"REPLACEMENT_NOT_FOUND","المنتج البديل غير موجود");
        const rp=pq.rows[0]; replacementProductName=rp.name; replacementUnitPrice=Number(rp.price||0); replacementVariantName=null;
        if(replacementVariantId){
          const vq=await client.query("SELECT id,product_id,color,size,price,stock FROM product_variants WHERE id=$1 AND product_id=$2 AND is_active=TRUE FOR UPDATE",[replacementVariantId,replacementProductId]);
          if(!vq.rowCount)throw createHttpError(400,"BAD_REPLACEMENT_VARIANT","اللون/الخيار البديل غير صالح");
          const rv=vq.rows[0];replacementVariantName=[rv.color,rv.size].filter(Boolean).join(" / ");replacementUnitPrice=Number(rv.price??rp.price??0);
          if(completing&&Number(rv.stock||0)<Number(rr.quantity))throw createHttpError(409,"REPLACEMENT_OUT_OF_STOCK","الكمية المطلوبة من البديل غير متوفرة");
          priceDifference=money((Number(replacementUnitPrice||0)-Number(rr.unit_price||0))*Number(rr.quantity||1));
        }else{
          priceDifference=money((Number(replacementUnitPrice||0)-Number(rr.unit_price||0))*Number(rr.quantity||1));
          if(completing&&Number(rp.stock||0)<Number(rr.quantity))throw createHttpError(409,"REPLACEMENT_OUT_OF_STOCK","الكمية المطلوبة من البديل غير متوفرة");
        }
      }
      let returnedMerchandiseValue=Number(rr.returned_merchandise_value||0);
      let returnedCostValue=Number(rr.returned_cost_value||0);
      let netSettlement=Number(rr.net_settlement||0);
      let exchangeSettlementDirection=rr.exchange_settlement_direction||null;
      let exchangeSettlementAmount=Math.max(0,Number(rr.exchange_settlement_amount||0));
      let exchangeSettlementMethod=cleanText(req.body.exchangeSettlementMethod??rr.exchange_settlement_method??"",50)||null;
      let exchangeSettlementStatus=cleanText(req.body.exchangeSettlementStatus??rr.exchange_settlement_status??"not_required",30).toLowerCase();
      let returnRefundAmount=Math.max(0,Number(rr.return_refund_amount||0));
      let returnRefundStatus=cleanText(req.body.returnRefundStatus??rr.return_refund_status??"not_required",30).toLowerCase();
      let returnRefundMethod=cleanText(req.body.returnRefundMethod??rr.return_refund_method??"",50)||null;
      let returnRefundReference=cleanText(req.body.returnRefundReference??rr.return_refund_reference??"",120)||null;
      if(rr.request_type==="exchange"){
        exchangeSettlementAmount=money(Math.abs(priceDifference));
        exchangeSettlementDirection=priceDifference>0?"customer_to_store":priceDifference<0?"store_to_customer":"none";
        if(exchangeSettlementDirection==="none"){
          exchangeSettlementStatus="not_required";
          exchangeSettlementMethod=null;
        }else{
          if(!["pending","settled"].includes(exchangeSettlementStatus))throw createHttpError(400,"BAD_EXCHANGE_SETTLEMENT_STATUS","حالة تسوية فرق الاستبدال غير صالحة");
          if(exchangeSettlementStatus==="settled"&&!exchangeSettlementMethod)throw createHttpError(400,"EXCHANGE_SETTLEMENT_METHOD_REQUIRED","حددي طريقة تسوية فرق سعر الاستبدال");
          if(completing&&exchangeSettlementStatus!=="settled")throw createHttpError(409,"EXCHANGE_SETTLEMENT_PENDING","يجب تسوية فرق سعر الاستبدال قبل إكمال العملية");
        }
      }
      if(completing){
        returnedMerchandiseValue=money(Number(rr.unit_price||0)*Number(rr.quantity||0));
        returnedCostValue=money(Number(rr.purchase_price||0)*Number(rr.quantity||0));
        if(rr.request_type==="return"){
          const subtotal=Math.max(0,Number(rr.subtotal||0));
          const previousReturnTotals=await client.query(
            `SELECT
               COALESCE(SUM(returned_merchandise_value),0) AS gross,
               COALESCE(SUM(allocated_coupon_discount),0) AS coupon,
               COALESCE(SUM(allocated_visa_discount),0) AS visa,
               COALESCE(SUM(allocated_loyalty_discount),0) AS loyalty,
               COALESCE(SUM(loyalty_award_reversed),0) AS award_reversed,
               COALESCE(SUM(loyalty_redeem_refunded),0) AS redeem_refunded
             FROM return_requests
             WHERE order_id=$1
               AND request_type='return'
               AND status='completed'`,
            [rr.order_id]
          );
          const previous=previousReturnTotals.rows[0]||{};
          const previousGross=Number(previous.gross||0);
          const cumulativeGross=Math.min(subtotal,previousGross+returnedMerchandiseValue);
          const cumulativeRatio=subtotal>0?Math.min(1,cumulativeGross/subtotal):0;
          const targetCoupon=money(Number(rr.coupon_discount||0)*cumulativeRatio);
          const targetVisa=money(Number(rr.visa_discount||0)*cumulativeRatio);
          const targetLoyalty=money(Number(rr.loyalty_discount||0)*cumulativeRatio);
          rr.allocated_coupon_discount=money(Math.max(0,targetCoupon-Number(previous.coupon||0)));
          rr.allocated_visa_discount=money(Math.max(0,targetVisa-Number(previous.visa||0)));
          rr.allocated_loyalty_discount=money(Math.max(0,targetLoyalty-Number(previous.loyalty||0)));
          rr.refundable_cash_value=money(Math.max(0,returnedMerchandiseValue-rr.allocated_coupon_discount-rr.allocated_visa_discount-rr.allocated_loyalty_discount));
          const targetAwardReversal=Math.min(Number(rr.loyalty_points_awarded||0),Math.round(Number(rr.loyalty_points_awarded||0)*cumulativeRatio));
          const targetRedeemRefund=Math.min(Number(rr.points_redeemed||0),Math.round(Number(rr.points_redeemed||0)*cumulativeRatio));
          const awardReversal=Math.max(0,targetAwardReversal-Number(previous.award_reversed||0));
          const redeemRefund=Math.max(0,targetRedeemRefund-Number(previous.redeem_refunded||0));
          if(awardReversal>0){
            const note=`إرجاع نقاط مكتسبة — طلب إرجاع #${rr.id}`;
            const lr=await client.query(`INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note,created_at) VALUES($1,$2,$3,'return_award_reversal',$4,NOW()) ON CONFLICT DO NOTHING RETURNING id`,[rr.order_user_id,rr.order_id,-awardReversal,note]);
            if(lr.rowCount)await client.query("UPDATE users SET loyalty_points=GREATEST(0,COALESCE(loyalty_points,0)-$1),updated_at=NOW() WHERE id=$2",[awardReversal,rr.order_user_id]);
          }
          if(redeemRefund>0){
            const note=`إعادة نقاط مصروفة — طلب إرجاع #${rr.id}`;
            const lr=await client.query(`INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note,created_at) VALUES($1,$2,$3,'return_redeem_refund',$4,NOW()) ON CONFLICT DO NOTHING RETURNING id`,[rr.order_user_id,rr.order_id,redeemRefund,note]);
            if(lr.rowCount)await client.query("UPDATE users SET loyalty_points=COALESCE(loyalty_points,0)+$1,updated_at=NOW() WHERE id=$2",[redeemRefund,rr.order_user_id]);
          }
          rr.loyalty_award_reversed=awardReversal;
          rr.loyalty_redeem_refunded=redeemRefund;
          const returnedTotals=await client.query(
            `SELECT COALESCE(SUM(returned_merchandise_value),0) AS value
             FROM return_requests
             WHERE order_id=$1 AND request_type='return' AND status='completed'`,
            [rr.order_id]
          );
          const cumulativeReturned=Number(returnedTotals.rows[0]?.value||0)+returnedMerchandiseValue;
          if(rr.coupon_code && !rr.coupon_released && cumulativeReturned>=subtotal){
            await client.query("UPDATE coupons SET used_count=GREATEST(0,COALESCE(used_count,0)-1) WHERE UPPER(code)=UPPER($1)",[rr.coupon_code]);
            rr.coupon_released=true;
          }
        }
        netSettlement=rr.request_type==="return"
          ? money(-Number(rr.refundable_cash_value)+serviceFee)
          : money(priceDifference+serviceFee);
        if(rr.request_type==="return"){
          if(rr.variant_id)await client.query("UPDATE product_variants SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[rr.quantity,rr.variant_id]);
          else await client.query("UPDATE products SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[rr.quantity,rr.product_id]);
          await client.query("INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at) VALUES($1,$2,$3,'customer_return',$4,NOW())",[rr.product_id,rr.variant_id,rr.quantity,rr.order_id]);
        }else{
          if(rr.variant_id)await client.query("UPDATE product_variants SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[rr.quantity,rr.variant_id]);
          else await client.query("UPDATE products SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[rr.quantity,rr.product_id]);
          await client.query("INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at) VALUES($1,$2,$3,'customer_exchange_return',$4,NOW())",[rr.product_id,rr.variant_id,rr.quantity,rr.order_id]);
          if(replacementVariantId)await client.query("UPDATE product_variants SET stock=stock-$1,updated_at=NOW() WHERE id=$2",[rr.quantity,replacementVariantId]);
          else await client.query("UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2",[rr.quantity,replacementProductId]);
          await client.query("INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at) VALUES($1,$2,$3,'customer_exchange_out',$4,NOW())",[replacementProductId,replacementVariantId,-Number(rr.quantity),rr.order_id]);
        }
      }
      if(rr.request_type==="return"){
        const refundableCash=Number(rr.refundable_cash_value||0);
        returnRefundAmount=money(Math.max(0,refundableCash-serviceFee));
        if(returnRefundAmount<=0){
          returnRefundStatus="not_required";
          returnRefundMethod=null;
          returnRefundReference=null;
        }else{
          if(returnRefundStatus==="not_required")returnRefundStatus="pending";
          if(!["pending","settled"].includes(returnRefundStatus))throw createHttpError(400,"BAD_RETURN_REFUND_STATUS","حالة استرداد مبلغ الإرجاع غير صالحة");
          if(returnRefundStatus==="settled"){
            if(!["cash","transfer","visa","store_credit"].includes(String(returnRefundMethod||"")))throw createHttpError(400,"RETURN_REFUND_METHOD_REQUIRED","حددي طريقة رد المبلغ للزبون");
            if(["transfer","visa","store_credit"].includes(returnRefundMethod)&&!returnRefundReference)throw createHttpError(400,"RETURN_REFUND_REFERENCE_REQUIRED","أدخلي مرجع تسوية مبلغ الإرجاع");
          }
        }
      }
      const u=await client.query(`UPDATE return_requests SET status=$1,admin_note=$2,replacement_product_id=$3,replacement_variant_id=$4,replacement_product_name=$5,replacement_variant_name=$6,replacement_unit_price=$7,fee_payer=$8,service_fee=$9,fee_reason=$10,price_difference=$11,returned_merchandise_value=$12,returned_cost_value=$13,net_settlement=$14,store_delivery_cost=$15,store_fault=$16,loyalty_award_reversed=$17,loyalty_redeem_refunded=$18,coupon_released=$19,exchange_settlement_direction=$20,exchange_settlement_amount=$21,exchange_settlement_method=$22,exchange_settlement_status=$23,allocated_coupon_discount=$24,allocated_visa_discount=$25,allocated_loyalty_discount=$26,refundable_cash_value=$27,return_refund_amount=$28,return_refund_status=$29,return_refund_method=$30,return_refund_reference=$31,exchange_settled_at=CASE WHEN $23='settled' AND exchange_settled_at IS NULL THEN NOW() ELSE exchange_settled_at END,return_refund_settled_at=CASE WHEN $29='settled' AND return_refund_settled_at IS NULL THEN NOW() ELSE return_refund_settled_at END,completed_at=CASE WHEN $1='completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END,updated_at=NOW() WHERE id=$32 RETURNING *`,[status,adminNote,replacementProductId,replacementVariantId,replacementProductName,replacementVariantName,replacementUnitPrice,requestedFeePayer,serviceFee,feeReason,priceDifference,returnedMerchandiseValue,returnedCostValue,netSettlement,storeDeliveryCost,storeFault,Number(rr.loyalty_award_reversed||0),Number(rr.loyalty_redeem_refunded||0),rr.coupon_released===true,exchangeSettlementDirection,exchangeSettlementAmount,exchangeSettlementMethod,exchangeSettlementStatus,Number(rr.allocated_coupon_discount||0),Number(rr.allocated_visa_discount||0),Number(rr.allocated_loyalty_discount||0),Number(rr.refundable_cash_value||0),returnRefundAmount,returnRefundStatus,returnRefundMethod,returnRefundReference,id]);return u.rows[0];
    });
    res.json({ok:true,request:result});
  }catch(e){console.error("[RETURN STATUS]",e);res.status(e.status||500).json({ok:false,message:e.message||"تعذر تحديث الطلب"});}
});

/* =========================================================
   ADMIN ORDERS
   ========================================================= */

app.get(
  "/api/admin/orders",
  requireAdmin,
  async (req, res) => {
    try {
      const status =
        cleanText(
          req.query.status ||
          "",
          50
        );

      const params = [];
      let where = "";

      if (status) {
        params.push(status);
        where =
          `WHERE o.status = $${params.length}`;
      }

      const result =
        await db(
          `
          SELECT
            o.*,
            u.email AS user_email,
            u.phone AS user_phone,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'productId', oi.product_id,
                  'variantId', oi.variant_id,
                  'productName', oi.product_name,
                  'variantName', oi.variant_name,
                  'image', oi.image,
                  'quantity', oi.quantity,
                  'unitPrice', oi.unit_price,
                  'total', oi.total,
                  'purchasePrice',
                    oi.purchase_price,
                  'isGift',
                    COALESCE(oi.is_gift,FALSE)
                )
                ORDER BY oi.id
              )
              FILTER (
                WHERE oi.id IS NOT NULL
              ),
              '[]'::json
            ) AS items
          FROM orders o
          LEFT JOIN users u
            ON u.id = o.user_id
          LEFT JOIN order_items oi
            ON oi.order_id = o.id
          ${where}
          GROUP BY
            o.id,
            u.email,
            u.phone
          ORDER BY
            o.created_at DESC
          `,
          params
        );

      return res.json({
        ok: true,
        orders:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN ORDERS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الطلبات"
      });
    }
  }
);


/* =========================================================
   ADMIN ORDER DETAILS
   ========================================================= */

app.get(
  "/api/admin/orders/:id",
  requireAdmin,
  async (req, res) => {
    const orderId =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(
        orderId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم الطلب غير صالح"
      });
    }

    try {
      const orderResult =
        await db(
          `
          SELECT
            o.*,
            u.name AS user_name,
            u.email AS user_email,
            u.phone AS user_phone
          FROM orders o
          LEFT JOIN users u
            ON u.id = o.user_id
          WHERE o.id = $1
          `,
          [orderId]
        );

      if (
        !orderResult.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "الطلب غير موجود"
        });
      }

      const itemsResult =
        await db(
          `
          SELECT *
          FROM order_items
          WHERE order_id = $1
          ORDER BY id
          `,
          [orderId]
        );

      return res.json({
        ok: true,
        order:
          orderResult.rows[0],
        items:
          itemsResult.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN ORDER DETAILS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل تفاصيل الطلب"
      });
    }
  }
);


/* =========================================================
   ADMIN CHANGE ORDER STATUS
   ========================================================= */

app.patch(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {
    const orderId =
      integer(
        req.params.id,
        NaN
      );

    const newStatus =
      cleanText(
        req.body.status ||
        "",
        50
      ).toLowerCase();

    const cancellationSource =
      cleanText(
        req.body.cancelSource ||
        req.body.cancel_source ||
        "",
        30
      ).toLowerCase();

    const cancellationReason =
      cleanText(
        req.body.cancellationReason ||
        req.body.cancellation_reason ||
        "",
        500
      );

    const allowedStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "completed",
      "cancelled"
    ];

    if (
      !Number.isFinite(
        orderId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم الطلب غير صالح"
      });
    }

    if (
      !allowedStatuses.includes(
        newStatus
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "حالة الطلب غير صالحة"
      });
    }

    try {
      const result =
        await transaction(
          async (client) => {
            const orderResult =
              await client.query(
                `
                SELECT *
                FROM orders
                WHERE id = $1
                FOR UPDATE
                `,
                [orderId]
              );

            if (
              !orderResult.rowCount
            ) {
              throw createHttpError(
                404,
                "ORDER_NOT_FOUND",
                "الطلب غير موجود"
              );
            }

            const order =
              orderResult.rows[0];

            const oldStatus =
              String(
                order.status || ""
              ).toLowerCase();

            if (
              oldStatus === "cancelled" &&
              newStatus !== "cancelled"
            ) {
              throw createHttpError(
                409,
                "CANCELLED_ORDER_FINAL",
                "الطلب الملغي نهائي ولا يمكن إعادته لحالة نشطة لأن المخزون والنقاط تمت إعادتهما"
              );
            }

            /*
             * الإلغاء يحدث مرة واحدة فقط.
             */
            const isNewCancellation =
              newStatus ===
                "cancelled" &&
              oldStatus !==
                "cancelled";

            let autoBlockedCustomer = null;

            if (
              isNewCancellation
            ) {
              if(!["customer","store","admin"].includes(cancellationSource)){
                throw createHttpError(
                  400,
                  "CANCELLATION_SOURCE_REQUIRED",
                  "حددي مصدر الإلغاء: الزبون أو المتجر أو الإدارة"
                );
              }

              const itemsResult =
                await client.query(
                  `
                  SELECT *
                  FROM order_items
                  WHERE order_id = $1
                  FOR UPDATE
                  `,
                  [orderId]
                );

              for (
                const item of
                itemsResult.rows
              ) {
                const qty =
                  Number(
                    item.quantity || 0
                  );

                if (
                  qty <= 0
                ) {
                  continue;
                }

                if (
                  item.variant_id
                ) {
                  await client.query(
                    `
                    UPDATE product_variants
                    SET stock =
                      COALESCE(
                        stock,
                        0
                      ) + $1,
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      qty,
                      item.variant_id
                    ]
                  );
                } else {
                  await client.query(
                    `
                    UPDATE products
                    SET stock =
                      COALESCE(
                        stock,
                        0
                      ) + $1,
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      qty,
                      item.product_id
                    ]
                  );
                }

                await client.query(
                  `
                  INSERT INTO inventory_movements (
                    product_id,
                    variant_id,
                    quantity_change,
                    reason,
                    order_id,
                    created_at
                  )
                  VALUES (
                    $1,
                    $2,
                    $3,
                    'order_cancel_return',
                    $4,
                    NOW()
                  )
                  `,
                  [
                    item.product_id,
                    item.variant_id,
                    qty,
                    orderId
                  ]
                );
              }

              const redeemedPoints = Math.max(0,Number(order.points_redeemed||0));
              if (redeemedPoints > 0 && order.user_id) {
                const refund = await client.query(
                  `INSERT INTO loyalty_points_transactions(user_id,order_id,points,transaction_type,note,created_at)
                   VALUES($1,$2,$3,'redeem_refund',$4,NOW())
                   ON CONFLICT DO NOTHING RETURNING id`,
                  [order.user_id,orderId,redeemedPoints,`إعادة نقاط مستخدمة للطلب الملغي #${orderId}`]
                );
                if (refund.rowCount) {
                  await client.query(
                    "UPDATE users SET loyalty_points=COALESCE(loyalty_points,0)+$1,updated_at=NOW() WHERE id=$2",
                    [redeemedPoints,order.user_id]
                  );
                }
              }

              const cancelledCouponCode = cleanText(order.coupon_code||"",100).toUpperCase();
              if (cancelledCouponCode) {
                await client.query(
                  `UPDATE coupons SET used_count=GREATEST(0,COALESCE(used_count,0)-1)
                   WHERE UPPER(code)=$1`,
                  [cancelledCouponCode]
                );
              }

              /*
               * عكس النقاط مرة واحدة فقط.
               */
              const awardedPoints =
                Number(
                  order.loyalty_points_awarded ||
                  0
                );

              if (
                awardedPoints > 0 &&
                !order.loyalty_points_reversed
              ) {
                const reversal =
                  await client.query(
                    `
                    INSERT INTO loyalty_points_transactions (
                      user_id,
                      order_id,
                      points,
                      transaction_type,
                      note,
                      created_at
                    )
                    VALUES (
                      $1,
                      $2,
                      $3,
                      'order_reversal',
                      $4,
                      NOW()
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    `,
                    [
                      order.user_id,
                      orderId,
                      -awardedPoints,
                      `عكس نقاط الطلب #${orderId}`
                    ]
                  );

                if (
                  reversal.rowCount
                ) {
                  await client.query(
                    `
                    UPDATE users
                    SET loyalty_points =
                      GREATEST(
                        0,
                        COALESCE(
                          loyalty_points,
                          0
                        ) - $1
                      ),
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      awardedPoints,
                      order.user_id
                    ]
                  );

                  await client.query(
                    `
                    UPDATE orders
                    SET loyalty_points_reversed =
                      TRUE
                    WHERE id = $1
                    `,
                    [orderId]
                  );
                }
              }

              if(cancellationSource==="customer"){
                let customerUserId=order.user_id||null;
                const phoneKey=String(order.customer_phone||"").replace(/\D/g,"");
                if(!customerUserId&&phoneKey){
                  const account=await client.query(
                    `SELECT id FROM users
                     WHERE role='customer'
                       AND regexp_replace(COALESCE(phone,''),'[^0-9]','','g')=$1
                     ORDER BY id
                     LIMIT 1`,
                    [phoneKey]
                  );
                  customerUserId=account.rows[0]?.id||null;
                }

                const autoBlockEnabled=(await getSetting("customer_cancel_auto_block_enabled",false,client))===true;
                const autoBlockThreshold=Math.max(
                  1,
                  integer(await getSetting("customer_cancel_auto_block_threshold",3,client),3)
                );
                const autoBlockDays=Math.max(
                  0,
                  integer(await getSetting("customer_cancel_auto_block_days",0,client),0)
                );

                if(autoBlockEnabled&&customerUserId){
                  const prior=await client.query(
                    `SELECT COUNT(*)::int AS count
                     FROM orders
                     WHERE status='cancelled'
                       AND cancelled_source='customer'
                       AND (
                         user_id=$1
                         OR (
                           $2<>''
                           AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=$2
                         )
                       )`,
                    [customerUserId,phoneKey]
                  );
                  const cancellationCount=Number(prior.rows[0]?.count||0)+1;
                  if(cancellationCount>=autoBlockThreshold){
                    const reason=`منع تلقائي بعد ${cancellationCount} إلغاءات طلب من طرف الزبون`;
                    const blocked=await client.query(
                      `UPDATE users
                       SET ordering_blocked=TRUE,
                           ordering_block_reason=$1,
                           ordering_block_until=CASE
                             WHEN $2::int > 0 THEN NOW()+($2::int * INTERVAL '1 day')
                             ELSE NULL
                           END,
                           updated_at=NOW()
                       WHERE id=$3
                       RETURNING id,ordering_block_until`,
                      [reason,autoBlockDays,customerUserId]
                    );
                    if(blocked.rowCount){
                      await require("./order-block-history").recordOrderBlockEvent(client,{
                        userId:customerUserId,
                        action:"auto_blocked",
                        source:"customer_cancellations",
                        reason,
                        blockedUntil:blocked.rows[0].ordering_block_until||null,
                        actorUserId:req.user?.id||null
                      });
                      autoBlockedCustomer={
                        userId:customerUserId,
                        cancellationCount,
                        until:blocked.rows[0].ordering_block_until||null
                      };
                    }
                  }
                }
              }
            }

            let matchedCustomerUserId = null;
            if (newStatus === "delivered" && !order.user_id) {
              const phoneKey = String(order.customer_phone || "").replace(/\D/g, "");
              if (phoneKey) {
                const matchingCustomers = await client.query(
                  `SELECT id
                   FROM users
                   WHERE role = 'customer'
                     AND is_active = TRUE
                     AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
                   ORDER BY id
                   LIMIT 2`,
                  [phoneKey]
                );
                if (matchingCustomers.rowCount === 1) {
                  matchedCustomerUserId = matchingCustomers.rows[0].id;
                }
              }
            }

            const updated =
              await client.query(
                `
                UPDATE orders
                SET status = $1,
                    user_id = COALESCE(user_id, $6),
                    delivered_at = CASE WHEN $1 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
                    cancelled_source = CASE WHEN $3::boolean THEN $4 ELSE cancelled_source END,
                    cancellation_reason = CASE WHEN $3::boolean THEN $5 ELSE cancellation_reason END,
                    cancelled_at = CASE WHEN $3::boolean THEN NOW() ELSE cancelled_at END,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [
                  newStatus,
                  orderId,
                  isNewCancellation,
                  cancellationSource || null,
                  cancellationReason || null,
                  matchedCustomerUserId
                ]
              );

            const customerAccountLinked = Boolean(updated.rows[0]?.user_id);
            const customerAccountLinkedNow = !order.user_id && Boolean(matchedCustomerUserId) && customerAccountLinked;
            return {
              order: updated.rows[0],
              autoBlockedCustomer,
              customerAccountLinked,
              customerAccountLinkedNow
            };
          }
        );

      if(newStatus==="cancelled"){
        require("./whatsapp-automation").runWaitlistRestockNotifications(db).catch(error=>
          console.error("[WAITLIST RESTOCK AFTER CANCELLATION]",error)
        );
      }
      return res.json({
        ok: true,
        message:
          "تم تحديث حالة الطلب",
        order: result.order,
        autoBlockedCustomer: result.autoBlockedCustomer
      });
    } catch (error) {
      console.error(
        "[ORDER STATUS]",
        error
      );

      if (
        error.status
      ) {
        return res.status(
          error.status
        ).json({
          ok: false,
          code:
            error.code ||
            "ORDER_STATUS_ERROR",
          message:
            error.message
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحديث حالة الطلب"
      });
    }
  }
);


/* =========================================================
   ADMIN SHIPPING WAIVER
   ========================================================= */
app.patch("/api/admin/orders/:id/shipping-waiver",requireAdmin,async(req,res)=>{
  const orderId=integer(req.params.id,NaN),waived=req.body?.waived===true;
  if(!Number.isFinite(orderId))return res.status(400).json({ok:false,message:"رقم الطلب غير صالح"});
  try{
    const result=await transaction(async client=>{
      const q=await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE",[orderId]);
      if(!q.rowCount)throw createHttpError(404,"ORDER_NOT_FOUND","الطلب غير موجود");
      const o=q.rows[0];
      if(String(o.status||"").toLowerCase()==="cancelled")throw createHttpError(409,"CANCELLED_ORDER_FINAL","لا يمكن تعديل رسوم طلب ملغي");
      const baseShipping=Math.max(0,Number(o.shipping_base_cost||o.shipping_cost||0));
      const autoPercent=Math.max(0,Math.min(100,Number(o.shipping_discount_percent||0)||0));
      const autoAmount=Math.max(0,Math.min(baseShipping,Number(o.shipping_discount_amount||0)||money(baseShipping*autoPercent/100)));
      const manualPercent=Math.max(0,Math.min(100,Number(o.shipping_manual_discount_percent||0)||0));
      const manualBase=Math.max(0,baseShipping-autoAmount);
      const manualAmount=Math.max(0,Math.min(manualBase,Number(o.shipping_manual_discount_amount||0)||money(manualBase*manualPercent/100)));
      const normalShipping=money(Math.max(0,baseShipping-autoAmount-manualAmount));
      const shipping=waived?0:normalShipping;
      const total=money(Math.max(0,Number(o.subtotal||0)-Number(o.coupon_discount||0)-Number(o.visa_discount||0)-Number(o.loyalty_discount||0)+Number(o.packaging_cost||0)+shipping));
      const u=await client.query(
        "UPDATE orders SET shipping_waived=$1,shipping_cost=$2,total=$3,updated_at=NOW() WHERE id=$4 RETURNING *",
        [waived,shipping,total,orderId]
      );
      return u.rows[0];
    });
    res.json({ok:true,order:result,message:waived?"تم إعفاء الطلب من رسوم التوصيل":"تم إلغاء إعفاء التوصيل"});
  }catch(e){console.error("[SHIPPING WAIVER]",e);res.status(e.status||500).json({ok:false,code:e.code||"SHIPPING_WAIVER_ERROR",message:e.message||"تعذر تعديل رسوم التوصيل"});}
});

/* =========================================================
   ADMIN MANUAL SHIPPING DISCOUNT
   ========================================================= */
app.patch("/api/admin/orders/:id/shipping-discount",requireAdmin,async(req,res)=>{
  const orderId=integer(req.params.id,NaN);
  const manualPercent=Number(req.body?.percent ?? req.body?.discountPercent ?? 0);
  const confirmStack=req.body?.confirmStack===true;
  if(!Number.isFinite(orderId))return res.status(400).json({ok:false,message:"رقم الطلب غير صالح"});
  if(!Number.isFinite(manualPercent)||manualPercent<0||manualPercent>100)return res.status(400).json({ok:false,message:"نسبة خصم التوصيل يجب أن تكون بين 0 و100"});
  try{
    const result=await transaction(async client=>{
      const q=await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE",[orderId]);
      if(!q.rowCount)throw createHttpError(404,"ORDER_NOT_FOUND","الطلب غير موجود");
      const o=q.rows[0];
      if(String(o.status||"").toLowerCase()==="cancelled")throw createHttpError(409,"CANCELLED_ORDER_FINAL","لا يمكن تعديل طلب ملغي");
      const baseShipping=Math.max(0,Number(o.shipping_base_cost||o.shipping_cost||0));
      const autoPercent=Math.max(0,Math.min(100,Number(o.shipping_discount_percent||0)||0));
      const autoAmount=Math.max(0,Math.min(baseShipping,Number(o.shipping_discount_amount||0)||money(baseShipping*autoPercent/100)));
      if(manualPercent>0&&autoPercent>0&&!confirmStack){
        throw createHttpError(
          409,
          "SHIPPING_AUTO_DISCOUNT_PRESENT",
          `يوجد أصلًا خصم توصيل تلقائي بنسبة ${money(autoPercent)}%. إضافة خصم يدوي ستطبق خصمًا إضافيًا على المبلغ المتبقي.`
        );
      }
      const manualBase=Math.max(0,baseShipping-autoAmount);
      const manualAmount=money(manualBase*(manualPercent/100));
      const shipping=Boolean(o.shipping_waived)?0:money(Math.max(0,manualBase-manualAmount));
      const total=money(Math.max(0,Number(o.subtotal||0)-Number(o.coupon_discount||0)-Number(o.visa_discount||0)-Number(o.loyalty_discount||0)+Number(o.packaging_cost||0)+shipping));
      const u=await client.query(
        `UPDATE orders
         SET shipping_manual_discount_percent=$1,
             shipping_manual_discount_amount=$2,
             shipping_cost=$3,
             total=$4,
             updated_at=NOW()
         WHERE id=$5
         RETURNING *`,
        [money(manualPercent),manualAmount,shipping,total,orderId]
      );
      return {order:u.rows[0],autoPercent,autoAmount,manualPercent:money(manualPercent),manualAmount};
    });
    return res.json({ok:true,...result,message:manualPercent>0?"تم تطبيق خصم التوصيل اليدوي":"تم إلغاء خصم التوصيل اليدوي"});
  }catch(e){
    console.error("[SHIPPING DISCOUNT]",e);
    return res.status(e.status||500).json({
      ok:false,
      code:e.code||"SHIPPING_DISCOUNT_ERROR",
      message:e.message||"تعذر تعديل خصم التوصيل"
    });
  }
});

/* =========================================================
   ADMIN ORDER GIFTS
   ========================================================= */
app.post("/api/admin/orders/:id/gifts",requireAdmin,async(req,res)=>{
  const orderId=integer(req.params.id,NaN);
  const productId=integer(req.body?.productId ?? req.body?.product_id,NaN);
  const rawVariant=req.body?.variantId ?? req.body?.variant_id ?? null;
  const variantId=rawVariant===null||rawVariant===undefined||rawVariant===""?null:integer(rawVariant,NaN);
  const quantity=integer(req.body?.quantity ?? req.body?.qty ?? 1,1);
  if(!Number.isFinite(orderId)||!Number.isFinite(productId)||!Number.isInteger(quantity)||quantity<1||quantity>1000){
    return res.status(400).json({ok:false,message:"بيانات الهدية غير صالحة"});
  }
  if(rawVariant!==null&&rawVariant!==undefined&&rawVariant!==""&&!Number.isFinite(variantId)){
    return res.status(400).json({ok:false,message:"خيار الهدية غير صالح"});
  }
  try{
    const result=await transaction(async client=>{
      const oq=await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE",[orderId]);
      if(!oq.rowCount)throw createHttpError(404,"ORDER_NOT_FOUND","الطلب غير موجود");
      const order=oq.rows[0],status=String(order.status||"").toLowerCase();
      if(!["pending","confirmed","processing"].includes(status)){
        throw createHttpError(409,"GIFT_ORDER_LOCKED","يمكن إضافة هدية قبل شحن أو تسليم الطلب فقط");
      }
      const pq=await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE",[productId]);
      if(!pq.rowCount)throw createHttpError(404,"PRODUCT_NOT_FOUND","منتج الهدية غير موجود");
      const product=pq.rows[0];
      const activeVariants=await client.query(
        "SELECT id,color,size,stock,is_active FROM product_variants WHERE product_id=$1 AND is_active=TRUE ORDER BY id",
        [productId]
      );
      if(activeVariants.rowCount>0&&variantId===null){
        throw createHttpError(400,"GIFT_VARIANT_REQUIRED","اختاري لون/خيار الهدية");
      }
      let variant=null;
      if(variantId!==null){
        const vq=await client.query(
          "SELECT * FROM product_variants WHERE id=$1 AND product_id=$2 FOR UPDATE",
          [variantId,productId]
        );
        if(!vq.rowCount||vq.rows[0].is_active===false)throw createHttpError(400,"INVALID_VARIANT","خيار الهدية غير متوفر");
        variant=vq.rows[0];
      }
      const available=Math.max(0,Number(variant?variant.stock:product.stock)||0);
      if(quantity>available)throw createHttpError(409,"OUT_OF_STOCK",stockAvailabilityMessage(available));
      const stockUpdate=variant
        ? await client.query(
            "UPDATE product_variants SET stock=stock-$1,updated_at=NOW() WHERE id=$2 AND stock >= $1 RETURNING stock",
            [quantity,variant.id]
          )
        : await client.query(
            "UPDATE products SET stock=stock-$1,updated_at=NOW() WHERE id=$2 AND stock >= $1 RETURNING stock",
            [quantity,product.id]
          );
      if(!stockUpdate.rowCount)throw createHttpError(409,"OUT_OF_STOCK",stockAvailabilityMessage(0));
      const variantName=variant?[variant.color,variant.size].filter(Boolean).join(" / "):"";
      const purchasePrice=Math.max(0,Number(product.purchase_price||product.cost_price||0)||0);
      const ins=await client.query(
        `INSERT INTO order_items(
          order_id,product_id,variant_id,product_name,variant_name,image,quantity,unit_price,total,purchase_price,is_gift,created_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,0,0,$8,TRUE,NOW())
        RETURNING *`,
        [orderId,product.id,variant?variant.id:null,product.name||"هدية",variantName,product.image||product.image_url||null,quantity,purchasePrice]
      );
      await client.query(
        `INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [product.id,variant?variant.id:null,-quantity,`gift: ${product.name||"هدية"}`,orderId]
      );
      return ins.rows[0];
    });
    return res.status(201).json({ok:true,item:result,message:"تمت إضافة الهدية للطلب وخصمها من المخزون"});
  }catch(e){
    console.error("[ORDER GIFT ADD]",e);
    return res.status(e.status||500).json({ok:false,code:e.code||"ORDER_GIFT_ERROR",message:e.message||"تعذر إضافة الهدية"});
  }
});

app.delete("/api/admin/orders/:id/gifts/:itemId",requireAdmin,async(req,res)=>{
  const orderId=integer(req.params.id,NaN),itemId=integer(req.params.itemId,NaN);
  if(!Number.isFinite(orderId)||!Number.isFinite(itemId))return res.status(400).json({ok:false,message:"بيانات الهدية غير صالحة"});
  try{
    const result=await transaction(async client=>{
      const oq=await client.query("SELECT status FROM orders WHERE id=$1 FOR UPDATE",[orderId]);
      if(!oq.rowCount)throw createHttpError(404,"ORDER_NOT_FOUND","الطلب غير موجود");
      if(!["pending","confirmed","processing"].includes(String(oq.rows[0].status||"").toLowerCase())){
        throw createHttpError(409,"GIFT_ORDER_LOCKED","لا يمكن حذف هدية بعد شحن أو تسليم الطلب");
      }
      const iq=await client.query(
        "SELECT * FROM order_items WHERE id=$1 AND order_id=$2 AND is_gift=TRUE FOR UPDATE",
        [itemId,orderId]
      );
      if(!iq.rowCount)throw createHttpError(404,"GIFT_NOT_FOUND","الهدية غير موجودة");
      const item=iq.rows[0],qty=Math.max(0,Number(item.quantity||0));
      if(item.variant_id){
        await client.query("UPDATE product_variants SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[qty,item.variant_id]);
      }else{
        await client.query("UPDATE products SET stock=COALESCE(stock,0)+$1,updated_at=NOW() WHERE id=$2",[qty,item.product_id]);
      }
      await client.query(
        `INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [item.product_id,item.variant_id,qty,`gift_removed: ${item.product_name||"هدية"}`,orderId]
      );
      await client.query("DELETE FROM order_items WHERE id=$1",[itemId]);
      return item;
    });
    return res.json({ok:true,item:result,message:"تم حذف الهدية وإعادة الكمية للمخزون"});
  }catch(e){
    console.error("[ORDER GIFT DELETE]",e);
    return res.status(e.status||500).json({ok:false,code:e.code||"ORDER_GIFT_DELETE_ERROR",message:e.message||"تعذر حذف الهدية"});
  }
});

/* =========================================================
   INVENTORY
   ========================================================= */

app.get(
  "/api/admin/inventory",
  requireAdmin,
  async (req, res) => {
    try {
      const products =
        await db(
          `
          SELECT
            p.id,
            p.name,
            p.sku,
            p.stock,
            p.price,
            p.is_active,
            p.supplier_name,
            p.image_url,
            c.name AS category_name,
            b.name AS brand_name
          FROM products p
          LEFT JOIN categories c
            ON c.id = p.category_id
          LEFT JOIN brands b
            ON b.id = p.brand_id
          ORDER BY p.name
          `
        );

      const variants =
        await db(
          `
          SELECT
            v.*,
            p.name AS product_name
          FROM product_variants v
          LEFT JOIN products p
            ON p.id = v.product_id
          ORDER BY
            p.name,
            v.color,
            v.size
          `
        );

      return res.json({
        ok: true,
        products:
          products.rows,
        variants:
          variants.rows
      });
    } catch (error) {
      console.error(
        "[INVENTORY]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المخزون"
      });
    }
  }
);


/* =========================================================
   INVENTORY UPDATE
   ========================================================= */

app.patch(
  "/api/admin/inventory/:productId",
  requireAdmin,
  async (req, res) => {
    const productId=integer(req.params.productId,NaN);
    const variantsSupplied=Array.isArray(req.body?.variants);
    const requestedStock=variantsSupplied
      ? null
      : integer(req.body?.stock,NaN);
    const supplierSupplied=
      req.body?.supplierName !== undefined ||
      req.body?.supplier_name !== undefined;
    const supplierName=supplierSupplied
      ? cleanText(req.body?.supplierName ?? req.body?.supplier_name ?? "").slice(0,200)
      : undefined;

    if(!Number.isFinite(productId)){
      return res.status(400).json({ok:false,message:"رقم المنتج غير صالح"});
    }

    if(!variantsSupplied&&(!Number.isFinite(requestedStock)||requestedStock<0)){
      return res.status(400).json({ok:false,message:"كمية المخزون غير صالحة"});
    }

    const desiredVariants=variantsSupplied?req.body.variants:[];
    if(variantsSupplied){
      const names=new Set();
      for(const v of desiredVariants){
        const name=cleanText(v?.name ?? v?.color ?? "").slice(0,120);
        const stock=integer(v?.stock,NaN);
        if(!name||names.has(name)||!Number.isFinite(stock)||stock<0){
          return res.status(400).json({ok:false,message:"بيانات الألوان/الخيارات غير صالحة أو مكررة"});
        }
        names.add(name);
      }
    }

    try{
      const result=await transaction(async client=>{
        const current=await client.query(
          "SELECT id,stock,supplier_name FROM products WHERE id=$1 FOR UPDATE",
          [productId]
        );
        if(!current.rowCount)throw createHttpError(404,"PRODUCT_NOT_FOUND","المنتج غير موجود");

        const previous=await client.query(
          "SELECT id,color,size,stock,is_active FROM product_variants WHERE product_id=$1 FOR UPDATE",
          [productId]
        );
        const previousRows=previous.rows;
        const movementNote=cleanText(req.body?.note||"تعديل المخزون من لوحة التحكم").slice(0,500);
        let finalStock=0;
        let finalVariants=[];

        if(variantsSupplied){
          const kept=new Set();

          for(const input of desiredVariants){
            const name=cleanText(input?.name ?? input?.color ?? "").slice(0,120);
            const stock=integer(input?.stock,0);
            const suppliedId=input?.id!==undefined&&input?.id!==null&&input?.id!==""
              ? integer(input.id,NaN)
              : null;

            let old=null;
            if(suppliedId!==null){
              if(!Number.isFinite(suppliedId))throw createHttpError(400,"INVALID_VARIANT","رقم اللون/الخيار غير صالح");
              old=previousRows.find(v=>Number(v.id)===Number(suppliedId))||null;
              if(!old)throw createHttpError(400,"INVALID_VARIANT","اللون/الخيار لا يتبع هذا المنتج");
            }else{
              old=previousRows.find(v=>String(v.color||"")===name&&!kept.has(Number(v.id)))||null;
            }

            let saved;
            let oldStock=0;
            if(old){
              kept.add(Number(old.id));
              oldStock=Math.max(0,Number(old.stock)||0);
              saved=await client.query(
                `UPDATE product_variants
                 SET color=$1,stock=$2,is_active=TRUE,updated_at=NOW()
                 WHERE id=$3 AND product_id=$4
                 RETURNING *`,
                [name,stock,old.id,productId]
              );
            }else{
              saved=await client.query(
                `INSERT INTO product_variants(product_id,color,stock,is_active,created_at,updated_at)
                 VALUES($1,$2,$3,TRUE,NOW(),NOW())
                 RETURNING *`,
                [productId,name,stock]
              );
              kept.add(Number(saved.rows[0].id));
            }

            const diff=stock-oldStock;
            if(diff!==0){
              await client.query(
                `INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at)
                 VALUES($1,$2,$3,$4,NULL,NOW())`,
                [productId,saved.rows[0].id,diff,movementNote+" — "+name]
              );
            }

            finalVariants.push(saved.rows[0]);
            finalStock+=stock;
          }

          for(const old of previousRows){
            if(kept.has(Number(old.id)))continue;
            const oldStock=Math.max(0,Number(old.stock)||0);
            if(oldStock!==0){
              await client.query(
                `INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at)
                 VALUES($1,$2,$3,$4,NULL,NOW())`,
                [productId,old.id,-oldStock,movementNote+" — إزالة "+(old.color||"خيار")]
              );
            }
            await client.query(
              "UPDATE product_variants SET stock=0,is_active=FALSE,updated_at=NOW() WHERE id=$1 AND product_id=$2",
              [old.id,productId]
            );
          }
        }else{
          const oldStock=Math.max(0,Number(current.rows[0].stock)||0);
          finalStock=requestedStock;
          const diff=finalStock-oldStock;
          if(diff!==0){
            await client.query(
              `INSERT INTO inventory_movements(product_id,variant_id,quantity_change,reason,order_id,created_at)
               VALUES($1,NULL,$2,$3,NULL,NOW())`,
              [productId,diff,movementNote]
            );
          }
          finalVariants=previousRows.filter(v=>v.is_active!==false);
        }

        const updated=await client.query(
          `UPDATE products
           SET stock=$1,
               supplier_name=CASE WHEN $2::boolean THEN $3 ELSE supplier_name END,
               updated_at=NOW()
           WHERE id=$4
           RETURNING *`,
          [finalStock,supplierSupplied,supplierName||null,productId]
        );

        return {product:updated.rows[0],variants:finalVariants};
      });

      require("./whatsapp-automation").runWaitlistRestockNotifications(db).catch(error=>
        console.error("[WAITLIST RESTOCK AFTER INVENTORY]",error)
      );
      return res.json({ok:true,...result,message:"تم تحديث المخزون والألوان والمورد"});
    }catch(error){
      console.error("[INVENTORY UPDATE]",error);
      return res.status(error.status||500).json({
        ok:false,
        code:error.code||"INVENTORY_UPDATE_ERROR",
        message:error.message||"تعذر تحديث المخزون"
      });
    }
  }
);


/* =========================================================
   INVENTORY VARIANT UPDATE
   ========================================================= */

app.patch(
  "/api/admin/inventory/variant/:variantId",
  requireAdmin,
  async (req, res) => {
    const variantId =
      integer(
        req.params.variantId,
        NaN
      );

    const requestedStock =
      integer(
        req.body.stock,
        NaN
      );

    if (
      !Number.isFinite(
        variantId
      ) ||
      !Number.isFinite(
        requestedStock
      ) ||
      requestedStock < 0
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "بيانات المخزون غير صالحة"
      });
    }

    try {
      const result =
        await transaction(
          async (client) => {
            const current =
              await client.query(
                `
                SELECT *
                FROM product_variants
                WHERE id = $1
                FOR UPDATE
                `,
                [variantId]
              );

            if (
              !current.rowCount
            ) {
              throw createHttpError(
                404,
                "VARIANT_NOT_FOUND",
                "الخيار غير موجود"
              );
            }

            const oldStock =
              Number(
                current.rows[0]
                  .stock || 0
              );

            const difference =
              requestedStock -
              oldStock;

            const updated =
              await client.query(
                `
                UPDATE product_variants
                SET stock = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [
                  requestedStock,
                  variantId
                ]
              );

            if (
              difference !== 0
            ) {
              await client.query(
                `
                INSERT INTO inventory_movements (
                  product_id,
                  variant_id,
                  quantity_change,
                  reason,
                  order_id,
                  created_at
                )
                VALUES (
                  $1,
                  $2,
                  $3,
                  $4,
                  NULL,
                  NOW()
                )
                `,
                [
                  current.rows[0]
                    .product_id,
                  variantId,
                  difference,
                  cleanText(
                    req.body.note ||
                    "تعديل مخزون الخيار",
                    500
                  )
                ]
              );
            }

            return updated.rows[0];
          }
        );

      return res.json({
        ok: true,
        variant: result
      });
    } catch (error) {
      console.error(
        "[VARIANT INVENTORY]",
        error
      );

      if (
        error.status
      ) {
        return res.status(
          error.status
        ).json({
          ok: false,
          message:
            error.message
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحديث مخزون الخيار"
      });
    }
  }
);


/* =========================================================
   INVENTORY MOVEMENTS REPORT
   ========================================================= */

app.get(
  "/api/admin/inventory/movements",
  requireAdmin,
  async (req, res) => {
    const from =
      cleanText(
        req.query.from ||
        req.query.start ||
        "",
        30
      );

    const to =
      cleanText(
        req.query.to ||
        req.query.end ||
        "",
        30
      );

    /*
     * التقرير لا يعرض شيئاً
     * قبل تحديد التاريخين.
     */
    if (!from || !to) {
      return res.json({
        ok: true,
        movements: [],
        requiresDateRange: true
      });
    }

    const validDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(value + "T00:00:00Z");
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!validDate(from) || !validDate(to) || from > to) {
      return res.status(400).json({
        ok: false,
        message: "اختاري تاريخين صحيحين، على أن يكون تاريخ البداية قبل النهاية أو مساوياً لها"
      });
    }

    try {
      const result =
        await db(
          `
          SELECT
            im.*,
            p.name AS product_name,
            v.color,
            v.size,
            v.sku AS variant_sku
          FROM inventory_movements im
          LEFT JOIN products p
            ON p.id = im.product_id
          LEFT JOIN product_variants v
            ON v.id = im.variant_id
          WHERE im.created_at >= $1::date
            AND im.created_at <
              ($2::date + INTERVAL '1 day')
          ORDER BY
            im.created_at DESC, im.id DESC
          `,
          [
            from,
            to
          ]
        );

      return res.json({
        ok: true,
        movements:
          result.rows,
        from,
        to
      });
    } catch (error) {
      console.error(
        "[INVENTORY MOVEMENTS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل حركة المخزون"
      });
    }
  }
);


/* =========================================================
   ADMIN USERS
   ========================================================= */

app.get(
  "/api/admin/users",
  requireAdmin,
  async (req, res) => {
    const search =
      cleanText(
        req.query.search ||
        req.query.q ||
        "",
        200
      );

    try {
      const params = [];
      let where = "";

      if (search) {
        params.push(
          `%${search}%`
        );

        where = `
          WHERE
            name ILIKE $1
            OR email ILIKE $1
            OR phone ILIKE $1
        `;
      }

      const result =
        await db(
          `
          SELECT
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            is_active,
            ordering_blocked,
            ordering_block_reason,
            ordering_block_until,
            loyalty_points,
            created_at,
            updated_at
          FROM users
          ${where}
          ORDER BY
            created_at DESC
          LIMIT 500
          `,
          params
        );

      return res.json({
        ok: true,
        users:
          result.rows.map(
            publicUser
          )
      });
    } catch (error) {
      console.error(
        "[ADMIN USERS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المستخدمين"
      });
    }
  }
);


/* =========================================================
   ADMIN USER UPDATE
   ========================================================= */

app.patch(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    const userId =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(
        userId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المستخدم غير صالح"
      });
    }

    try {
      const targetUser = await db(
        `
        SELECT id, role, ordering_blocked, ordering_block_reason, ordering_block_until
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (!targetUser.rowCount) {
        return res.status(404).json({
          ok: false,
          message: "المستخدم غير موجود"
        });
      }

      if (String(targetUser.rows[0].role || "").toLowerCase() !== "customer" && req.user.role !== "owner") {
        return res.status(403).json({ ok: false, message: "إدارة حسابات الموظفين والإدارة متاحة للمالك فقط" });
      }

      if (
        String(targetUser.rows[0].role || "").toLowerCase() === "owner"
      ) {
        return res.status(403).json({
          ok: false,
          message: "لا يمكن تعديل حساب المالك من إدارة المستخدمين"
        });
      }

      if (
        req.body.role !== undefined &&
        String(req.user?.role || "").toLowerCase() !== "owner"
      ) {
        return res.status(403).json({
          ok: false,
          message: "تغيير دور المستخدم متاح للمالك فقط"
        });
      }

      const fields = [];
      const values = [];

      function addField(
        column,
        value
      ) {
        values.push(value);
        fields.push(
          `${column} = $${values.length}`
        );
      }

      if (
        req.body.name !==
        undefined
      ) {
        addField(
          "name",
          cleanText(
            req.body.name,
            200
          )
        );
      }

      if (
        req.body.email !==
        undefined
      ) {
        addField(
          "email",
          normalizeEmail(
            req.body.email
          )
        );
      }

      if (
        req.body.phone !==
        undefined
      ) {
        addField(
          "phone",
          normalizePhone(
            req.body.phone
          )
        );
      }

      if (
        req.body.gender !==
        undefined
      ) {
        addField(
          "gender",
          cleanText(
            req.body.gender,
            50
          ) || null
        );
      }

      if (
        req.body.age !==
        undefined
      ) {
        const age =
          integer(
            req.body.age,
            NaN
          );

        if (
          !Number.isFinite(age) ||
          age < 1 ||
          age > 120
        ) {
          return res.status(400).json({
            ok: false,
            message:
              "العمر غير صالح"
          });
        }

        addField(
          "age",
          age
        );
      }

      if (
        req.body.is_active !==
        undefined
      ) {
        addField(
          "is_active",
          Boolean(
            req.body.is_active
          )
        );
      }

      if (req.body.ordering_blocked !== undefined || req.body.orderingBlocked !== undefined) {
        const blocked=Boolean(req.body.ordering_blocked ?? req.body.orderingBlocked);
        addField("ordering_blocked",blocked);
        if(!blocked){
          if(req.body.ordering_block_reason===undefined&&req.body.orderingBlockReason===undefined)addField("ordering_block_reason",null);
          if(req.body.ordering_block_until===undefined&&req.body.orderingBlockUntil===undefined)addField("ordering_block_until",null);
        }
      }

      if (req.body.ordering_block_reason !== undefined || req.body.orderingBlockReason !== undefined) {
        addField(
          "ordering_block_reason",
          cleanText(req.body.ordering_block_reason ?? req.body.orderingBlockReason).slice(0,500) || null
        );
      }

      if (req.body.ordering_block_until !== undefined || req.body.orderingBlockUntil !== undefined) {
        const rawUntil=req.body.ordering_block_until !== undefined
          ? req.body.ordering_block_until
          : req.body.orderingBlockUntil;
        if(rawUntil===null||rawUntil===""){
          addField("ordering_block_until",null);
        }else{
          const untilDate=new Date(rawUntil);
          if(Number.isNaN(untilDate.getTime()))return res.status(400).json({ok:false,message:"تاريخ انتهاء منع الطلب غير صالح"});
          addField("ordering_block_until",untilDate.toISOString());
        }
      }

      /*
       * لا يستطيع الـ Admin
       * تحويل نفسه أو غيره إلى Owner.
       */
      if (
        req.body.role !==
        undefined
      ) {
        const requestedRole =
          String(
            req.body.role
          ).toLowerCase();

        if (
          ![
            "customer",
            "staff",
            "admin"
          ].includes(
            requestedRole
          )
        ) {
          return res.status(400).json({
            ok: false,
            message:
              "الدور غير صالح"
          });
        }

        addField(
          "role",
          requestedRole
        );
      }

      if (!fields.length) {
        return res.status(400).json({
          ok: false,
          message:
            "لا توجد بيانات للتعديل"
        });
      }

      values.push(
        userId
      );

      const result =
        await db(
          `
          UPDATE users
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            is_active,
            ordering_blocked,
            ordering_block_reason,
            ordering_block_until,
            loyalty_points,
            created_at,
            updated_at
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      const blockFieldsRequested =
        req.body.ordering_blocked !== undefined ||
        req.body.orderingBlocked !== undefined ||
        req.body.ordering_block_reason !== undefined ||
        req.body.orderingBlockReason !== undefined ||
        req.body.ordering_block_until !== undefined ||
        req.body.orderingBlockUntil !== undefined;

      if(blockFieldsRequested){
        const before=targetUser.rows[0],after=result.rows[0];
        const beforeUntil=before.ordering_block_until?new Date(before.ordering_block_until).toISOString():null;
        const afterUntil=after.ordering_block_until?new Date(after.ordering_block_until).toISOString():null;
        const changed=
          Boolean(before.ordering_blocked)!==Boolean(after.ordering_blocked) ||
          String(before.ordering_block_reason||"")!==String(after.ordering_block_reason||"") ||
          beforeUntil!==afterUntil;
        if(changed){
          const action=Boolean(after.ordering_blocked)
            ? (Boolean(before.ordering_blocked)?"updated":"blocked")
            : "unblocked";
          await require("./order-block-history").recordOrderBlockEvent(db,{
            userId,
            action,
            source:"manual",
            reason:after.ordering_block_reason||null,
            blockedUntil:after.ordering_block_until||null,
            actorUserId:req.user?.id||null
          });
        }
      }

      return res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[ADMIN USER UPDATE]",
        error
      );

      if (
        String(
          error.code
        ) === "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "البريد الإلكتروني أو رقم الهاتف مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل المستخدم"
      });
    }
  }
);


/* =========================================================
   ADMIN RESET USER PASSWORD
   ========================================================= */

app.patch(
  "/api/admin/users/:id/password",
  requireAdmin,
  async (req, res) => {
    const userId =
      integer(
        req.params.id,
        NaN
      );

    const password =
      String(
        req.body.newPassword ||
        req.body.password ||
        ""
      );

    if (
      !Number.isFinite(
        userId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المستخدم غير صالح"
      });
    }

    if (
      password.length < 12
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "كلمة المرور يجب أن تكون 12 خانة على الأقل"
      });
    }

    try {
      const targetUser = await db(
        `
        SELECT id, role
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (!targetUser.rowCount) {
        return res.status(404).json({
          ok: false,
          message: "المستخدم غير موجود"
        });
      }

      if (String(targetUser.rows[0].role || "").toLowerCase() !== "customer" && req.user.role !== "owner") {
        return res.status(403).json({ ok: false, message: "إدارة حسابات الموظفين والإدارة متاحة للمالك فقط" });
      }

      if (
        String(targetUser.rows[0].role || "").toLowerCase() === "owner"
      ) {
        return res.status(403).json({
          ok: false,
          message: "لا يمكن تغيير كلمة مرور المالك من إدارة المستخدمين"
        });
      }

      const passwordHash =
        await hashPassword(
          password
        );

      const result =
        await db(
          `
          UPDATE users
          SET password_hash = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING id
          `,
          [
            passwordHash,
            userId
          ]
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      return res.json({
        ok: true,
        message:
          "تم تغيير كلمة المرور"
      });
    } catch (error) {
      console.error(
        "[ADMIN PASSWORD]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تغيير كلمة المرور"
      });
    }
  }
);


/* =========================================================
   ADMIN DISABLE / ENABLE USER
   ========================================================= */

app.patch(
  "/api/admin/users/:id/status",
  requireAdmin,
  async (req, res) => {
    const userId =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(
        userId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المستخدم غير صالح"
      });
    }

    const active =
      req.body.is_active !==
      undefined
        ? Boolean(
            req.body.is_active
          )
        : Boolean(
            req.body.enabled
          );

    try {
      const targetUser = await db(
        `
        SELECT id, role
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );

      if (!targetUser.rowCount) {
        return res.status(404).json({
          ok: false,
          message: "المستخدم غير موجود"
        });
      }

      if (String(targetUser.rows[0].role || "").toLowerCase() !== "customer" && req.user.role !== "owner") {
        return res.status(403).json({ ok: false, message: "إدارة حسابات الموظفين والإدارة متاحة للمالك فقط" });
      }

      if (
        String(targetUser.rows[0].role || "").toLowerCase() === "owner"
      ) {
        return res.status(403).json({
          ok: false,
          message: "لا يمكن إيقاف أو تفعيل حساب المالك من إدارة المستخدمين"
        });
      }

      const result =
        await db(
          `
          UPDATE users
          SET is_active = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            is_active,
            loyalty_points
          `,
          [
            active,
            userId
          ]
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      return res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[USER STATUS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحديث حالة المستخدم"
      });
    }
  }
);


/* =========================================================
   END PART 2
   ========================================================= */
 /* =========================================================
    ADMIN DASHBOARD
    ========================================================= */

app.get(
  "/api/admin/dashboard",
  requireAdmin,
  async (req, res) => {
    try {
      const [
        usersResult,
        productsResult,
        ordersResult,
        salesResult,
        pendingResult,
        lowStockResult
      ] = await Promise.all([
        db(`
          SELECT COUNT(*)::int AS count
          FROM users
          WHERE role = 'customer'
        `),

        db(`
          SELECT COUNT(*)::int AS count
          FROM products
          WHERE is_active = TRUE
        `),

        db(`
          SELECT COUNT(*)::int AS count
          FROM orders
        `),

        db(`
          SELECT
            COALESCE(
              SUM(total),
              0
            ) AS total
          FROM orders
          WHERE status <> 'cancelled'
        `),

        db(`
          SELECT COUNT(*)::int AS count
          FROM orders
          WHERE status IN (
            'pending',
            'confirmed',
            'processing'
          )
        `),

        db(`
          SELECT COUNT(*)::int AS count
          FROM products
          WHERE is_active = TRUE
            AND COALESCE(stock, 0) <= 5
        `)
      ]);

      return res.json({
        ok: true,
        dashboard: {
          customers:
            Number(
              usersResult.rows[0]?.count || 0
            ),

          products:
            Number(
              productsResult.rows[0]?.count || 0
            ),

          orders:
            Number(
              ordersResult.rows[0]?.count || 0
            ),

          sales:
            Number(
              salesResult.rows[0]?.total || 0
            ),

          pendingOrders:
            Number(
              pendingResult.rows[0]?.count || 0
            ),

          lowStock:
            Number(
              lowStockResult.rows[0]?.count || 0
            )
        }
      });
    } catch (error) {
      console.error(
        "[ADMIN DASHBOARD]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل لوحة التحكم"
      });
    }
  }
);


/* =========================================================
   SALES REPORT
   ========================================================= */

app.get(
  "/api/admin/reports/sales",
  requireAdmin,
  async (req, res) => {
    const from =
      cleanText(
        req.query.from || "",
        30
      );

    const to =
      cleanText(
        req.query.to || "",
        30
      );

    if (!from || !to) {
      return res.json({
        ok: true,
        requiresDateRange: true,
        summary: {
          orders: 0,
          sales: 0,
          cancelled: 0
        },
        rows: []
      });
    }

    try {
      const summary =
        await db(
          `
          SELECT
            COUNT(*) FILTER (
              WHERE status <> 'cancelled'
            )::int AS orders,

            COALESCE(
              SUM(GREATEST(0, subtotal - coupon_discount - visa_discount - loyalty_discount) + packaging_cost) FILTER (
                WHERE status <> 'cancelled'
              ),
              0
            ) AS sales,

            COUNT(*) FILTER (
              WHERE status = 'cancelled'
            )::int AS cancelled,

            COALESCE((
              SELECT SUM(oi.purchase_price * oi.quantity)
              FROM order_items oi
              JOIN orders po ON po.id = oi.order_id
              WHERE po.status <> 'cancelled'
                AND po.created_at >= $1::date
                AND po.created_at < ($2::date + INTERVAL '1 day')
            ),0) AS cost,

            COALESCE(
              SUM(GREATEST(0, subtotal - coupon_discount - visa_discount - loyalty_discount) + packaging_cost) FILTER (
                WHERE status <> 'cancelled'
              ),0
            ) - COALESCE((
              SELECT SUM(oi.purchase_price * oi.quantity)
              FROM order_items oi
              JOIN orders po ON po.id = oi.order_id
              WHERE po.status <> 'cancelled'
                AND po.created_at >= $1::date
                AND po.created_at < ($2::date + INTERVAL '1 day')
            ),0) AS profit

          FROM orders
          WHERE created_at >= $1::date
            AND created_at <
              ($2::date + INTERVAL '1 day')
          `,
          [
            from,
            to
          ]
        );

      const rows =
        await db(
          `
          WITH order_days AS (
            SELECT
              DATE(created_at) AS date,
              COUNT(*) FILTER (
                WHERE status <> 'cancelled'
              )::int AS orders,
              COALESCE(
                SUM(GREATEST(0, subtotal - coupon_discount - visa_discount - loyalty_discount) + packaging_cost) FILTER (
                  WHERE status <> 'cancelled'
                ),
                0
              ) AS sales
            FROM orders
            WHERE created_at >= $1::date
              AND created_at < ($2::date + INTERVAL '1 day')
            GROUP BY DATE(created_at)
          ),
          cost_days AS (
            SELECT
              DATE(po.created_at) AS date,
              COALESCE(SUM(oi.purchase_price * oi.quantity),0) AS cost
            FROM order_items oi
            JOIN orders po ON po.id = oi.order_id
            WHERE po.status <> 'cancelled'
              AND po.created_at >= $1::date
              AND po.created_at < ($2::date + INTERVAL '1 day')
            GROUP BY DATE(po.created_at)
          )
          SELECT
            od.date,
            od.orders,
            od.sales,
            COALESCE(cd.cost,0) AS cost,
            od.sales - COALESCE(cd.cost,0) AS profit
          FROM order_days od
          LEFT JOIN cost_days cd ON cd.date = od.date
          ORDER BY od.date
          `,
          [
            from,
            to
          ]
        );

      const settlements=await db(
        `SELECT
           COALESCE(SUM(refundable_cash_value) FILTER (WHERE request_type='return'),0) AS returns_value,
           COALESCE(SUM(returned_merchandise_value) FILTER (WHERE request_type='return'),0) AS returns_gross_value,
           COALESCE(SUM(allocated_coupon_discount) FILTER (WHERE request_type='return'),0) AS returned_coupon_discount,
           COALESCE(SUM(allocated_visa_discount) FILTER (WHERE request_type='return'),0) AS returned_visa_discount,
           COALESCE(SUM(allocated_loyalty_discount) FILTER (WHERE request_type='return'),0) AS returned_loyalty_discount,
           COALESCE(SUM(returned_cost_value) FILTER (WHERE request_type='return'),0) AS returned_cost,
           COALESCE(SUM(price_difference) FILTER (WHERE request_type='exchange'),0) AS exchange_difference,
           COALESCE(SUM(service_fee),0) AS return_service_fees,
           COALESCE(SUM(store_delivery_cost),0) AS store_delivery_cost,
           COALESCE(SUM(net_settlement),0) AS net_settlement
         FROM return_requests
         WHERE status='completed'
           AND completed_at >= $1::date
           AND completed_at < ($2::date + INTERVAL '1 day')`,
        [from,to]
      );
      const giftCosts=await db(
        `SELECT COALESCE(SUM(oi.purchase_price * oi.quantity),0) AS gift_cost
         FROM order_items oi
         JOIN orders o ON o.id=oi.order_id
         WHERE COALESCE(oi.is_gift,FALSE)=TRUE
           AND o.status <> 'cancelled'
           AND o.created_at >= $1::date
           AND o.created_at < ($2::date + INTERVAL '1 day')`,
        [from,to]
      );
      const baseSummary=summary.rows[0]||{};
      const rs=settlements.rows[0]||{};
      const giftCost=Number(giftCosts.rows[0]?.gift_cost||0);
      const grossSales=Number(baseSummary.sales||0);
      const grossCost=Number(baseSummary.cost||0);
      const returnsValue=Number(rs.returns_value||0);
      const returnsGrossValue=Number(rs.returns_gross_value||0);
      const returnedCouponDiscount=Number(rs.returned_coupon_discount||0);
      const returnedVisaDiscount=Number(rs.returned_visa_discount||0);
      const returnedLoyaltyDiscount=Number(rs.returned_loyalty_discount||0);
      const returnedCost=Number(rs.returned_cost||0);
      const exchangeDifference=Number(rs.exchange_difference||0);
      const returnServiceFees=Number(rs.return_service_fees||0);
      const storeDeliveryCost=Number(rs.store_delivery_cost||0);
      const netSales=money(grossSales-returnsValue+exchangeDifference+returnServiceFees);
      const netCost=money(grossCost-returnedCost);
      const netProfit=money(netSales-netCost-storeDeliveryCost);
      return res.json({
        ok:true,from,to,
        summary:{...baseSummary,grossSales,grossCost,giftCost,returnsValue,returnsGrossValue,returnedCouponDiscount,returnedVisaDiscount,returnedLoyaltyDiscount,returnedCost,exchangeDifference,returnServiceFees,storeDeliveryCost,netSettlement:Number(rs.net_settlement||0),sales:netSales,cost:netCost,profit:netProfit},
        rows:rows.rows
      });
    } catch (error) {
      console.error(
        "[SALES REPORT]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل تقرير المبيعات"
      });
    }
  }
);


/* =========================================================
   TOP 5 PRODUCTS - LAST 7 DAYS
   ========================================================= */

app.get(
  "/api/admin/reports/top-five",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            oi.product_id,
            oi.product_name,
            SUM(
              oi.quantity
            )::int AS quantity,
            SUM(
              oi.total
            ) AS sales

          FROM order_items oi

          INNER JOIN orders o
            ON o.id = oi.order_id

          WHERE o.created_at >=
            NOW() - INTERVAL '7 days'

            AND o.status <> 'cancelled'
            AND COALESCE(oi.is_gift,FALSE)=FALSE

          GROUP BY
            oi.product_id,
            oi.product_name

          ORDER BY
            SUM(oi.quantity) DESC,
            SUM(oi.total) DESC

          LIMIT 5
        `);

      return res.json({
        ok: true,
        topFive:
          result.rows
      });
    } catch (error) {
      console.error(
        "[TOP FIVE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل أفضل المنتجات"
      });
    }
  }
);


/* =========================================================
   BEST SELLERS
   ========================================================= */

app.get(
  "/api/admin/reports/best-sellers",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            oi.product_id,
            oi.product_name,
            SUM(
              oi.quantity
            )::int AS quantity,
            SUM(
              oi.total
            ) AS sales

          FROM order_items oi

          INNER JOIN orders o
            ON o.id = oi.order_id

          WHERE o.status <> 'cancelled'
            AND COALESCE(oi.is_gift,FALSE)=FALSE

          GROUP BY
            oi.product_id,
            oi.product_name

          ORDER BY
            SUM(oi.quantity) DESC,
            SUM(oi.total) DESC

          LIMIT 20
        `);

      return res.json({
        ok: true,
        bestSellers:
          result.rows
      });
    } catch (error) {
      console.error(
        "[BEST SELLERS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المنتجات الأكثر مبيعاً"
      });
    }
  }
);


/* =========================================================
   CATEGORY MANAGEMENT
   ========================================================= */

app.post(
  "/api/admin/categories",
  requireAdmin,
  async (req, res) => {
    const name =
      cleanText(
        req.body.name || "",
        200
      );

    if (!name) {
      return res.status(400).json({
        ok: false,
        message:
          "اسم التصنيف مطلوب"
      });
    }

    try {
      const slug =
        slugify(
          req.body.slug ||
          name
        );

      const result =
        await db(
          `
          INSERT INTO categories (
            name,
            slug,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
          [
            name,
            slug
          ]
        );

      return res.status(201).json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[CATEGORY CREATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "هذا التصنيف موجود مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء التصنيف"
      });
    }
  }
);


app.patch(
  "/api/admin/categories/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(id)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم التصنيف غير صالح"
      });
    }

    const fields = [];
    const values = [];

    if (
      req.body.name !==
      undefined
    ) {
      values.push(
        cleanText(
          req.body.name,
          200
        )
      );

      fields.push(
        `name = $${values.length}`
      );
    }

    if (
      req.body.slug !==
      undefined
    ) {
      values.push(
        slugify(
          req.body.slug
        )
      );

      fields.push(
        `slug = $${values.length}`
      );
    }

    if (
      req.body.is_active !==
      undefined
    ) {
      values.push(
        Boolean(
          req.body.is_active
        )
      );

      fields.push(
        `is_active = $${values.length}`
      );
    }

    if (!fields.length) {
      return res.status(400).json({
        ok: false,
        message:
          "لا توجد بيانات للتعديل"
      });
    }

    values.push(id);

    try {
      const result =
        await db(
          `
          UPDATE categories
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "التصنيف غير موجود"
        });
      }

      return res.json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[CATEGORY UPDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل التصنيف"
      });
    }
  }
);


/* =========================================================
   BRAND MANAGEMENT
   ========================================================= */

app.post(
  "/api/admin/brands",
  requireAdmin,
  async (req, res) => {
    const name =
      cleanText(
        req.body.name || "",
        200
      );

    if (!name) {
      return res.status(400).json({
        ok: false,
        message:
          "اسم البراند مطلوب"
      });
    }

    try {
      const slug =
        slugify(
          req.body.slug ||
          name
        );

      const result =
        await db(
          `
          INSERT INTO brands (
            name,
            slug,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
          [
            name,
            slug
          ]
        );

      return res.status(201).json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[BRAND CREATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "هذا البراند موجود مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء البراند"
      });
    }
  }
);


app.patch(
  "/api/admin/brands/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(id)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم البراند غير صالح"
      });
    }

    const fields = [];
    const values = [];

    if (
      req.body.name !==
      undefined
    ) {
      values.push(
        cleanText(
          req.body.name,
          200
        )
      );

      fields.push(
        `name = $${values.length}`
      );
    }

    if (
      req.body.slug !==
      undefined
    ) {
      values.push(
        slugify(
          req.body.slug
        )
      );

      fields.push(
        `slug = $${values.length}`
      );
    }

    if (
      req.body.is_active !==
      undefined
    ) {
      values.push(
        Boolean(
          req.body.is_active
        )
      );

      fields.push(
        `is_active = $${values.length}`
      );
    }

    if (!fields.length) {
      return res.status(400).json({
        ok: false,
        message:
          "لا توجد بيانات للتعديل"
      });
    }

    values.push(id);

    try {
      const result =
        await db(
          `
          UPDATE brands
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "البراند غير موجود"
        });
      }

      return res.json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[BRAND UPDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل البراند"
      });
    }
  }
);


/* =========================================================
   PRODUCT MANAGEMENT
   ========================================================= */

/* =========================================================
   PRODUCT UPDATE
   ========================================================= */

app.patch(
  "/api/admin/products/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(id)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المنتج غير صالح"
      });
    }

    try {
      const fields = [];
      const values = [];

      function add(
        column,
        value
      ) {
        values.push(value);

        fields.push(
          `${column} = $${values.length}`
        );
      }

      if (
        req.body.name !==
        undefined
      ) {
        add(
          "name",
          cleanText(
            req.body.name,
            300
          )
        );
      }

      if (
        req.body.slug !==
        undefined
      ) {
        add(
          "slug",
          slugify(
            req.body.slug
          )
        );
      }

      if (
        req.body.description !==
        undefined
      ) {
        add(
          "description",
          cleanText(
            req.body.description,
            5000
          )
        );
      }

      if (
        req.body.price !==
        undefined
      ) {
        const price =
          Number(
            req.body.price
          );

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          return res.status(400).json({
            ok: false,
            message:
              "السعر غير صالح"
          });
        }

        add(
          "price",
          price
        );
      }

      if (
        req.body.sku !==
        undefined
      ) {
        add(
          "sku",
          cleanText(
            req.body.sku,
            100
          ) || null
        );
      }

      if (
        req.body.category_id !==
          undefined ||
        req.body.categoryId !==
          undefined
      ) {
        add(
          "category_id",
          req.body.category_id ??
          req.body.categoryId ??
          null
        );
      }

      if (
        req.body.brand_id !==
          undefined ||
        req.body.brandId !==
          undefined
      ) {
        add(
          "brand_id",
          req.body.brand_id ??
          req.body.brandId ??
          null
        );
      }

      if (
        req.body.image !==
          undefined ||
        req.body.image_url !==
          undefined
      ) {
        add(
          "image",
          cleanText(
            req.body.image ??
            req.body.image_url ??
            "",
            1000
          ) || null
        );
      }

      if (
        req.body.is_active !==
        undefined
      ) {
        add(
          "is_active",
          Boolean(
            req.body.is_active
          )
        );
      }

      if (!fields.length) {
        return res.status(400).json({
          ok: false,
          message:
            "لا توجد بيانات للتعديل"
        });
      }

      values.push(id);

      const result =
        await db(
          `
          UPDATE products
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المنتج غير موجود"
        });
      }

      return res.json({
        ok: true,
        product:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[PRODUCT UPDATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "SKU أو الرابط المختصر مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل المنتج"
      });
    }
  }
);


/* =========================================================
   PRODUCT VARIANTS
   ========================================================= */

app.post(
  "/api/admin/products/:productId/variants",
  requireAdmin,
  async (req, res) => {
    const productId =
      integer(
        req.params.productId,
        NaN
      );

    if (
      !Number.isFinite(
        productId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المنتج غير صالح"
      });
    }

    const color =
      cleanText(
        req.body.color || "",
        100
      ) || null;

    const size =
      cleanText(
        req.body.size || "",
        100
      ) || null;

    const sku =
      cleanText(
        req.body.sku || "",
        100
      ) || null;

    const price =
      req.body.price !==
      undefined
        ? Number(
            req.body.price
          )
        : null;

    const stock =
      integer(
        req.body.stock ?? 0,
        0
      );

    if (
      stock < 0 ||
      (
        price !== null &&
        (
          !Number.isFinite(price) ||
          price < 0
        )
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "بيانات الخيار غير صالحة"
      });
    }

    try {
      const product =
        await db(
          `
          SELECT id
          FROM products
          WHERE id = $1
          `,
          [productId]
        );

      if (
        !product.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المنتج غير موجود"
        });
      }

      const result =
        await db(
          `
          INSERT INTO product_variants (
            product_id,
            color,
            size,
            sku,
            price,
            stock,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
          [
            productId,
            color,
            size,
            sku,
            price,
            stock
          ]
        );

      return res.status(201).json({
        ok: true,
        variant:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[VARIANT CREATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "SKU مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء الخيار"
      });
    }
  }
);


app.patch(
  "/api/admin/variants/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(id)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم الخيار غير صالح"
      });
    }

    const fields = [];
    const values = [];

    function add(
      column,
      value
    ) {
      values.push(value);

      fields.push(
        `${column} = $${values.length}`
      );
    }

    if (
      req.body.color !==
      undefined
    ) {
      add(
        "color",
        cleanText(
          req.body.color,
          100
        ) || null
      );
    }

    if (
      req.body.size !==
      undefined
    ) {
      add(
        "size",
        cleanText(
          req.body.size,
          100
        ) || null
      );
    }

    if (
      req.body.sku !==
      undefined
    ) {
      add(
        "sku",
        cleanText(
          req.body.sku,
          100
        ) || null
      );
    }

    if (
      req.body.price !==
      undefined
    ) {
      const price =
        Number(
          req.body.price
        );

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "السعر غير صالح"
        });
      }

      add(
        "price",
        price
      );
    }

    if (
      req.body.is_active !==
      undefined
    ) {
      add(
        "is_active",
        Boolean(
          req.body.is_active
        )
      );
    }

    if (!fields.length) {
      return res.status(400).json({
        ok: false,
        message:
          "لا توجد بيانات للتعديل"
      });
    }

    values.push(id);

    try {
      const result =
        await db(
          `
          UPDATE product_variants
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "الخيار غير موجود"
        });
      }

      return res.json({
        ok: true,
        variant:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[VARIANT UPDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل الخيار"
      });
    }
  }
);


/* =========================================================
   COUPON VALIDATION - PUBLIC CHECKOUT
   ========================================================= */

app.post(
  "/api/coupons/validate",
  optionalAuth,
  async (req, res) => {
    const code =
      cleanText(
        req.body?.code || "",
        100
      ).toUpperCase();

    const subtotal =
      Math.max(
        0,
        money(
          req.body?.subtotal || 0
        )
      );

    if (!code) {
      return res.status(400).json({
        ok: false,
        code: "COUPON_REQUIRED",
        message: "أدخلي كود الخصم"
      });
    }

    try {
      const result =
        await db(
          `
          SELECT *
          FROM coupons
          WHERE UPPER(code) = $1
            AND is_active = TRUE
            AND (
              starts_at IS NULL
              OR starts_at <= NOW()
            )
            AND (
              expires_at IS NULL
              OR expires_at >= NOW()
            )
          LIMIT 1
          `,
          [code]
        );

      if (!result.rowCount) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_COUPON",
          message: "كود الخصم غير صحيح أو غير فعال"
        });
      }

      const coupon =
        result.rows[0];

      const maxUses =
        Math.max(
          0,
          Number(
            coupon.max_uses || 0
          ) || 0
        );

      const usedCount =
        Math.max(
          0,
          Number(
            coupon.used_count || 0
          ) || 0
        );

      if (
        maxUses > 0 &&
        usedCount >= maxUses
      ) {
        return res.status(400).json({
          ok: false,
          code: "COUPON_EXHAUSTED",
          message: "انتهت استخدامات الكوبون"
        });
      }

      const maxUsesPerCustomer =
        Math.max(
          0,
          Number(
            coupon.max_uses_per_customer ||
            0
          ) || 0
        );

      const suppliedPhone =
        cleanText(
          req.body?.customerPhone ||
          req.body?.customer_phone ||
          "",
          100
        );

      if (
        maxUsesPerCustomer > 0 &&
        (
          req.user?.id ||
          suppliedPhone
        )
      ) {
        let usageResult;

        if (req.user?.id) {
          usageResult =
            await db(
              `
              SELECT COUNT(*)::int AS count
              FROM orders
              WHERE UPPER(COALESCE(coupon_code,'')) = $1
                AND user_id = $2
                AND COALESCE(LOWER(status),'') NOT IN ('cancelled','canceled','ملغي')
              `,
              [
                code,
                req.user.id
              ]
            );
        } else {
          const phoneKey =
            String(
              suppliedPhone
            ).replace(/\D/g, "");

          usageResult =
            await db(
              `
              SELECT COUNT(*)::int AS count
              FROM orders
              WHERE UPPER(COALESCE(coupon_code,'')) = $1
                AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g') = $2
                AND COALESCE(LOWER(status),'') NOT IN ('cancelled','canceled','ملغي')
              `,
              [
                code,
                phoneKey
              ]
            );
        }

        if (
          Number(
            usageResult.rows[0]?.count ||
            0
          ) >= maxUsesPerCustomer
        ) {
          return res.status(400).json({
            ok: false,
            code: "COUPON_CUSTOMER_LIMIT",
            message: "تم استخدام هذا الكوبون الحد الأقصى المسموح لهذا الزبون"
          });
        }
      }

      const minimumAmount =
        Math.max(
          0,
          Number(
            coupon.minimum_amount ??
            coupon.min_order ??
            0
          ) || 0
        );

      if (
        subtotal <
        minimumAmount
      ) {
        return res.status(400).json({
          ok: false,
          code: "COUPON_MINIMUM",
          message:
            `الحد الأدنى لاستخدام الكوبون هو ${minimumAmount.toFixed(2)} ₪`,
          minimumAmount
        });
      }

      const discountType =
        String(
          coupon.discount_type ||
          "percent"
        ).toLowerCase();

      const discountValue =
        Math.max(
          0,
          Number(
            coupon.discount_value || 0
          ) || 0
        );

      if (
        !["fixed", "percent"].includes(
          discountType
        ) ||
        (
          discountType === "percent" &&
          discountValue > 100
        )
      ) {
        return res.status(400).json({
          ok: false,
          code: "INVALID_COUPON_VALUE",
          message: "قيمة الكوبون غير صالحة"
        });
      }

      const discount =
        discountType === "fixed"
          ? Math.min(
              subtotal,
              discountValue
            )
          : Math.min(
              subtotal,
              subtotal *
                (discountValue / 100)
            );

      return res.json({
        ok: true,
        coupon: {
          code:
            coupon.code,
          discountType,
          discountValue,
          minimumAmount,
          maxUses,
          usedCount,
          maxUsesPerCustomer,
          startsAt:
            coupon.starts_at ||
            null,
          expiresAt:
            coupon.expires_at ||
            null
        },
        discount:
          money(discount)
      });
    } catch (error) {
      console.error(
        "[COUPON VALIDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "تعذر التحقق من كود الخصم"
      });
    }
  }
);


/* =========================================================
   COUPONS
   ========================================================= */

app.get(
  "/api/admin/coupons",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT *
          FROM coupons
          ORDER BY
            created_at DESC
        `);

      return res.json({
        ok: true,
        coupons:
          result.rows
      });
    } catch (error) {
      console.error(
        "[COUPONS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الكوبونات"
      });
    }
  }
);


app.post(
  "/api/admin/coupons",
  requireAdmin,
  async (req, res) => {
    const code =
      cleanText(
        req.body.code || "",
        100
      ).toUpperCase();

    const discountType =
      cleanText(
        req.body.discount_type ||
        req.body.discountType ||
        "percent",
        30
      ).toLowerCase();

    const discountValue =
      Number(
        req.body.discount_value ??
        req.body.discountValue ??
        0
      );

    if (
      !code ||
      !["percent", "fixed"].includes(
        discountType
      ) ||
      !Number.isFinite(
        discountValue
      ) ||
      discountValue < 0 ||
      (
        discountType ===
          "percent" &&
        discountValue > 100
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "بيانات الكوبون غير صالحة"
      });
    }

    try {
      const result =
        await db(
          `
          INSERT INTO coupons (
            code,
            discount_type,
            discount_value,
            minimum_amount,
            max_uses,
            max_uses_per_customer,
            used_count,
            starts_at,
            expires_at,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            0,
            $7,
            $8,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
          [
            code,
            discountType,
            discountValue,
            Math.max(
              0,
              Number(
                req.body.minimum_amount ??
                req.body.minimumAmount ??
                0
              ) || 0
            ),
            Math.max(
              0,
              integer(
                req.body.max_uses ??
                req.body.maxUses ??
                0,
                0
              )
            ),
            Math.max(
              0,
              integer(
                req.body.max_uses_per_customer ??
                req.body.maxUsesPerCustomer ??
                0,
                0
              )
            ),
            req.body.starts_at ||
              req.body.startsAt ||
              null,
            req.body.expires_at ||
              req.body.expiresAt ||
              null
          ]
        );

      return res.status(201).json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[COUPON CREATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "رمز الكوبون مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء الكوبون"
      });
    }
  }
);


app.patch(
  "/api/admin/coupons/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (
      !Number.isFinite(id)
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم الكوبون غير صالح"
      });
    }

    const fields = [];
    const values = [];

    function add(
      column,
      value
    ) {
      values.push(value);

      fields.push(
        `${column} = $${values.length}`
      );
    }

    if (
      req.body.is_active !==
      undefined
    ) {
      add(
        "is_active",
        Boolean(
          req.body.is_active
        )
      );
    }

    if (
      req.body.discount_value !==
      undefined
    ) {
      const value =
        Number(
          req.body.discount_value
        );

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "قيمة الخصم غير صالحة"
        });
      }

      add(
        "discount_value",
        value
      );
    }

    if (
      req.body.discount_type !== undefined ||
      req.body.discountType !== undefined
    ) {
      const value =
        cleanText(
          req.body.discount_type ??
          req.body.discountType,
          30
        ).toLowerCase();

      if (!["percent","fixed"].includes(value)) {
        return res.status(400).json({
          ok: false,
          message: "نوع الخصم غير صالح"
        });
      }

      add("discount_type", value);
    }

    if (
      req.body.minimum_amount !== undefined ||
      req.body.minimumAmount !== undefined
    ) {
      add(
        "minimum_amount",
        Math.max(
          0,
          Number(
            req.body.minimum_amount ??
            req.body.minimumAmount ??
            0
          ) || 0
        )
      );
    }

    if (
      req.body.max_uses !== undefined ||
      req.body.maxUses !== undefined
    ) {
      add(
        "max_uses",
        Math.max(
          0,
          integer(
            req.body.max_uses ??
            req.body.maxUses ??
            0,
            0
          )
        )
      );
    }

    if (
      req.body.max_uses_per_customer !== undefined ||
      req.body.maxUsesPerCustomer !== undefined
    ) {
      add(
        "max_uses_per_customer",
        Math.max(
          0,
          integer(
            req.body.max_uses_per_customer ??
            req.body.maxUsesPerCustomer ??
            0,
            0
          )
        )
      );
    }

    if (
      req.body.starts_at !== undefined ||
      req.body.startsAt !== undefined
    ) {
      add(
        "starts_at",
        req.body.starts_at ||
        req.body.startsAt ||
        null
      );
    }

    if (
      req.body.expires_at !== undefined ||
      req.body.expiresAt !== undefined
    ) {
      add(
        "expires_at",
        req.body.expires_at ||
        req.body.expiresAt ||
        null
      );
    }

    if (!fields.length) {
      return res.status(400).json({
        ok: false,
        message:
          "لا توجد بيانات للتعديل"
      });
    }

    values.push(id);

    try {
      const result =
        await db(
          `
          UPDATE coupons
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "الكوبون غير موجود"
        });
      }

      return res.json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[COUPON UPDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل الكوبون"
      });
    }
  }
);


app.delete(
  "/api/admin/coupons/:id",
  requireAdmin,
  async (req, res) => {
    const id =
      integer(
        req.params.id,
        NaN
      );

    if (!Number.isFinite(id)) {
      return res.status(400).json({
        ok: false,
        message: "رقم الكوبون غير صالح"
      });
    }

    try {
      const result =
        await db(
          `
          DELETE FROM coupons
          WHERE id = $1
          RETURNING id, code
          `,
          [id]
        );

      if (!result.rowCount) {
        return res.status(404).json({
          ok: false,
          message: "الكوبون غير موجود"
        });
      }

      return res.json({
        ok: true,
        message: "تم حذف الكوبون",
        coupon: result.rows[0]
      });
    } catch (error) {
      console.error(
        "[COUPON DELETE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message: "تعذر حذف الكوبون"
      });
    }
  }
);


/* =========================================================
   SETTINGS MANAGEMENT
   ========================================================= */

app.get(
  "/api/admin/settings",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            key,
            value
          FROM settings
          ORDER BY key
        `);

      const settings = {};

      for (
        const row of result.rows
      ) {
        settings[row.key] =
          parseJson(
            row.value,
            row.value
          );
      }

      return res.json({
        ok: true,
        settings
      });
    } catch (error) {
      console.error(
        "[ADMIN SETTINGS]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الإعدادات"
      });
    }
  }
);


app.put(
  "/api/admin/settings",
  requireAdmin,
  async (req, res) => {
    let incoming =
      req.body &&
      typeof req.body ===
        "object"
        ? req.body
        : {};

    try {
      incoming = validateHomepageSettings(incoming);

      const changesMaintenance =
        Object.prototype.hasOwnProperty.call(incoming,"maintenance_mode") ||
        Object.prototype.hasOwnProperty.call(incoming,"maintenance_message");

      if (
        changesMaintenance &&
        String(req.user?.role || "").toLowerCase() !== "owner"
      ) {
        return res.status(403).json({
          ok:false,
          code:"OWNER_ONLY_MAINTENANCE",
          message:"وضع الطوارئ / الصيانة متاح للمالك فقط"
        });
      }

      await transaction(
        async (client) => {
          for (
            const [
              key,
              value
            ] of Object.entries(
              incoming
            )
          ) {
            const safeKey =
              cleanText(
                key,
                150
              );

            if (!safeKey) {
              continue;
            }

            await client.query(
              `
              INSERT INTO settings (
                key,
                value,
                updated_at
              )
              VALUES (
                $1,
                $2::jsonb,
                NOW()
              )
              ON CONFLICT (key)
              DO UPDATE SET
                value =
                  EXCLUDED.value,
                updated_at =
                  NOW()
              `,
              [
                safeKey,
                JSON.stringify(
                  value
                )
              ]
            );
          }
        }
      );

      return res.json({
        ok: true,
        message:
          "تم حفظ الإعدادات"
      });
    } catch (error) {
      console.error(
        "[ADMIN SETTINGS SAVE]",
        error
      );

      return res.status(error.status || 500).json({
        ok: false,
        message:
          error.status === 400 ? error.message : "تعذر حفظ الإعدادات"
      });
    }
  }
);


/* =========================================================
   CHANGE OWN PASSWORD
   ========================================================= */

app.patch(
  "/api/auth/password",
  requireAuth,
  async (req, res) => {
    const currentPassword =
      String(
        req.body.currentPassword ||
        req.body.current_password ||
        ""
      );

    const newPassword =
      String(
        req.body.newPassword ||
        req.body.new_password ||
        ""
      );

    if (
      newPassword.length < 12
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل"
      });
    }

    try {
      const result =
        await db(
          `
          SELECT
            id,
            password_hash
          FROM users
          WHERE id = $1
          `,
          [req.user.id]
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      const valid =
        await verifyPassword(
          currentPassword,
          result.rows[0]
            .password_hash
        );

      if (!valid) {
        return res.status(401).json({
          ok: false,
          message:
            "كلمة المرور الحالية غير صحيحة"
        });
      }

      const hash =
        await hashPassword(
          newPassword
        );

      await db(
        `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          hash,
          req.user.id
        ]
      );

      return res.json({
        ok: true,
        message:
          "تم تغيير كلمة المرور"
      });
    } catch (error) {
      console.error(
        "[CHANGE PASSWORD]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تغيير كلمة المرور"
      });
    }
  }
);


/* =========================================================
   ADMIN STAFF
   ========================================================= */

app.get(
  "/api/admin/staff",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            id,
            name,
            email,
            phone,
            gender,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
          FROM users
          WHERE role IN (
            'owner',
            'admin',
            'staff'
          )
          ORDER BY
            CASE role
              WHEN 'owner' THEN 1
              WHEN 'admin' THEN 2
              WHEN 'staff' THEN 3
              ELSE 4
            END,
            created_at DESC
        `);

      return res.json({
        ok: true,
        staff:
          result.rows
      });
    } catch (error) {
      console.error(
        "[STAFF]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الموظفين"
      });
    }
  }
);


/* =========================================================
   CREATE STAFF / ADMIN
   ========================================================= */

app.post(
  "/api/admin/staff",
  requireOwner,
  async (req, res) => {
    const name =
      cleanText(
        req.body.name || "",
        200
      );

    const email =
      normalizeEmail(
        req.body.email
      );

    const phone =
      normalizePhone(
        req.body.phone
      );

    const genderRaw =
      cleanText(
        req.body.gender || "",
        20
      ).toLowerCase();

    const gender =
      ["male","female"].includes(genderRaw)
        ? genderRaw
        : null;

    const password =
      String(
        req.body.password ||
        ""
      );

    const role =
      String(
        req.body.role ||
        "staff"
      ).toLowerCase();

    if (
      !name ||
      !email ||
      password.length < 12
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "الاسم والبريد وكلمة المرور مطلوبة"
      });
    }

    if (
      !["admin", "staff"].includes(
        role
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "الدور غير صالح"
      });
    }

    try {
      const passwordHash =
        await hashPassword(
          password
        );

      const result =
        await db(
          `
          INSERT INTO users (
            name,
            email,
            phone,
            gender,
            password_hash,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7::jsonb,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            role,
            permissions,
            is_active,
            created_at,
            updated_at
          `,
          [
            name,
            email,
            phone,
            gender,
            passwordHash,
            role,
            JSON.stringify(
              role === "staff"
                ? normalizePermissions(req.body.permissions)
                : []
            )
          ]
        );

      return res.status(201).json({
        ok: true,
        staff:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[STAFF CREATE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "البريد الإلكتروني أو رقم الهاتف مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر إنشاء الموظف"
      });
    }
  }
);


/* =========================================================
   STAFF ROLE UPDATE
   ========================================================= */

app.patch(
  "/api/admin/staff/:id",
  requireOwner,
  async (req, res) => {
    const id = integer(req.params.id, NaN);

    if (!Number.isFinite(id)) {
      return res.status(400).json({
        ok: false,
        message: "رقم الموظف غير صالح"
      });
    }

    try {
      const currentResult = await db(
        `
        SELECT id, role, permissions, is_active, gender
        FROM users
        WHERE id = $1
          AND role <> 'owner'
        LIMIT 1
        `,
        [id]
      );

      if (!currentResult.rowCount) {
        return res.status(404).json({
          ok: false,
          message: "الموظف غير موجود أو هو Owner"
        });
      }

      const current = currentResult.rows[0];
      const role = req.body.role !== undefined
        ? String(req.body.role || "").toLowerCase()
        : String(current.role || "staff").toLowerCase();

      if (!["admin", "staff"].includes(role)) {
        return res.status(400).json({
          ok: false,
          message: "الدور غير صالح"
        });
      }

      const permissions = role === "staff"
        ? normalizePermissions(
            req.body.permissions !== undefined
              ? req.body.permissions
              : current.permissions
          )
        : [];

      const active = req.body.is_active !== undefined
        ? Boolean(req.body.is_active)
        : Boolean(current.is_active);

      const requestedGender = req.body.gender !== undefined
        ? cleanText(req.body.gender || "",20).toLowerCase()
        : String(current.gender || "").toLowerCase();

      if (requestedGender && !["male","female"].includes(requestedGender)) {
        return res.status(400).json({
          ok:false,
          message:"الجنس غير صالح"
        });
      }

      const gender = requestedGender || null;

      const result = await db(
        `
        UPDATE users
        SET
          role = $1,
          permissions = $2::jsonb,
          is_active = $3,
          gender = $4,
          updated_at = NOW()
        WHERE id = $5
          AND role <> 'owner'
        RETURNING
          id,
          name,
          email,
          phone,
          gender,
          role,
          permissions,
          is_active,
          updated_at
        `,
        [
          role,
          JSON.stringify(permissions),
          active,
          gender,
          id
        ]
      );

      return res.json({
        ok: true,
        staff: result.rows[0]
      });
    } catch (error) {
      console.error("[STAFF UPDATE]", error);
      return res.status(500).json({
        ok: false,
        message: "تعذر تعديل الموظف"
      });
    }
  }
);


/* =========================================================
   FAVORITES - ADD
   ========================================================= */

app.post(
  "/api/favorites",
  requireAuth,
  async (req, res) => {
    const productId =
      integer(
        req.body.productId ??
        req.body.product_id,
        NaN
      );

    if (
      !Number.isFinite(
        productId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المنتج غير صالح"
      });
    }

    try {
      await db(
        `
        INSERT INTO favorites (
          user_id,
          product_id,
          created_at
        )
        VALUES (
          $1,
          $2,
          NOW()
        )
        ON CONFLICT DO NOTHING
        `,
        [
          req.user.id,
          productId
        ]
      );

      return res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "[FAVORITE ADD]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ المفضلة"
      });
    }
  }
);


/* =========================================================
   FAVORITES - DELETE
   ========================================================= */

app.delete(
  "/api/favorites/:productId",
  requireAuth,
  async (req, res) => {
    const productId =
      integer(
        req.params.productId,
        NaN
      );

    if (
      !Number.isFinite(
        productId
      )
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "رقم المنتج غير صالح"
      });
    }

    try {
      await db(
        `
        DELETE FROM favorites
        WHERE user_id = $1
          AND product_id = $2
        `,
        [
          req.user.id,
          productId
        ]
      );

      return res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "[FAVORITE DELETE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر حذف المفضلة"
      });
    }
  }
);


/* =========================================================
   FAVORITES - LIST
   ========================================================= */

app.get(
  "/api/favorites",
  requireAuth,
  async (req, res) => {
    try {
      const result =
        await db(
          `
          SELECT
            p.*
          FROM favorites f
          INNER JOIN products p
            ON p.id = f.product_id
          WHERE f.user_id = $1
          ORDER BY
            f.created_at DESC
          `,
          [req.user.id]
        );

      return res.json({
        ok: true,
        favorites:
          result.rows
      });
    } catch (error) {
      console.error(
        "[FAVORITES LIST]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المفضلة"
      });
    }
  }
);


/* =========================================================
   USER PROFILE UPDATE
   ========================================================= */

app.patch(
  "/api/users/me",
  requireAuth,
  async (req, res) => {
    const fields = [];
    const values = [];

    function add(
      column,
      value
    ) {
      values.push(value);

      fields.push(
        `${column} = $${values.length}`
      );
    }

    if (
      req.body.name !==
      undefined
    ) {
      add(
        "name",
        cleanText(
          req.body.name,
          200
        )
      );
    }

    if (
      req.body.email !==
      undefined
    ) {
      add(
        "email",
        normalizeEmail(
          req.body.email
        )
      );
    }

    if (
      req.body.phone !==
      undefined
    ) {
      add(
        "phone",
        normalizePhone(
          req.body.phone
        )
      );
    }

    if (
      req.body.gender !==
      undefined
    ) {
      add(
        "gender",
        cleanText(
          req.body.gender,
          50
        ) || null
      );
    }

    if (
      req.body.age !==
      undefined
    ) {
      const age =
        integer(
          req.body.age,
          NaN
        );

      if (
        !Number.isFinite(age) ||
        age < 1 ||
        age > 120
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "العمر غير صالح"
        });
      }

      add(
        "age",
        age
      );
    }

    if (
      req.body.whatsapp_opt_in !==
      undefined ||
      req.body.whatsappOptIn !==
      undefined
    ) {
      const rawOptIn =
        req.body.whatsapp_opt_in !== undefined
          ? req.body.whatsapp_opt_in
          : req.body.whatsappOptIn;

      const enabled =
        rawOptIn === true ||
        rawOptIn === 1 ||
        rawOptIn === "1" ||
        String(rawOptIn).toLowerCase() === "true";

      add(
        "whatsapp_opt_in",
        enabled
      );

      add(
        "whatsapp_opt_in_updated_at",
        new Date()
      );
    }

    if (!fields.length) {
      return res.status(400).json({
        ok: false,
        message:
          "لا توجد بيانات للتعديل"
      });
    }

    values.push(
      req.user.id
    );

    try {
      const result =
        await db(
          `
          UPDATE users
          SET
            ${fields.join(", ")},
            updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING *
          `,
          values
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      return res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[USER PROFILE]",
        error
      );

      if (
        String(error.code) ===
        "23505"
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "البريد أو رقم الهاتف مستخدم مسبقاً"
        });
      }

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحديث البيانات"
      });
    }
  }
);


/* =========================================================
   LOYALTY POINTS
   ========================================================= */

app.get(
  "/api/loyalty",
  requireAuth,
  async (req, res) => {
    try {
      const userResult =
        await db(
          `
          SELECT
            loyalty_points
          FROM users
          WHERE id = $1
          `,
          [req.user.id]
        );

      const transactions =
        await db(
          `
          SELECT *
          FROM loyalty_points_transactions
          WHERE user_id = $1
          ORDER BY
            created_at DESC
          LIMIT 200
          `,
          [req.user.id]
        );

      const [
        enabled,
        redeemEnabled,
        pointValue,
        pointsPerCurrency,
        earningMode,
        pointsPerOrder
      ] = await Promise.all([
        getSetting("loyalty_enabled", true),
        getSetting("loyalty_redeem_enabled", true),
        getSetting("loyalty_point_value", 0.1),
        getSetting("loyalty_points_per_currency", 1),
        getSetting("loyalty_earning_mode", "amount"),
        getSetting("loyalty_points_per_order", 10)
      ]);

      return res.json({
        ok: true,
        points:
          Number(
            userResult.rows[0]
              ?.loyalty_points || 0
          ),
        settings: {
          enabled: enabled !== false,
          redeemEnabled: redeemEnabled !== false,
          pointValue: Math.max(0, Number(pointValue) || 0),
          pointsPerCurrency: Math.max(0, Number(pointsPerCurrency) || 0),
          earningMode: String(earningMode || "amount") === "order" ? "order" : "amount",
          pointsPerOrder: Math.max(0, Number(pointsPerOrder) || 0)
        },
        transactions:
          transactions.rows
      });
    } catch (error) {
      console.error(
        "[LOYALTY]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل النقاط"
      });
    }
  }
);


/* =========================================================
   HEALTH
   ========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      const status =
        await getDatabaseStatus();

      return res.json({
        ok: true,
        service:
          "ladies-first",
        database:
          status,
        time:
          new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        service:
          "ladies-first",
        message:
          "Health check failed"
      });
    }
  }
);


/* =========================================================
   ADMIN HEALTH
   ========================================================= */

app.get(
  "/api/admin/health",
  requireAdmin,
  async (req, res) => {
    try {
      const status =
        await getDatabaseStatus();

      return res.json({
        ok: true,
        database:
          status,
        serverTime:
          new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message:
          "تعذر فحص النظام"
      });
    }
  }
);


/* =========================================================
   STATIC FRONTEND
   ========================================================= */

const frontendPath =
  path.join(
    __dirname,
    "../../frontend"
  );

if (
  fs.existsSync(
    frontendPath
  )
) {
  app.use(
    express.static(
      frontendPath,
      {
        extensions: [
          "html"
        ]
      }
    )
  );
}


/* =========================================================
   ADMIN HTML
   ========================================================= */

app.get(
  [
    "/admin",
    "/admin/",
    "/admin.html"
  ],
  (req, res) => {
    const adminFile =
      path.join(
        frontendPath,
        "admin.html"
      );

    if (
      fs.existsSync(
        adminFile
      )
    ) {
      return res.sendFile(
        adminFile
      );
    }

    return res.status(404).send(
      "Admin page not found"
    );
  }
);


/* =========================================================
   WAITLIST
========================================================= */

require("./waitlist").registerWaitlistRoutes(app, {
  db,
  requireAdmin,
  requireAuth,
  optionalAuth,
  normalizePhone
});


/* =========================================================
   CART TRACKING
========================================================= */

require("./cart-tracking").registerCartTrackingRoutes(app, {
  db,
  requireAuth,
  requireAdmin
});

/* =========================================================
   CUSTOMER ORDER BLOCK HISTORY
========================================================= */

require("./order-block-history").registerOrderBlockHistoryRoutes(app, {
  db,
  requireAdmin
});

/* =========================================================
   CUSTOMER ACCOUNT STATE
========================================================= */

require("./account-state").registerAccountStateRoutes(app, {
  db,
  requireAuth,
  transaction
});


/* =========================================================
   WHATSAPP AUTOMATION
========================================================= */

require("./whatsapp-automation").registerWhatsAppAutomationRoutes(app, {
  db,
  requireAdmin
});

/* =========================================================
   STAFF LOGIN ANNOUNCEMENTS
========================================================= */

require("./staff-messages").registerStaffMessageRoutes(app, {
  db,
  requireAdmin
});

/* =========================================================
   PASSKEY / BIOMETRIC LOGIN
========================================================= */

require("./passkeys").registerPasskeyRoutes(app, {
  db,
  requireAuth
});

/* =========================================================
   PASSWORD RECOVERY
========================================================= */

require("./password-recovery").registerPasswordRecoveryRoutes(app, {
  db,
  transaction
});

/* =========================================================
   SECURE PUBLIC ORDER QR
========================================================= */

require("./order-public-access").registerOrderPublicAccessRoutes(app, {
  db,
  requireAdmin
});


/* =========================================================
   SPA FALLBACK
   ========================================================= */

app.get(
  "/{*splat}",
  (req, res, next) => {
    /*
     * لا نعيد index.html
     * لطلبات API.
     */
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return next();
    }

    /*
     * الملفات الموجودة فعلياً
     * يتم تقديمها بواسطة express.static.
     */
    const requestedPath =
      path.join(
        frontendPath,
        req.path
      );

    if (
      req.path !== "/" &&
      fs.existsSync(
        requestedPath
      ) &&
      fs.statSync(
        requestedPath
      ).isFile()
    ) {
      return res.sendFile(
        requestedPath
      );
    }

    const indexFile =
      path.join(
        frontendPath,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
    ) {
      return res.sendFile(
        indexFile
      );
    }

    return next();
  }
);


/* =========================================================
   404
   ========================================================= */

app.use(
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res.status(404).json({
        ok: false,
        message:
          "API endpoint not found"
      });
    }

    return res.status(404).send(
      "Page not found"
    );
  }
);


/* =========================================================
   GLOBAL ERROR HANDLER
   ========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "[GLOBAL ERROR]",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res.status(
      error.status || 500
    ).json({
      ok: false,
      code:
        error.code ||
        "INTERNAL_ERROR",
      message:
        (error.status && error.status < 500) ? error.message : "حدث خطأ غير متوقع"
    });
  }
);


/* =========================================================
   SERVER START
   ========================================================= */


async function startServer() {
  try {
    await initDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Ladies First server running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "[SERVER START ERROR]",
      error
    );

    process.exit(1);
  }
}

if (require.main === module) startServer();

module.exports = { app, initDatabase };


/* =========================================================
   END OF SERVER.JS
   ========================================================= */
