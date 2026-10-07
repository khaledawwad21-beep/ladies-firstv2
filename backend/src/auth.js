"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const MIN_PASSWORD_LENGTH = 12;

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
  const value = String(password || "");
  if (!value) throw new Error("Password is required");
  if (value.length < MIN_PASSWORD_LENGTH) {
    const error = new Error("كلمة المرور يجب أن تكون 12 خانة على الأقل");
    error.code = "PASSWORD_TOO_SHORT";
    error.status = 400;
    throw error;
  }
  return bcrypt.hash(value, 12);
}

async function verifyPassword(password, passwordHash) {
  if (!password || !passwordHash) return false;
  return bcrypt.compare(String(password), String(passwordHash));
}

function createToken(user) {
  if (!user || !user.id) throw new Error("User is required to create token");
  return jwt.sign(
    { id: user.id, role: user.role || "customer", sv: Number(user.session_version || 0) },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

function getTokenFromRequest(req) {
  const authorization = req.headers.authorization || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  return null;
}

function verifyToken(token) {
  if (!token) return null;
  try { return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }); }
  catch { return null; }
}

async function authenticatedUser(req) {
  const payload = verifyToken(getTokenFromRequest(req));
  if (!payload || !Number.isSafeInteger(Number(payload.id)) || Number(payload.id) <= 0) return null;
  const { db } = require("./db");
  const result = await db("SELECT id, role, is_active, permissions, session_version FROM users WHERE id=$1 LIMIT 1", [payload.id]);
  const user = result.rows[0];
  if (!user || user.is_active !== true || Number(payload.sv || 0) !== Number(user.session_version || 0)) return null;
  return { ...payload, role: user.role, permissions: user.permissions || [] };
}
async function optionalAuth(req, res, next) {
  try { req.user = await authenticatedUser(req); return next(); }
  catch (error) { return next(error); }
}
async function requireAuth(req, res, next) {
  try {
    req.user = await authenticatedUser(req);
    if (!req.user) return res.status(401).json({ ok: false, message: "جلسة الدخول غير صالحة أو الحساب غير مفعل" });
    return next();
  } catch (error) { return next(error); }
}

async function initSessionSecurity(db) {
  await db("ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0");
  await db(`CREATE OR REPLACE FUNCTION invalidate_password_sessions() RETURNS trigger AS $$
    BEGIN
      IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        NEW.session_version := OLD.session_version + 1;
      END IF;
      RETURN NEW;
    END;
  $$ LANGUAGE plpgsql`);
  await db("DROP TRIGGER IF EXISTS users_password_sessions ON users");
  await db(`CREATE TRIGGER users_password_sessions BEFORE UPDATE OF password_hash ON users
    FOR EACH ROW EXECUTE FUNCTION invalidate_password_sessions()`);
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
  return {id:user.id,name:user.name||"",email:user.email||null,phone:user.phone||null,contact:user.email||user.phone||"",is_owner:user.role==="owner"?1:0,gender:user.gender||null,age:user.age!==undefined&&user.age!==null?Number(user.age):null,role:user.role||"customer",permissions:Array.isArray(user.permissions)?user.permissions:[],loyaltyPoints:Number(user.loyalty_points??user.loyaltyPoints??0),whatsapp_opt_in:user.whatsapp_opt_in!==undefined?Boolean(user.whatsapp_opt_in):Boolean(user.whatsappOptIn),whatsappOptIn:user.whatsapp_opt_in!==undefined?Boolean(user.whatsapp_opt_in):Boolean(user.whatsappOptIn),whatsappOptInUpdatedAt:user.whatsapp_opt_in_updated_at||user.whatsappOptInUpdatedAt||null,isActive:user.is_active!==undefined?Boolean(user.is_active):true,createdAt:user.created_at||user.createdAt||null,updatedAt:user.updated_at||user.updatedAt||null};
}
function getGenderGreeting(gender) { const value=String(gender||"").trim().toLowerCase(); if(value==="male"||value==="ذكر"||value==="m")return "نورتنا"; if(value==="female"||value==="أنثى"||value==="انثى"||value==="f")return "نورتينا"; return "أهلاً وسهلاً"; }
module.exports={initSessionSecurity,MIN_PASSWORD_LENGTH,hashPassword,verifyPassword,createToken,getTokenFromRequest,verifyToken,optionalAuth,requireAuth,requireRole,requireAdmin,requireOwner,normalizeEmail,normalizePhone,normalizeContact,sanitizeUser,getGenderGreeting};
