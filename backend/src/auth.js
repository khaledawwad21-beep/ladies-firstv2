"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    const error = new Error("JWT_SECRET is not configured");
    error.code = "JWT_NOT_CONFIGURED";
    throw error;
  }
  return secret;
}

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

async function hashPassword(password) {
  if (!password) throw new Error("Password is required");
  return bcrypt.hash(String(password), 12);
}

async function verifyPassword(password, passwordHash) {
  if (!password || !passwordHash) return false;
  return bcrypt.compare(String(password), String(passwordHash));
}

function createToken(user) {
  if (!user || !user.id) throw new Error("User is required to create token");
  return jwt.sign(
    { id: user.id, role: user.role || "customer" },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookieHeader = req.headers.cookie || "";
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      try { return decodeURIComponent(match[1]); }
      catch { return match[1]; }
    }
  }
  return null;
}

function verifyToken(token) {
  if (!token) return null;
  try { return jwt.verify(token, getJwtSecret()); }
  catch { return null; }
}

function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) { req.user = null; return next(); }
  req.user = verifyToken(token) || null;
  next();
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ ok: false, message: "يجب تسجيل الدخول أولاً" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ ok: false, message: "جلسة الدخول غير صالحة" });
  req.user = payload;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "يجب تسجيل الدخول أولاً" });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ ok: false, message: "ليس لديك صلاحية للوصول إلى هذا القسم" });
    next();
  };
}

function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => requireRole("owner", "admin", "staff")(req, res, next));
}
function requireOwner(req, res, next) {
  return requireAuth(req, res, () => requireRole("owner")(req, res, next));
}
function normalizeEmail(email) { if (!email) return null; const value=String(email).trim().toLowerCase(); return value||null; }
function normalizePhone(phone) { if (!phone) return null; const value=String(phone).trim().replace(/[\s()-]/g, ""); return value||null; }
function normalizeContact(contact) { if (!contact) return null; const value=String(contact).trim(); return value.includes("@")?normalizeEmail(value):normalizePhone(value); }
function sanitizeUser(user) {
  if (!user) return null;
  return {id:user.id,name:user.name||"",email:user.email||null,phone:user.phone||null,contact:user.email||user.phone||"",is_owner:user.role==="owner"?1:0,gender:user.gender||null,age:user.age!==undefined&&user.age!==null?Number(user.age):null,role:user.role||"customer",loyaltyPoints:Number(user.loyalty_points??user.loyaltyPoints??0),isActive:user.is_active!==undefined?Boolean(user.is_active):true,createdAt:user.created_at||user.createdAt||null,updatedAt:user.updated_at||user.updatedAt||null};
}
function getGenderGreeting(gender) { const value=String(gender||"").trim().toLowerCase(); if(value==="male"||value==="ذكر"||value==="m")return "نورتنا"; if(value==="female"||value==="أنثى"||value==="انثى"||value==="f")return "نورتينا"; return "أهلاً وسهلاً"; }
module.exports={hashPassword,verifyPassword,createToken,getTokenFromRequest,verifyToken,optionalAuth,requireAuth,requireRole,requireAdmin,requireOwner,normalizeEmail,normalizePhone,normalizeContact,sanitizeUser,getGenderGreeting};
