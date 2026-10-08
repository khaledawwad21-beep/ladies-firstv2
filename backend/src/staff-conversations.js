"use strict";

const MAX_MESSAGE_LENGTH = 3000;

async function initStaffConversations(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS staff_conversations (
      id BIGSERIAL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('direct','order','product')),
      order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
      participant_low_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      participant_high_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (participant_low_id < participant_high_id),
      CHECK (
        (kind='direct' AND order_id IS NULL AND product_id IS NULL) OR
        (kind='order' AND order_id IS NOT NULL AND product_id IS NULL) OR
        (kind='product' AND product_id IS NOT NULL AND order_id IS NULL)
      )
    )
  `);
  await db(`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_conversations_direct_pair ON staff_conversations(participant_low_id,participant_high_id) WHERE kind='direct'`);
  await db(`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_conversations_order_pair ON staff_conversations(participant_low_id,participant_high_id,order_id) WHERE kind='order'`);
  await db(`CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_conversations_product_pair ON staff_conversations(participant_low_id,participant_high_id,product_id) WHERE kind='product'`);
  await db(`
    CREATE TABLE IF NOT EXISTS staff_conversation_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
      sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 3000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db(`CREATE INDEX IF NOT EXISTS idx_staff_conversation_messages_thread ON staff_conversation_messages(conversation_id,id)`);
  await db(`
    CREATE TABLE IF NOT EXISTS staff_conversation_reads (
      conversation_id BIGINT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(conversation_id,user_id)
    )
  `);
}

function asId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function hasContextPermission(user, permission) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "owner" || role === "admin") return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}

