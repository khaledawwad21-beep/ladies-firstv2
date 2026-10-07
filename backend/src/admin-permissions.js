"use strict";

const ADMIN_PERMISSIONS = Object.freeze([
  "dashboard",
  "products",
  "inventory",
  "orders",
  "users",
  "catalog",
  "coupons",
  "reports",
  "offers",
  "settings",
  "staff"
]);

function normalizePermissions(value) {
  const raw = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(",") : []);
  const allowed = new Set(ADMIN_PERMISSIONS);
  return [...new Set(
    raw
      .map(x => String(x || "").trim().toLowerCase())
      .filter(x => allowed.has(x))
  )];
}

function permissionForAdminRequest(req) {
  const path = String(req.originalUrl || req.url || "").split("?")[0];

  if (/\/api\/admin\/(whatsapp-|cart-reminders)/.test(path)) return "offers";
  if (/\/api\/admin\/products\/[^/]+\/offers(?:\/|$)/.test(path)) return "offers";
  if (/\/api\/admin\/uploads\/image(?:\/|$)/.test(path)) return "products";
  if (/\/api\/admin\/staff(?:\/|$)/.test(path)) return "staff";
  if (/\/api\/admin\/settings(?:\/|$)/.test(path)) return "settings";
  if (/\/api\/admin\/reports(?:\/|$)/.test(path)) return "reports";
  if (/\/api\/admin\/coupons(?:\/|$)/.test(path)) return "coupons";
  if (/\/api\/admin\/(categories|brands)(?:\/|$)/.test(path)) return "catalog";
  if (/\/api\/admin\/inventory(?:\/|$)/.test(path)) return "inventory";
  if (/\/api\/admin\/(orders|returns|waitlist)(?:\/|$)/.test(path)) return "orders";
  if (/\/api\/admin\/users(?:\/|$)/.test(path)) return "users";
  if (/\/api\/admin\/(products|variants)(?:\/|$)/.test(path)) return "products";
  if (/\/api\/admin\/(dashboard|health)(?:\/|$)/.test(path)) return "dashboard";

  return null;
}

async function initAdminPermissions(db) {
  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS permissions
    JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await db(`
    UPDATE users
    SET permissions = '[]'::jsonb
    WHERE permissions IS NULL
       OR jsonb_typeof(permissions) <> 'array'
  `);
}

function createAdminPermissionGuard(db, requireAuth) {
  return function adminPermissionGuard(req, res, next) {
    return requireAuth(req, res, async () => {
      const tokenRole = String(req.user?.role || "").toLowerCase();

      // requireAuth has already loaded the active role from the database.
      // Staff permissions below are checked against the database as well.
      if (tokenRole === "owner" || tokenRole === "admin") {
        return next();
      }

      if (tokenRole !== "staff") {
        return res.status(403).json({
          ok: false,
          message: "هذا الحساب ليس حساب إدارة"
        });
      }

      try {
        const result = await db(
          `
          SELECT id, role, is_active, permissions
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

        const user = result.rows[0];
        if (!user || user.is_active === false) {
          return res.status(403).json({
            ok: false,
            message: "حساب الإدارة غير مفعل"
          });
        }

        const role = String(user.role || "").toLowerCase();
        req.user.role = role;
        req.user.permissions = normalizePermissions(user.permissions);

        if (role === "owner" || role === "admin") {
          return next();
        }

        if (role !== "staff") {
          return res.status(403).json({
            ok: false,
            message: "هذا الحساب ليس حساب إدارة"
          });
        }

        const permission = permissionForAdminRequest(req);
        if (!permission || !req.user.permissions.includes(permission)) {
          return res.status(403).json({
            ok: false,
            code: "ADMIN_PERMISSION_DENIED",
            permission: permission || null,
            message: "ليس لديك صلاحية للوصول إلى هذا القسم"
          });
        }

        return next();
      } catch (error) {
        console.error("[ADMIN PERMISSION]", error);
        return res.status(500).json({
          ok: false,
          message: "تعذر التحقق من صلاحيات الإدارة"
        });
      }
    });
  };
}

module.exports = {
  ADMIN_PERMISSIONS,
  normalizePermissions,
  permissionForAdminRequest,
  initAdminPermissions,
  createAdminPermissionGuard
};
