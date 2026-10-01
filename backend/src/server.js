"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("node:path");

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
const ROOT = path.resolve(__dirname, "..", "..");

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

app.use(express.urlencoded({
  extended: true,
  limit: "5mb"
}));

app.use(express.static(path.join(ROOT, "frontend")));

/* =========================================================
   HELPERS
========================================================= */

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function integer(value, fallback = 0) {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

function cleanText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function publicUser(user) {
  return sanitizeUser(user);
}

function productIdFromRequest(req) {
  const id = integer(req.params.id, NaN);

  if (!Number.isInteger(id)) {
    return null;
  }

  return id;
}

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initDatabase() {
  const status = await getDatabaseStatus();

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
      category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
      brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  /*
     Existing installations may already have products.
     Add stock safely if the table existed before.
  */
  await db(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0
  `);

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
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
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2) NOT NULL
    )
  `);

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

  await db(`
    ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS product_id BIGINT
    REFERENCES products(id)
    ON DELETE SET NULL
  `);

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

  await db(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("[DB] Database initialized.");
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", async (req, res) => {
  try {
    const status = await getDatabaseStatus();

    res.json({
      ok: true,
      server: true,
      database: status.connected,
      databaseConfigured: status.configured,
      serverTime: status.serverTime || null
    });
  } catch (error) {
    console.error("[HEALTH]", error);

    res.status(503).json({
      ok: false,
      server: true,
      database: false
    });
  }
});

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      contact,
      password,
      gender,
      age
    } = req.body || {};

    const cleanName = cleanText(name);
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone || contact);

    if (!cleanName || !password) {
      return res.status(400).json({
        ok: false,
        message: "الاسم وكلمة المرور مطلوبان"
      });
    }

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({
        ok: false,
        message:
          "أدخلي البريد الإلكتروني أو رقم الهاتف"
      });
    }

    const existing = await db(
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
        cleanEmail,
        cleanPhone
      ]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        ok: false,
        message:
          "هذا البريد أو رقم الهاتف مسجل مسبقاً"
      });
    }

    const passwordHash =
      await hashPassword(password);

    const ageNumber =
      age === undefined ||
      age === null ||
      age === ""
        ? null
        : integer(age, null);

    const result = await db(
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
        ($1,$2,$3,$4,$5,$6)
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
        cleanText(gender) || null,
        ageNumber
      ]
    );

    const user =
      result.rows[0];

    const token =
      createToken(user);

    res.status(201).json({
      ok: true,
      user: publicUser(user),
      token,
      greeting:
        getGenderGreeting(user.gender)
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
});

