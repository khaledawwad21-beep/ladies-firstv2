import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import { db, initDb } from './db.js';
import {
  requireAuth,
  requireAdmin,
  requireOwner,
  hashPassword,
  verifyPassword,
  signToken
} from './auth.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const PORT = Number(process.env.PORT || 10000);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({
  limit: '5mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '5mb'
}));

app.use(express.static(path.join(ROOT, 'frontend')));

function now() {
  return new Date().toISOString();
}

function integer(value, fallback = 0) {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeEmail(value) {
  const v = cleanText(value).toLowerCase();
  return v || null;
}

function normalizePhone(value) {
  const v = cleanText(value).replace(/[^\d+]/g, '');
  return v || null;
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || user.contact || '',
    contact: user.contact || user.phone || '',
    gender: user.gender || 'unspecified',
    age: user.age ?? null,
    role: user.role || 'customer',
    is_owner: Number(user.is_owner || 0),
    is_active: Number(user.is_active ?? user.active ?? 1),
    loyalty_points: Number(user.loyalty_points || 0),
    created_at: user.created_at || null,
    updated_at: user.updated_at || null
  };
}

function getGenderGreeting(gender) {
  if (gender === 'female') return 'نورتينا';
  if (gender === 'male') return 'نورتنا';
  return 'أهلًا وسهلًا';
}

/* =========================================================
   DATABASE
========================================================= */

await initDb();

/* =========================================================
   HEALTH
========================================================= */

app.get('/api/health', async (req, res) => {
  try {
    await db('SELECT 1');

    res.json({
      ok: true,
      server: true,
      database: true,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      time: now()
    });
  } catch (error) {
    console.error('[HEALTH]', error);

    res.status(500).json({
      ok: false,
      server: true,
      database: false,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      time: now()
    });
  }
});

/* =========================================================
   SETTINGS
========================================================= */

app.get('/api/settings', async (req, res) => {
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
    console.error('[SETTINGS]', error);

    res.status(500).json({
      ok: false,
      message: 'تعذر تحميل الإعدادات'
    });
  }
});

