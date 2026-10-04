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

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

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
      "الكمية خلصت، حقك علينا"
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

  await require('./product-media').initMedia();
  await db(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);

  await db(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
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

      loyalty_points_reversed INTEGER
        NOT NULL DEFAULT 0,

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
    INTEGER NOT NULL DEFAULT 0
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

  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_region TEXT`);
  await db(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_waived BOOLEAN NOT NULL DEFAULT FALSE`);

  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS image TEXT`);
  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS minimum_amount NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`);
  await db(`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await db(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      request_type TEXT NOT NULL CHECK (request_type IN ('return','exchange')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
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
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_product_name TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_variant_name TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS replacement_unit_price NUMERIC(12,2)`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS fee_payer TEXT NOT NULL DEFAULT 'customer'`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS service_fee NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS fee_reason TEXT`);
  await db(`ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS price_difference NUMERIC(12,2) NOT NULL DEFAULT 0`);

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
    DO UPDATE SET
      value = '"0562499924"'::jsonb
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
        String(password).length < 6
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
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
            loyalty_points,
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
        String(password).length < 8
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "كلمة مرور المالك يجب أن تكون 8 أحرف على الأقل"
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
    "p.created_at DESC"
) {
  const result =
    await db(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.old_price AS "oldPrice",
        p.old_price,
        p.cost_price,
        p.metadata,
        (SELECT name FROM categories WHERE id = p.category_id) AS category,
        (SELECT name FROM brands WHERE id = p.brand_id) AS brand,
        COALESCE((SELECT json_agg(image_url ORDER BY sort_order, id) FROM product_images WHERE product_id=p.id AND is_primary=TRUE), '[]'::json) AS "mainImages",
        COALESCE((SELECT json_agg(image_url ORDER BY sort_order, id) FROM product_images WHERE product_id=p.id AND is_primary=FALSE), '[]'::json) AS "subImages",
        p.stock,
        p.image_url AS "imageUrl",
        p.category_id AS "categoryId",
        p.brand_id AS "brandId",
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
        p.is_active = TRUE
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
        settings[row.key] =
          parseJson(
            row.value,
            row.value
          );
      }

      settings.whatsapp_number =
        "0562499924";

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
  requireAuth,
  async (req, res) => {
    const userId = req.user.id;

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
          let subtotal = 0;
          let couponDiscount = 0;
          let visaDiscount = 0;

          const normalizedItems = [];

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
                FOR UPDATE
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
                "الكمية خلصت، حقك علينا"
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
          const shippingFees = { westbank: 20, jerusalem: 35, inside: 70 };
          if (!Object.prototype.hasOwnProperty.call(shippingFees, shippingRegion)) {
            throw createHttpError(400,"BAD_SHIPPING_REGION","منطقة التوصيل غير صالحة");
          }
          const shippingWaived = req.body.shippingWaived === true && req.user && ["owner","admin"].includes(String(req.user.role||"").toLowerCase());
          const shipping = shippingWaived ? 0 : shippingFees[shippingRegion];

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
          if (requestedPoints > 0 && loyaltyEnabled && redeemEnabled) {
            const ur = await client.query("SELECT loyalty_points FROM users WHERE id=$1 FOR UPDATE",[userId]);
            const balance = Number(ur.rows[0]?.loyalty_points || 0);
            pointsRedeemed = Math.min(requestedPoints, balance);
            loyaltyDiscount = Math.min(pointsRedeemed * pointValue, Math.max(0, subtotal - couponDiscount - visaDiscount));
          }

          const total = Math.max(0, subtotal - couponDiscount - visaDiscount - loyaltyDiscount + shipping + packaging);

          const pointsRate = Math.max(0, Number(await getSetting("loyalty_points_per_currency", 1, client)) || 0);
          const pointsBase = Math.max(0, subtotal - couponDiscount - visaDiscount - loyaltyDiscount);
          const loyaltyPoints = loyaltyEnabled ? calculateLoyaltyPoints(pointsBase, pointsRate) : 0;

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
                0,
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
                    oi.purchase_price
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

      return res.json({
        ok: true,
        order:
          orderResult.rows[0],
        items:
          itemsResult.rows
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
  const reason=cleanText(req.body.reason||"");
  const notes=cleanText(req.body.notes||"");
  const images=Array.isArray(req.body.images)?req.body.images.filter(x=>typeof x==="string").slice(0,5):[];
  if(!Number.isFinite(orderId)||!Number.isFinite(orderItemId)||!Number.isFinite(quantity)||quantity<1)
    return res.status(400).json({ok:false,message:"بيانات طلب الإرجاع/الاستبدال غير مكتملة"});
  if(!["return","exchange"].includes(requestType))
    return res.status(400).json({ok:false,message:"اختاري إرجاع أو استبدال"});
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
      if(quantity>Number(item.rows[0].quantity||0))throw createHttpError(400,"BAD_QTY","الكمية المطلوبة أكبر من الكمية المشتراة");
      const dup=await client.query(`SELECT 1 FROM return_requests WHERE order_item_id=$1 AND status IN ('pending','approved') LIMIT 1`,[orderItemId]);
      if(dup.rowCount)throw createHttpError(409,"RETURN_EXISTS","يوجد طلب إرجاع/استبدال مفتوح لهذا المنتج");
      const ins=await client.query(`INSERT INTO return_requests(order_id,user_id,order_item_id,request_type,quantity,reason,notes,images) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *`,
        [orderId,req.user.id,orderItemId,requestType,quantity,reason,notes,JSON.stringify(images)]);
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
      const q=await client.query(`SELECT rr.*,oi.product_id,oi.variant_id,oi.unit_price FROM return_requests rr JOIN order_items oi ON oi.id=rr.order_item_id WHERE rr.id=$1 FOR UPDATE`,[id]);
      if(!q.rowCount)throw createHttpError(404,"RETURN_NOT_FOUND","الطلب غير موجود");
      const rr=q.rows[0], completing=status==="completed"&&rr.status!=="completed";
      const requestedFeePayer=cleanText(req.body.feePayer??rr.fee_payer??"customer",20).toLowerCase();
      if(!["customer","store","waived"].includes(requestedFeePayer))throw createHttpError(400,"BAD_FEE_PAYER","حددي من يتحمل رسوم الإرجاع/الاستبدال");
      const serviceFee=requestedFeePayer==="customer"?Math.max(0,money(req.body.serviceFee??rr.service_fee??0)):0;
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
      if(completing){
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
      const u=await client.query(`UPDATE return_requests SET status=$1,admin_note=$2,replacement_product_id=$3,replacement_variant_id=$4,replacement_product_name=$5,replacement_variant_name=$6,replacement_unit_price=$7,fee_payer=$8,service_fee=$9,fee_reason=$10,price_difference=$11,updated_at=NOW() WHERE id=$12 RETURNING *`,[status,adminNote,replacementProductId,replacementVariantId,replacementProductName,replacementVariantName,replacementUnitPrice,requestedFeePayer,serviceFee,feeReason,priceDifference,id]);return u.rows[0];
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
                    oi.purchase_price
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

            /*
             * الإلغاء يحدث مرة واحدة فقط.
             */
            const isNewCancellation =
              newStatus ===
                "cancelled" &&
              oldStatus !==
                "cancelled";

            if (
              isNewCancellation
            ) {
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
            }

            const updated =
              await client.query(
                `
                UPDATE orders
                SET status = $1,
                    delivered_at = CASE WHEN $1 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [
                  newStatus,
                  orderId
                ]
              );

            return updated.rows[0];
          }
        );

      return res.json({
        ok: true,
        message:
          "تم تحديث حالة الطلب",
        order: result
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
      const o=q.rows[0],fees={westbank:20,jerusalem:35,inside:70};
      const normalShipping=Math.max(0,Number(fees[String(o.shipping_region||"westbank").toLowerCase()] ?? o.shipping_cost ?? 0));
      const shipping=waived?0:normalShipping;
      const total=Math.max(0,Number(o.subtotal||0)-Number(o.coupon_discount||0)-Number(o.visa_discount||0)-Number(o.loyalty_discount||0)+Number(o.packaging_cost||0)+shipping);
      const u=await client.query("UPDATE orders SET shipping_waived=$1,shipping_cost=$2,total=$3,updated_at=NOW() WHERE id=$4 RETURNING *",[waived,shipping,total,orderId]);
      return u.rows[0];
    });
    res.json({ok:true,order:result,message:waived?"تم إعفاء الطلب من رسوم التوصيل":"تم إلغاء إعفاء التوصيل"});
  }catch(e){console.error("[SHIPPING WAIVER]",e);res.status(e.status||500).json({ok:false,message:e.message||"تعذر تعديل رسوم التوصيل"});}
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
    const productId =
      integer(
        req.params.productId,
        NaN
      );

    const requestedStock =
      integer(
        req.body.stock,
        NaN
      );

    if (
      !Number.isFinite(
        productId
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
                SELECT id, stock
                FROM products
                WHERE id = $1
                FOR UPDATE
                `,
                [productId]
              );

            if (
              !current.rowCount
            ) {
              throw createHttpError(
                404,
                "PRODUCT_NOT_FOUND",
                "المنتج غير موجود"
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
                UPDATE products
                SET stock = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [
                  requestedStock,
                  productId
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
                  NULL,
                  $2,
                  $3,
                  NULL,
                  NOW()
                )
                `,
                [
                  productId,
                  difference,
                  cleanText(
                    req.body.note ||
                    "تعديل يدوي للمخزون",
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
        product: result
      });
    } catch (error) {
      console.error(
        "[INVENTORY UPDATE]",
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
          "تعذر تحديث المخزون"
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
            im.created_at DESC
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
      password.length < 6
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
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
              SUM(total) FILTER (
                WHERE status <> 'cancelled'
              ),
              0
            ) AS sales,

            COUNT(*) FILTER (
              WHERE status = 'cancelled'
            )::int AS cancelled

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
          SELECT
            DATE(created_at) AS date,
            COUNT(*) FILTER (
              WHERE status <> 'cancelled'
            )::int AS orders,

            COALESCE(
              SUM(total) FILTER (
                WHERE status <> 'cancelled'
              ),
              0
            ) AS sales

          FROM orders

          WHERE created_at >= $1::date
            AND created_at <
              ($2::date + INTERVAL '1 day')

          GROUP BY DATE(created_at)

          ORDER BY DATE(created_at)
          `,
          [
            from,
            to
          ]
        );

      return res.json({
        ok: true,
        from,
        to,
        summary:
          summary.rows[0],
        rows:
          rows.rows
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
            0,
            $6,
            $7,
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
      req.body.expires_at !==
      undefined
    ) {
      add(
        "expires_at",
        req.body.expires_at ||
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
    const incoming =
      req.body &&
      typeof req.body ===
        "object"
        ? req.body
        : {};

    try {
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

      return res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ الإعدادات"
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
      newPassword.length < 6
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"
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
            role,
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
      password.length < 6
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
            password_hash,
            role,
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
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING
            id,
            name,
            email,
            phone,
            role,
            is_active,
            created_at,
            updated_at
          `,
          [
            name,
            email,
            phone,
            passwordHash,
            role
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
          "رقم الموظف غير صالح"
      });
    }

    const role =
      String(
        req.body.role ||
        ""
      ).toLowerCase();

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
      const result =
        await db(
          `
          UPDATE users
          SET
            role = $1,
            updated_at = NOW()
          WHERE id = $2
            AND role <> 'owner'
          RETURNING
            id,
            name,
            email,
            phone,
            role,
            is_active
          `,
          [
            role,
            id
          ]
        );

      if (
        !result.rowCount
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "الموظف غير موجود أو هو Owner"
        });
      }

      return res.json({
        ok: true,
        staff:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[STAFF UPDATE]",
        error
      );

      return res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل الموظف"
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

      return res.json({
        ok: true,
        points:
          Number(
            userResult.rows[0]
              ?.loyalty_points || 0
          ),
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
        error.message ||
        "حدث خطأ غير متوقع"
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
