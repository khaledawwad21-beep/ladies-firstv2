"use strict";

const crypto = require("node:crypto");
const {
  normalizeContact,
  normalizeEmail,
  normalizePhone,
  hashPassword
} = require("./auth");
const {
  getWhatsAppConfig,
  buildTemplatePayload
} = require("./whatsapp-automation");

const RECOVERY_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const MIN_REQUEST_INTERVAL_SECONDS = 60;

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function recoverySecret() {
  const secret = env("PASSWORD_RECOVERY_SECRET") || env("JWT_SECRET");
  if (!secret) {
    const error = new Error("PASSWORD_RECOVERY_SECRET/JWT_SECRET is not configured");
    error.code = "RECOVERY_SECRET_NOT_CONFIGURED";
    error.status = 500;
    throw error;
  }
  return secret;
}

function recoveryError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function channelForContact(contact) {
  return String(contact || "").includes("@") ? "email" : "whatsapp";
}

function normalizeRecoveryContact(value) {
  const normalized = normalizeContact(value);
  if (!normalized) {
    throw recoveryError(400, "RECOVERY_CONTACT_REQUIRED", "أدخل البريد الإلكتروني أو رقم الهاتف");
  }
  return normalized;
}

function hashRecoveryCode(requestId, code) {
  return crypto
    .createHmac("sha256", recoverySecret())
    .update(String(requestId) + "|" + String(code))
    .digest("hex");
}

function safeCode(value) {
  const code = String(value || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw recoveryError(400, "RECOVERY_CODE_INVALID", "رمز الاسترداد يجب أن يكون 6 أرقام");
  }
  return code;
}

function randomCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function providerStatus(channel) {
  if (channel === "email") {
    return {
      configured: Boolean(
        env("RESEND_API_KEY") &&
        env("PASSWORD_RECOVERY_EMAIL_FROM")
      ),
      provider: "resend"
    };
  }

  const config = getWhatsAppConfig();
  return {
    configured: Boolean(
      config.accessToken &&
      config.phoneNumberId &&
      env("WHATSAPP_PASSWORD_RESET_TEMPLATE")
    ),
    provider: "whatsapp"
  };
}

async function sendRecoveryEmail(to, code) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("PASSWORD_RECOVERY_EMAIL_FROM");
  if (!apiKey || !from) {
    throw recoveryError(
      503,
      "RECOVERY_EMAIL_NOT_CONFIGURED",
      "استرداد كلمة المرور عبر البريد غير مفعّل بعد"
    );
  }

  const subject = env(
    "PASSWORD_RECOVERY_EMAIL_SUBJECT",
    "Ladies First - رمز استرداد كلمة المرور"
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [normalizeEmail(to)],
      subject,
      text:
        "رمز استرداد كلمة المرور الخاص بك هو: " +
        code +
        ". الرمز صالح لمدة " +
        RECOVERY_TTL_MINUTES +
        " دقيقة. إذا لم تطلب هذا الرمز فتجاهل الرسالة."
    }),
    signal: AbortSignal.timeout(15000)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw recoveryError(
      502,
      "RECOVERY_EMAIL_SEND_FAILED",
      data?.message || "تعذر إرسال رمز الاسترداد عبر البريد"
    );
  }

  return data?.id || null;
}

async function sendRecoveryWhatsApp(phone, code) {
  const config = getWhatsAppConfig();
  const templateName = env("WHATSAPP_PASSWORD_RESET_TEMPLATE");

  if (
    !config.accessToken ||
    !config.phoneNumberId ||
    !templateName
  ) {
    throw recoveryError(
      503,
      "RECOVERY_WHATSAPP_NOT_CONFIGURED",
      "استرداد كلمة المرور عبر واتساب غير مفعّل بعد"
    );
  }

  const payload = buildTemplatePayload(
    normalizePhone(phone),
    templateName,
    config.language,
    [code]
  );

  if (!payload) {
    throw recoveryError(
      400,
      "RECOVERY_PHONE_INVALID",
      "رقم الهاتف غير صالح للاسترداد"
    );
  }

  const response = await fetch(
    "https://graph.facebook.com/" +
      config.apiVersion +
      "/" +
      config.phoneNumberId +
      "/messages",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    }
  );

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw recoveryError(
      502,
      "RECOVERY_WHATSAPP_SEND_FAILED",
      data?.error?.message || "تعذر إرسال رمز الاسترداد عبر واتساب"
    );
  }

  return data?.messages?.[0]?.id || null;
}