app.get(
  '/api/admin/settings',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db(`
        SELECT key, value, updated_at
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
        updatedAt: Object.fromEntries(
          result.rows.map(row => [row.key, row.updated_at])
        )
      });
    } catch (error) {
      console.error('[ADMIN SETTINGS]', error);

      res.status(500).json({
        ok: false,
        message: 'تعذر تحميل إعدادات الإدارة'
      });
    }
  }
);

app.put(
  '/api/admin/settings/:key',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const key = cleanText(req.params.key);

      if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(key)) {
        return res.status(400).json({
          ok: false,
          message: 'اسم الإعداد غير صالح'
        });
      }

      const value = req.body?.value;

      if (value === undefined) {
        return res.status(400).json({
          ok: false,
          message: 'قيمة الإعداد مطلوبة'
        });
      }

      await db(
        `
        INSERT INTO settings(key, value, updated_at)
        VALUES($1, $2, NOW())
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
      console.error('[SAVE SETTING]', error);

      res.status(500).json({
        ok: false,
        message: 'تعذر حفظ الإعداد'
      });
    }
  }
);

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      contact,
      password,
      gender = 'unspecified',
      age = null
    } = req.body || {};

    const cleanName = cleanText(name);
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone || contact);
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanPassword || cleanPassword.length < 8) {
      return res.status(400).json({
        ok: false,
        message: 'البيانات غير مكتملة أو كلمة المرور قصيرة'
      });
    }

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({
        ok: false,
        message: 'أدخلي البريد الإلكتروني أو رقم الهاتف'
      });
    }

    const duplicate = await db(
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

    if (duplicate.rows.length) {
      return res.status(409).json({
        ok: false,
        message: 'البريد الإلكتروني أو رقم الهاتف مستخدم مسبقًا'
      });
    }

    const passwordHash = await hashPassword(cleanPassword);

    const result = await db(
      `
      INSERT INTO users(
        name,
        email,
        phone,
        gender,
        age,
        password_hash,
        role,
        is_owner,
        is_active,
        loyalty_points,
        created_at,
        updated_at
      )
      VALUES(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'customer',
        false,
        true,
        0,
        NOW(),
        NOW()
      )
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
        cleanText(gender) || 'unspecified',
        age === '' || age === null ? null : integer(age, null),
        passwordHash
      ]
    );

    const user = result.rows[0];

    const token = signToken({
      id: user.id,
      role: user.role,
      is_owner: user.is_owner
    });

    res.status(201).json({
      ok: true,
      user: publicUser(user),
      token,
      greeting: getGenderGreeting(user.gender)
    });
  } catch (error) {
    console.error('[REGISTER]', error);

    res.status(500).json({
      ok: false,
      message: 'تعذر إنشاء الحساب'
    });
  }
});

/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = cleanText(
      req.body?.email ||
      req.body?.phone ||
      req.body?.contact
    );

    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      return res.status(400).json({
        ok: false,
        message: 'أدخلي بيانات الدخول'
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
      [identifier.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        ok: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(403).json({
        ok: false,
        message: 'هذا الحساب غير مفعل'
      });
    }

    const valid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        ok: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      is_owner: user.is_owner
    });

    res.json({
      ok: true,
      user: publicUser(user),
      token,
      greeting: getGenderGreeting(user.gender)
    });
  } catch (error) {
    console.error('[LOGIN]', error);

    res.status(500).json({
      ok: false,
      message: 'تعذر تسجيل الدخول'
    });
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const result = await db(
      `
      SELECT *
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        ok: false,
        message: 'المستخدم غير موجود'
      });
    }

    const user = result.rows[0];

    let permissions = {};

    if (Number(user.is_owner) === 1) {
      permissions = {
        '*': true
      };
    } else {
      const permissionResult = await db(
        `
        SELECT permissions
        FROM admin_permissions
        WHERE user_id = $1
        LIMIT 1
        `,
        [user.id]
      );

      if (permissionResult.rows.length) {
        permissions = permissionResult.rows[0].permissions || {};
      }
    }

    res.json({
      ok: true,
      user: {
        ...publicUser(user),
        permissions
      },
      greeting: getGenderGreeting(user.gender)
    });
  } catch (error) {
    console.error('[ME]', error);

    res.status(500).json({
      ok: false,
      message: 'تعذر تحميل بيانات الحساب'
    });
  }
});

/* =========================================================
   CUSTOMER - UPDATE OWN PROFILE
========================================================= */

app.put(
  '/api/users/:id',
  requireAuth,
  async (req, res) => {
    try {
      const id = integer(req.params.id, NaN);

      if (!Number.isInteger(id) || id !== Number(req.user.id)) {
        return res.status(403).json({
          ok: false,
          message: 'غير مسموح بتعديل هذا الحساب'
        });
      }

      const {
        name,
        email,
        phone,
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
        phone !== undefined
          ? normalizePhone(phone)
          : null;

      const cleanGender =
        gender !== undefined
          ? cleanText(gender)
          : null;

      const cleanAge =
        age !== undefined &&
        age !== null &&
        age !== ''
          ? integer(age, null)
          : null;

      if (cleanName !== null && !cleanName) {
        return res.status(400).json({
          ok: false,
          message: 'الاسم مطلوب'
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
          message: 'العمر غير صالح'
        });
      }

      const duplicate = await db(
        `
        SELECT id
        FROM users
        WHERE
          id <> $1
          AND (
            (
              $2::text IS NOT NULL
              AND email = $2
            )
            OR
            (
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

      if (duplicate.rows.length) {
        return res.status(409).json({
          ok: false,
          message: 'هذا البريد أو رقم الهاتف مستخدم من حساب آخر'
        });
      }

      const result = await db(
        `
        UPDATE users
        SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          gender = COALESCE($4, gender),
          age = COALESCE($5, age),
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

      if (!result.rows.length) {
        return res.status(404).json({
          ok: false,
          message: 'المستخدم غير موجود'
        });
      }

      const user = result.rows[0];

      res.json({
        ok: true,
        user: publicUser(user),
        greeting: getGenderGreeting(user.gender)
      });
    } catch (error) {
      console.error('[UPDATE OWN PROFILE]', error);

      res.status(500).json({
        ok: false,
        message: 'تعذر حفظ بيانات الحساب'
      });
    }
  }
);
