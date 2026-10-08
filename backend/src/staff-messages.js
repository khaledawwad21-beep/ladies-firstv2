"use strict";

const crypto = require("node:crypto");

const STAFF_MESSAGE_ROLES = Object.freeze(["owner", "admin", "staff"]);

function normalizeTargetRoles(value) {
  const roles = Array.isArray(value)
    ? value.map((x) => String(x || "").trim().toLowerCase()).filter((x) => STAFF_MESSAGE_ROLES.includes(x))
    : [];
  return [...new Set(roles.length ? roles : STAFF_MESSAGE_ROLES)];
}

async function initStaffMessages(db) {
  await db(`ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_message_seen_version TEXT`);
  await db(`
    CREATE TABLE IF NOT EXISTS staff_general_message_history (
      version TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      target_roles TEXT[] NOT NULL DEFAULT ARRAY['owner','admin','staff']::TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await db(`
    CREATE TABLE IF NOT EXISTS staff_general_message_reads (
      message_version TEXT NOT NULL REFERENCES staff_general_message_history(version) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (message_version, user_id)
    )
  `);

}

async function ensureMessageHistory(db, message) {
  if (!message.version || !message.message) return;
  await db(
    `INSERT INTO staff_general_message_history(version,message,target_roles,created_at,created_by,active)
     VALUES($1,$2,$3::text[],COALESCE($4::timestamptz,NOW()),$5,$6)
     ON CONFLICT(version) DO NOTHING`,
    [message.version, message.message, message.targetRoles, message.createdAt, message.createdBy, message.active]
  );
  await db(
    `INSERT INTO staff_general_message_reads(message_version,user_id,role,read_at)
     SELECT $1,id,role,COALESCE(updated_at,NOW()) FROM users
     WHERE staff_message_seen_version=$1 AND role=ANY($2::text[])
     ON CONFLICT(message_version,user_id) DO NOTHING`,
    [message.version, message.targetRoles]
  );
}

async function getSetting(db, key, fallback = null) {
  const result = await db("SELECT value FROM settings WHERE key=$1 LIMIT 1", [key]);
  return result.rowCount ? result.rows[0].value : fallback;
}

async function setSetting(db, key, value) {
  await db(
    `INSERT INTO settings(key,value,updated_at)
     VALUES($1,$2::jsonb,NOW())
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,
    [key, JSON.stringify(value)]
  );
}

function normalizeMessage(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    version: String(raw.version || ""),
    message: String(raw.message || "").trim().slice(0, 3000),
    active: raw.active === true,
    createdAt: raw.createdAt || null,
    createdBy: raw.createdBy || null,
    targetRoles: normalizeTargetRoles(raw.targetRoles)
  };
}

