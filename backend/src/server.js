"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT || 10000);
const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_SECRET_IN_RENDER";

const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not configured.");
}

const pool = new Pool({
  connectionString: DATABASE_URL || undefined,
  ssl: DATABASE_URL
    ? {
        rejectUnauthorized: false
      }
    : false
});

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

/* =========================================================
   DATABASE
========================================================= */

async function db(query, params = []) {
  const result = await pool.query(query, params);
  return result;
}

async function initDatabase() {
  if (!DATABASE_URL) {
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
    CREATE TABLE IF NOT EXISTS product_variants (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
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
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      variant_id BIGINT REFERENCES product_variants(id) ON DELETE RESTRICT,
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
      variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
      quantity_change INTEGER NOT NULL,
      reason TEXT,
      order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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

  console.log("Database initialized.");
}

/* =========================================================
   AUTH HELPERS
========================================================= */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || "";

  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  if (req.headers.cookie) {
    const match = req.headers.cookie.match(
      /(?:^|;\s*)token=([^;]+)/
    );

    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
  }

  next();
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول أولاً"
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "جلسة الدخول غير صالحة"
    });
  }
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", async (req, res) => {
  try {
    if (!DATABASE_URL) {
      return res.json({
        ok: true,
        server: true,
        database: false,
        message: "Server is running. DATABASE_URL is not configured."
      });
    }

    await db("SELECT 1");

    res.json({
      ok: true,
      server: true,
      database: true
    });
  } catch (error) {
    console.error("Health error:", error);

    res.status(503).json({
      ok: false,
      server: true,
      database: false
    });
  }
});

/* =========================================================
   AUTH
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

    if (!name || !password) {
      return res.status(400).json({
        message: "الاسم وكلمة المرور مطلوبان"
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        message: "أدخلي البريد الإلكتروني أو رقم الهاتف"
      });
    }

    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : null;

    const cleanPhone = phone
      ? String(phone).trim()
      : null;

    const existing = await db(
      `
      SELECT id
      FROM users
      WHERE ($1::text IS NOT NULL AND email = $1)
         OR ($2::text IS NOT NULL AND phone = $2)
      LIMIT 1
      `,
      [cleanEmail, cleanPhone]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        message: "هذا البريد أو رقم الهاتف مسجل مسبقاً"
      });
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    const result = await db(
      `
      INSERT INTO users
        (name, email, phone, password_hash, gender, age)
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
        created_at
      `,
      [
        String(name).trim(),
        cleanEmail,
        cleanPhone,
        passwordHash,
        gender ? String(gender) : null,
        age ? Number(age) : null
      ]
    );

    const user = result.rows[0];
    const token = createToken(user);

    res.cookie = res.cookie || (() => {});

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "تعذر إنشاء الحساب حالياً"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      contact,
      password
    } = req.body || {};

    if (!contact || !password) {
      return res.status(400).json({
        message: "بيانات الدخول غير مكتملة"
      });
    }

    const value = String(contact).trim();

    const result = await db(
      `
      SELECT *
      FROM users
      WHERE email = $1
         OR phone = $1
      LIMIT 1
      `,
      [value.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        message: "بيانات الدخول غير صحيحة"
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "هذا الحساب غير مفعل"
      });
    }

    const valid = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        message: "بيانات الدخول غير صحيحة"
      });
    }

    delete user.password_hash;

    const token = createToken(user);

    res.json({
      user,
      token
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "تعذر تسجيل الدخول حالياً"
    });
  }
});

app.get("/api/auth/me", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
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
        created_at
      FROM users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.json({
        user: null
      });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Auth me error:", error);

    res.status(500).json({
      message: "تعذر تحميل الحساب"
    });
  }
});

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
      categories: result.rows
    });
  } catch (error) {
    console.error("Categories error:", error);

    res.status(500).json({
      message: "تعذر تحميل الأقسام"
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
      brands: result.rows
    });
  } catch (error) {
    console.error("Brands error:", error);

    res.status(500).json({
      message: "تعذر تحميل الماركات"
    });
  }
});

/* =========================================================
   PRODUCTS
========================================================= */

