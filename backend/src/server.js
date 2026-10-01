"use strict";

/*
=========================================================
 LADIES FIRST - COMPLETE BACKEND
 Node.js + Express + PostgreSQL
=========================================================
*/

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const {
  db,
  transaction,
  getDatabaseStatus
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
  sanitizeUser,
  getGenderGreeting
} = require("./auth");

const app = express();

const PORT =
  Number(process.env.PORT || 10000);

const FRONTEND_DIR =
  path.join(
    __dirname,
    "../../frontend"
  );

/* =========================================================
   EXPRESS
========================================================= */

app.disable("x-powered-by");

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

/* =========================================================
   HELPERS
========================================================= */

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

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

function percent(value) {
  return Math.min(
    100,
    Math.max(
      0,
      number(value, 0)
    )
  );
}

function normalizePaymentMethod(value) {
  const method =
    cleanText(value)
      .toLowerCase();

  if (
    method === "visa" ||
    method === "card" ||
    method === "credit_card" ||
    method === "credit-card"
  ) {
    return "visa";
  }

  return "cash";
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return sanitizeUser(user);
}

function settingNumber(
  value,
  fallback = 0
) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    if (
      value.value !== undefined
    ) {
      value = value.value;
    }
  }

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function loyaltyPointsFor(
  amount,
  rate
) {
  const base =
    Math.max(
      0,
      money(amount)
    );

  const pointsRate =
    Math.max(
      0,
      number(rate, 1)
    );

  return Math.max(
    0,
    Math.floor(
      base * pointsRate
    )
  );
}

function getWhatsAppNumber() {
  return "0562499924";
}

async function getSettings(keys = null) {
  let result;

  if (
    Array.isArray(keys) &&
    keys.length
  ) {
    result = await db(
      `
      SELECT
        key,
        value
      FROM settings
      WHERE key = ANY($1::text[])
      `,
      [keys]
    );
  } else {
    result = await db(`
      SELECT
        key,
        value
      FROM settings
      ORDER BY key
    `);
  }

  const settings = {};

  for (
    const row of result.rows
  ) {
    settings[row.key] =
      row.value;
  }

  return settings;
}

function sendError(
  res,
  status,
  message
) {
  return res
    .status(status)
    .json({
      ok: false,
      message
    });
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

  /* USERS */

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
      is_owner BOOLEAN NOT NULL DEFAULT FALSE,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS age INTEGER,
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  /* CATEGORIES */

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

  /* BRANDS */

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

  /* PRODUCTS */

  await db(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      old_price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  /* VARIANTS */

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

  /* IMAGES */

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
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE
  `);

  /* ORDERS */

  await db(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT
        REFERENCES users(id)
        ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount NUMERIC(12,2) NOT NULL DEFAULT 0,
      shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
      packaging NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,

      payment_method TEXT NOT NULL DEFAULT 'cash',
      visa_discount NUMERIC(12,2) NOT NULL DEFAULT 0,

      loyalty_points_awarded INTEGER NOT NULL DEFAULT 0,
      loyalty_points_reversed INTEGER NOT NULL DEFAULT 0,

      customer_name TEXT,
      customer_phone TEXT,
      shipping_address TEXT,
      notes TEXT,
      coupon_code TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash',
      ADD COLUMN IF NOT EXISTS visa_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_points_awarded INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS loyalty_points_reversed INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS customer_name TEXT,
      ADD COLUMN IF NOT EXISTS customer_phone TEXT,
      ADD COLUMN IF NOT EXISTS shipping_address TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS coupon_code TEXT
  `);

  /* ORDER ITEMS */

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
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2) NOT NULL,
      purchase_price NUMERIC(12,2),
      image_url TEXT
    )
  `);

  await db(`
    ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS image_url TEXT
  `);

  /* COUPONS */

  await db(`
    CREATE TABLE IF NOT EXISTS coupons (
      id BIGSERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
      min_order NUMERIC(12,2) NOT NULL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /* INVENTORY */

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /* FAVORITES */

  await db(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      product_id BIGINT NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, product_id)
    )
  `);

  /* SETTINGS */

  await db(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /* POINTS LEDGER */

  await db(`
    CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      order_id BIGINT NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,
      transaction_type TEXT NOT NULL,
      points INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS loyalty_points_award_once
    ON loyalty_points_transactions(order_id)
    WHERE transaction_type = 'order_award'
  `);

  await db(`
    CREATE UNIQUE INDEX IF NOT EXISTS loyalty_points_reversal_once
    ON loyalty_points_transactions(order_id)
    WHERE transaction_type = 'order_reversal'
  `);

  /* DEFAULT SETTINGS */

  await db(`
    INSERT INTO settings
      (key, value)
    VALUES
      ('visa_discount_percent', '0'::jsonb),
      ('loyalty_points_per_currency', '1'::jsonb),
      ('shipping_fee', '0'::jsonb),
      ('packaging_fee', '0'::jsonb),
      ('whatsapp_number', '"0562499924"'::jsonb)
    ON CONFLICT (key)
    DO NOTHING
  `);

  console.log(
    "[DB] Database initialized."
  );
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    const status =
      await getDatabaseStatus();

    res.json({
      ok: true,
      service: "ladies-first",
      database: status,
      time: new Date().toISOString()
    });
  }
);

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      const email =
        normalizeEmail(
          req.body?.email
        );

      const phone =
        normalizePhone(
          req.body?.phone ??
          req.body?.whatsapp
        );

      const password =
        cleanText(
          req.body?.password
        );

      const gender =
        cleanText(
          req.body?.gender
        ) || null;

      const age =
        req.body?.age !== undefined &&
        req.body?.age !== null &&
        req.body?.age !== ""
          ? integer(
              req.body.age,
              NaN
            )
          : null;

      if (!name) {
        return sendError(
          res,
          400,
          "الاسم مطلوب"
        );
      }

      if (!email && !phone) {
        return sendError(
          res,
          400,
          "الإيميل أو رقم الهاتف مطلوب"
        );
      }

      if (
        !password ||
        password.length < 6
      ) {
        return sendError(
          res,
          400,
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
        );
      }

      const existing =
        await db(
          `
          SELECT id
          FROM users
          WHERE
            ($1::text IS NOT NULL AND email = $1)
            OR
            ($2::text IS NOT NULL AND phone = $2)
          LIMIT 1
          `,
          [
            email,
            phone
          ]
        );

      if (
        existing.rows.length
      ) {
        return sendError(
          res,
          409,
          "المستخدم موجود مسبقاً"
        );
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
              role
            )
          VALUES
            ($1,$2,$3,$4,$5,$6,'customer')
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
            name,
            email,
            phone,
            passwordHash,
            gender,
            age
          ]
        );

      const user =
        result.rows[0];

      const token =
        createToken(user);

      res.status(201).json({
        ok: true,
        token,
        user:
          publicUser(user),
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

      sendError(
        res,
        400,
        error.message ||
          "تعذر إنشاء الحساب"
      );
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
        cleanText(
          req.body?.contact ??
          req.body?.email ??
          req.body?.phone ??
          req.body?.username
        );

      const password =
        cleanText(
          req.body?.password
        );

      if (!contact) {
        return sendError(
          res,
          400,
          "الإيميل أو رقم الهاتف مطلوب"
        );
      }

      if (!password) {
        return sendError(
          res,
          400,
          "كلمة المرور مطلوبة"
        );
      }

      const email =
        contact.includes("@")
          ? normalizeEmail(
              contact
            )
          : null;

      const phone =
        email
          ? null
          : normalizePhone(
              contact
            );

      const result =
        await db(
          `
          SELECT *
          FROM users
          WHERE
            ($1::text IS NOT NULL AND email = $1)
            OR
            ($2::text IS NOT NULL AND phone = $2)
          LIMIT 1
          `,
          [
            email,
            phone
          ]
        );

      if (
        !result.rows.length
      ) {
        return sendError(
          res,
          401,
          "بيانات الدخول غير صحيحة"
        );
      }

      const user =
        result.rows[0];

      if (
        !user.is_active
      ) {
        return sendError(
          res,
          403,
          "الحساب غير مفعل"
        );
      }

      const valid =
        await verifyPassword(
          password,
          user.password_hash
        );

      if (!valid) {
        return sendError(
          res,
          401,
          "بيانات الدخول غير صحيحة"
        );
      }

      const token =
        createToken(user);

      res.json({
        ok: true,
        token,
        user:
          publicUser(user),
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

      sendError(
        res,
        500,
        "تعذر تسجيل الدخول"
      );
    }
  }
);

/* =========================================================
   AUTH - CURRENT USER
========================================================= */

app.get(
  "/api/auth/me",
  requireAuth,
  async (req, res) => {
    try {
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
          WHERE id = $1
          `,
          [
            req.user.id
          ]
        );

      if (
        !result.rows.length
      ) {
        return sendError(
          res,
          404,
          "المستخدم غير موجود"
        );
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
      sendError(
        res,
        500,
        "تعذر تحميل المستخدم"
      );
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
          WHERE is_active = TRUE
          ORDER BY name
        `);

      res.json({
        ok: true,
        categories:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الأقسام"
      );
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
          WHERE is_active = TRUE
          ORDER BY name
        `);

      res.json({
        ok: true,
        brands:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الماركات"
      );
    }
  }
);