function registerStaffConversationRoutes(app, { db, requireAdmin }) {
  app.get("/api/staff-conversations/contacts", requireAdmin, async (req, res) => {
    try {
      const result = await db(
        `SELECT id,name,role
         FROM users WHERE is_active=TRUE AND role IN ('owner','admin','staff') AND id<>$1
         ORDER BY name,id`,
        [req.user.id]
      );
      return res.json({ ok: true, contacts: result.rows });
    } catch (error) {
      console.error("[STAFF CHAT CONTACTS]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل قائمة الموظفين" });
    }
  });

  app.get("/api/staff-conversations", requireAdmin, async (req, res) => {
    try {
      const result = await db(
        `SELECT c.id,c.kind,c.order_id,c.product_id,c.created_at,c.updated_at,
                CASE WHEN c.participant_low_id=$1 THEN high.name ELSE low.name END AS other_name,
                CASE WHEN c.kind='order' THEN 'طلب #'||c.order_id::text
                     WHEN c.kind='product' THEN COALESCE(p.name,'منتج #'||c.product_id::text)
                     ELSE 'محادثة مباشرة' END AS context_label,
                COALESCE(last.body,'') AS last_message,
                (SELECT COUNT(*)::int FROM staff_conversation_messages unread
                 LEFT JOIN staff_conversation_reads rd ON rd.conversation_id=c.id AND rd.user_id=$1
                 WHERE unread.conversation_id=c.id AND unread.sender_id<>$1
                   AND unread.created_at>COALESCE(rd.last_read_at,'epoch'::timestamptz)) AS unread_count
         FROM staff_conversations c
         JOIN users low ON low.id=c.participant_low_id
         JOIN users high ON high.id=c.participant_high_id
         LEFT JOIN products p ON p.id=c.product_id
         LEFT JOIN LATERAL (
           SELECT body FROM staff_conversation_messages WHERE conversation_id=c.id
           ORDER BY id DESC LIMIT 1
         ) last ON TRUE
         WHERE $1 IN (c.participant_low_id,c.participant_high_id)
         ORDER BY c.updated_at DESC,c.id DESC LIMIT 200`,
        [req.user.id]
      );
      return res.json({ ok: true, conversations: result.rows });
    } catch (error) {
      console.error("[STAFF CHAT LIST]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل المحادثات" });
    }
  });

  app.post("/api/staff-conversations", requireAdmin, async (req, res) => {
    const recipientId = asId(req.body?.recipientId);
    const body = String(req.body?.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    const contextType = String(req.body?.contextType || "").trim().toLowerCase();
    const contextId = req.body?.contextId ? asId(req.body.contextId) : null;
    if (!recipientId || recipientId === asId(req.user.id)) {
      return res.status(400).json({ ok: false, message: "اختار موظفًا آخر للمحادثة" });
    }
    if (!body) return res.status(400).json({ ok: false, message: "اكتب الرسالة قبل الإرسال" });
    if (!['', 'order', 'product'].includes(contextType) || ((contextType === '') !== (contextId === null))) {
      return res.status(400).json({ ok: false, message: "نوع أو رقم الطلب/المنتج غير صالح" });
    }
    if (contextType === "order" && (!hasContextPermission(req.user, "orders"))) {
      return res.status(403).json({ ok: false, message: "لا تملك صلاحية ربط المحادثة بطلب" });
    }
    if (contextType === "product" && (!hasContextPermission(req.user, "products"))) {
      return res.status(403).json({ ok: false, message: "لا تملك صلاحية ربط المحادثة بمنتج" });
    }

    try {
      const recipientResult = await db(
        `SELECT id,name,role,permissions FROM users
         WHERE id=$1 AND is_active=TRUE AND role IN ('owner','admin','staff') LIMIT 1`,
        [recipientId]
      );
      const recipient = recipientResult.rows[0];
      if (!recipient) return res.status(404).json({ ok: false, message: "الموظف المحدد غير موجود أو غير فعال" });
      if (contextType && !hasContextPermission(recipient, contextType === "order" ? "orders" : "products")) {
        return res.status(400).json({ ok: false, message: "الموظف المحدد لا يملك صلاحية الوصول إلى هذا النوع من السجلات" });
      }

      let orderId = null;
      let productId = null;
      let kind = "direct";
      if (contextType === "order") {
        const exists = await db("SELECT id FROM orders WHERE id=$1 LIMIT 1", [contextId]);
        if (!exists.rowCount) return res.status(404).json({ ok: false, message: "الطلب غير موجود" });
        orderId = contextId;
        kind = "order";
      } else if (contextType === "product") {
        const exists = await db("SELECT id FROM products WHERE id=$1 LIMIT 1", [contextId]);
        if (!exists.rowCount) return res.status(404).json({ ok: false, message: "المنتج غير موجود" });
        productId = contextId;
        kind = "product";
      }

      const requesterId = asId(req.user.id);
      const lowId = Math.min(requesterId, recipientId);
      const highId = Math.max(requesterId, recipientId);
      let conversation = await db(
        `SELECT id FROM staff_conversations
         WHERE participant_low_id=$1 AND participant_high_id=$2 AND kind=$3
           AND order_id IS NOT DISTINCT FROM $4::bigint
           AND product_id IS NOT DISTINCT FROM $5::bigint LIMIT 1`,
        [lowId, highId, kind, orderId, productId]
      );
      let conversationId = conversation.rows[0]?.id;
      if (!conversationId) {
        const inserted = await db(
          `INSERT INTO staff_conversations(kind,order_id,product_id,participant_low_id,participant_high_id,created_by)
           VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,
          [kind, orderId, productId, lowId, highId, requesterId]
        );
        conversationId = inserted.rows[0]?.id;
        if (!conversationId) {
          conversation = await db(
            `SELECT id FROM staff_conversations
             WHERE participant_low_id=$1 AND participant_high_id=$2 AND kind=$3
               AND order_id IS NOT DISTINCT FROM $4::bigint
               AND product_id IS NOT DISTINCT FROM $5::bigint LIMIT 1`,
            [lowId, highId, kind, orderId, productId]
          );
          conversationId = conversation.rows[0]?.id;
        }
      }
      if (!conversationId) throw new Error("تعذر إنشاء المحادثة");
      await db("INSERT INTO staff_conversation_messages(conversation_id,sender_id,body) VALUES($1,$2,$3)", [conversationId, requesterId, body]);
      await db("UPDATE staff_conversations SET updated_at=NOW() WHERE id=$1", [conversationId]);
      await db(
        `INSERT INTO staff_conversation_reads(conversation_id,user_id,last_read_at)
         VALUES($1,$2,NOW()) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_at=NOW()`,
        [conversationId, requesterId]
      );
      return res.status(201).json({ ok: true, conversationId });
    } catch (error) {
      console.error("[STAFF CHAT CREATE]", error);
      return res.status(500).json({ ok: false, message: "تعذر إنشاء المحادثة" });
    }
  });

  app.get("/api/staff-conversations/:id", requireAdmin, async (req, res) => {
    const conversationId = asId(req.params.id);
    if (!conversationId) return res.status(400).json({ ok: false, message: "رقم المحادثة غير صالح" });
    try {
      const result = await db(
        `SELECT c.id,c.kind,c.order_id,c.product_id,c.created_at,
                CASE WHEN c.participant_low_id=$2 THEN high.name ELSE low.name END AS other_name,
                CASE WHEN c.kind='order' THEN 'طلب #'||c.order_id::text
                     WHEN c.kind='product' THEN COALESCE(p.name,'منتج #'||c.product_id::text)
                     ELSE 'محادثة مباشرة' END AS context_label
         FROM staff_conversations c
         JOIN users low ON low.id=c.participant_low_id
         JOIN users high ON high.id=c.participant_high_id
         LEFT JOIN products p ON p.id=c.product_id
         WHERE c.id=$1 AND $2 IN (c.participant_low_id,c.participant_high_id) LIMIT 1`,
        [conversationId, req.user.id]
      );
      const conversation = result.rows[0];
      if (!conversation) return res.status(404).json({ ok: false, message: "المحادثة غير موجودة" });
      const messages = await db(
        `SELECT m.id,m.sender_id,m.body,m.created_at,u.name AS sender_name
         FROM staff_conversation_messages m JOIN users u ON u.id=m.sender_id
         WHERE m.conversation_id=$1 ORDER BY m.id ASC LIMIT 500`,
        [conversationId]
      );
      await db(
        `INSERT INTO staff_conversation_reads(conversation_id,user_id,last_read_at)
         VALUES($1,$2,NOW()) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_at=NOW()`,
        [conversationId, req.user.id]
      );
      return res.json({ ok: true, conversation, messages: messages.rows });
    } catch (error) {
      console.error("[STAFF CHAT DETAIL]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل المحادثة" });
    }
  });

  app.post("/api/staff-conversations/:id/messages", requireAdmin, async (req, res) => {
    const conversationId = asId(req.params.id);
    const body = String(req.body?.message || "").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!conversationId) return res.status(400).json({ ok: false, message: "رقم المحادثة غير صالح" });
    if (!body) return res.status(400).json({ ok: false, message: "اكتب الرسالة قبل الإرسال" });
    try {
      const conversation = await db(
        `SELECT id FROM staff_conversations
         WHERE id=$1 AND $2 IN (participant_low_id,participant_high_id) LIMIT 1`,
        [conversationId, req.user.id]
      );
      if (!conversation.rowCount) return res.status(404).json({ ok: false, message: "المحادثة غير موجودة" });
      const message = await db(
        `INSERT INTO staff_conversation_messages(conversation_id,sender_id,body)
         VALUES($1,$2,$3) RETURNING id,sender_id,body,created_at`,
        [conversationId, req.user.id, body]
      );
      await db("UPDATE staff_conversations SET updated_at=NOW() WHERE id=$1", [conversationId]);
      await db(
        `INSERT INTO staff_conversation_reads(conversation_id,user_id,last_read_at)
         VALUES($1,$2,NOW()) ON CONFLICT(conversation_id,user_id) DO UPDATE SET last_read_at=NOW()`,
        [conversationId, req.user.id]
      );
      return res.status(201).json({ ok: true, message: message.rows[0] });
    } catch (error) {
      console.error("[STAFF CHAT SEND]", error);
      return res.status(500).json({ ok: false, message: "تعذر إرسال الرسالة" });
    }
  });
}

module.exports = { initStaffConversations, registerStaffConversationRoutes, hasContextPermission };