async function getProducts(where = "", params = []) {
  const result = await db(
    `
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.old_price AS "oldPrice",
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
          WHERE v.product_id = p.id
            AND v.is_active = TRUE
        ),
        '[]'::json
      ) AS variants,

      COALESCE(
        (
          SELECT json_agg(
            pi.image_url
            ORDER BY pi.sort_order, pi.id
          )
          FROM product_images pi
          WHERE pi.product_id = p.id
        ),
        '[]'::json
      ) AS images

    FROM products p
    WHERE p.is_active = TRUE
    ${where}
    ORDER BY p.created_at DESC
    `,
    params
  );

  return result.rows;
}

app.get("/api/products", async (req, res) => {
  try {
    const {
      search,
      category,
      brand
    } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${String(search).trim()}%`);
      conditions.push(`
        (
          p.name ILIKE $${params.length}
          OR p.description ILIKE $${params.length}
        )
      `);
    }

    if (category) {
      params.push(Number(category));
      conditions.push(
        `p.category_id = $${params.length}`
      );
    }

    if (brand) {
      params.push(Number(brand));
      conditions.push(
        `p.brand_id = $${params.length}`
      );
    }

    const where = conditions.length
      ? `AND ${conditions.join(" AND ")}`
      : "";

    const products = await getProducts(where, params);

    res.json({
      products
    });
  } catch (error) {
    console.error("Products error:", error);

    res.status(500).json({
      message: "تعذر تحميل المنتجات"
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const products = await getProducts(
      "AND p.id = $1",
      [Number(req.params.id)]
    );

    if (!products.length) {
      return res.status(404).json({
        message: "المنتج غير موجود"
      });
    }

    res.json({
      product: products[0]
    });
  } catch (error) {
    console.error("Product error:", error);

    res.status(500).json({
      message: "تعذر تحميل المنتج"
    });
  }
});

/* =========================================================
   HOME
========================================================= */

app.get("/api/store/home", async (req, res) => {
  try {
    const [
      featured,
      bestSellers,
      products
    ] = await Promise.all([
      getProducts(
        "AND p.is_featured = TRUE",
        []
      ),
      getProducts(
        "AND p.is_best_seller = TRUE",
        []
      ),
      getProducts("", [])
    ]);

    res.json({
      featured,
      bestSellers,
      products
    });
  } catch (error) {
    console.error("Home error:", error);

    res.status(500).json({
      message: "تعذر تحميل الصفحة الرئيسية"
    });
  }
});

/* =========================================================
   ORDERS
========================================================= */

app.post("/api/orders", requireAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items
      : [];

    if (!items.length) {
      return res.status(400).json({
        message: "السلة فارغة"
      });
    }

    await client.query("BEGIN");

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const variantId = item.variantId
        ? Number(item.variantId)
        : null;
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error("بيانات المنتج غير صحيحة");
      }

      const productResult = await client.query(
        `
        SELECT
          p.id,
          p.name,
          p.price
        FROM products p
        WHERE p.id = $1
          AND p.is_active = TRUE
        FOR UPDATE
        `,
        [productId]
      );

      if (!productResult.rows.length) {
        throw new Error("المنتج غير موجود");
      }

      const product = productResult.rows[0];

      let unitPrice = Number(product.price);
      let variantName = null;

      if (variantId) {
        const variantResult = await client.query(
          `
          SELECT
            id,
            color,
            size,
            price,
            stock
          FROM product_variants
          WHERE id = $1
            AND product_id = $2
            AND is_active = TRUE
          FOR UPDATE
          `,
          [variantId, productId]
        );

        if (!variantResult.rows.length) {
          throw new Error("الخيار المطلوب غير موجود");
        }

        const variant = variantResult.rows[0];

        if (Number(variant.stock) < quantity) {
          throw new Error(
            "الكمية خلصت، حقك علينا"
          );
        }

        if (variant.price !== null) {
          unitPrice = Number(variant.price);
        }

        variantName = [
          variant.color,
          variant.size
        ]
          .filter(Boolean)
          .join(" / ");

        await client.query(
          `
          UPDATE product_variants
          SET
            stock = stock - $1,
            updated_at = NOW()
          WHERE id = $2
            AND stock >= $1
          `,
          [quantity, variantId]
        );
      } else {
        const variantsResult = await client.query(
          `
          SELECT
            COALESCE(SUM(stock), 0) AS total_stock
          FROM product_variants
          WHERE product_id = $1
            AND is_active = TRUE
          `,
          [productId]
        );

        const totalStock = Number(
          variantsResult.rows[0]?.total_stock || 0
        );

        if (totalStock > 0 && totalStock < quantity) {
          throw new Error(
            "الكمية خلصت، حقك علينا"
          );
        }
      }

      const totalPrice = unitPrice * quantity;

      subtotal += totalPrice;

      orderItems.push({
        productId,
        variantId,
        productName: product.name,
        variantName,
        quantity,
        unitPrice,
        totalPrice
      });
    }

    const shipping = 0;
    const packaging = 0;
    const discount = 0;
    const total =
      subtotal +
      shipping +
      packaging -
      discount;

    const orderResult = await client.query(
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
        ($1,'pending',$2,$3,$4,$5,$6)
      RETURNING *
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

    const order = orderResult.rows[0];

    for (const item of orderItems) {
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
          ($1,$2,$3,$4,$5,$6,$7,$8)
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

      if (item.variantId) {
        await client.query(
          `
          INSERT INTO inventory_movements
            (
              variant_id,
              quantity_change,
              reason,
              order_id
            )
          VALUES
            ($1,$2,$3,$4)
          `,
          [
            item.variantId,
            -item.quantity,
            "order",
            order.id
          ]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      order
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create order error:", error);

    res.status(400).json({
      message:
        error.message ||
        "تعذر إنشاء الطلب"
    });
  } finally {
    client.release();
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const result = await db(
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
                'productId', oi.product_id,
                'variantId', oi.variant_id,
                'productName', oi.product_name,
                'variantName', oi.variant_name,
                'quantity', oi.quantity,
                'unitPrice', oi.unit_price,
                'totalPrice', oi.total_price
              )
            )
            FROM order_items oi
            WHERE oi.order_id = o.id
          ),
          '[]'::json
        ) AS items

      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      orders: result.rows
    });
  } catch (error) {
    console.error("Orders error:", error);

    res.status(500).json({
      message: "تعذر تحميل الطلبات"
    });
  }
});

/* =========================================================
   FAVORITES
========================================================= */

app.get(
  "/api/favorites",
  requireAuth,
  async (req, res) => {
    try {
      const result = await db(
        `
        SELECT product_id AS "productId"
        FROM favorites
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        favorites: result.rows
      });
    } catch (error) {
      console.error("Favorites error:", error);

      res.status(500).json({
        message: "تعذر تحميل المفضلة"
      });
    }
  }
);