/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      contact,
      password
    } = req.body || {};

    const value =
      normalizeContact(contact);

    if (!value || !password) {
      return res.status(400).json({
        ok: false,
        message:
          "بيانات الدخول غير مكتملة"
      });
    }

    const result = await db(
      `
      SELECT *
      FROM users
      WHERE
        email = $1
        OR phone = $1
      LIMIT 1
      `,
      [value]
    );

    if (!result.rows.length) {
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
      user: publicUser(user),
      token,
      greeting:
        getGenderGreeting(user.gender)
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

      const result = await db(
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

      if (!result.rows.length) {
        return res.json({
          ok: true,
          user: null
        });
      }

      const user =
        result.rows[0];

      res.json({
        ok: true,
        user: publicUser(user),
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
   CATEGORIES
========================================================= */

app.get("/api/categories", async (req, res) => {
  try {
    const result = await db(`
      SELECT
        id,
        name,
        slug,
        image_url AS "imageUrl"
      FROM categories
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({
      ok: true,
      categories: result.rows
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
});

/* =========================================================
   BRANDS
========================================================= */

app.get("/api/brands", async (req, res) => {
  try {
    const result = await db(`
      SELECT
        id,
        name,
        slug,
        logo_url AS "logoUrl"
      FROM brands
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({
      ok: true,
      brands: result.rows
    });
  } catch (error) {
    console.error(
      "[BRANDS]",
      error
    );

    res.status(500).json({
      ok: false,
      message:
        "تعذر تحميل العلامات التجارية"
    });
  }
});
/* =========================================================
   PRODUCT QUERY
========================================================= */

async function getProducts(
  where = "",
  params = [],
  order = "p.created_at DESC"
) {
  const result = await db(
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
      p.created_at AS "createdAt",

      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'sku', v.sku,
              'color', v.color,
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

    ORDER BY ${order}
    `,
    params
  );

  return result.rows;
}

/* =========================================================
   PRODUCTS
========================================================= */

app.get("/api/products", async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      sort
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(
        `%${cleanText(search)}%`
      );

      conditions.push(`
        (
          p.name ILIKE $${params.length}
          OR
          p.description ILIKE $${params.length}
        )
      `);
    }

    if (
      category &&
      Number.isInteger(Number(category))
    ) {
      params.push(
        Number(category)
      );

      conditions.push(
        `p.category_id = $${params.length}`
      );
    }

    if (
      brand &&
      Number.isInteger(Number(brand))
    ) {
      params.push(
        Number(brand)
      );

      conditions.push(
        `p.brand_id = $${params.length}`
      );
    }

    const where =
      conditions.length
        ? `AND ${conditions.join(" AND ")}`
        : "";

    let order =
      "p.created_at DESC";

    if (sort === "price_asc") {
      order =
        "p.price ASC";
    }

    if (sort === "price_desc") {
      order =
        "p.price DESC";
    }

    if (sort === "name") {
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
});

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

      /*
         Recommended products:
         same category first,
         then same brand.
      */
      const recommendations =
        await getProducts(
          `
          AND p.id <> $1
          AND (
            p.category_id = $2
            OR p.brand_id = $3
          )
          `,
          [
            id,
            product.categoryId,
            product.brandId
          ],
          "p.created_at DESC"
        );

      res.json({
        ok: true,
        product,
        recommendations:
          recommendations.slice(0, 8)
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
   HOME DATA
========================================================= */

app.get(
  "/api/store/home",
  async (req, res) => {
    try {
      const featured =
        await getProducts(
          "AND p.is_featured = TRUE",
          [],
          "p.created_at DESC"
        );

      /*
         Real best sellers:
         cancelled orders are excluded.
      */
      const bestResult =
        await db(`
          SELECT
            oi.product_id AS id,
            SUM(oi.quantity)::INTEGER AS sold_quantity
          FROM order_items oi
          INNER JOIN orders o
            ON o.id = oi.order_id
          WHERE
            LOWER(o.status) NOT IN (
              'cancelled',
              'canceled'
            )
          GROUP BY
            oi.product_id
          ORDER BY
            sold_quantity DESC
          LIMIT 20
        `);

      let bestSellers = [];

      if (bestResult.rows.length) {
        const ids =
          bestResult.rows.map(
            (row) =>
              Number(row.id)
          );

        const products =
          await getProducts(
            `
            AND p.id = ANY($1::bigint[])
            `,
            [ids]
          );

        const byId =
          new Map(
            products.map(
              (product) => [
                Number(product.id),
                product
              ]
            )
          );

        bestSellers =
          ids
            .map((id) =>
              byId.get(id)
            )
            .filter(Boolean);
      }

      if (!bestSellers.length) {
        bestSellers =
          await getProducts(
            "AND p.is_best_seller = TRUE",
            [],
            "p.created_at DESC"
          );
      }

      const offers =
        await getProducts(
          `
          AND p.old_price IS NOT NULL
          AND p.old_price > p.price
          `,
          [],
          "(p.old_price - p.price) DESC"
        );

      const products =
        await getProducts(
          "",
          [],
          "p.created_at DESC"
        );

      const topFive =
        products.slice(0, 5);

      res.json({
        ok: true,

        featured,

        topFive,

        bestSellers:
          bestSellers.slice(0, 20),

        offers:
          offers.slice(0, 20),

        products,

        /*
           Frontend can use this for
           "بيلبق معه / بكمل اللوك".
        */
        completeLook:
          bestSellers.slice(0, 8)
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
          WHERE user_id = $1
          ORDER BY created_at DESC
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

      if (!Number.isInteger(productId)) {
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
        return res.status(400).json({
          ok: false,
          message:
            "السلة فارغة"
        });
      }

      const result =
        await transaction(
          async (client) => {
            let subtotal = 0;

            const orderItems = [];

            for (const item of items) {
              const productId =
                integer(
                  item.productId,
                  NaN
                );

              const variantId =
                item.variantId
                  ? integer(
                      item.variantId,
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
                quantity <= 0
              ) {
                throw new Error(
                  "بيانات المنتج غير صحيحة"
                );
              }

              const productResult =
                await client.query(
                  `
                  SELECT
                    p.*
                  FROM products p
                  WHERE
                    p.id = $1
                    AND p.is_active = TRUE
                  FOR UPDATE
                  `,
                  [productId]
                );

              if (
                !productResult.rows.length
              ) {
                throw new Error(
                  "المنتج غير موجود"
                );
              }

              const product =
                productResult.rows[0];

              let unitPrice =
                Number(
                  product.price
                );

              let variantName =
                null;

              /*
                 Check whether this product
                 actually uses variants.
              */
              const variantsResult =
                await client.query(
                  `
                  SELECT
                    COUNT(*)::INTEGER AS count
                  FROM product_variants
                  WHERE
                    product_id = $1
                    AND is_active = TRUE
                  `,
                  [productId]
                );

              const hasVariants =
                Number(
                  variantsResult
                    .rows[0]
                    ?.count || 0
                ) > 0;

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
                  !variantResult.rows.length
                ) {
                  throw new Error(
                    "الخيار المطلوب غير موجود"
                  );
                }

                const variant =
                  variantResult.rows[0];

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
                  variant.price !== null
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
                    .join(" / ");

                const updateResult =
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
                  !updateResult.rows.length
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
                    ($1,$2,$3,$4)
                  `,
                  [
                    variantId,
                    productId,
                    -quantity,
                    "order"
                  ]
                );
              } else {
                /*
                   Products without variants
                   use products.stock.
                */
                if (
                  Number(
                    product.stock
                  ) < quantity
                ) {
                  throw new Error(
                    "الكمية خلصت، حقك علينا"
                  );
                }

                const updateResult =
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
                  !updateResult.rows.length
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
                    ($1,$2,$3)
                  `,
                  [
                    productId,
                    -quantity,
                    "order"
                  ]
                );
              }

              const totalPrice =
                unitPrice *
                quantity;

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
                totalPrice
              });
            }

            const shipping =
              number(
                req.body?.shipping,
                0
              );

            const packaging =
              number(
                req.body?.packaging,
                0
              );

            const discount = 0;

            const total =
              subtotal +
              shipping +
              packaging -
              discount;

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
                    total
                  )
                VALUES
                  (
                    $1,
                    'pending',
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
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
                  created_at AS "createdAt"
                `,
                [
                  req.user.id,
                  subtotal,
                  discount,
                  shipping,
                  packaging,
                  total
                ]
              );

            const order =
              orderResult.rows[0];

            for (
              const item of orderItems
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
                    total_price
                  )
                VALUES
                  (
                    $1,$2,$3,$4,
                    $5,$6,$7,$8
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
                  item.totalPrice
                ]
              );

              /*
                 Attach order id to inventory movement.
              */
              if (item.variantId) {
                await client.query(
                  `
                  UPDATE inventory_movements
                  SET order_id = $1
                  WHERE
                    variant_id = $2
                    AND order_id IS NULL
                    AND reason = 'order'
                    AND created_at =
                      (
                        SELECT MAX(created_at)
                        FROM inventory_movements
                        WHERE
                          variant_id = $2
                          AND order_id IS NULL
                          AND reason = 'order'
                      )
                  `,
                  [
                    order.id,
                    item.variantId
                  ]
                );
              } else {
                await client.query(
                  `
                  UPDATE inventory_movements
                  SET order_id = $1
                  WHERE
                    product_id = $2
                    AND order_id IS NULL
                    AND reason = 'order'
                    AND created_at =
                      (
                        SELECT MAX(created_at)
                        FROM inventory_movements
                        WHERE
                          product_id = $2
                          AND order_id IS NULL
                          AND reason = 'order'
                      )
                  `,
                  [
                    order.id,
                    item.productId
                  ]
                );
              }
            }

            return order;
          }
        );

      res.status(201).json({
        ok: true,
        order: result
      });
    } catch (error) {
      console.error(
        "[CREATE ORDER]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر إنشاء الطلب"
      });
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
            o.created_at AS "createdAt",

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
                    oi.total_price
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
          [req.user.id]
        );

      res.json({
        ok: true,
        orders:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ORDERS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الطلبات"
      });
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
          ORDER BY created_at DESC
        `);

      res.json({
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

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المستخدمين"
      });
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
        return res.status(400).json({
          ok: false,
          message:
            "رقم المستخدم غير صحيح"
        });
      }

      const {
        name,
        email,
        phone,
        gender,
        age,
        isActive
      } = req.body || {};

      const result =
        await db(
          `
          UPDATE users
          SET
            name =
              COALESCE(
                $1,
                name
              ),

            email =
              COALESCE(
                $2,
                email
              ),

            phone =
              COALESCE(
                $3,
                phone
              ),

            gender =
              COALESCE(
                $4,
                gender
              ),

            age =
              COALESCE(
                $5,
                age
              ),

            is_active =
              COALESCE(
                $6,
                is_active
              ),

            updated_at =
              NOW()

          WHERE
            id = $7

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
            name !== undefined
              ? cleanText(name)
              : null,

            email !== undefined
              ? normalizeEmail(email)
              : null,

            phone !== undefined
              ? normalizePhone(phone)
              : null,

            gender !== undefined
              ? cleanText(gender)
              : null,

            age !== undefined
              ? integer(age, null)
              : null,

            isActive !== undefined
              ? Boolean(isActive)
              : null,

            id
          ]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
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
        "[ADMIN UPDATE USER]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل بيانات المستخدم"
      });
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
        await db(
          `
          SELECT
            o.id,
            o.user_id AS "userId",
            o.status,
            o.subtotal,
            o.discount,
            o.shipping,
            o.packaging,
            o.total,
            o.created_at AS "createdAt",

            u.name AS "customerName",
            u.email AS "customerEmail",
            u.phone AS "customerPhone",

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
                    oi.total_price
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
          `
        );

      res.json({
        ok: true,
        orders:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN ORDERS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الطلبات"
      });
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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الطلب غير صحيح"
        });
      }

      const orderResult =
        await db(
          `
          SELECT
            o.id,
            o.user_id AS "userId",
            o.status,
            o.subtotal,
            o.discount,
            o.shipping,
            o.packaging,
            o.total,
            o.created_at AS "createdAt",

            u.name AS "customerName",
            u.email AS "customerEmail",
            u.phone AS "customerPhone",
            u.gender AS "customerGender",
            u.age AS "customerAge"

          FROM orders o

          LEFT JOIN users u
            ON u.id = o.user_id

          WHERE
            o.id = $1
          `,
          [id]
        );

      if (
        !orderResult.rows.length
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
          SELECT
            id,
            product_id AS "productId",
            variant_id AS "variantId",
            product_name AS "productName",
            variant_name AS "variantName",
            quantity,
            unit_price AS "unitPrice",
            total_price AS "totalPrice"
          FROM order_items
          WHERE
            order_id = $1
          ORDER BY id
          `,
          [id]
        );

      res.json({
        ok: true,
        order: {
          ...orderResult.rows[0],
          items:
            itemsResult.rows
        }
      });
    } catch (error) {
      console.error(
        "[ADMIN ORDER DETAILS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل تفاصيل الطلب"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE ORDER STATUS
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
        );

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
        return res.status(400).json({
          ok: false,
          message:
            "رقم الطلب غير صحيح"
        });
      }

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "حالة الطلب غير صحيحة"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const currentResult =
              await client.query(
                `
                SELECT
                  id,
                  status
                FROM orders
                WHERE id = $1
                FOR UPDATE
                `,
                [id]
              );

            if (
              !currentResult.rows.length
            ) {
              throw new Error(
                "الطلب غير موجود"
              );
            }

            const current =
              currentResult.rows[0];

            /*
              If an order is already cancelled,
              do not restore stock twice.
            */
            const wasCancelled =
              [
                "cancelled",
                "canceled"
              ].includes(
                String(
                  current.status
                ).toLowerCase()
              );

            const willCancel =
              [
                "cancelled",
                "canceled"
              ].includes(
                status
              );

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
                if (
                  item.variant_id
                ) {
                  await client.query(
                    `
                    UPDATE product_variants
                    SET
                      stock =
                        stock +
                        $1,
                      updated_at =
                        NOW()
                    WHERE
                      id = $2
                    `,
                    [
                      Number(
                        item.quantity
                      ),
                      item.variant_id
                    ]
                  );

                  await client.query(
                    `
                    INSERT INTO inventory_movements
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
                        $4,
                        $5
                      )
                    `,
                    [
                      item.variant_id,
                      item.product_id,
                      Number(
                        item.quantity
                      ),
                      "order_cancelled",
                      id
                    ]
                  );
                } else {
                  await client.query(
                    `
                    UPDATE products
                    SET
                      stock =
                        stock +
                        $1,
                      updated_at =
                        NOW()
                    WHERE
                      id = $2
                    `,
                    [
                      Number(
                        item.quantity
                      ),
                      item.product_id
                    ]
                  );

                  await client.query(
                    `
                    INSERT INTO inventory_movements
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
                        $3,
                        $4
                      )
                    `,
                    [
                      item.product_id,
                      Number(
                        item.quantity
                      ),
                      "order_cancelled",
                      id
                    ]
                  );
                }
              }
            }

            const updateResult =
              await client.query(
                `
                UPDATE orders
                SET
                  status = $1,
                  updated_at =
                    NOW()
                WHERE
                  id = $2
                RETURNING
                  id,
                  user_id AS "userId",
                  status,
                  subtotal,
                  discount,
                  shipping,
                  packaging,
                  total,
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"
                `,
                [
                  status,
                  id
                ]
              );

            return updateResult.rows[0];
          }
        );

      res.json({
        ok: true,
        order: result
      });
    } catch (error) {
      console.error(
        "[ADMIN UPDATE ORDER STATUS]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر تعديل حالة الطلب"
      });
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
    try {
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
    } catch (error) {
      console.error(
        "[ADMIN CATEGORIES]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل التصنيفات"
      });
    }
  }
);

/* =========================================================
   ADMIN - CREATE CATEGORY
========================================================= */

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
        return res.status(400).json({
          ok: false,
          message:
            "اسم التصنيف مطلوب"
        });
      }

      const slug =
        slugify(name);

      const result =
        await db(
          `
          INSERT INTO categories
            (
              name,
              slug
            )
          VALUES
            ($1,$2)
          RETURNING
            id,
            name,
            slug,
            image_url AS "imageUrl",
            is_active AS "isActive"
          `,
          [
            name,
            slug
          ]
        );

      res.status(201).json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[CREATE CATEGORY]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إنشاء التصنيف"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE CATEGORY
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم التصنيف غير صحيح"
        });
      }

      const name =
        req.body?.name !== undefined
          ? cleanText(
              req.body.name
            )
          : null;

      const isActive =
        req.body?.isActive !== undefined
          ? Boolean(
              req.body.isActive
            )
          : null;

      const result =
        await db(
          `
          UPDATE categories
          SET
            name =
              COALESCE(
                $1,
                name
              ),
            slug =
              CASE
                WHEN $1 IS NULL
                  THEN slug
                ELSE $2
              END,
            is_active =
              COALESCE(
                $3,
                is_active
              ),
            updated_at =
              NOW()
          WHERE
            id = $4
          RETURNING
            id,
            name,
            slug,
            image_url AS "imageUrl",
            is_active AS "isActive"
          `,
          [
            name,
            name
              ? slugify(name)
              : null,
            isActive,
            id
          ]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "التصنيف غير موجود"
        });
      }

      res.json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[UPDATE CATEGORY]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر تعديل التصنيف"
      });
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
    try {
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
    } catch (error) {
      console.error(
        "[ADMIN BRANDS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل العلامات التجارية"
      });
    }
  }
);

/* =========================================================
   ADMIN - CREATE BRAND
========================================================= */

app.post(
  "/api/admin/brands",
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      if (!name) {
        return res.status(400).json({
          ok: false,
          message:
            "اسم العلامة التجارية مطلوب"
        });
      }

      const slug =
        slugify(name);

      const result =
        await db(
          `
          INSERT INTO brands
            (
              name,
              slug
            )
          VALUES
            ($1,$2)
          RETURNING
            id,
            name,
            slug,
            logo_url AS "logoUrl",
            is_active AS "isActive"
          `,
          [
            name,
            slug
          ]
        );

      res.status(201).json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[CREATE BRAND]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إنشاء العلامة التجارية"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE BRAND
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم العلامة التجارية غير صحيح"
        });
      }

      const name =
        req.body?.name !== undefined
          ? cleanText(
              req.body.name
            )
          : null;

      const isActive =
        req.body?.isActive !== undefined
          ? Boolean(
              req.body.isActive
            )
          : null;

      const result =
        await db(
          `
          UPDATE brands
          SET
            name =
              COALESCE(
                $1,
                name
              ),
            slug =
              CASE
                WHEN $1 IS NULL
                  THEN slug
                ELSE $2
              END,
            is_active =
              COALESCE(
                $3,
                is_active
              ),
            updated_at =
              NOW()
          WHERE
            id = $4
          RETURNING
            id,
            name,
            slug,
            logo_url AS "logoUrl",
            is_active AS "isActive"
          `,
          [
            name,
            name
              ? slugify(name)
              : null,
            isActive,
            id
          ]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "العلامة التجارية غير موجودة"
        });
      }

      res.json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[UPDATE BRAND]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر تعديل العلامة التجارية"
      });
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
    try {
      const search =
        cleanText(
          req.query?.search
        );

      const params = [];
      const conditions = [];

      if (search) {
        params.push(
          `%${search}%`
        );

        conditions.push(
          `(
            p.name ILIKE $${params.length}
            OR p.description ILIKE $${params.length}
          )`
        );
      }

      const where =
        conditions.length
          ? `WHERE ${conditions.join(
              " AND "
            )}`
          : "";

      const result =
        await getProducts(
          where,
          params,
          "p.created_at DESC"
        );

      res.json({
        ok: true,
        products:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN PRODUCTS]",
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

app.post(
  "/api/admin/products",
  requireAdmin,
  async (req, res) => {
    try {
      const name =
        cleanText(
          req.body?.name
        );

      if (!name) {
        return res.status(400).json({
          ok: false,
          message:
            "اسم المنتج مطلوب"
        });
      }

      const price =
        number(
          req.body?.price,
          NaN
        );

      const oldPrice =
        req.body?.oldPrice !== undefined
          ? number(
              req.body.oldPrice,
              null
            )
          : null;

      const stock =
        integer(
          req.body?.stock,
          0
        );

      const categoryId =
        req.body?.categoryId
          ? integer(
              req.body.categoryId,
              null
            )
          : null;

      const brandId =
        req.body?.brandId
          ? integer(
              req.body.brandId,
              null
            )
          : null;

      const imageUrl =
        cleanText(
          req.body?.imageUrl
        );

      const description =
        cleanText(
          req.body?.description
        );

      const isFeatured =
        Boolean(
          req.body?.isFeatured
        );

      const isBestSeller =
        Boolean(
          req.body?.isBestSeller
        );

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "السعر غير صحيح"
        });
      }

      if (
        stock < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "المخزون غير صحيح"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const productResult =
              await client.query(
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
                    is_featured,
                    is_best_seller
                  )
                VALUES
                  (
                    $1,$2,$3,$4,$5,
                    $6,$7,$8,$9,$10
                  )
                RETURNING *
                `,
                [
                  name,
                  description,
                  price,
                  oldPrice,
                  stock,
                  imageUrl,
                  categoryId,
                  brandId,
                  isFeatured,
                  isBestSeller
                ]
              );

            const product =
              productResult.rows[0];

            if (stock > 0) {
              await client.query(
                `
                INSERT INTO inventory_movements
                  (
                    product_id,
                    quantity_change,
                    reason
                  )
                VALUES
                  (
                    $1,
                    $2,
                    $3
                  )
                `,
                [
                  product.id,
                  stock,
                  "initial_stock"
                ]
              );
            }

            return product;
          }
        );

      res.status(201).json({
        ok: true,
        product:
          result
      });
    } catch (error) {
      console.error(
        "[CREATE PRODUCT]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إنشاء المنتج"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE PRODUCT
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المنتج غير صحيح"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const currentResult =
              await client.query(
                `
                SELECT *
                FROM products
                WHERE id = $1
                FOR UPDATE
                `,
                [id]
              );

            if (
              !currentResult.rows.length
            ) {
              throw new Error(
                "المنتج غير موجود"
              );
            }

            const current =
              currentResult.rows[0];

            const name =
              req.body?.name !== undefined
                ? cleanText(
                    req.body.name
                  )
                : current.name;

            const description =
              req.body?.description !== undefined
                ? cleanText(
                    req.body.description
                  )
                : current.description;

            const price =
              req.body?.price !== undefined
                ? number(
                    req.body.price,
                    NaN
                  )
                : Number(
                    current.price
                  );

            const oldPrice =
              req.body?.oldPrice !== undefined
                ? number(
                    req.body.oldPrice,
                    null
                  )
                : current.old_price;

            const stock =
              req.body?.stock !== undefined
                ? integer(
                    req.body.stock,
                    NaN
                  )
                : Number(
                    current.stock
                  );

            const categoryId =
              req.body?.categoryId !== undefined
                ? integer(
                    req.body.categoryId,
                    null
                  )
                : current.category_id;

            const brandId =
              req.body?.brandId !== undefined
                ? integer(
                    req.body.brandId,
                    null
                  )
                : current.brand_id;

            const imageUrl =
              req.body?.imageUrl !== undefined
                ? cleanText(
                    req.body.imageUrl
                  )
                : current.image_url;

            const isActive =
              req.body?.isActive !== undefined
                ? Boolean(
                    req.body.isActive
                  )
                : current.is_active;

            const isFeatured =
              req.body?.isFeatured !== undefined
                ? Boolean(
                    req.body.isFeatured
                  )
                : current.is_featured;

            const isBestSeller =
              req.body?.isBestSeller !== undefined
                ? Boolean(
                    req.body.isBestSeller
                  )
                : current.is_best_seller;

            if (
              !Number.isFinite(price) ||
              price < 0
            ) {
              throw new Error(
                "السعر غير صحيح"
              );
            }

            if (
              !Number.isInteger(stock) ||
              stock < 0
            ) {
              throw new Error(
                "المخزون غير صحيح"
              );
            }

            const oldStock =
              Number(
                current.stock
              );

            const updateResult =
              await client.query(
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
                  name,
                  description,
                  price,
                  oldPrice,
                  stock,
                  imageUrl,
                  categoryId,
                  brandId,
                  isActive,
                  isFeatured,
                  isBestSeller,
                  id
                ]
              );

            if (
              stock !== oldStock
            ) {
              await client.query(
                `
                INSERT INTO inventory_movements
                  (
                    product_id,
                    quantity_change,
                    reason
                  )
                VALUES
                  (
                    $1,
                    $2,
                    $3
                  )
                `,
                [
                  id,
                  stock - oldStock,
                  "admin_adjustment"
                ]
              );
            }

            return updateResult.rows[0];
          }
        );

      res.json({
        ok: true,
        product:
          result
      });
    } catch (error) {
      console.error(
        "[UPDATE PRODUCT]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر تعديل المنتج"
      });
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

      if (!Number.isInteger(productId)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المنتج غير صحيح"
        });
      }

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
            is_active AS "isActive",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM product_variants
          WHERE
            product_id = $1
          ORDER BY
            id
          `,
          [productId]
        );

      res.json({
        ok: true,
        variants:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN VARIANTS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل خيارات المنتج"
      });
    }
  }
);

/* =========================================================
   ADMIN - CREATE PRODUCT VARIANT
========================================================= */

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

      if (!Number.isInteger(productId)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المنتج غير صحيح"
        });
      }

      const productCheck =
        await db(
          `
          SELECT
            id,
            price
          FROM products
          WHERE
            id = $1
          `,
          [productId]
        );

      if (
        !productCheck.rows.length
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المنتج غير موجود"
        });
      }

      const sku =
        cleanText(
          req.body?.sku
        ) || null;

      const color =
        cleanText(
          req.body?.color
        ) || null;

      const size =
        cleanText(
          req.body?.size
        ) || null;

      const price =
        req.body?.price !== undefined &&
        req.body?.price !== null
          ? number(
              req.body.price,
              NaN
            )
          : Number(
              productCheck
                .rows[0]
                .price
          );

      const stock =
        integer(
          req.body?.stock,
          0
        );

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "سعر الخيار غير صحيح"
        });
      }

      if (
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "مخزون الخيار غير صحيح"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const variantResult =
              await client.query(
                `
                INSERT INTO product_variants
                  (
                    product_id,
                    sku,
                    color,
                    size,
                    price,
                    stock
                  )
                VALUES
                  (
                    $1,$2,$3,
                    $4,$5,$6
                  )
                RETURNING
                  id,
                  product_id AS "productId",
                  sku,
                  color,
                  size,
                  price,
                  stock,
                  is_active AS "isActive",
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"
                `,
                [
                  productId,
                  sku,
                  color,
                  size,
                  price,
                  stock
                ]
              );

            const variant =
              variantResult.rows[0];

            if (stock > 0) {
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
                  (
                    $1,$2,$3,$4
                  )
                `,
                [
                  variant.id,
                  productId,
                  stock,
                  "initial_stock"
                ]
              );
            }

            return variant;
          }
        );

      res.status(201).json({
        ok: true,
        variant:
          result
      });
    } catch (error) {
      console.error(
        "[CREATE VARIANT]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إنشاء الخيار"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE PRODUCT VARIANT
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الخيار غير صحيح"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const currentResult =
              await client.query(
                `
                SELECT *
                FROM product_variants
                WHERE
                  id = $1
                FOR UPDATE
                `,
                [id]
              );

            if (
              !currentResult.rows.length
            ) {
              throw new Error(
                "الخيار غير موجود"
              );
            }

            const current =
              currentResult.rows[0];

            const sku =
              req.body?.sku !== undefined
                ? cleanText(
                    req.body.sku
                  ) || null
                : current.sku;

            const color =
              req.body?.color !== undefined
                ? cleanText(
                    req.body.color
                  ) || null
                : current.color;

            const size =
              req.body?.size !== undefined
                ? cleanText(
                    req.body.size
                  ) || null
                : current.size;

            const price =
              req.body?.price !== undefined
                ? number(
                    req.body.price,
                    NaN
                  )
                : Number(
                    current.price
                  );

            const stock =
              req.body?.stock !== undefined
                ? integer(
                    req.body.stock,
                    NaN
                  )
                : Number(
                    current.stock
                  );

            const isActive =
              req.body?.isActive !== undefined
                ? Boolean(
                    req.body.isActive
                  )
                : current.is_active;

            if (
              !Number.isFinite(price) ||
              price < 0
            ) {
              throw new Error(
                "سعر الخيار غير صحيح"
              );
            }

            if (
              !Number.isInteger(stock) ||
              stock < 0
            ) {
              throw new Error(
                "مخزون الخيار غير صحيح"
              );
            }

            const oldStock =
              Number(
                current.stock
              );

            const updateResult =
              await client.query(
                `
                UPDATE product_variants
                SET
                  sku = $1,
                  color = $2,
                  size = $3,
                  price = $4,
                  stock = $5,
                  is_active = $6,
                  updated_at = NOW()
                WHERE
                  id = $7
                RETURNING
                  id,
                  product_id AS "productId",
                  sku,
                  color,
                  size,
                  price,
                  stock,
                  is_active AS "isActive",
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"
                `,
                [
                  sku,
                  color,
                  size,
                  price,
                  stock,
                  isActive,
                  id
                ]
              );

            if (
              stock !== oldStock
            ) {
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
                  (
                    $1,$2,$3,$4
                  )
                `,
                [
                  id,
                  current.product_id,
                  stock - oldStock,
                  "admin_adjustment"
                ]
              );
            }

            return updateResult.rows[0];
          }
        );

      res.json({
        ok: true,
        variant:
          result
      });
    } catch (error) {
      console.error(
        "[UPDATE VARIANT]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر تعديل الخيار"
      });
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY MOVEMENTS
========================================================= */

app.get(
  "/api/admin/inventory",
  requireAdmin,
  async (req, res) => {
    try {
      const limit =
        Math.min(
          Math.max(
            integer(
              req.query?.limit,
              100
            ),
            1
          ),
          500
        );

      const result =
        await db(
          `
          SELECT
            im.id,
            im.product_id AS "productId",
            im.variant_id AS "variantId",
            im.quantity_change AS "quantityChange",
            im.reason,
            im.order_id AS "orderId",
            im.created_at AS "createdAt",

            p.name AS "productName",

            pv.sku,
            pv.color,
            pv.size

          FROM inventory_movements im

          LEFT JOIN products p
            ON p.id = im.product_id

          LEFT JOIN product_variants pv
            ON pv.id = im.variant_id

          ORDER BY
            im.created_at DESC

          LIMIT $1
          `,
          [limit]
        );

      res.json({
        ok: true,
        movements:
          result.rows
      });
    } catch (error) {
      console.error(
        "[INVENTORY]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل حركة المخزون"
      });
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY ADJUSTMENT
========================================================= */

app.post(
  "/api/admin/inventory/adjust",
  requireAdmin,
  async (req, res) => {
    try {
      const productId =
        req.body?.productId
          ? integer(
              req.body.productId,
              null
            )
          : null;

      const variantId =
        req.body?.variantId
          ? integer(
              req.body.variantId,
              null
            )
          : null;

      const quantity =
        integer(
          req.body?.quantity,
          NaN
        );

      const reason =
        cleanText(
          req.body?.reason
        ) ||
        "admin_adjustment";

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity === 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "كمية التعديل غير صحيحة"
        });
      }

      if (
        !productId &&
        !variantId
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "يجب تحديد المنتج أو الخيار"
        });
      }

      const result =
        await transaction(
          async (client) => {
            if (variantId) {
              const variantResult =
                await client.query(
                  `
                  SELECT
                    id,
                    product_id,
                    stock
                  FROM product_variants
                  WHERE
                    id = $1
                  FOR UPDATE
                  `,
                  [variantId]
                );

              if (
                !variantResult.rows.length
              ) {
                throw new Error(
                  "الخيار غير موجود"
                );
              }

              const variant =
                variantResult.rows[0];

              const newStock =
                Number(
                  variant.stock
                ) + quantity;

              if (
                newStock < 0
              ) {
                throw new Error(
                  "لا يمكن أن يصبح المخزون سالباً"
                );
              }

              await client.query(
                `
                UPDATE product_variants
                SET
                  stock = $1,
                  updated_at = NOW()
                WHERE
                  id = $2
                `,
                [
                  newStock,
                  variantId
                ]
              );

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
                  (
                    $1,$2,$3,$4
                  )
                `,
                [
                  variantId,
                  variant.product_id,
                  quantity,
                  reason
                ]
              );

              return {
                variantId,
                productId:
                  variant.product_id,
                stock:
                  newStock
              };
            }

            const productResult =
              await client.query(
                `
                SELECT
                  id,
                  stock
                FROM products
                WHERE
                  id = $1
                FOR UPDATE
                `,
                [productId]
              );

            if (
              !productResult.rows.length
            ) {
              throw new Error(
                "المنتج غير موجود"
              );
            }

            const product =
              productResult.rows[0];

            const newStock =
              Number(
                product.stock
              ) + quantity;

            if (
              newStock < 0
            ) {
              throw new Error(
                "لا يمكن أن يصبح المخزون سالباً"
              );
            }

            await client.query(
              `
              UPDATE products
              SET
                stock = $1,
                updated_at = NOW()
              WHERE
                id = $2
              `,
              [
                newStock,
                productId
              ]
            );

            await client.query(
              `
              INSERT INTO inventory_movements
                (
                  product_id,
                  quantity_change,
                  reason
                )
              VALUES
                (
                  $1,$2,$3
                )
              `,
              [
                productId,
                quantity,
                reason
              ]
            );

            return {
              productId,
              stock:
                newStock
            };
          }
        );

      res.json({
        ok: true,
        inventory:
          result
      });
    } catch (error) {
      console.error(
        "[INVENTORY ADJUST]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر تعديل المخزون"
      });
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
    try {
      const result =
        await db(`
          SELECT
            id,
            code,
            discount_type AS "discountType",
            discount_value AS "discountValue",
            min_order AS "minOrder",
            max_uses AS "maxUses",
            used_count AS "usedCount",
            expires_at AS "expiresAt",
            is_active AS "isActive",
            created_at AS "createdAt"
          FROM coupons
          ORDER BY created_at DESC
        `);

      res.json({
        ok: true,
        coupons:
          result.rows
      });
    } catch (error) {
      console.error(
        "[ADMIN COUPONS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل الكوبونات"
      });
    }
  }
);