/* =========================================================
   PRODUCTS
========================================================= */

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const search =
        cleanText(
          req.query?.search ??
          req.query?.q
        );

      const categoryId =
        integer(
          req.query?.category_id ??
          req.query?.categoryId,
          0
        );

      const brandId =
        integer(
          req.query?.brand_id ??
          req.query?.brandId,
          0
        );

      const values = [];
      const where = [
        "p.is_active = TRUE"
      ];

      if (search) {
        values.push(
          `%${search}%`
        );

        where.push(
          `(p.name ILIKE $${values.length}
            OR p.description ILIKE $${values.length})`
        );
      }

      if (categoryId) {
        values.push(
          categoryId
        );

        where.push(
          `p.category_id = $${values.length}`
        );
      }

      if (brandId) {
        values.push(
          brandId
        );

        where.push(
          `p.brand_id = $${values.length}`
        );
      }

      const result =
        await db(
          `
          SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.old_price AS "oldPrice",
            p.stock,
            p.image_url AS "imageUrl",
            p.category_id AS "categoryId",
            p.brand_id AS "brandId",
            p.is_featured AS "isFeatured",
            p.is_best_seller AS "isBestSeller",

            c.name AS "categoryName",
            b.name AS "brandName",

            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', pv.id,
                    'sku', pv.sku,
                    'color', pv.color,
                    'size', pv.size,
                    'price', pv.price,
                    'stock', pv.stock
                  )
                  ORDER BY pv.id
                )
                FROM product_variants pv
                WHERE
                  pv.product_id = p.id
                  AND pv.is_active = TRUE
              ),
              '[]'::json
            ) AS variants,

            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'sortOrder', pi.sort_order,
                    'isPrimary', pi.is_primary
                  )
                  ORDER BY
                    pi.is_primary DESC,
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

          LEFT JOIN categories c
            ON c.id = p.category_id

          LEFT JOIN brands b
            ON b.id = p.brand_id

          WHERE
            ${where.join(" AND ")}

          ORDER BY
            p.created_at DESC
          `,
          values
        );

      res.json({
        ok: true,
        products:
          result.rows
      });
    } catch (error) {
      console.error(
        "[PRODUCTS]",
        error
      );

      sendError(
        res,
        500,
        "تعذر تحميل المنتجات"
      );
    }
  }
);

/* =========================================================
   PRODUCT DETAILS
========================================================= */

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return sendError(
          res,
          400,
          "رقم المنتج غير صحيح"
        );
      }

      const result =
        await db(
          `
          SELECT
            p.*,
            c.name AS "categoryName",
            b.name AS "brandName"
          FROM products p

          LEFT JOIN categories c
            ON c.id = p.category_id

          LEFT JOIN brands b
            ON b.id = p.brand_id

          WHERE
            p.id = $1
            AND p.is_active = TRUE
          `,
          [id]
        );

      if (!result.rows.length) {
        return sendError(
          res,
          404,
          "المنتج غير موجود"
        );
      }

      const product =
        result.rows[0];

      const variants =
        await db(
          `
          SELECT
            id,
            sku,
            color,
            size,
            price,
            stock,
            is_active AS "isActive"
          FROM product_variants
          WHERE
            product_id = $1
          ORDER BY id
          `,
          [id]
        );

      const images =
        await db(
          `
          SELECT
            id,
            image_url AS "url",
            sort_order AS "sortOrder",
            is_primary AS "isPrimary"
          FROM product_images
          WHERE
            product_id = $1
          ORDER BY
            is_primary DESC,
            sort_order,
            id
          `,
          [id]
        );

      res.json({
        ok: true,
        product: {
          ...product,
          variants:
            variants.rows,
          images:
            images.rows
        }
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل المنتج"
      );
    }
  }
);

/* =========================================================
   STORE HOME
========================================================= */

app.get(
  "/api/store/home",
  async (req, res) => {
    try {
      const [
        categories,
        brands,
        products,
        settings
      ] = await Promise.all([
        db(`
          SELECT
            id,
            name,
            slug,
            image_url AS "imageUrl"
          FROM categories
          WHERE is_active = TRUE
          ORDER BY name
        `),

        db(`
          SELECT
            id,
            name,
            slug,
            logo_url AS "logoUrl"
          FROM brands
          WHERE is_active = TRUE
          ORDER BY name
        `),

        db(`
          SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.old_price AS "oldPrice",
            p.stock,
            p.image_url AS "imageUrl",
            p.category_id AS "categoryId",
            p.brand_id AS "brandId",
            p.is_featured AS "isFeatured",
            p.is_best_seller AS "isBestSeller"
          FROM products p
          WHERE p.is_active = TRUE
          ORDER BY
            p.is_featured DESC,
            p.created_at DESC
          LIMIT 100
        `),

        getSettings()
      ]);

      res.json({
        ok: true,
        categories:
          categories.rows,
        brands:
          brands.rows,
        products:
          products.rows,
        settings
      });
    } catch (error) {
      console.error(
        "[STORE HOME]",
        error
      );

      sendError(
        res,
        500,
        "تعذر تحميل المتجر"
      );
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
            p.*
          FROM favorites f

          JOIN products p
            ON p.id = f.product_id

          WHERE
            f.user_id = $1
            AND p.is_active = TRUE

          ORDER BY
            f.created_at DESC
          `,
          [
            req.user.id
          ]
        );

      res.json({
        ok: true,
        favorites:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل المفضلة"
      );
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
        return sendError(
          res,
          400,
          "رقم المنتج غير صحيح"
        );
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
      sendError(
        res,
        400,
        "تعذر إضافة المنتج للمفضلة"
      );
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
      sendError(
        res,
        400,
        "تعذر حذف المنتج من المفضلة"
      );
    }
  }
);

/* =========================================================
   CUSTOMER PROFILE UPDATE
========================================================= */

app.put(
  "/api/users/:id",
  requireAuth,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (
        id !==
        Number(req.user.id)
      ) {
        return sendError(
          res,
          403,
          "ليس لديك صلاحية"
        );
      }

      const name =
        cleanText(
          req.body?.name
        );

      const email =
        normalizeEmail(
          req.body?.email
        );

      const phone =
        normalizePhone(
          req.body?.phone
        );

      const gender =
        cleanText(
          req.body?.gender
        ) || null;

      const age =
        req.body?.age !== undefined &&
        req.body?.age !== null &&
        req.body?.age !== ""
          ? integer(
              req.body.age,
              null
            )
          : null;

      const result =
        await db(
          `
          UPDATE users
          SET
            name =
              COALESCE(
                NULLIF($1,''),
                name
              ),
            email = $2,
            phone = $3,
            gender = $4,
            age = $5,
            updated_at = NOW()
          WHERE id = $6
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
            name,
            email,
            phone,
            gender,
            age,
            id
          ]
        );

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          ),
        greeting:
          getGenderGreeting(
            result.rows[0]
              .gender
          )
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل البيانات"
      );
    }
  }
);

/* =========================================================
   CREATE ORDER
========================================================= */