function registerStaffMessageRoutes(app, { db, requireAdmin }) {
  app.get("/api/staff-message", requireAdmin, async (req, res) => {
    try {
      const message = normalizeMessage(await getSetting(db, "staff_general_message", {}));
      await ensureMessageHistory(db, message);
      const user = await db(
        "SELECT staff_message_seen_version FROM users WHERE id=$1 LIMIT 1",
        [req.user.id]
      );
      const seenVersion = String(user.rows[0]?.staff_message_seen_version || "");
      const read = message.version
        ? await db(
          "SELECT 1 FROM staff_general_message_reads WHERE message_version=$1 AND user_id=$2 LIMIT 1",
          [message.version, req.user.id]
        )
        : { rowCount: 0 };
      const role = String(req.user?.role || "").toLowerCase();
      const isRead = read.rowCount > 0 || seenVersion === message.version;
      const shouldShow = Boolean(message.active && message.version && message.message && message.targetRoles.includes(role) && !isRead);
      return res.json({ ok: true, message, seenVersion, shouldShow, isRead });
    } catch (error) {
      console.error("[STAFF MESSAGE READ]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل رسالة الإدارة" });
    }
  });

  app.post("/api/staff-message/read", requireAdmin, async (req, res) => {
    try {
      const current = normalizeMessage(await getSetting(db, "staff_general_message", {}));
      await ensureMessageHistory(db, current);
      const version = String(req.body?.version || "").trim();
      const role = String(req.user?.role || "").toLowerCase();
      if (!current.targetRoles.includes(role)) {
        return res.status(403).json({ ok: false, code: "MESSAGE_NOT_TARGETED", message: "هذه الرسالة ليست موجهة لهذا الدور" });
      }
      if (!current.version || version !== current.version) {
        return res.status(409).json({ ok: false, message: "الرسالة تغيرت، يرجى إعادة فتحها" });
      }
      await db(
        `INSERT INTO staff_general_message_reads(message_version,user_id,role,read_at)
         VALUES($1,$2,$3,NOW())
         ON CONFLICT(message_version,user_id) DO NOTHING`,
        [version, req.user.id, role]
      );
      // Keep the legacy marker for compatibility with existing deployments and readers.
      await db(
        "UPDATE users SET staff_message_seen_version=$1,updated_at=NOW() WHERE id=$2",
        [version, req.user.id]
      );
      return res.json({ ok: true, version, readAt: new Date().toISOString() });
    } catch (error) {
      console.error("[STAFF MESSAGE ACK]", error);
      return res.status(500).json({ ok: false, message: "تعذر تسجيل قراءة الرسالة" });
    }
  });

  app.get("/api/admin/settings/staff-message", requireAdmin, async (req, res) => {
    try {
      const message = normalizeMessage(await getSetting(db, "staff_general_message", {}));
      await ensureMessageHistory(db, message);
      const placeholders = message.targetRoles.map((_, index) => "$" + (index + 2)).join(",");
      const counts = await db(
        `SELECT
           COUNT(*) FILTER (WHERE is_active=TRUE)::int AS eligible,
           COUNT(*) FILTER (
             WHERE is_active=TRUE AND $1<>'' AND (
               COALESCE(staff_message_seen_version,'')=$1 OR EXISTS (
                 SELECT 1 FROM staff_general_message_reads r
                 WHERE r.message_version=$1 AND r.user_id=users.id
               )
             )
           )::int AS seen
         FROM users WHERE role IN (${placeholders})`,
        [message.version, ...message.targetRoles]
      );
      const history = await db(
        `SELECT h.version,h.message,h.target_roles,h.created_at,h.created_by,h.active,
                u.name AS created_by_name,
                COUNT(r.user_id)::int AS read_count
         FROM staff_general_message_history h
         LEFT JOIN users u ON u.id=h.created_by
         LEFT JOIN staff_general_message_reads r ON r.message_version=h.version
         GROUP BY h.version,h.message,h.target_roles,h.created_at,h.created_by,h.active,u.name
         ORDER BY h.created_at DESC LIMIT 50`
      );
      return res.json({
        ok: true,
        message,
        eligible: Number(counts.rows[0]?.eligible || 0),
        seen: Number(counts.rows[0]?.seen || 0),
        history: history.rows.map((item) => ({
          version: item.version,
          message: item.message,
          targetRoles: item.target_roles || [],
          createdAt: item.created_at,
          createdBy: item.created_by_name || null,
          active: item.active === true,
          readCount: Number(item.read_count || 0)
        }))
      });
    } catch (error) {
      console.error("[STAFF MESSAGE ADMIN GET]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل الرسالة العامة للموظفين" });
    }
  });

  app.post("/api/admin/settings/staff-message", requireAdmin, async (req, res) => {
    if (!["owner", "admin"].includes(String(req.user?.role || "").toLowerCase())) {
      return res.status(403).json({ ok: false, code: "MANAGEMENT_ONLY", message: "نشر رسالة الموظفين متاح للمالك أو Admin فقط" });
    }
    const message = String(req.body?.message || "").trim().slice(0, 3000);
    const requestedRoles = Array.isArray(req.body?.targetRoles) ? req.body.targetRoles : null;
    const targetRoles = normalizeTargetRoles(requestedRoles);
    if (requestedRoles && requestedRoles.length && requestedRoles.every((role) => !STAFF_MESSAGE_ROLES.includes(String(role || "").trim().toLowerCase()))) {
      return res.status(400).json({ ok: false, message: "الأدوار المستهدفة غير صالحة" });
    }
    if (!message) return res.status(400).json({ ok: false, message: "اكتب نص الرسالة أولًا" });
    try {
      const value = {
        version: crypto.randomUUID(),
        message,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: Number(req.user.id) || null,
        targetRoles
      };
      await db("UPDATE staff_general_message_history SET active=FALSE WHERE active=TRUE");
      await db(
        `INSERT INTO staff_general_message_history(version,message,target_roles,created_at,created_by,active)
         VALUES($1,$2,$3::text[],$4::timestamptz,$5,$6)`,
        [value.version, value.message, value.targetRoles, value.createdAt, value.createdBy, value.active]
      );
      await setSetting(db, "staff_general_message", value);
      return res.status(201).json({ ok: true, message: value });
    } catch (error) {
      console.error("[STAFF MESSAGE PUBLISH]", error);
      return res.status(500).json({ ok: false, message: "تعذر نشر الرسالة للموظفين" });
    }
  });

  app.patch("/api/admin/settings/staff-message", requireAdmin, async (req, res) => {
    if (!["owner", "admin"].includes(String(req.user?.role || "").toLowerCase())) {
      return res.status(403).json({ ok: false, code: "MANAGEMENT_ONLY", message: "تغيير حالة رسالة الموظفين متاح للمالك أو Admin فقط" });
    }
    try {
      const current = normalizeMessage(await getSetting(db, "staff_general_message", {}));
      const active = req.body?.active === true;
      const value = { ...current, active };
      await setSetting(db, "staff_general_message", value);
      if (current.version) await db("UPDATE staff_general_message_history SET active=$1 WHERE version=$2", [active, current.version]);
      return res.json({ ok: true, message: value });
    } catch (error) {
      console.error("[STAFF MESSAGE TOGGLE]", error);
      return res.status(500).json({ ok: false, message: "تعذر تغيير حالة رسالة الموظفين" });
    }
  });
}

module.exports = { initStaffMessages, registerStaffMessageRoutes, normalizeMessage, normalizeTargetRoles };
