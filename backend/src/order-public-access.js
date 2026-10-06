"use strict";

const crypto = require("node:crypto");

function orderQrSecret() {
  const secret = String(
    process.env.ORDER_QR_SECRET ||
    process.env.JWT_SECRET ||
    ""
  ).trim();

  if (!secret) {
    const error = new Error("ORDER_QR_SECRET/JWT_SECRET is not configured");
    error.status = 500;
    error.code = "ORDER_QR_SECRET_NOT_CONFIGURED";
    throw error;
  }

  return secret;
}

function orderTokenMessage(orderId, createdAt) {
  const created = new Date(createdAt);
  if (!Number.isInteger(Number(orderId)) || Number(orderId) <= 0 || Number.isNaN(created.getTime())) {
    throw new Error("Invalid order token input");
  }
  return `order:${Number(orderId)}:${created.toISOString()}`;
}

function signOrderToken(orderId, createdAt, secret = orderQrSecret()) {
  return crypto
    .createHmac("sha256", String(secret))
    .update(orderTokenMessage(orderId, createdAt))
    .digest("base64url");
}

function verifyOrderToken(orderId, createdAt, token, secret = orderQrSecret()) {
  const supplied = String(token || "").trim();
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(supplied)) return false;

  const expected = signOrderToken(orderId, createdAt, secret);
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(supplied, "utf8");

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function safeOrder(order) {
  return {
    id: Number(order.id),
    status: order.status,
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    couponDiscount: Number(order.coupon_discount || 0),
    couponCode: order.coupon_code || null,
    visaDiscount: Number(order.visa_discount || 0),
    loyaltyDiscount: Number(order.loyalty_discount || 0),
    pointsRedeemed: Number(order.points_redeemed || 0),
    shipping: Number(order.shipping_cost ?? order.shipping ?? 0),
    shippingRegion: order.shipping_region || null,
    shippingWaived: Boolean(order.shipping_waived),
    packaging: Number(order.packaging_cost ?? order.packaging ?? 0),
    total: Number(order.total || 0),
    paymentMethod: order.payment_method || "cash",
    createdAt: order.created_at,
    deliveredAt: order.delivered_at || null
  };
}

function safeItem(item) {
  return {
    id: Number(item.id),
    productId: Number(item.product_id),
    productName: item.product_name || "منتج",
    variantName: item.variant_name || "",
    image: item.image || "",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    total: Number(item.total || 0)
  };
}

function registerOrderPublicAccessRoutes(app, deps) {
  const { db, requireAdmin } = deps;

  app.get("/api/admin/orders/:id/public-link", requireAdmin, async (req, res) => {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ ok: false, message: "رقم الطلب غير صالح" });
    }

    try {
      const result = await db(
        "SELECT id, created_at FROM orders WHERE id = $1 LIMIT 1",
        [orderId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ ok: false, message: "الطلب غير موجود" });
      }

      const order = result.rows[0];
      const token = signOrderToken(order.id, order.created_at);

      return res.json({
        ok: true,
        path: `/order/${orderId}?token=${encodeURIComponent(token)}`
      });
    } catch (error) {
      console.error("[ORDER PUBLIC LINK]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "ORDER_PUBLIC_LINK_ERROR",
        message: error.message || "تعذر إنشاء رابط تفاصيل الطلب"
      });
    }
  });

  app.get("/api/public/orders/:id", async (req, res) => {
    const orderId = Number(req.params.id);
    const token = String(req.query?.token || "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0 || !token) {
      return res.status(404).json({ ok: false, message: "تفاصيل الطلب غير متاحة" });
    }

    try {
      const orderResult = await db(
        `
        SELECT
          id,
          status,
          subtotal,
          discount,
          coupon_discount,
          coupon_code,
          visa_discount,
          loyalty_discount,
          points_redeemed,
          shipping,
          shipping_cost,
          shipping_region,
          shipping_waived,
          packaging,
          packaging_cost,
          total,
          payment_method,
          created_at,
          delivered_at
        FROM orders
        WHERE id = $1
        LIMIT 1
        `,
        [orderId]
      );

      if (!orderResult.rowCount) {
        return res.status(404).json({ ok: false, message: "تفاصيل الطلب غير متاحة" });
      }

      const order = orderResult.rows[0];
      if (!verifyOrderToken(order.id, order.created_at, token)) {
        return res.status(404).json({ ok: false, message: "تفاصيل الطلب غير متاحة" });
      }

      const itemsResult = await db(
        `
        SELECT
          id,
          product_id,
          product_name,
          variant_name,
          image,
          quantity,
          unit_price,
          total
        FROM order_items
        WHERE order_id = $1
        ORDER BY id
        `,
        [orderId]
      );

      return res.json({
        ok: true,
        order: safeOrder(order),
        items: itemsResult.rows.map(safeItem)
      });
    } catch (error) {
      console.error("[PUBLIC ORDER DETAILS]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "PUBLIC_ORDER_ERROR",
        message: error.message || "تعذر تحميل تفاصيل الطلب"
      });
    }
  });
}

module.exports = {
  signOrderToken,
  verifyOrderToken,
  safeOrder,
  safeItem,
  registerOrderPublicAccessRoutes
};