app.post(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const items =
        Array.isArray(
          req.body?.items
        )
          ? req.body.items
          : [];

      if (!items.length) {
        return sendError(
          res,
          400,
          "السلة فارغة"
        );
      }

      const result =
        await transaction(
          async (client) => {
            let subtotal = 0;

            const orderItems = [];

            const settingsResult =
              await client.query(`
                SELECT
                  key,
                  value
                FROM settings
                WHERE key = ANY(
                  ARRAY[
                    'visa_discount_percent',
                    'loyalty_points_per_currency',
                    'shipping_fee',
                    'packaging_fee'
                  ]
                )
              `);

            const settings = {};

            for (
              const row
                of settingsResult.rows
            ) {
              settings[row.key] =
                row.value;
            }

            const paymentMethod =
              normalizePaymentMethod(
                req.body?.paymentMethod ??
                req.body?.payment_method
              );

            const visaPercent =
              percent(
                settingNumber(
                  settings
                    .visa_discount_percent,
                  0
                )
              );

            const shipping =
              Math.max(
                0,
                settingNumber(
                  settings.shipping_fee,
                  number(
                    req.body?.shipping,
                    0
                  )
                )
              );

            const packaging =
              Math.max(
                0,
                settingNumber(
                  settings.packaging_fee,
                  number(
                    req.body?.packaging,
                    0
                  )
                )
              );

            /* -----------------------------------------
               PRODUCTS + STOCK
            ----------------------------------------- */

            for (
              const item of items
            ) {
              const productId =
                integer(
                  item.productId ??
                    item.product_id,
                  NaN
                );

              const rawVariantId =
                item.variantId ??
                item.variant_id ??
                null;

              const variantId =
                rawVariantId !==
                  null &&
                rawVariantId !==
                  undefined &&
                rawVariantId !== ""
                  ? integer(
                      rawVariantId,
                      NaN
                    )
                  : null;

              const quantity =
                integer(
                  item.quantity,
                  NaN
                );

              if (
                !Number.isInteger(
                  productId
                ) ||
                !Number.isInteger(
                  quantity
                ) ||
                quantity <= 0 ||
                quantity > 1000
              ) {
                throw new Error(
                  "بيانات المنتج غير صحيحة"
                );
              }

              const productResult =
                await client.query(
                  `
                  SELECT *
                  FROM products
                  WHERE
                    id = $1
                    AND is_active = TRUE
                  FOR UPDATE
                  `,
                  [
                    productId
                  ]
                );

              if (
                !productResult
                  .rows.length
              ) {
                throw new Error(
                  "المنتج غير موجود"
                );
              }

              const product =
                productResult.rows[0];

              let unitPrice =
                Number(
                  product.price || 0
                );

              let variantName =
                null;

              const variantsResult =
                await client.query(
                  `
                  SELECT
                    COUNT(*)::INTEGER
                      AS count
                  FROM product_variants
                  WHERE
                    product_id = $1
                    AND is_active = TRUE
                  `,
                  [
                    productId
                  ]
                );

              const hasVariants =
                Number(
                  variantsResult
                    .rows[0]
                    ?.count || 0
                ) > 0;

              /* VARIANT */

              if (hasVariants) {
                if (
                  !Number.isInteger(
                    variantId
                  )
                ) {
                  throw new Error(
                    "اختاري اللون أو المقاس أولاً"
                  );
                }

                const variantResult =
                  await client.query(
                    `
                    SELECT
                      id,
                      color,
                      size,
                      price,
                      stock
                    FROM product_variants
                    WHERE
                      id = $1
                      AND product_id = $2
                      AND is_active = TRUE
                    FOR UPDATE
                    `,
                    [
                      variantId,
                      productId
                    ]
                  );

                if (
                  !variantResult
                    .rows.length
                ) {
                  throw new Error(
                    "الخيار المطلوب غير موجود"
                  );
                }

                const variant =
                  variantResult
                    .rows[0];

                if (
                  Number(
                    variant.stock
                  ) < quantity
                ) {
                  throw new Error(
                    "الكمية خلصت، حقك علينا"
                  );
                }

                if (
                  variant.price !==
                  null &&
                  variant.price !==
                  undefined
                ) {
                  unitPrice =
                    Number(
                      variant.price
                    );
                }

                variantName =
                  [
                    variant.color,
                    variant.size
                  ]
                    .filter(Boolean)
                    .join(
                      " / "
                    );

                const update =
                  await client.query(
                    `
                    UPDATE product_variants
                    SET
                      stock =
                        stock - $1,
                      updated_at =
                        NOW()
                    WHERE
                      id = $2
                      AND stock >= $1
                    RETURNING stock
                    `,
                    [
                      quantity,
                      variantId
                    ]
                  );

                if (
                  !update.rows.length
                ) {
                  throw new Error(
                    "الكمية خلصت، حقك علينا"
                  );
                }

                await client.query(
                  `
                  INSERT INTO inventory_movements
                    (
                      variant_id,
                      product_id,
                      quantity_change,
                      reason
                    )
                  VALUES
                    ($1,$2,$3,'order')
                  `,
                  [
                    variantId,
                    productId,
                    -quantity
                  ]
                );
              }

              /* PRODUCT WITHOUT VARIANT */

              else {
                if (
                  Number(
                    product.stock
                  ) < quantity
                ) {
                  throw new Error(
                    "الكمية خلصت، حقك علينا"
                  );
                }

                const update =
                  await client.query(
                    `
                    UPDATE products
                    SET
                      stock =
                        stock - $1,
                      updated_at =
                        NOW()
                    WHERE
                      id = $2
                      AND stock >= $1
                    RETURNING stock
                    `,
                    [
                      quantity,
                      productId
                    ]
                  );

                if (
                  !update.rows.length
                ) {
                  throw new Error(
                    "الكمية خلصت، حقك علينا"
                  );
                }

                await client.query(
                  `
                  INSERT INTO inventory_movements
                    (
                      product_id,
                      quantity_change,
                      reason
                    )
                  VALUES
                    ($1,$2,'order')
                  `,
                  [
                    productId,
                    -quantity
                  ]
                );
              }

              const totalPrice =
                money(
                  unitPrice *
                    quantity
                );

              subtotal +=
                totalPrice;

              orderItems.push({
                productId,
                variantId,
                productName:
                  product.name,
                variantName,
                quantity,
                unitPrice,
                totalPrice,
                purchasePrice:
                  Number(
                    product.price ||
                      0
                  ),
                imageUrl:
                  product.image_url ||
                  null
              });
            }

            subtotal =
              money(subtotal);

            /* -----------------------------------------
               COUPON
            ----------------------------------------- */

            const couponCode =
              cleanText(
                req.body?.couponCode ??
                req.body?.coupon_code
              ).toUpperCase();

            let couponDiscount = 0;
            let coupon = null;

            if (couponCode) {
              const couponResult =
                await client.query(
                  `
                  SELECT *
                  FROM coupons
                  WHERE
                    UPPER(code) = $1
                    AND is_active = TRUE
                    AND (
                      expires_at IS NULL
                      OR expires_at > NOW()
                    )
                    AND (
                      max_uses IS NULL
                      OR used_count < max_uses
                    )
                  FOR UPDATE
                  `,
                  [
                    couponCode
                  ]
                );

              if (
                !couponResult
                  .rows.length
              ) {
                throw new Error(
                  "كود الخصم غير صالح أو منتهي"
                );
              }

              coupon =
                couponResult
                  .rows[0];

              if (
                subtotal <
                Number(
                  coupon.min_order ||
                    0
                )
              ) {
                throw new Error(
                  "الطلب لا يحقق الحد الأدنى للكوبون"
                );
              }

              if (
                coupon.discount_type ===
                "fixed"
              ) {
                couponDiscount =
                  Math.min(
                    subtotal,
                    Math.max(
                      0,
                      Number(
                        coupon.discount_value ||
                          0
                      )
                    )
                  );
              } else {
                couponDiscount =
                  Math.min(
                    subtotal,
                    subtotal *
                      percent(
                        coupon.discount_value
                      ) /
                      100
                  );
              }
            }

            /* -----------------------------------------
               VISA DISCOUNT
            ----------------------------------------- */

            const visaDiscount =
              paymentMethod === "visa"
                ? money(
                    Math.min(
                      Math.max(
                        0,
                        subtotal -
                          couponDiscount
                      ),
                      Math.max(
                        0,
                        (
                          subtotal -
                          couponDiscount
                        ) *
                          visaPercent /
                          100
                      )
                    )
                  )
                : 0;

            const total =
              money(
                Math.max(
                  0,
                  subtotal -
                    couponDiscount -
                    visaDiscount +
                    shipping +
                    packaging
                )
              );

            /* -----------------------------------------
               POINTS
            ----------------------------------------- */

            const pointsBase =
              Math.max(
                0,
                subtotal -
                  couponDiscount -
                  visaDiscount
              );

            const points =
              loyaltyPointsFor(
                pointsBase,
                settingNumber(
                  settings
                    .loyalty_points_per_currency,
                  1
                )
              );

            /* -----------------------------------------
               CUSTOMER DATA
            ----------------------------------------- */

            const customerName =
              cleanText(
                req.body?.customer_name ??
                req.body?.customerName ??
                ""
              );

            const customerPhone =
              cleanText(
                req.body?.customer_phone ??
                req.body?.customerPhone ??
                ""
              );

            const shippingAddress =
              cleanText(
                req.body?.shipping_address ??
                req.body?.shippingAddress ??
                ""
              );

            const notes =
              cleanText(
                req.body?.notes ??
                ""
              );

            /* -----------------------------------------
               INSERT ORDER
            ----------------------------------------- */

            const orderResult =
              await client.query(
                `
                INSERT INTO orders
                  (
                    user_id,
                    status,
                    subtotal,
                    discount,
                    shipping,
                    packaging,
                    total,
                    payment_method,
                    visa_discount,
                    loyalty_points_awarded,
                    loyalty_points_reversed,
                    customer_name,
                    customer_phone,
                    shipping_address,
                    notes,
                    coupon_code
                  )
                VALUES
                  (
                    $1,
                    'pending',
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    0,
                    $10,
                    $11,
                    $12,
                    $13,
                    $14
                  )
                RETURNING
                  id,
                  user_id AS "userId",
                  status,
                  subtotal,
                  discount,
                  shipping,
                  packaging,
                  total,
                  payment_method
                    AS "paymentMethod",
                  visa_discount
                    AS "visaDiscount",
                  loyalty_points_awarded
                    AS "loyaltyPoints",
                  customer_name
                    AS "customerName",
                  customer_phone
                    AS "customerPhone",
                  shipping_address
                    AS "shippingAddress",
                  notes,
                  coupon_code
                    AS "couponCode",
                  created_at
                    AS "createdAt"
                `,
                [
                  req.user.id,
                  subtotal,
                  couponDiscount,
                  shipping,
                  packaging,
                  total,
                  paymentMethod,
                  visaDiscount,
                  points,
                  customerName ||
                    null,
                  customerPhone ||
                    null,
                  shippingAddress ||
                    null,
                  notes || null,
                  couponCode ||
                    null
                ]
              );

            const order =
              orderResult.rows[0];

            /* -----------------------------------------
               ORDER ITEMS
            ----------------------------------------- */

            for (
              const item
                of orderItems
            ) {
              await client.query(
                `
                INSERT INTO order_items
                  (
                    order_id,
                    product_id,
                    variant_id,
                    product_name,
                    variant_name,
                    quantity,
                    unit_price,
                    total_price,
                    purchase_price,
                    image_url
                  )
                VALUES
                  (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                  )
                `,
                [
                  order.id,
                  item.productId,
                  item.variantId,
                  item.productName,
                  item.variantName,
                  item.quantity,
                  item.unitPrice,
                  item.totalPrice,
                  item.purchasePrice,
                  item.imageUrl
                ]
              );

              await client.query(
                `
                UPDATE inventory_movements
                SET order_id = $1
                WHERE id = (
                  SELECT id
                  FROM inventory_movements
                  WHERE
                    order_id IS NULL
                    AND reason = 'order'
                    AND product_id = $2
                    AND (
                      $3::bigint IS NULL
                      OR variant_id = $3
                    )
                  ORDER BY id DESC
                  LIMIT 1
                )
                `,
                [
                  order.id,
                  item.productId,
                  item.variantId
                ]
              );
            }

            /* -----------------------------------------
               AWARD POINTS ONCE
            ----------------------------------------- */

            if (
              points > 0
            ) {
              const award =
                await client.query(
                  `
                  INSERT INTO
                    loyalty_points_transactions
                    (
                      user_id,
                      order_id,
                      transaction_type,
                      points
                    )
                  VALUES
                    (
                      $1,
                      $2,
                      'order_award',
                      $3
                    )
                  ON CONFLICT DO NOTHING
                  RETURNING id
                  `,
                  [
                    req.user.id,
                    order.id,
                    points
                  ]
                );

              if (
                award.rows.length
              ) {
                await client.query(
                  `
                  UPDATE users
                  SET
                    loyalty_points =
                      GREATEST(
                        0,
                        loyalty_points + $1
                      ),
                    updated_at =
                      NOW()
                  WHERE id = $2
                  `,
                  [
                    points,
                    req.user.id
                  ]
                );
              }
            }

            /* -----------------------------------------
               COUPON USAGE
            ----------------------------------------- */

            if (coupon) {
              await client.query(
                `
                UPDATE coupons
                SET
                  used_count =
                    used_count + 1
                WHERE id = $1
                `,
                [
                  coupon.id
                ]
              );
            }

            return order;
          }
        );

      res.status(201).json({
        ok: true,
        order: result,
        paymentMethod:
          result.paymentMethod,
        visaDiscount:
          Number(
            result.visaDiscount || 0
          ),
        loyaltyPoints:
          Number(
            result.loyaltyPoints || 0
          )
      });
    } catch (error) {
      console.error(
        "[CREATE ORDER]",
        error
      );

      sendError(
        res,
        400,
        error.message ||
          "تعذر إنشاء الطلب"
      );
    }
  }
);