/* =========================================================
   ADMIN - CREATE COUPON
========================================================= */

app.post(
  "/api/admin/coupons",
  requireAdmin,
  async (req, res) => {
    try {
      const code =
        cleanText(
          req.body?.code
        )
          .toUpperCase();

      const discountType =
        cleanText(
          req.body?.discountType
        ) || "fixed";

      const discountValue =
        number(
          req.body?.discountValue,
          NaN
        );

      const minOrder =
        number(
          req.body?.minOrder,
          0
        );

      const maxUses =
        req.body?.maxUses !== undefined
          ? integer(
              req.body.maxUses,
              null
            )
          : null;

      const expiresAt =
        req.body?.expiresAt ||
        null;

      if (!code) {
        return res.status(400).json({
          ok: false,
          message:
            "رمز الكوبون مطلوب"
        });
      }

      if (
        ![
          "fixed",
          "percentage"
        ].includes(
          discountType
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "نوع الخصم غير صحيح"
        });
      }

      if (
        !Number.isFinite(
          discountValue
        ) ||
        discountValue <= 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "قيمة الخصم غير صحيحة"
        });
      }

      if (
        discountType ===
          "percentage" &&
        discountValue > 100
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "نسبة الخصم لا يمكن أن تتجاوز 100%"
        });
      }

      if (
        !Number.isFinite(
          minOrder
        ) ||
        minOrder < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "الحد الأدنى للطلب غير صحيح"
        });
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
              expires_at
            )
          VALUES
            (
              $1,$2,$3,
              $4,$5,$6
            )
          RETURNING
            id,
            code,
            discount_type AS "discountType",
            discount_value AS "discountValue",
            min_order AS "minOrder",
            max_uses AS "maxUses",
            used_count AS "usedCount",
            expires_at AS "expiresAt",
            is_active AS "isActive",
            created_at AS "createdAt"
          `,
          [
            code,
            discountType,
            discountValue,
            minOrder,
            maxUses,
            expiresAt
          ]
        );

      res.status(201).json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[CREATE COUPON]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إنشاء الكوبون"
      });
    }
  }
);

/* =========================================================
   ADMIN - UPDATE COUPON
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الكوبون غير صحيح"
        });
      }

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
              COALESCE(
                $4,
                max_uses
              ),

            expires_at =
              COALESCE(
                $5,
                expires_at
              ),

            is_active =
              COALESCE(
                $6,
                is_active
              ),

            updated_at =
              NOW()

          WHERE
            id = $7

          RETURNING
            id,
            code,
            discount_type AS "discountType",
            discount_value AS "discountValue",
            min_order AS "minOrder",
            max_uses AS "maxUses",
            used_count AS "usedCount",
            expires_at AS "expiresAt",
            is_active AS "isActive",
            created_at AS "createdAt"
          `,
          [
            req.body?.discountType
              ? cleanText(
                  req.body.discountType
                )
              : null,

            req.body?.discountValue !==
            undefined
              ? number(
                  req.body.discountValue,
                  null
                )
              : null,

            req.body?.minOrder !==
            undefined
              ? number(
                  req.body.minOrder,
                  null
                )
              : null,

            req.body?.maxUses !==
            undefined
              ? integer(
                  req.body.maxUses,
                  null
                )
              : null,

            req.body?.expiresAt !==
            undefined
              ? req.body.expiresAt
              : null,

            req.body?.isActive !==
            undefined
              ? Boolean(
                  req.body.isActive
                )
              : null,

            id
          ]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الكوبون غير موجود"
        });
      }

      res.json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[UPDATE COUPON]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر تعديل الكوبون"
      });
    }
  }
);