app.post(
  "/api/favorites/:productId",
  requireAuth,
  async (req, res) => {
    try {
      await db(
        `
        INSERT INTO favorites
          (user_id, product_id)
        VALUES
          ($1,$2)
        ON CONFLICT DO NOTHING
        `,
        [
          req.user.id,
          Number(req.params.productId)
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      console.error("Favorite add error:", error);

      res.status(500).json({
        message: "تعذر إضافة المنتج للمفضلة"
      });
    }
  }
);

app.delete(
  "/api/favorites/:productId",
  requireAuth,
  async (req, res) => {
    try {
      await db(
        `
        DELETE FROM favorites
        WHERE user_id = $1
          AND product_id = $2
        `,
        [
          req.user.id,
          Number(req.params.productId)
        ]
      );

      res.json({
        ok: true
      });
    } catch (error) {
      console.error(
        "Favorite delete error:",
        error
      );

      res.status(500).json({
        message: "تعذر إزالة المنتج من المفضلة"
      });
    }
  }
);

/* =========================================================
   404
========================================================= */

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found"
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "حدث خطأ في السيرفر"
  });
});

/* =========================================================
   START
========================================================= */

async function start() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(
        `Ladies First backend running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start backend:",
      error
    );

    process.exit(1);
  }
}

start();