/* =========================================================
   CUSTOMER ORDERS
========================================================= */

app.get(
  "/api/orders",
  requireAuth,
  async (req, res) => {
    try {
      const result =
        await db(
          `
          SELECT
            o.id,
            o.status,
            o.subtotal,
            o.discount,
            o.shipping,
            o.packaging,
            o.total,
            o.payment_method
              AS "paymentMethod",
            o.visa_discount
              AS "visaDiscount",
            o.loyalty_points_awarded
              AS "loyaltyPoints",
            o.loyalty_points_reversed
              AS "loyaltyPointsReversed",
            o.customer_name
              AS "customerName",
            o.customer_phone
              AS "customerPhone",
            o.shipping_address
              AS "shippingAddress",
            o.notes,
            o.created_at
              AS "createdAt",

            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'productId',
                    oi.product_id,
                    'variantId',
                    oi.variant_id,
                    'productName',
                    oi.product_name,
                    'variantName',
                    oi.variant_name,
                    'quantity',
                    oi.quantity,
                    'unitPrice',
                    oi.unit_price,
                    'totalPrice',
                    oi.total_price,
                    'imageUrl',
                    oi.image_url
                  )
                  ORDER BY oi.id
                )
                FROM order_items oi
                WHERE
                  oi.order_id = o.id
              ),
              '[]'::json
            ) AS items

          FROM orders o

          WHERE
            o.user_id = $1

          ORDER BY
            o.created_at DESC
          `,
          [
            req.user.id
          ]
        );

      res.json({
        ok: true,
        orders:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الطلبات"
      );
    }
  }
);

/* =========================================================
   ADMIN - USERS
========================================================= */

app.get(
  "/api/admin/users",
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
            age,
            role,
            loyalty_points,
            is_active,
            created_at,
            updated_at
          FROM users
          ORDER BY
            created_at DESC
        `);

      res.json({
        ok: true,
        users:
          result.rows.map(
            publicUser
          )
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل المستخدمين"
      );
    }
  }
);

/* =========================================================
   ADMIN - SEARCH USERS
========================================================= */

app.get(
  "/api/admin/users/search",
  requireAdmin,
  async (req, res) => {
    try {
      const q =
        cleanText(
          req.query?.q
        );

      if (!q) {
        return res.json({
          ok: true,
          users: []
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
            name ILIKE $1
            OR email ILIKE $1
            OR phone ILIKE $1
          ORDER BY
            created_at DESC
          LIMIT 100
          `,
          [
            `%${q}%`
          ]
        );

      res.json({
        ok: true,
        users:
          result.rows.map(
            publicUser
          )
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر البحث"
      );
    }
  }
);

/* =========================================================
   ADMIN - GET USER
========================================================= */

app.get(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

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
          WHERE id = $1
          `,
          [id]
        );

      if (!result.rows.length) {
        return sendError(
          res,
          404,
          "المستخدم غير موجود"
        );
      }

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل المستخدم"
      );
    }
  }
);

/* =========================================================
   ADMIN - UPDATE USER
========================================================= */

app.patch(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return sendError(
          res,
          400,
          "رقم المستخدم غير صحيح"
        );
      }

      const current =
        await db(
          `
          SELECT *
          FROM users
          WHERE id = $1
          `,
          [id]
        );

      if (!current.rows.length) {
        return sendError(
          res,
          404,
          "المستخدم غير موجود"
        );
      }

      const old =
        current.rows[0];

      const name =
        req.body?.name !== undefined
          ? cleanText(
              req.body.name
            )
          : old.name;

      const email =
        req.body?.email !== undefined
          ? normalizeEmail(
              req.body.email
            )
          : old.email;

      const phone =
        req.body?.phone !== undefined
          ? normalizePhone(
              req.body.phone
            )
          : old.phone;

      const gender =
        req.body?.gender !== undefined
          ? cleanText(
              req.body.gender
            ) || null
          : old.gender;

      const age =
        req.body?.age !== undefined
          ? integer(
              req.body.age,
              null
            )
          : old.age;

      const isActive =
        req.body?.is_active !== undefined
          ? Boolean(
              req.body.is_active
            )
          : req.body?.isActive !==
              undefined
            ? Boolean(
                req.body.isActive
              )
            : old.is_active;

      const result =
        await db(
          `
          UPDATE users
          SET
            name = $1,
            email = $2,
            phone = $3,
            gender = $4,
            age = $5,
            is_active = $6,
            updated_at = NOW()
          WHERE id = $7
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
            name,
            email,
            phone,
            gender,
            age,
            isActive,
            id
          ]
        );

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          ),
        greeting:
          getGenderGreeting(
            result.rows[0]
              .gender
          )
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل المستخدم"
      );
    }
  }
);

/* =========================================================
   ADMIN - UPDATE USER ROLE
========================================================= */

app.patch(
  "/api/admin/users/:id/role",
  requireOwner,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const role =
        cleanText(
          req.body?.role
        ).toLowerCase();

      const allowed = [
        "customer",
        "staff",
        "admin",
        "owner"
      ];

      if (
        !allowed.includes(
          role
        )
      ) {
        return sendError(
          res,
          400,
          "الصلاحية غير صحيحة"
        );
      }

      if (
        id ===
        Number(req.user.id) &&
        role !== "owner"
      ) {
        return sendError(
          res,
          400,
          "لا يمكنك إزالة صلاحية المالك عن نفسك"
        );
      }

      const result =
        await db(
          `
          UPDATE users
          SET
            role = $1,
            is_owner =
              ($1 = 'owner'),
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
            loyalty_points,
            is_active,
            created_at,
            updated_at
          `,
          [
            role,
            id
          ]
        );

      if (!result.rows.length) {
        return sendError(
          res,
          404,
          "المستخدم غير موجود"
        );
      }

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل الصلاحية"
      );
    }
  }
);

/* =========================================================
   ADMIN - USERS POINTS
========================================================= */

app.patch(
  "/api/admin/users/:id/points",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const points =
        integer(
          req.body?.points,
          NaN
        );

      if (
        !Number.isInteger(
          points
        )
      ) {
        return sendError(
          res,
          400,
          "عدد النقاط غير صحيح"
        );
      }

      const result =
        await db(
          `
          UPDATE users
          SET
            loyalty_points =
              GREATEST(
                0,
                $1
              ),
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
            loyalty_points,
            is_active,
            created_at,
            updated_at
          `,
          [
            points,
            id
          ]
        );

      if (!result.rows.length) {
        return sendError(
          res,
          404,
          "المستخدم غير موجود"
        );
      }

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل النقاط"
      );
    }
  }
);

/* =========================================================
   ADMIN - ORDERS
========================================================= */