/* =========================================================
   COUPON VALIDATION
========================================================= */

app.post(
  "/api/coupons/validate",
  optionalAuth,
  async (req, res) => {
    try {
      const code =
        cleanText(
          req.body?.code
        )
          .toUpperCase();

      const subtotal =
        number(
          req.body?.subtotal,
          NaN
        );

      if (!code) {
        return res.status(400).json({
          ok: false,
          message:
            "أدخل رمز الكوبون"
        });
      }

      if (
        !Number.isFinite(
          subtotal
        ) ||
        subtotal < 0
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "قيمة الطلب غير صحيحة"
        });
      }

      const result =
        await db(
          `
          SELECT
            id,
            code,
            discount_type,
            discount_value,
            min_order,
            max_uses,
            used_count,
            expires_at,
            is_active
          FROM coupons
          WHERE
            code = $1
            AND is_active = TRUE
          LIMIT 1
          `,
          [code]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الكوبون غير صالح"
        });
      }

      const coupon =
        result.rows[0];

      if (
        coupon.expires_at &&
        new Date(
          coupon.expires_at
        ).getTime() <
          Date.now()
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "انتهت صلاحية الكوبون"
        });
      }

      if (
        coupon.max_uses !== null &&
        Number(
          coupon.used_count
        ) >=
          Number(
            coupon.max_uses
          )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "تم استخدام الكوبون بالكامل"
        });
      }

      if (
        subtotal <
        Number(
          coupon.min_order
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            `الحد الأدنى للطلب هو ${coupon.min_order}`
        });
      }

      let discount = 0;

      if (
        coupon.discount_type ===
        "percentage"
      ) {
        discount =
          subtotal *
          (
            Number(
              coupon.discount_value
            ) / 100
          );
      } else {
        discount =
          Number(
            coupon.discount_value
          );
      }

      discount =
        Math.min(
          discount,
          subtotal
        );

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
            Number(
              coupon.discount_value
            ),
          discount:
            Number(
              discount.toFixed(2)
            )
        }
      });
    } catch (error) {
      console.error(
        "[VALIDATE COUPON]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر التحقق من الكوبون"
      });
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
      const [
        salesResult,
        ordersResult,
        customersResult,
        productsResult,
        bestSellersResult
      ] =
        await Promise.all([
          db(`
            SELECT
              COALESCE(
                SUM(total),
                0
              ) AS total_sales,

              COALESCE(
                SUM(
                  CASE
                    WHEN
                      status NOT IN
                      (
                        'cancelled',
                        'canceled'
                      )
                    THEN total
                    ELSE 0
                  END
                ),
                0
              ) AS valid_sales
            FROM orders
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER
                AS total_orders,

              COUNT(
                CASE
                  WHEN
                    status NOT IN
                    (
                      'cancelled',
                      'canceled'
                    )
                  THEN 1
                END
              )::INTEGER
                AS valid_orders,

              COUNT(
                CASE
                  WHEN
                    status IN
                    (
                      'cancelled',
                      'canceled'
                    )
                  THEN 1
                END
              )::INTEGER
                AS cancelled_orders
            FROM orders
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER
                AS customers
            FROM users
            WHERE
              role = 'customer'
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER
                AS products
            FROM products
            WHERE
              is_active = TRUE
          `),

          db(`
            SELECT
              oi.product_id AS "productId",
              oi.product_name AS "productName",
              SUM(
                oi.quantity
              )::INTEGER AS quantity,
              SUM(
                oi.total_price
              ) AS revenue
            FROM order_items oi
            INNER JOIN orders o
              ON o.id =
                 oi.order_id
            WHERE
              o.status NOT IN
              (
                'cancelled',
                'canceled'
              )
            GROUP BY
              oi.product_id,
              oi.product_name
            ORDER BY
              quantity DESC
            LIMIT 10
          `)
        ]);

      res.json({
        ok: true,
        reports: {
          sales:
            salesResult.rows[0],

          orders:
            ordersResult.rows[0],

          customers:
            customersResult.rows[0],

          products:
            productsResult.rows[0],

          bestSellers:
            bestSellersResult.rows
        }
      });
    } catch (error) {
      console.error(
        "[REPORTS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل التقارير"
      });
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
        usersResult,
        productsResult,
        ordersResult,
        salesResult,
        pendingResult
      ] =
        await Promise.all([
          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM users
            WHERE
              role = 'customer'
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM products
            WHERE
              is_active = TRUE
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM orders
            WHERE
              status NOT IN
              (
                'cancelled',
                'canceled'
              )
          `),

          db(`
            SELECT
              COALESCE(
                SUM(total),
                0
              ) AS total
            FROM orders
            WHERE
              status NOT IN
              (
                'cancelled',
                'canceled'
              )
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM orders
            WHERE
              status = 'pending'
          `)
        ]);

      res.json({
        ok: true,
        dashboard: {
          customers:
            Number(
              usersResult
                .rows[0]
                ?.count || 0
            ),

          products:
            Number(
              productsResult
                .rows[0]
                ?.count || 0
            ),

          orders:
            Number(
              ordersResult
                .rows[0]
                ?.count || 0
            ),

          totalSales:
            Number(
              salesResult
                .rows[0]
                ?.total || 0
            ),

          pendingOrders:
            Number(
              pendingResult
                .rows[0]
                ?.count || 0
            )
        }
      });
    } catch (error) {
      console.error(
        "[DASHBOARD]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل لوحة المعلومات"
      });
    }
  }
);

/* =========================================================
   ADMIN - SETTINGS
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
            value,
            updated_at AS "updatedAt"
          FROM settings
          ORDER BY key
        `);

      const settings = {};

      for (
        const row of result.rows
      ) {
        settings[row.key] =
          row.value;
      }

      res.json({
        ok: true,
        settings
      });
    } catch (error) {
      console.error(
        "[ADMIN SETTINGS]",
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
   ADMIN - UPDATE SETTINGS
========================================================= */

app.put(
  "/api/admin/settings",
  requireAdmin,
  async (req, res) => {
    try {
      const settings =
        req.body?.settings &&
        typeof req.body.settings ===
          "object"
          ? req.body.settings
          : req.body || {};

      const entries =
        Object.entries(
          settings
        );

      for (
        const [key, value]
          of entries
      ) {
        if (
          !cleanText(key)
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
            value = EXCLUDED.value,
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
      console.error(
        "[UPDATE SETTINGS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ الإعدادات"
      });
    }
  }
);

/* =========================================================
   PUBLIC SETTINGS
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
        const row of result.rows
      ) {
        settings[row.key] =
          row.value;
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
   ADMIN - SINGLE SETTING
========================================================= */

app.put(
  "/api/admin/settings/:key",
  requireAdmin,
  async (req, res) => {
    try {
      const key =
        cleanText(
          req.params.key
        );

      if (!key) {
        return res.status(400).json({
          ok: false,
          message:
            "مفتاح الإعداد مطلوب"
        });
      }

      const value =
        req.body?.value !== undefined
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
            value = EXCLUDED.value,
            updated_at = NOW()
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
      console.error(
        "[SINGLE SETTING]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ الإعداد"
      });
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
      const search =
        cleanText(
          req.query?.q
        );

      if (!search) {
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
          LIMIT 50
          `,
          [
            `%${search}%`
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
      console.error(
        "[SEARCH USERS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر البحث عن المستخدمين"
      });
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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المستخدم غير صحيح"
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
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

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
      console.error(
        "[GET USER]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل المستخدم"
      });
    }
  }
);
/* =========================================================
   ADMIN - CHANGE USER ROLE
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
        );

      const allowedRoles = [
        "customer",
        "staff",
        "admin",
        "owner"
      ];

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المستخدم غير صحيح"
        });
      }

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "الصلاحية غير صحيحة"
        });
      }

      const result =
        await db(
          `
          UPDATE users
          SET
            role = $1,
            updated_at = NOW()
          WHERE
            id = $2
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
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[CHANGE ROLE]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر تغيير الصلاحية"
      });
    }
  }
);

/* =========================================================
   ADMIN - LOYALTY POINTS
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
        !Number.isInteger(id) ||
        !Number.isInteger(points)
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "بيانات النقاط غير صحيحة"
        });
      }

      const result =
        await db(
          `
          UPDATE users
          SET
            loyalty_points =
              GREATEST(
                0,
                loyalty_points + $1
              ),
            updated_at = NOW()
          WHERE
            id = $2
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
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[LOYALTY POINTS]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر تعديل النقاط"
      });
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
      const [
        productsResult,
        variantsResult,
        lowStockResult,
        outOfStockResult
      ] =
        await Promise.all([
          db(`
            SELECT
              COALESCE(
                SUM(stock),
                0
              )::INTEGER AS stock
            FROM products
            WHERE
              is_active = TRUE
          `),

          db(`
            SELECT
              COALESCE(
                SUM(stock),
                0
              )::INTEGER AS stock
            FROM product_variants
            WHERE
              is_active = TRUE
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM products
            WHERE
              is_active = TRUE
              AND stock > 0
              AND stock <= 5
          `),

          db(`
            SELECT
              COUNT(*)::INTEGER AS count
            FROM products
            WHERE
              is_active = TRUE
              AND stock <= 0
          `)
        ]);

      res.json({
        ok: true,
        summary: {
          productStock:
            Number(
              productsResult
                .rows[0]
                ?.stock || 0
            ),

          variantStock:
            Number(
              variantsResult
                .rows[0]
                ?.stock || 0
            ),

          lowStock:
            Number(
              lowStockResult
                .rows[0]
                ?.count || 0
            ),

          outOfStock:
            Number(
              outOfStockResult
                .rows[0]
                ?.count || 0
            )
        }
      });
    } catch (error) {
      console.error(
        "[INVENTORY SUMMARY]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل ملخص المخزون"
      });
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
      const productId =
        integer(
          req.params.id,
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
            sort_order,
            id
          `,
          [productId]
        );

      res.json({
        ok: true,
        images:
          result.rows
      });
    } catch (error) {
      console.error(
        "[PRODUCT IMAGES]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل صور المنتج"
      });
    }
  }
);

/* =========================================================
   ADMIN - ADD PRODUCT IMAGE
========================================================= */

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
          req.body?.imageUrl
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

      if (!imageUrl) {
        return res.status(400).json({
          ok: false,
          message:
            "رابط الصورة مطلوب"
        });
      }

      const productResult =
        await db(
          `
          SELECT id
          FROM products
          WHERE id = $1
          `,
          [productId]
        );

      if (
        !productResult.rows.length
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
          INSERT INTO product_images
            (
              product_id,
              image_url,
              sort_order,
              is_primary
            )
          VALUES
            (
              $1,
              $2,
              COALESCE(
                (
                  SELECT
                    MAX(sort_order) + 1
                  FROM product_images
                  WHERE
                    product_id = $1
                ),
                0
              ),
              NOT EXISTS(
                SELECT 1
                FROM product_images
                WHERE
                  product_id = $1
                  AND is_primary = TRUE
              )
            )
          RETURNING
            id,
            product_id AS "productId",
            image_url AS "imageUrl",
            sort_order AS "sortOrder",
            is_primary AS "isPrimary"
          `,
          [
            productId,
            imageUrl
          ]
        );

      res.status(201).json({
        ok: true,
        image:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[ADD PRODUCT IMAGE]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر إضافة الصورة"
      });
    }
  }
);

/* =========================================================
   ADMIN - DELETE PRODUCT IMAGE
========================================================= */

app.delete(
  "/api/admin/product-images/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الصورة غير صحيح"
        });
      }

      const result =
        await db(
          `
          DELETE FROM product_images
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الصورة غير موجودة"
        });
      }

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "[DELETE PRODUCT IMAGE]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر حذف الصورة"
      });
    }
  }
);
/* =========================================================
   ADMIN - PRODUCT IMAGE PRIMARY
========================================================= */

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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الصورة غير صحيح"
        });
      }

      const imageResult =
        await db(
          `
          SELECT
            id,
            product_id
          FROM product_images
          WHERE id = $1
          `,
          [id]
        );

      if (!imageResult.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الصورة غير موجودة"
        });
      }

      const productId =
        imageResult.rows[0]
          .product_id;

      await transaction(
        async (client) => {
          await client.query(
            `
            UPDATE product_images
            SET is_primary = FALSE
            WHERE product_id = $1
            `,
            [productId]
          );

          await client.query(
            `
            UPDATE product_images
            SET is_primary = TRUE
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
      console.error(
        "[PRIMARY IMAGE]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تعيين الصورة الرئيسية"
      });
    }
  }
);

/* =========================================================
   ADMIN - PRODUCT VARIANT DELETE
========================================================= */

app.delete(
  "/api/admin/product-variants/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم المتغير غير صحيح"
        });
      }

      const result =
        await db(
          `
          UPDATE product_variants
          SET
            is_active = FALSE
          WHERE id = $1
          RETURNING
            id,
            product_id AS "productId",
            sku,
            color,
            size,
            price,
            stock,
            is_active AS "isActive"
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المتغير غير موجود"
        });
      }

      res.json({
        ok: true,
        variant:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[DELETE VARIANT]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر حذف المتغير"
      });
    }
  }
);

