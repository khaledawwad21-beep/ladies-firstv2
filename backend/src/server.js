"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

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

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "2mb"
  })
);

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
      password,
      gender,
      age
    } = req.body || {};

    const cleanName = cleanText(name);
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);

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
        "تعذر تحميل الماركات"
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
        await db(`
          SELECT
            o.id,
            o.user_id AS "userId",
            u.name AS "userName",
            u.email AS "userEmail",
            u.phone AS "userPhone",
            o.status,
            o.subtotal,
            o.discount,
            o.shipping,
            o.packaging,
            o.total,
            o.created_at AS "createdAt"
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
   ADMIN - CANCEL ORDER
========================================================= */

app.patch(
  "/api/admin/orders/:id/cancel",
  requireAdmin,
  async (req, res) => {
    try {
      const orderId =
        integer(
          req.params.id,
          NaN
        );

      if (!Number.isInteger(orderId)) {
        return res.status(400).json({
          ok: false,
          message:
            "رقم الطلب غير صحيح"
        });
      }

      const result =
        await transaction(
          async (client) => {
            const orderResult =
              await client.query(
                `
                SELECT
                  id,
                  status
                FROM orders
                WHERE id = $1
                FOR UPDATE
                `,
                [orderId]
              );

            if (
              !orderResult.rows.length
            ) {
              throw new Error(
                "الطلب غير موجود"
              );
            }

            const order =
              orderResult.rows[0];

            if (
              [
                "cancelled",
                "canceled"
              ].includes(
                String(
                  order.status
                ).toLowerCase()
              )
            ) {
              return order;
            }

            const itemsResult =
              await client.query(
                `
                SELECT
                  product_id,
                  variant_id,
                  quantity
                FROM order_items
                WHERE order_id = $1
                `,
                [orderId]
              );

            for (
              const item of
                itemsResult.rows
            ) {
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
                  WHERE
                    id = $2
                  `,
                  [
                    item.quantity,
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
                      $1,$2,$3,
                      'cancelled_order',
                      $4
                    )
                  `,
                  [
                    item.variant_id,
                    item.product_id,
                    item.quantity,
                    orderId
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
                  WHERE
                    id = $2
                  `,
                  [
                    item.quantity,
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
                      $1,$2,
                      'cancelled_order',
                      $3
                    )
                  `,
                  [
                    item.product_id,
                    item.quantity,
                    orderId
                  ]
                );
              }
            }

            const updated =
              await client.query(
                `
                UPDATE orders
                SET
                  status = 'cancelled',
                  updated_at = NOW()
                WHERE
                  id = $1
                RETURNING
                  id,
                  status,
                  total,
                  updated_at AS "updatedAt"
                `,
                [orderId]
              );

            return updated.rows[0];
          }
        );

      res.json({
        ok: true,
        order: result
      });
    } catch (error) {
      console.error(
        "[CANCEL ORDER]",
        error
      );

      res.status(400).json({
        ok: false,
        message:
          error.message ||
          "تعذر إلغاء الطلب"
      });
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
            p.id AS "productId",
            p.name AS "productName",
            p.stock AS "productStock",

            v.id AS "variantId",
            v.sku,
            v.color,
            v.size,
            v.stock AS "variantStock"

          FROM products p

          LEFT JOIN product_variants v
            ON v.product_id = p.id
            AND v.is_active = TRUE

          WHERE
            p.is_active = TRUE

          ORDER BY
            p.name ASC,
            v.id ASC
        `);

      res.json({
        ok: true,
        inventory:
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
          "تعذر تحميل المخزون"
      });
    }
  }
);

/* =========================================================
   ADMIN - INVENTORY MOVEMENTS
========================================================= */

app.get(
  "/api/admin/inventory/movements",
  requireAdmin,
  async (req, res) => {
    try {
      const from =
        cleanText(
          req.query.from
        );

      const to =
        cleanText(
          req.query.to
        );

      if (!from || !to) {
        return res.json({
          ok: true,
          movements: []
        });
      }

      const result =
        await db(
          `
          SELECT
            im.id,
            im.product_id AS "productId",
            p.name AS "productName",
            im.variant_id AS "variantId",
            im.quantity_change AS "quantityChange",
            im.reason,
            im.order_id AS "orderId",
            im.created_at AS "createdAt"
          FROM inventory_movements im

          LEFT JOIN products p
            ON p.id = im.product_id

          WHERE
            im.created_at >= $1::date
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

      res.json({
        ok: true,
        movements:
          result.rows
      });
    } catch (error) {
      console.error(
        "[MOVEMENTS]",
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
   ADMIN - ROLES
========================================================= */

app.patch(
  "/api/admin/users/:id/role",
  requireOwner,
  async (req, res) => {
    try {
      const userId =
        integer(
          req.params.id,
          NaN
        );

      const role =
        cleanText(
          req.body?.role
        );

      const allowed = [
        "customer",
        "staff",
        "admin"
      ];

      if (
        !Number.isInteger(
          userId
        ) ||
        !allowed.includes(role)
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "بيانات الصلاحية غير صحيحة"
        });
      }

      const target =
        await db(
          `
          SELECT
            id,
            role
          FROM users
          WHERE id = $1
          `,
          [userId]
        );

      if (!target.rows.length) {
        return res.status(404).json({
          ok: false,
          message:
            "المستخدم غير موجود"
        });
      }

      /*
         Owner cannot be changed
         through the normal role endpoint.
      */
      if (
        target.rows[0].role === "owner"
      ) {
        return res.status(403).json({
          ok: false,
          message:
            "لا يمكن تغيير صلاحية المالك"
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
            userId
          ]
        );

      res.json({
        ok: true,
        user:
          publicUser(
            result.rows[0]
          )
      });
    } catch (error) {
      console.error(
        "[ROLE]",
        error
      );

      res.status(500).json({
        ok: false,
        message:
          "تعذر تعديل الصلاحية"
      });
    }
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

    if (res.headersSent) {
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

async function shutdown(signal) {
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