app.get(
  "/api/admin/orders",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            o.id,
            o.user_id AS "userId",
            o.status,
            o.subtotal,
            o.discount,
            o.shipping,
            o.packaging,
            o.total,

            o.payment_method
              AS "paymentMethod",

            o.visa_discount
              AS "visaDiscount",

            o.loyalty_points_awarded
              AS "loyaltyPoints",

            o.loyalty_points_reversed
              AS "loyaltyPointsReversed",

            o.customer_name
              AS "customerName",

            o.customer_phone
              AS "customerPhone",

            o.shipping_address
              AS "shippingAddress",

            o.notes,

            o.created_at
              AS "createdAt",

            u.name
              AS "userName",

            u.email
              AS "userEmail",

            u.phone
              AS "userPhone",

            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'productId',
                    oi.product_id,
                    'variantId',
                    oi.variant_id,
                    'productName',
                    oi.product_name,
                    'variantName',
                    oi.variant_name,
                    'quantity',
                    oi.quantity,
                    'unitPrice',
                    oi.unit_price,
                    'totalPrice',
                    oi.total_price,
                    'imageUrl',
                    oi.image_url
                  )
                  ORDER BY oi.id
                )
                FROM order_items oi
                WHERE
                  oi.order_id = o.id
              ),
              '[]'::json
            ) AS items

          FROM orders o

          LEFT JOIN users u
            ON u.id = o.user_id

          ORDER BY
            o.created_at DESC
        `);

      res.json({
        ok: true,
        orders:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الطلبات"
      );
    }
  }
);

/* =========================================================
   ADMIN - ORDER DETAILS
========================================================= */

app.get(
  "/api/admin/orders/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const orderResult =
        await db(
          `
          SELECT
            o.*,
            u.name
              AS "userName",
            u.email
              AS "userEmail",
            u.phone
              AS "userPhone",
            u.gender
              AS "userGender",
            u.age
              AS "userAge"
          FROM orders o
          LEFT JOIN users u
            ON u.id = o.user_id
          WHERE o.id = $1
          `,
          [id]
        );

      if (
        !orderResult.rows.length
      ) {
        return sendError(
          res,
          404,
          "الطلب غير موجود"
        );
      }

      const items =
        await db(
          `
          SELECT
            id,
            product_id
              AS "productId",
            variant_id
              AS "variantId",
            product_name
              AS "productName",
            variant_name
              AS "variantName",
            quantity,
            unit_price
              AS "unitPrice",
            total_price
              AS "totalPrice",
            purchase_price
              AS "purchasePrice",
            image_url
              AS "imageUrl"
          FROM order_items
          WHERE
            order_id = $1
          ORDER BY id
          `,
          [id]
        );

      const order =
        orderResult.rows[0];

      res.json({
        ok: true,
        order: {
          ...order,
          paymentMethod:
            order.payment_method,
          visaDiscount:
            order.visa_discount,
          loyaltyPoints:
            order.loyalty_points_awarded,
          loyaltyPointsReversed:
            order.loyalty_points_reversed,
          customerName:
            order.customer_name,
          customerPhone:
            order.customer_phone,
          shippingAddress:
            order.shipping_address,
          items:
            items.rows
        }
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل تفاصيل الطلب"
      );
    }
  }
);

/* =========================================================
   ADMIN - CHANGE ORDER STATUS
========================================================= */

app.patch(
  "/api/admin/orders/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const status =
        cleanText(
          req.body?.status
        ).toLowerCase();

      const allowedStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "canceled"
      ];

      if (
        !Number.isInteger(id)
      ) {
        return sendError(
          res,
          400,
          "رقم الطلب غير صحيح"
        );
      }

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return sendError(
          res,
          400,
          "حالة الطلب غير صحيحة"
        );
      }

      const result =
        await transaction(
          async (client) => {
            const currentResult =
              await client.query(
                `
                SELECT *
                FROM orders
                WHERE id = $1
                FOR UPDATE
                `,
                [id]
              );

            if (
              !currentResult
                .rows.length
            ) {
              throw new Error(
                "الطلب غير موجود"
              );
            }

            const current =
              currentResult
                .rows[0];

            const wasCancelled =
              [
                "cancelled",
                "canceled"
              ].includes(
                String(
                  current.status ||
                    ""
                ).toLowerCase()
              );

            const willCancel =
              [
                "cancelled",
                "canceled"
              ].includes(
                status
              );

            /* -----------------------------------------
               RESTORE STOCK ON FIRST CANCELLATION
            ----------------------------------------- */

            if (
              !wasCancelled &&
              willCancel
            ) {
              const itemsResult =
                await client.query(
                  `
                  SELECT
                    product_id,
                    variant_id,
                    quantity
                  FROM order_items
                  WHERE
                    order_id = $1
                  `,
                  [id]
                );

              for (
                const item
                  of itemsResult.rows
              ) {
                const quantity =
                  Number(
                    item.quantity ||
                      0
                  );

                if (
                  item.variant_id
                ) {
                  await client.query(
                    `
                    UPDATE product_variants
                    SET
                      stock =
                        stock + $1,
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      quantity,
                      item.variant_id
                    ]
                  );

                  await client.query(
                    `
                    INSERT INTO
                      inventory_movements
                      (
                        variant_id,
                        product_id,
                        quantity_change,
                        reason,
                        order_id
                      )
                    VALUES
                      (
                        $1,
                        $2,
                        $3,
                        'order_cancelled',
                        $4
                      )
                    `,
                    [
                      item.variant_id,
                      item.product_id,
                      quantity,
                      id
                    ]
                  );
                } else {
                  await client.query(
                    `
                    UPDATE products
                    SET
                      stock =
                        stock + $1,
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      quantity,
                      item.product_id
                    ]
                  );

                  await client.query(
                    `
                    INSERT INTO
                      inventory_movements
                      (
                        product_id,
                        quantity_change,
                        reason,
                        order_id
                      )
                    VALUES
                      (
                        $1,
                        $2,
                        'order_cancelled',
                        $3
                      )
                    `,
                    [
                      item.product_id,
                      quantity,
                      id
                    ]
                  );
                }
              }

              /* -----------------------------------------
                 REVERSE POINTS ONCE
              ----------------------------------------- */

              const awarded =
                Number(
                  current
                    .loyalty_points_awarded ||
                    0
                );

              const reversed =
                Number(
                  current
                    .loyalty_points_reversed ||
                    0
                );

              const pointsToReverse =
                Math.max(
                  0,
                  awarded -
                    reversed
                );

              if (
                pointsToReverse >
                  0 &&
                current.user_id
              ) {
                const reversal =
                  await client.query(
                    `
                    INSERT INTO
                      loyalty_points_transactions
                      (
                        user_id,
                        order_id,
                        transaction_type,
                        points
                      )
                    VALUES
                      (
                        $1,
                        $2,
                        'order_reversal',
                        $3
                      )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                    `,
                    [
                      current.user_id,
                      id,
                      pointsToReverse
                    ]
                  );

                if (
                  reversal.rows.length
                ) {
                  await client.query(
                    `
                    UPDATE users
                    SET
                      loyalty_points =
                        GREATEST(
                          0,
                          loyalty_points - $1
                        ),
                      updated_at =
                        NOW()
                    WHERE id = $2
                    `,
                    [
                      pointsToReverse,
                      current.user_id
                    ]
                  );

                  await client.query(
                    `
                    UPDATE orders
                    SET
                      loyalty_points_reversed =
                        $1
                    WHERE id = $2
                    `,
                    [
                      pointsToReverse,
                      id
                    ]
                  );
                }
              }
            }

            const update =
              await client.query(
                `
                UPDATE orders
                SET
                  status = $1,
                  updated_at = NOW()
                WHERE id = $2
                RETURNING
                  id,
                  user_id AS "userId",
                  status,
                  subtotal,
                  discount,
                  shipping,
                  packaging,
                  total,
                  payment_method
                    AS "paymentMethod",
                  visa_discount
                    AS "visaDiscount",
                  loyalty_points_awarded
                    AS "loyaltyPoints",
                  loyalty_points_reversed
                    AS "loyaltyPointsReversed",
                  created_at
                    AS "createdAt",
                  updated_at
                    AS "updatedAt"
                `,
                [
                  status,
                  id
                ]
              );

            return update.rows[0];
          }
        );

      res.json({
        ok: true,
        order: result
      });
    } catch (error) {
      console.error(
        "[ORDER STATUS]",
        error
      );

      sendError(
        res,
        400,
        error.message ||
          "تعذر تعديل حالة الطلب"
      );
    }
  }
);

/* =========================================================
   ADMIN - CATEGORIES
========================================================= */

app.get(
  "/api/admin/categories",
  requireAdmin,
  async (req, res) => {
    const result =
      await db(`
        SELECT
          id,
          name,
          slug,
          image_url AS "imageUrl",
          is_active AS "isActive"
        FROM categories
        ORDER BY name
      `);

    res.json({
      ok: true,
      categories:
        result.rows
    });
  }
);

app.post(
  "/api/admin/categories",
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      if (!name) {
        return sendError(
          res,
          400,
          "اسم القسم مطلوب"
        );
      }

      const slug =
        slugify(
          req.body?.slug ||
            name
        );

      const result =
        await db(
          `
          INSERT INTO categories
            (
              name,
              slug,
              image_url
            )
          VALUES
            ($1,$2,$3)
          RETURNING *
          `,
          [
            name,
            slug,
            cleanText(
              req.body?.image_url ??
              req.body?.imageUrl
            ) || null
          ]
        );

      res.status(201).json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إنشاء القسم"
      );
    }
  }
);

app.patch(
  "/api/admin/categories/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          UPDATE categories
          SET
            name =
              COALESCE(
                NULLIF($1,''),
                name
              ),
            slug =
              COALESCE(
                NULLIF($2,''),
                slug
              ),
            image_url =
              $3,
            is_active =
              COALESCE(
                $4,
                is_active
              )
          WHERE id = $5
          RETURNING *
          `,
          [
            cleanText(
              req.body?.name
            ),
            slugify(
              req.body?.slug ||
                req.body?.name ||
                ""
            ),
            cleanText(
              req.body?.image_url ??
              req.body?.imageUrl
            ) || null,
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : null,
            id
          ]
        );

      res.json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل القسم"
      );
    }
  }
);