/* =========================================================
   ADMIN - CATEGORY DELETE
========================================================= */

app.delete(
  "/api/admin/categories/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم التصنيف غير صحيح"
        });
      }

      const result =
        await db(
          `
          UPDATE categories
          SET
            is_active = FALSE
          WHERE id = $1
          RETURNING
            id,
            name,
            slug,
            is_active AS "isActive"
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "التصنيف غير موجود"
        });
      }

      res.json({
        ok: true,
        category:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[DELETE CATEGORY]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر حذف التصنيف"
      });
    }
  }
);

/* =========================================================
   ADMIN - BRAND DELETE
========================================================= */

app.delete(
  "/api/admin/brands/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الماركة غير صحيح"
        });
      }

      const result =
        await db(
          `
          UPDATE brands
          SET
            is_active = FALSE
          WHERE id = $1
          RETURNING
            id,
            name,
            slug,
            is_active AS "isActive"
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الماركة غير موجودة"
        });
      }

      res.json({
        ok: true,
        brand:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[DELETE BRAND]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر حذف الماركة"
      });
    }
  }
);

/* =========================================================
   ADMIN - COUPON DELETE
========================================================= */

app.delete(
  "/api/admin/coupons/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الكوبون غير صحيح"
        });
      }

      const result =
        await db(
          `
          UPDATE coupons
          SET
            is_active = FALSE
          WHERE id = $1
          RETURNING
            id,
            code,
            discount_type AS "discountType",
            discount_value AS "discountValue",
            min_order AS "minOrder",
            max_uses AS "maxUses",
            used_count AS "usedCount",
            expires_at AS "expiresAt",
            is_active AS "isActive"
          `,
          [id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "الكوبون غير موجود"
        });
      }

      res.json({
        ok: true,
        coupon:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "[DELETE COUPON]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          "تعذر حذف الكوبون"
      });
    }
  }
);
/* =========================================================
   SETTINGS
========================================================= */