async function initPasswordRecovery(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS password_recovery_requests (
      id TEXT PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      contact TEXT NOT NULL,
      channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      provider_message_id TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      delivery_error TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS idx_password_recovery_contact_created
    ON password_recovery_requests(contact, created_at DESC)
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS idx_password_recovery_expiry
    ON password_recovery_requests(expires_at)
  `);
}

async function cleanupRecovery(db) {
  await db(`
    DELETE FROM password_recovery_requests
    WHERE expires_at < NOW() - INTERVAL '1 day'
       OR used_at < NOW() - INTERVAL '1 day'
  `);
}

async function findUserForContact(db, contact) {
  const result = await db(
    `
    SELECT id, name, email, phone, is_active
    FROM users
    WHERE email = $1
       OR phone = $1
    LIMIT 1
    `,
    [contact]
  );
  return result.rows[0] || null;
}

async function sendRecoveryCode(channel, contact, code) {
  if (channel === "email") {
    return sendRecoveryEmail(contact, code);
  }
  return sendRecoveryWhatsApp(contact, code);
}

function genericRecoveryMessage() {
  return "إذا كان الحساب موجودًا فسيصلك رمز استرداد صالح لمدة 15 دقيقة.";
}

function registerPasswordRecoveryRoutes(app, deps) {
  const { db, transaction } = deps;

  app.post("/api/auth/password-recovery/request", async (req, res) => {
    let contact;
    try {
      contact = normalizeRecoveryContact(
        req.body?.contact ??
        req.body?.email ??
        req.body?.phone
      );

      const channel = channelForContact(contact);
      const provider = providerStatus(channel);

      if (!provider.configured) {
        return res.status(503).json({
          ok: false,
          code:
            channel === "email"
              ? "RECOVERY_EMAIL_NOT_CONFIGURED"
              : "RECOVERY_WHATSAPP_NOT_CONFIGURED",
          message:
            channel === "email"
              ? "استرداد كلمة المرور عبر البريد غير مفعّل بعد"
              : "استرداد كلمة المرور عبر واتساب غير مفعّل بعد"
        });
      }

      await cleanupRecovery(db);

      const recent = await db(
        `
        SELECT created_at
        FROM password_recovery_requests
        WHERE contact = $1
          AND created_at > NOW() - ($2::text || ' seconds')::interval
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [contact, String(MIN_REQUEST_INTERVAL_SECONDS)]
      );

      if (recent.rowCount) {
        return res.status(429).json({
          ok: false,
          code: "RECOVERY_RATE_LIMITED",
          message: "انتظر دقيقة قبل طلب رمز استرداد جديد"
        });
      }

      const user = await findUserForContact(db, contact);
      const id = crypto.randomUUID();
      const code = randomCode();
      const codeHash = hashRecoveryCode(id, code);

      await db(
        `
        INSERT INTO password_recovery_requests
          (
            id,
            user_id,
            contact,
            channel,
            code_hash,
            expires_at
          )
        VALUES
          (
            $1,$2,$3,$4,$5,
            NOW() + ($6::text || ' minutes')::interval
          )
        `,
        [
          id,
          user?.id || null,
          contact,
          channel,
          codeHash,
          String(RECOVERY_TTL_MINUTES)
        ]
      );

      if (user?.id && user.is_active !== false) {
        try {
          const providerMessageId =
            await sendRecoveryCode(
              channel,
              contact,
              code
            );

          await db(
            `
            UPDATE password_recovery_requests
            SET
              delivery_status = 'sent',
              provider_message_id = $1
            WHERE id = $2
            `,
            [providerMessageId, id]
          );
        } catch (error) {
          await db(
            `
            UPDATE password_recovery_requests
            SET
              delivery_status = 'failed',
              delivery_error = $1
            WHERE id = $2
            `,
            [
              String(error.message || error).slice(0, 800),
              id
            ]
          );

          console.error("[PASSWORD RECOVERY DELIVERY]", error);
          return res.status(error.status || 502).json({
            ok: false,
            code: error.code || "RECOVERY_DELIVERY_FAILED",
            message:
              "تعذر إرسال رمز الاسترداد حاليًا. حاول مرة أخرى لاحقًا."
          });
        }
      }

      return res.json({
        ok: true,
        message: genericRecoveryMessage()
      });
    } catch (error) {
      console.error("[PASSWORD RECOVERY REQUEST]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "RECOVERY_REQUEST_FAILED",
        message:
          error.message ||
          "تعذر بدء استرداد كلمة المرور"
      });
    }
  });

  app.post("/api/auth/password-recovery/confirm", async (req, res) => {
    try {
      const contact =
        normalizeRecoveryContact(
          req.body?.contact ??
          req.body?.email ??
          req.body?.phone
        );

      const code = safeCode(req.body?.code);
      const newPassword = String(
        req.body?.newPassword ??
        req.body?.new_password ??
        ""
      );

      if (newPassword.length < 12) {
        return res.status(400).json({
          ok: false,
          code: "PASSWORD_TOO_SHORT",
          message:
            "كلمة المرور الجديدة يجب أن تكون 12 خانة على الأقل"
        });
      }

      const latest = await db(
        `
        SELECT *
        FROM password_recovery_requests
        WHERE contact = $1
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [contact]
      );

      if (!latest.rowCount) {
        return res.status(400).json({
          ok: false,
          code: "RECOVERY_CODE_EXPIRED",
          message:
            "رمز الاسترداد غير صحيح أو انتهت صلاحيته"
        });
      }

      const request = latest.rows[0];

      if (Number(request.attempts || 0) >= MAX_ATTEMPTS) {
        return res.status(429).json({
          ok: false,
          code: "RECOVERY_ATTEMPTS_EXCEEDED",
          message:
            "تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا."
        });
      }

      const actual = Buffer.from(
        hashRecoveryCode(request.id, code),
        "hex"
      );
      const expected = Buffer.from(
        String(request.code_hash || ""),
        "hex"
      );

      const valid =
        actual.length === expected.length &&
        crypto.timingSafeEqual(actual, expected);

      if (!valid || !request.user_id) {
        await db(
          `
          UPDATE password_recovery_requests
          SET attempts = attempts + 1
          WHERE id = $1
          `,
          [request.id]
        );

        return res.status(400).json({
          ok: false,
          code: "RECOVERY_CODE_INVALID",
          message:
            "رمز الاسترداد غير صحيح أو انتهت صلاحيته"
        });
      }

      const passwordHash =
        await hashPassword(newPassword);

      await transaction(async client => {
        const locked = await client.query(
          `
          SELECT
            id,
            user_id,
            attempts,
            used_at,
            expires_at
          FROM password_recovery_requests
          WHERE id = $1
          FOR UPDATE
          `,
          [request.id]
        );

        if (!locked.rowCount) {
          throw recoveryError(
            400,
            "RECOVERY_CODE_EXPIRED",
            "رمز الاسترداد غير صحيح أو انتهت صلاحيته"
          );
        }

        const row = locked.rows[0];
        if (
          row.used_at ||
          new Date(row.expires_at).getTime() <= Date.now() ||
          Number(row.attempts || 0) >= MAX_ATTEMPTS
        ) {
          throw recoveryError(
            400,
            "RECOVERY_CODE_EXPIRED",
            "رمز الاسترداد غير صحيح أو انتهت صلاحيته"
          );
        }

        await client.query(
          `
          UPDATE users
          SET
            password_hash = $1,
            updated_at = NOW()
          WHERE id = $2
            AND is_active = TRUE
          `,
          [passwordHash, request.user_id]
        );

        await client.query(
          `
          UPDATE password_recovery_requests
          SET used_at = NOW()
          WHERE id = $1
          `,
          [request.id]
        );

        await client.query(
          `
          UPDATE password_recovery_requests
          SET used_at = COALESCE(used_at, NOW())
          WHERE user_id = $1
            AND id <> $2
            AND used_at IS NULL
          `,
          [request.user_id, request.id]
        );
      });

      return res.json({
        ok: true,
        message:
          "تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن."
      });
    } catch (error) {
      console.error("[PASSWORD RECOVERY CONFIRM]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "RECOVERY_CONFIRM_FAILED",
        message:
          error.message ||
          "تعذر تغيير كلمة المرور"
      });
    }
  });
}

module.exports = {
  RECOVERY_TTL_MINUTES,
  MAX_ATTEMPTS,
  MIN_REQUEST_INTERVAL_SECONDS,
  channelForContact,
  normalizeRecoveryContact,
  hashRecoveryCode,
  safeCode,
  providerStatus,
  initPasswordRecovery,
  registerPasswordRecoveryRoutes
};