/* =========================================================
   ADMIN - BRANDS
========================================================= */

app.get(
  "/api/admin/brands",
  requireAdmin,
  async (req, res) => {
    const result =
      await db(`
        SELECT
          id,
          name,
          slug,
          logo_url AS "logoUrl",
          is_active AS "isActive"
        FROM brands
        ORDER BY name
      `);

    res.json({
      ok: true,
      brands:
        result.rows
    });
  }
);

app.post(
  "/api/admin/brands",
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      const slug =
        slugify(
          req.body?.slug ||
            name
        );

      const result =
        await db(
          `
          INSERT INTO brands
            (
              name,
              slug,
              logo_url
            )
          VALUES
            ($1,$2,$3)
          RETURNING *
          `,
          [
            name,
            slug,
            cleanText(
              req.body?.logo_url ??
              req.body?.logoUrl
            ) || null
          ]
        );

      res.status(201).json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إنشاء الماركة"
      );
    }
  }
);

app.patch(
  "/api/admin/brands/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          UPDATE brands
          SET
            name =
              COALESCE(
                NULLIF($1,''),
                name
              ),
            slug =
              COALESCE(
                NULLIF($2,''),
                slug
              ),
            logo_url =
              $3,
            is_active =
              COALESCE(
                $4,
                is_active
              )
          WHERE id = $5
          RETURNING *
          `,
          [
            cleanText(
              req.body?.name
            ),
            slugify(
              req.body?.slug ||
                req.body?.name ||
                ""
            ),
            cleanText(
              req.body?.logo_url ??
              req.body?.logoUrl
            ) || null,
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : null,
            id
          ]
        );

      res.json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل الماركة"
      );
    }
  }
);

/* =========================================================
   ADMIN - PRODUCTS
========================================================= */

app.get(
  "/api/admin/products",
  requireAdmin,
  async (req, res) => {
    const result =
      await db(`
        SELECT
          p.*,
          c.name AS "categoryName",
          b.name AS "brandName"
        FROM products p
        LEFT JOIN categories c
          ON c.id = p.category_id
        LEFT JOIN brands b
          ON b.id = p.brand_id
        ORDER BY
          p.created_at DESC
      `);

    res.json({
      ok: true,
      products:
        result.rows
    });
  }
);

app.post(
  "/api/admin/products",
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      const price =
        money(
          req.body?.price
        );

      if (!name) {
        return sendError(
          res,
          400,
          "اسم المنتج مطلوب"
        );
      }

      const result =
        await db(
          `
          INSERT INTO products
            (
              name,
              description,
              price,
              old_price,
              stock,
              image_url,
              category_id,
              brand_id,
              is_active,
              is_featured,
              is_best_seller
            )
          VALUES
            (
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10,$11
            )
          RETURNING *
          `,
          [
            name,
            cleanText(
              req.body?.description
            ) || null,
            price,
            req.body?.old_price !==
              undefined
              ? money(
                  req.body.old_price
                )
              : null,
            integer(
              req.body?.stock,
              0
            ),
            cleanText(
              req.body?.image_url ??
              req.body?.imageUrl
            ) || null,
            integer(
              req.body?.category_id ??
                req.body?.categoryId,
              null
            ),
            integer(
              req.body?.brand_id ??
                req.body?.brandId,
              null
            ),
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : true,
            Boolean(
              req.body?.is_featured
            ),
            Boolean(
              req.body?.is_best_seller
            )
          ]
        );

      res.status(201).json({
        ok: true,
        product:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إنشاء المنتج"
      );
    }
  }
);

app.patch(
  "/api/admin/products/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const current =
        await db(
          `
          SELECT *
          FROM products
          WHERE id = $1
          `,
          [id]
        );

      if (!current.rows.length) {
        return sendError(
          res,
          404,
          "المنتج غير موجود"
        );
      }

      const old =
        current.rows[0];

      const result =
        await db(
          `
          UPDATE products
          SET
            name = $1,
            description = $2,
            price = $3,
            old_price = $4,
            stock = $5,
            image_url = $6,
            category_id = $7,
            brand_id = $8,
            is_active = $9,
            is_featured = $10,
            is_best_seller = $11,
            updated_at = NOW()
          WHERE id = $12
          RETURNING *
          `,
          [
            req.body?.name !==
              undefined
              ? cleanText(
                  req.body.name
                )
              : old.name,

            req.body?.description !==
              undefined
              ? cleanText(
                  req.body.description
                )
              : old.description,

            req.body?.price !==
              undefined
              ? money(
                  req.body.price
                )
              : old.price,

            req.body?.old_price !==
              undefined
              ? money(
                  req.body.old_price
                )
              : old.old_price,

            req.body?.stock !==
              undefined
              ? integer(
                  req.body.stock,
                  0
                )
              : old.stock,

            req.body?.image_url !==
              undefined ||
            req.body?.imageUrl !==
              undefined
              ? cleanText(
                  req.body?.image_url ??
                    req.body?.imageUrl
                ) || null
              : old.image_url,

            req.body?.category_id !==
              undefined ||
            req.body?.categoryId !==
              undefined
              ? integer(
                  req.body?.category_id ??
                    req.body?.categoryId,
                  null
                )
              : old.category_id,

            req.body?.brand_id !==
              undefined ||
            req.body?.brandId !==
              undefined
              ? integer(
                  req.body?.brand_id ??
                    req.body?.brandId,
                  null
                )
              : old.brand_id,

            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : old.is_active,

            req.body?.is_featured !==
              undefined
              ? Boolean(
                  req.body.is_featured
                )
              : old.is_featured,

            req.body?.is_best_seller !==
              undefined
              ? Boolean(
                  req.body.is_best_seller
                )
              : old.is_best_seller,

            id
          ]
        );

      res.json({
        ok: true,
        product:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل المنتج"
      );
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT VARIANTS
========================================================= */

app.get(
  "/api/admin/products/:id/variants",
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          SELECT
            id,
            product_id AS "productId",
            sku,
            color,
            size,
            price,
            stock,
            is_active AS "isActive"
          FROM product_variants
          WHERE
            product_id = $1
          ORDER BY id
          `,
          [productId]
        );

      res.json({
        ok: true,
        variants:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الخيارات"
      );
    }
  }
);