app.get("/api/settings", async (req, res) => {
  try {
    const result = await db(`
      SELECT key, value
      FROM settings
      ORDER BY key
    `);

    const settings = {};

    for (const row of result.rows) {
      settings[row.key] = row.value;
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
});

app.get(
  "/api/admin/settings",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db(`
        SELECT
          key,
          value,
          updated_at
        FROM settings
        ORDER BY key
      `);

      const settings = {};

      for (const row of result.rows) {
        settings[row.key] = row.value;
      }

      res.json({
        ok: true,
        settings,
        updatedAt:
          Object.fromEntries(
            result.rows.map(
              row => [
                row.key,
                row.updated_at
              ]
            )
          )
      });
    } catch (error) {
      console.error(
        "[ADMIN SETTINGS]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل إعدادات الإدارة"
      });
    }
  }
);

app.put(
  "/api/admin/settings/:key",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const key =
        cleanText(
          req.params.key
        );

      const value =
        req.body?.value;

      if (
        !/^[a-zA-Z0-9_.-]{1,80}$/.test(
          key
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "اسم الإعداد غير صالح"
        });
      }

      if (
        value === undefined
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "قيمة الإعداد مطلوبة"
        });
      }

      await db(
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
            $2,
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

      res.json({
        ok: true,
        key,
        value
      });
    } catch (error) {
      console.error(
        "[SAVE SETTING]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ الإعداد"
      });
    }
  }
);

