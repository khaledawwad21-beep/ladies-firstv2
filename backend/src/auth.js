"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "CHANGE_THIS_SECRET_IN_RENDER";

const TOKEN_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "30d";

/* =========================================================
   PASSWORD
========================================================= */

async function hashPassword(password) {
  if (!password) {
    throw new Error("Password is required");
  }

  return bcrypt.hash(String(password), 12);
}

async function verifyPassword(password, passwordHash) {
  if (!password || !passwordHash) {
    return false;
  }

  return bcrypt.compare(
    String(password),
    String(passwordHash)
  );
}

/* =========================================================
   TOKEN
========================================================= */

function createToken(user) {
  if (!user || !user.id) {
    throw new Error(
      "User is required to create token"
    );
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role || "customer"
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN
    }
  );
}

/* =========================================================
   TOKEN FROM REQUEST
========================================================= */

function getTokenFromRequest(req) {
  const authorization =
    req.headers.authorization || "";

  if (
    authorization.startsWith("Bearer ")
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  const cookieHeader =
    req.headers.cookie || "";

  if (cookieHeader) {
    const match =
      cookieHeader.match(
        /(?:^|;\s*)token=([^;]+)/
      );

    if (match) {
      try {
        return decodeURIComponent(
          match[1]
        );
      } catch {
        return match[1];
      }
    }
  }

  return null;
}

/* =========================================================
   VERIFY TOKEN
========================================================= */

function verifyToken(token) {
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch {
    return null;
  }
}

/* =========================================================
   OPTIONAL AUTH
========================================================= */

function optionalAuth(
  req,
  res,
  next
) {
  const token =
    getTokenFromRequest(req);

  if (!token) {
    req.user = null;
    return next();
  }

  const payload =
    verifyToken(token);

  req.user =
    payload || null;

  next();
}

/* =========================================================
   REQUIRED AUTH
========================================================= */

function requireAuth(
  req,
  res,
  next
) {
  const token =
    getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      message:
        "يجب تسجيل الدخول أولاً"
    });
  }

  const payload =
    verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      ok: false,
      message:
        "جلسة الدخول غير صالحة"
    });
  }

  req.user = payload;

  next();
}

/* =========================================================
   ROLE AUTHORIZATION
========================================================= */

function requireRole(
  ...allowedRoles
) {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message:
          "يجب تسجيل الدخول أولاً"
      });
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        ok: false,
        message:
          "ليس لديك صلاحية للوصول إلى هذا القسم"
      });
    }

    next();
  };
}

/* =========================================================
   ADMIN
========================================================= */

function requireAdmin(
  req,
  res,
  next
) {
  return requireRole(
    "owner",
    "admin",
    "staff"
  )(
    req,
    res,
    next
  );
}

/* =========================================================
   OWNER
========================================================= */

function requireOwner(
  req,
  res,
  next
) {
  return requireRole(
    "owner"
  )(
    req,
    res,
    next
  );
}

/* =========================================================
   CONTACT NORMALIZATION
========================================================= */

function normalizeEmail(email) {
  if (!email) {
    return null;
  }

  const value =
    String(email)
      .trim()
      .toLowerCase();

  return value || null;
}

function normalizePhone(phone) {
  if (!phone) {
    return null;
  }

  const value =
    String(phone)
      .trim()
      .replace(/[\s()-]/g, "");

  return value || null;
}

function normalizeContact(
  contact
) {
  if (!contact) {
    return null;
  }

  const value =
    String(contact).trim();

  if (
    value.includes("@")
  ) {
    return normalizeEmail(
      value
    );
  }

  return normalizePhone(
    value
  );
}

/* =========================================================
   USER PUBLIC DATA
========================================================= */

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,

    name:
      user.name || "",

    email:
      user.email || null,

    phone:
      user.phone || null,

    gender:
      user.gender || null,

    age:
      user.age !== undefined &&
      user.age !== null
        ? Number(user.age)
        : null,

    role:
      user.role || "customer",

    loyaltyPoints:
      Number(
        user.loyalty_points ??
        user.loyaltyPoints ??
        0
      ),

    isActive:
      user.is_active !== undefined
        ? Boolean(
            user.is_active
          )
        : true,

    createdAt:
      user.created_at ||
      user.createdAt ||
      null,

    updatedAt:
      user.updated_at ||
      user.updatedAt ||
      null
  };
}

/* =========================================================
   GENDER GREETING
========================================================= */

function getGenderGreeting(
  gender
) {
  const value =
    String(gender || "")
      .trim()
      .toLowerCase();

  if (
    value === "male" ||
    value === "ذكر" ||
    value === "m"
  ) {
    return "نورتنا";
  }

  if (
    value === "female" ||
    value === "أنثى" ||
    value === "انثى" ||
    value === "f"
  ) {
    return "نورتينا";
  }

  return "أهلاً وسهلاً";
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  hashPassword,
  verifyPassword,

  createToken,
  getTokenFromRequest,
  verifyToken,

  optionalAuth,
  requireAuth,
  requireRole,
  requireAdmin,
  requireOwner,

  normalizeEmail,
  normalizePhone,
  normalizeContact,

  sanitizeUser,
  getGenderGreeting
};