app.post(
  "/api/admin/products/:id/variants",
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          INSERT INTO product_variants
            (
              product_id,
              sku,
              color,
              size,
              price,
              stock,
              is_active
            )
          VALUES
            ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
          `,
          [
            productId,
            cleanText(
              req.body?.sku
            ) || null,
            cleanText(
              req.body?.color
            ) || null,
            cleanText(
              req.body?.size
            ) || null,
            req.body?.price !==
              undefined
              ? money(
                  req.body.price
                )
              : null,
            integer(
              req.body?.stock,
              0
            ),
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : true
          ]
        );

      res.status(201).json({
        ok: true,
        variant:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إنشاء الخيار"
      );
    }
  }
);

app.patch(
  "/api/admin/variants/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          UPDATE product_variants
          SET
            sku =
              COALESCE(
                NULLIF($1,''),
                sku
              ),
            color = $2,
            size = $3,
            price = $4,
            stock = $5,
            is_active = $6,
            updated_at = NOW()
          WHERE id = $7
          RETURNING *
          `,
          [
            cleanText(
              req.body?.sku
            ),
            cleanText(
              req.body?.color
            ) || null,
            cleanText(
              req.body?.size
            ) || null,
            req.body?.price !==
              undefined
              ? money(
                  req.body.price
                )
              : null,
            integer(
              req.body?.stock,
              0
            ),
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : true,
            id
          ]
        );

      res.json({
        ok: true,
        variant:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل الخيار"
      );
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY
========================================================= */

app.get(
  "/api/admin/inventory",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            im.id,
            im.product_id AS "productId",
            im.variant_id AS "variantId",
            im.quantity_change
              AS "quantityChange",
            im.reason,
            im.order_id AS "orderId",
            im.created_at
              AS "createdAt",

            p.name
              AS "productName",

            pv.color,
            pv.size

          FROM inventory_movements im

          LEFT JOIN products p
            ON p.id = im.product_id

          LEFT JOIN product_variants pv
            ON pv.id = im.variant_id

          ORDER BY
            im.created_at DESC
        `);

      res.json({
        ok: true,
        movements:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل المخزون"
      );
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY ADJUST
========================================================= */

app.post(
  "/api/admin/inventory/adjust",
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.body?.product_id ??
            req.body?.productId,
          NaN
        );

      const variantId =
        req.body?.variant_id ??
        req.body?.variantId;

      const change =
        integer(
          req.body?.quantity_change ??
            req.body?.quantityChange,
          NaN
        );

      const reason =
        cleanText(
          req.body?.reason
        ) ||
        "admin_adjustment";

      if (
        !Number.isInteger(
          change
        ) ||
        change === 0
      ) {
        return sendError(
          res,
          400,
          "كمية التعديل غير صحيحة"
        );
      }

      await transaction(
        async (client) => {
          if (
            variantId !==
              undefined &&
            variantId !==
              null &&
            variantId !== ""
          ) {
            const vid =
              integer(
                variantId,
                NaN
              );

            const updated =
              await client.query(
                `
                UPDATE product_variants
                SET
                  stock =
                    GREATEST(
                      0,
                      stock + $1
                    ),
                  updated_at =
                    NOW()
                WHERE id = $2
                RETURNING stock
                `,
                [
                  change,
                  vid
                ]
              );

            if (
              !updated.rows.length
            ) {
              throw new Error(
                "الخيار غير موجود"
              );
            }

            await client.query(
              `
              INSERT INTO inventory_movements
                (
                  variant_id,
                  product_id,
                  quantity_change,
                  reason
                )
              VALUES
                ($1,$2,$3,$4)
              `,
              [
                vid,
                productId,
                change,
                reason
              ]
            );
          } else {
            const updated =
              await client.query(
                `
                UPDATE products
                SET
                  stock =
                    GREATEST(
                      0,
                      stock + $1
                    ),
                  updated_at =
                    NOW()
                WHERE id = $2
                RETURNING stock
                `,
                [
                  change,
                  productId
                ]
              );

            if (
              !updated.rows.length
            ) {
              throw new Error(
                "المنتج غير موجود"
              );
            }

            await client.query(
              `
              INSERT INTO inventory_movements
                (
                  product_id,
                  quantity_change,
                  reason
                )
              VALUES
                ($1,$2,$3)
              `,
              [
                productId,
                change,
                reason
              ]
            );
          }
        }
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        error.message ||
          "تعذر تعديل المخزون"
      );
    }
  }
);

/* =========================================================
   COUPONS - VALIDATE
========================================================= */

app.post(
  "/api/coupons/validate",
  optionalAuth,
  async (req, res) => {
    try {
      const code =
        cleanText(
          req.body?.code
        ).toUpperCase();

      const subtotal =
        money(
          req.body?.subtotal
        );

      if (!code) {
        return sendError(
          res,
          400,
          "كود الخصم مطلوب"
        );
      }

      const result =
        await db(
          `
          SELECT *
          FROM coupons
          WHERE
            UPPER(code) = $1
            AND is_active = TRUE
            AND (
              expires_at IS NULL
              OR expires_at > NOW()
            )
            AND (
              max_uses IS NULL
              OR used_count < max_uses
            )
          LIMIT 1
          `,
          [code]
        );

      if (!result.rows.length) {
        return sendError(
          res,
          404,
          "كود الخصم غير صالح"
        );
      }

      const coupon =
        result.rows[0];

      if (
        subtotal <
        Number(
          coupon.min_order ||
            0
        )
      ) {
        return sendError(
          res,
          400,
          "الطلب لا يحقق الحد الأدنى للكوبون"
        );
      }

      let discount = 0;

      if (
        coupon.discount_type ===
        "fixed"
      ) {
        discount =
          Math.min(
            subtotal,
            Number(
              coupon.discount_value ||
                0
            )
          );
      } else {
        discount =
          Math.min(
            subtotal,
            subtotal *
              percent(
                coupon.discount_value
              ) /
              100
          );
      }

      res.json({
        ok: true,
        coupon: {
          id:
            coupon.id,
          code:
            coupon.code,
          discountType:
            coupon.discount_type,
          discountValue:
            coupon.discount_value
        },
        discount:
          money(discount)
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر التحقق من الكوبون"
      );
    }
  }
);

/* =========================================================
   ADMIN - COUPONS
========================================================= */

app.get(
  "/api/admin/coupons",
  requireAdmin,
  async (req, res) => {
    const result =
      await db(`
        SELECT
          *
        FROM coupons
        ORDER BY
          created_at DESC
      `);

    res.json({
      ok: true,
      coupons:
        result.rows
    });
  }
);

app.post(
  "/api/admin/coupons",
  requireAdmin,
  async (req, res) => {
    try {
      const code =
        cleanText(
          req.body?.code
        ).toUpperCase();

      if (!code) {
        return sendError(
          res,
          400,
          "كود الخصم مطلوب"
        );
      }

      const result =
        await db(
          `
          INSERT INTO coupons
            (
              code,
              discount_type,
              discount_value,
              min_order,
              max_uses,
              expires_at,
              is_active
            )
          VALUES
            ($1,$2,$3,$4,$5,$6,$7)
          RETURNING *
          `,
          [
            code,
            cleanText(
              req.body?.discount_type ??
                "percent"
            ),
            money(
              req.body?.discount_value
            ),
            money(
              req.body?.min_order
            ),
            req.body?.max_uses !==
              undefined &&
            req.body?.max_uses !==
              null &&
            req.body?.max_uses !==
              ""
              ? integer(
                  req.body.max_uses,
                  null
                )
              : null,
            req.body?.expires_at ||
              null,
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : true
          ]
        );

      res.status(201).json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إنشاء الكوبون"
      );
    }
  }
);

app.patch(
  "/api/admin/coupons/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          UPDATE coupons
          SET
            discount_type =
              COALESCE(
                $1,
                discount_type
              ),
            discount_value =
              COALESCE(
                $2,
                discount_value
              ),
            min_order =
              COALESCE(
                $3,
                min_order
              ),
            max_uses =
              $4,
            expires_at =
              $5,
            is_active =
              COALESCE(
                $6,
                is_active
              )
          WHERE id = $7
          RETURNING *
          `,
          [
            cleanText(
              req.body?.discount_type
            ) || null,
            req.body?.discount_value !==
              undefined
              ? money(
                  req.body.discount_value
                )
              : null,
            req.body?.min_order !==
              undefined
              ? money(
                  req.body.min_order
                )
              : null,
            req.body?.max_uses !==
              undefined
              ? integer(
                  req.body.max_uses,
                  null
                )
              : null,
            req.body?.expires_at ??
              null,
            req.body?.is_active !==
              undefined
              ? Boolean(
                  req.body.is_active
                )
              : null,
            id
          ]
        );

      res.json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعديل الكوبون"
      );
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
      const settings =
        await getSettings();

      /* Always keep WhatsApp fixed */
      settings.whatsapp_number =
        "0562499924";

      res.json({
        ok: true,
        settings
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الإعدادات"
      );
    }
  }
);

/* =========================================================
   SETTINGS - ADMIN
========================================================= */