/* =========================================================
   FRONTEND COMPATIBILITY - /api/me
========================================================= */

app.get(
  "/api/me",
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
            is_owner,
            is_active,
            loyalty_points,
            created_at,
            updated_at
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
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
        "[ME]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تحميل بيانات الحساب"
      });
    }
  }
);

/* =========================================================
   CUSTOMER - UPDATE OWN PROFILE
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
        !Number.isInteger(id) ||
        id !== Number(req.user.id)
      ) {
        return res.status(403).json({
          ok: false,
          message:
            "غير مسموح بتعديل هذا الحساب"
        });
      }

      const {
        name,
        email,
        phone,
        contact,
        gender,
        age
      } = req.body || {};

      const cleanName =
        name !== undefined
          ? cleanText(name)
          : null;

      const cleanEmail =
        email !== undefined
          ? normalizeEmail(email)
          : null;

      const cleanPhone =
        phone !== undefined ||
        contact !== undefined
          ? normalizePhone(
              phone || contact
            )
          : null;

      const cleanGender =
        gender !== undefined
          ? cleanText(gender)
          : null;

      const cleanAge =
        age !== undefined &&
        age !== null &&
        age !== ""
          ? integer(age, null)
          : null;

      if (
        cleanName !== null &&
        !cleanName
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "الاسم مطلوب"
        });
      }

      if (
        cleanAge !== null &&
        (
          cleanAge < 13 ||
          cleanAge > 120
        )
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "العمر غير صالح"
        });
      }

      const duplicate =
        await db(
          `
          SELECT id
          FROM users
          WHERE id <> $1
            AND (
              (
                $2::text IS NOT NULL
                AND email = $2
              )
              OR (
                $3::text IS NOT NULL
                AND phone = $3
              )
            )
          LIMIT 1
          `,
          [
            id,
            cleanEmail,
            cleanPhone
          ]
        );

      if (
        duplicate.rows.length
      ) {
        return res.status(409).json({
          ok: false,
          message:
            "هذا البريد أو رقم الهاتف مستخدم من حساب آخر"
        });
      }

      const result =
        await db(
          `
          UPDATE users
          SET
            name =
              COALESCE(
                $1,
                name
              ),
            email =
              COALESCE(
                $2,
                email
              ),
            phone =
              COALESCE(
                $3,
                phone
              ),
            gender =
              COALESCE(
                $4,
                gender
              ),
            age =
              COALESCE(
                $5,
                age
              ),
            updated_at =
              NOW()
          WHERE id = $6
          RETURNING
            id,
            name,
            email,
            phone,
            gender,
            age,
            role,
            is_owner,
            is_active,
            loyalty_points,
            created_at,
            updated_at
          `,
          [
            cleanName,
            cleanEmail,
            cleanPhone,
            cleanGender,
            cleanAge,
            id
          ]
        );

      if (
        !result.rows.length
      ) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
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
        "[UPDATE OWN PROFILE]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر حفظ بيانات الحساب"
      });
    }
  }
);

app.get(
  "/{*splat}",
  (req, res, next) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return next();
    }

    res.sendFile(
      path.join(
        ROOT,
        "frontend",
        "index.html"
      )
    );
  }
);

/* =========================================================
   404 API
========================================================= */

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      ok: false,
      message:
        "API endpoint not found"
    });
  }
);

/* =========================================================
   GLOBAL ERROR
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "[UNHANDLED]",
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
        "حدث خطأ في السيرفر"
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
      () => {
        console.log(
          `Ladies First backend running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "[START FAILED]",
      error
    );

    process.exit(1);
  }
}

async function shutdown(
  signal
) {
  console.log(
    `[SERVER] ${signal} received.`
  );

  await closeDatabase();

  process.exit(0);
}

process.once(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.once(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

start();