app.get(
  "/api/admin/settings",
  requireAdmin,
  async (req, res) => {
    try {
      const settings =
        await getSettings();

      settings.whatsapp_number =
        "0562499924";

      res.json({
        ok: true,
        settings
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الإعدادات"
      );
    }
  }
);

app.put(
  "/api/admin/settings",
  requireAdmin,
  async (req, res) => {
    try {
      const input =
        req.body?.settings &&
        typeof req.body.settings ===
          "object"
          ? req.body.settings
          : req.body || {};

      for (
        const [
          key,
          value
        ] of Object.entries(
          input
        )
      ) {
        if (
          !cleanText(key)
        ) {
          continue;
        }

        /* WhatsApp is fixed */
        if (
          key ===
          "whatsapp_number"
        ) {
          continue;
        }

        await db(
          `
          INSERT INTO settings
            (
              key,
              value
            )
          VALUES
            ($1,$2)
          ON CONFLICT (key)
          DO UPDATE SET
            value =
              EXCLUDED.value,
            updated_at =
              NOW()
          `,
          [
            cleanText(key),
            value
          ]
        );
      }

      res.json({
        ok: true,
        message:
          "تم حفظ الإعدادات"
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر حفظ الإعدادات"
      );
    }
  }
);

app.put(
  "/api/admin/settings/:key",
  requireAdmin,
  async (req, res) => {
    try {
      const key =
        cleanText(
          req.params.key
        );

      if (
        key ===
        "whatsapp_number"
      ) {
        return sendError(
          res,
          400,
          "رقم الواتساب ثابت"
        );
      }

      const value =
        req.body?.value !==
        undefined
          ? req.body.value
          : req.body;

      const result =
        await db(
          `
          INSERT INTO settings
            (
              key,
              value
            )
          VALUES
            ($1,$2)
          ON CONFLICT (key)
          DO UPDATE SET
            value =
              EXCLUDED.value,
            updated_at =
              NOW()
          RETURNING
            key,
            value,
            updated_at AS "updatedAt"
          `,
          [
            key,
            value
          ]
        );

      res.json({
        ok: true,
        setting:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر حفظ الإعداد"
      );
    }
  }
);

/* =========================================================
   ADMIN - DASHBOARD
========================================================= */

app.get(
  "/api/admin/dashboard",
  requireAdmin,
  async (req, res) => {
    try {
      const [
        users,
        products,
        orders,
        revenue,
        lowStock
      ] = await Promise.all([
        db(`
          SELECT COUNT(*)::INTEGER AS count
          FROM users
          WHERE role = 'customer'
        `),

        db(`
          SELECT COUNT(*)::INTEGER AS count
          FROM products
          WHERE is_active = TRUE
        `),

        db(`
          SELECT COUNT(*)::INTEGER AS count
          FROM orders
          WHERE status NOT IN
            ('cancelled','canceled')
        `),

        db(`
          SELECT
            COALESCE(
              SUM(total),
              0
            ) AS total
          FROM orders
          WHERE status NOT IN
            ('cancelled','canceled')
        `),

        db(`
          SELECT COUNT(*)::INTEGER AS count
          FROM products
          WHERE
            is_active = TRUE
            AND stock <= 5
        `)
      ]);

      res.json({
        ok: true,
        dashboard: {
          users:
            users.rows[0].count,
          products:
            products.rows[0].count,
          orders:
            orders.rows[0].count,
          revenue:
            Number(
              revenue.rows[0].total
            ),
          lowStock:
            lowStock.rows[0].count
        }
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل لوحة التحكم"
      );
    }
  }
);

/* =========================================================
   ADMIN - REPORTS
========================================================= */

app.get(
  "/api/admin/reports",
  requireAdmin,
  async (req, res) => {
    try {
      const from =
        cleanText(
          req.query?.from
        );

      const to =
        cleanText(
          req.query?.to
        );

      const values = [];
      const where = [
        `
        o.status NOT IN
          ('cancelled','canceled')
        `
      ];

      if (from) {
        values.push(
          from
        );

        where.push(
          `o.created_at >= $${values.length}::date`
        );
      }

      if (to) {
        values.push(
          to
        );

        where.push(
          `o.created_at < ($${values.length}::date + INTERVAL '1 day')`
        );
      }

      const summary =
        await db(
          `
          SELECT
            COUNT(*)::INTEGER
              AS orders,
            COALESCE(
              SUM(o.total),
              0
            ) AS revenue,
            COALESCE(
              SUM(o.subtotal),
              0
            ) AS subtotal,
            COALESCE(
              SUM(o.discount),
              0
            ) AS discounts
          FROM orders o
          WHERE
            ${where.join(" AND ")}
          `,
          values
        );

      const top =
        await db(
          `
          SELECT
            oi.product_id
              AS "productId",
            oi.product_name
              AS "productName",
            SUM(
              oi.quantity
            )::INTEGER
              AS quantity,
            SUM(
              oi.total_price
            ) AS revenue
          FROM order_items oi

          JOIN orders o
            ON o.id =
              oi.order_id

          WHERE
            ${where.join(
              " AND "
            )}

          GROUP BY
            oi.product_id,
            oi.product_name

          ORDER BY
            quantity DESC

          LIMIT 5
          `,
          values
        );

      res.json({
        ok: true,
        summary:
          summary.rows[0],
        topProducts:
          top.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل التقارير"
      );
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY SUMMARY
========================================================= */

app.get(
  "/api/admin/inventory/summary",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db(`
          SELECT
            COUNT(*)::INTEGER
              AS "products",
            COALESCE(
              SUM(stock),
              0
            )::INTEGER
              AS "units",
            COUNT(*) FILTER (
              WHERE stock <= 0
            )::INTEGER
              AS "outOfStock",
            COUNT(*) FILTER (
              WHERE stock > 0
                AND stock <= 5
            )::INTEGER
              AS "lowStock"
          FROM products
          WHERE
            is_active = TRUE
        `);

      res.json({
        ok: true,
        summary:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل ملخص المخزون"
      );
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT IMAGES
========================================================= */

app.get(
  "/api/admin/products/:id/images",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      const result =
        await db(
          `
          SELECT
            id,
            product_id AS "productId",
            image_url AS "imageUrl",
            sort_order AS "sortOrder",
            is_primary AS "isPrimary"
          FROM product_images
          WHERE
            product_id = $1
          ORDER BY
            is_primary DESC,
            sort_order,
            id
          `,
          [id]
        );

      res.json({
        ok: true,
        images:
          result.rows
      });
    } catch (error) {
      sendError(
        res,
        500,
        "تعذر تحميل الصور"
      );
    }
  }
);

app.post(
  "/api/admin/products/:id/images",
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        integer(
          req.params.id,
          NaN
        );

      const imageUrl =
        cleanText(
          req.body?.image_url ??
          req.body?.imageUrl ??
          req.body?.url
        );

      if (!imageUrl) {
        return sendError(
          res,
          400,
          "رابط الصورة مطلوب"
        );
      }

      const result =
        await db(
          `
          INSERT INTO product_images
            (
              product_id,
              image_url,
              sort_order,
              is_primary
            )
          VALUES
            ($1,$2,$3,$4)
          RETURNING
            id,
            product_id AS "productId",
            image_url AS "imageUrl",
            sort_order AS "sortOrder",
            is_primary AS "isPrimary"
          `,
          [
            productId,
            imageUrl,
            integer(
              req.body?.sort_order ??
                req.body?.sortOrder,
              0
            ),
            Boolean(
              req.body?.is_primary ??
              req.body?.isPrimary
            )
          ]
        );

      res.status(201).json({
        ok: true,
        image:
          result.rows[0]
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر إضافة الصورة"
      );
    }
  }
);

app.delete(
  "/api/admin/product-images/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db(
        `
        DELETE FROM product_images
        WHERE id = $1
        `,
        [
          integer(
            req.params.id,
            NaN
          )
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر حذف الصورة"
      );
    }
  }
);

app.patch(
  "/api/admin/product-images/:id/primary",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      await transaction(
        async (client) => {
          const image =
            await client.query(
              `
              SELECT
                product_id
              FROM product_images
              WHERE id = $1
              `,
              [id]
            );

          if (
            !image.rows.length
          ) {
            throw new Error(
              "الصورة غير موجودة"
            );
          }

          const productId =
            image.rows[0]
              .product_id;

          await client.query(
            `
            UPDATE product_images
            SET
              is_primary = FALSE
            WHERE
              product_id = $1
            `,
            [productId]
          );

          await client.query(
            `
            UPDATE product_images
            SET
              is_primary = TRUE
            WHERE id = $1
            `,
            [id]
          );
        }
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر تعيين الصورة الرئيسية"
      );
    }
  }
);

/* =========================================================
   DELETE VARIANT
========================================================= */

app.delete(
  "/api/admin/product-variants/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db(
        `
        DELETE FROM product_variants
        WHERE id = $1
        `,
        [
          integer(
            req.params.id,
            NaN
          )
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر حذف الخيار"
      );
    }
  }
);

/* =========================================================
   DELETE CATEGORY
========================================================= */

app.delete(
  "/api/admin/categories/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db(
        `
        UPDATE categories
        SET
          is_active = FALSE
        WHERE id = $1
        `,
        [
          integer(
            req.params.id,
            NaN
          )
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر حذف القسم"
      );
    }
  }
);

/* =========================================================
   DELETE BRAND
========================================================= */

app.delete(
  "/api/admin/brands/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db(
        `
        UPDATE brands
        SET
          is_active = FALSE
        WHERE id = $1
        `,
        [
          integer(
            req.params.id,
            NaN
          )
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر حذف الماركة"
      );
    }
  }
);

/* =========================================================
   DELETE COUPON
========================================================= */

app.delete(
  "/api/admin/coupons/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db(
        `
        UPDATE coupons
        SET
          is_active = FALSE
        WHERE id = $1
        `,
        [
          integer(
            req.params.id,
            NaN
          )
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      sendError(
        res,
        400,
        "تعذر حذف الكوبون"
      );
    }
  }
);

/* =========================================================
   ADMIN - FIRST OWNER
========================================================= */

app.post(
  "/api/admin/bootstrap-owner",
  async (req, res) => {
    try {
      const countResult =
        await db(`
          SELECT COUNT(*)::INTEGER
            AS count
          FROM users
          WHERE
            role IN (
              'owner',
              'admin'
            )
        `);

      if (
        Number(
          countResult.rows[0].count
        ) > 0
      ) {
        return sendError(
          res,
          403,
          "تم إنشاء المالك مسبقاً"
        );
      }

      const name =
        cleanText(
          req.body?.name
        );

      const email =
        normalizeEmail(
          req.body?.email
        );

      const phone =
        normalizePhone(
          req.body?.phone
        );

      const password =
        cleanText(
          req.body?.password
        );

      if (
        !name ||
        (!email && !phone) ||
        password.length < 6
      ) {
        return sendError(
          res,
          400,
          "البيانات غير مكتملة"
        );
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
              role,
              is_owner,
              is_active
            )
          VALUES
            (
              $1,
              $2,
              $3,
              $4,
              'owner',
              TRUE,
              TRUE
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
            name,
            email,
            phone,
            passwordHash
          ]
        );

      const user =
        result.rows[0];

      const token =
        createToken(user);

      res.status(201).json({
        ok: true,
        token,
        user:
          publicUser(user)
      });
    } catch (error) {
      sendError(
        res,
        400,
        error.message ||
          "تعذر إنشاء المالك"
      );
    }
  }
);

/* =========================================================
   WHATSAPP INFO
========================================================= */

app.get(
  "/api/contact/whatsapp",
  (req, res) => {
    res.json({
      ok: true,
      number:
        "0562499924"
    });
  }
);

/* =========================================================
   FRONTEND STATIC FILES
========================================================= */

if (
  fs.existsSync(
    FRONTEND_DIR
  )
) {
  app.use(
    express.static(
      FRONTEND_DIR
    )
  );
}

/* =========================================================
   SPA FALLBACK
========================================================= */

app.get(
  "/{*splat}",
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return res
        .status(404)
        .json({
          ok: false,
          message:
            "المسار غير موجود"
        });
    }

    const adminPath =
      req.path === "/admin" ||
      req.path === "/admin/" ||
      req.path === "/admin.html";

    if (
      adminPath &&
      fs.existsSync(
        path.join(
          FRONTEND_DIR,
          "admin.html"
        )
      )
    ) {
      return res.sendFile(
        path.join(
          FRONTEND_DIR,
          "admin.html"
        )
      );
    }

    const indexPath =
      path.join(
        FRONTEND_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        indexPath
      )
    ) {
      return res.sendFile(
        indexPath
      );
    }

    res
      .status(404)
      .send(
        "Ladies First frontend not found."
      );
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "[SERVER ERROR]",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      ok: false,
      message:
        "حدث خطأ في الخادم"
    });
  }
);

/* =========================================================
   START
========================================================= */

async function start() {
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
      "[STARTUP ERROR]",
      error
    );

    process.exit(1);
  }
}

start();

module.exports = app;
