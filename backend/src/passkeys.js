"use strict";

const crypto = require("node:crypto");
const {
  createToken,
  normalizeContact,
  sanitizeUser,
  getGenderGreeting
} = require("./auth");

function passkeyError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function cleanBase64Url(value, maxLength = 16384) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength || !/^[A-Za-z0-9_-]+$/.test(text)) {
    throw passkeyError(400, "BAD_PASSKEY_DATA", "بيانات البصمة غير صالحة");
  }
  return text;
}

function decodeBase64Url(value, maxLength) {
  return Buffer.from(cleanBase64Url(value, maxLength), "base64url");
}

function normalizeCredentialId(value) {
  return decodeBase64Url(value, 4096).toString("base64url");
}

function parseClientData(encoded) {
  const buffer = decodeBase64Url(encoded, 16384);
  try {
    return {
      buffer,
      data: JSON.parse(buffer.toString("utf8"))
    };
  } catch {
    throw passkeyError(400, "BAD_CLIENT_DATA", "بيانات تسجيل البصمة غير صالحة");
  }
}

function validLocalHttp(url) {
  return url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

function getWebAuthnContext(req) {
  const configuredOrigin = String(process.env.WEBAUTHN_ORIGIN || "").trim();
  const requestOrigin = String(req.get("origin") || "").trim();
  let origin = configuredOrigin || requestOrigin;

  if (!origin) {
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const protocol = forwardedProto || req.protocol || "https";
    origin = `${protocol}://${req.get("host")}`;
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw passkeyError(400, "BAD_WEBAUTHN_ORIGIN", "تعذر تحديد نطاق تسجيل البصمة");
  }

  if (parsed.protocol !== "https:" && !validLocalHttp(parsed)) {
    throw passkeyError(400, "WEBAUTHN_REQUIRES_HTTPS", "الدخول بالبصمة يحتاج اتصال HTTPS آمن");
  }

  if (configuredOrigin && requestOrigin && new URL(requestOrigin).origin !== parsed.origin) {
    throw passkeyError(403, "WEBAUTHN_ORIGIN_MISMATCH", "مصدر طلب البصمة غير مسموح");
  }

  const rpId = String(process.env.WEBAUTHN_RP_ID || parsed.hostname).trim().toLowerCase();
  if (!rpId || rpId.includes("/") || rpId.includes(":")) {
    throw passkeyError(500, "BAD_WEBAUTHN_RP_ID", "إعداد نطاق البصمة غير صالح");
  }

  return {
    origin: parsed.origin,
    rpId,
    rpName: String(process.env.WEBAUTHN_RP_NAME || "Ladies First").trim() || "Ladies First"
  };
}

function verifyClientData(encoded, expectedType, challengeRow) {
  const parsed = parseClientData(encoded);
  const data = parsed.data;

  if (data.type !== expectedType) {
    throw passkeyError(400, "BAD_WEBAUTHN_TYPE", "نوع طلب البصمة غير صالح");
  }
  if (String(data.challenge || "") !== String(challengeRow.challenge || "")) {
    throw passkeyError(400, "BAD_WEBAUTHN_CHALLENGE", "انتهت أو تغيرت جلسة البصمة");
  }
  if (String(data.origin || "") !== String(challengeRow.origin || "")) {
    throw passkeyError(403, "BAD_WEBAUTHN_ORIGIN", "مصدر البصمة لا يطابق المتجر");
  }

  return parsed.buffer;
}

function verifyAuthenticatorData(encoded, rpId) {
  const data = decodeBase64Url(encoded, 32768);
  if (data.length < 37) {
    throw passkeyError(400, "BAD_AUTHENTICATOR_DATA", "بيانات جهاز البصمة غير مكتملة");
  }

  const expectedRpHash = crypto.createHash("sha256").update(String(rpId), "utf8").digest();
  const actualRpHash = data.subarray(0, 32);
  if (!crypto.timingSafeEqual(expectedRpHash, actualRpHash)) {
    throw passkeyError(403, "BAD_RP_ID_HASH", "بصمة الجهاز لا تخص هذا المتجر");
  }

  const flags = data[32];
  const userPresent = Boolean(flags & 0x01);
  const userVerified = Boolean(flags & 0x04);
  if (!userPresent || !userVerified) {
    throw passkeyError(403, "USER_VERIFICATION_REQUIRED", "يجب تأكيد بصمة أو قفل الجهاز");
  }

  return {
    buffer: data,
    flags,
    signCount: data.readUInt32BE(33)
  };
}

function verifyPublicKey(encoded) {
  const der = decodeBase64Url(encoded, 16384);
  let key;
  try {
    key = crypto.createPublicKey({
      key: der,
      format: "der",
      type: "spki"
    });
  } catch {
    throw passkeyError(400, "BAD_PASSKEY_PUBLIC_KEY", "مفتاح البصمة غير صالح");
  }

  if (!["ec", "rsa"].includes(key.asymmetricKeyType)) {
    throw passkeyError(400, "UNSUPPORTED_PASSKEY_KEY", "نوع مفتاح البصمة غير مدعوم");
  }

  return {
    der,
    key,
    keyType: key.asymmetricKeyType
  };
}

function safeTransports(value) {
  const allowed = new Set(["internal", "hybrid", "usb", "nfc", "ble"]);
  return Array.isArray(value)
    ? [...new Set(value.map(x => String(x || "").trim()).filter(x => allowed.has(x)))].slice(0, 10)
    : [];
}

async function initPasskeys(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key_der TEXT NOT NULL,
      key_type TEXT NOT NULL,
      sign_count BIGINT NOT NULL DEFAULT 0,
      transports JSONB NOT NULL DEFAULT '[]'::jsonb,
      label TEXT NOT NULL DEFAULT 'هذا الجهاز',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user
    ON passkey_credentials(user_id)
  `);

  await db(`
    CREATE TABLE IF NOT EXISTS passkey_challenges (
      id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('register','login')),
      challenge TEXT NOT NULL,
      rp_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db(`
    CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expiry
    ON passkey_challenges(expires_at)
  `);
}

async function clearExpiredChallenges(db) {
  await db("DELETE FROM passkey_challenges WHERE expires_at <= NOW()");
}

async function createChallenge(db, userId, purpose, context) {
  await clearExpiredChallenges(db);
  const id = crypto.randomUUID();
  const challenge = crypto.randomBytes(32).toString("base64url");

  await db(
    `
    INSERT INTO passkey_challenges
      (id, user_id, purpose, challenge, rp_id, origin, expires_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,NOW() + INTERVAL '5 minutes')
    `,
    [id, userId, purpose, challenge, context.rpId, context.origin]
  );

  return { id, challenge };
}

async function consumeChallenge(db, id, purpose, userId = null) {
  const params = [String(id || ""), purpose];
  let userFilter = "";
  if (userId !== null && userId !== undefined) {
    params.push(userId);
    userFilter = `AND user_id = $${params.length}`;
  }

  const result = await db(
    `
    DELETE FROM passkey_challenges
    WHERE id = $1
      AND purpose = $2
      ${userFilter}
      AND expires_at > NOW()
    RETURNING *
    `,
    params
  );

  if (!result.rowCount) {
    throw passkeyError(400, "PASSKEY_CHALLENGE_EXPIRED", "انتهت جلسة البصمة. أعيدي المحاولة.");
  }

  return result.rows[0];
}

async function findUserById(db, userId) {
  const result = await db(
    `
    SELECT *
    FROM users
    WHERE id = $1
      AND is_active = TRUE
    LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

async function findUserByContact(db, contact) {
  const normalized = normalizeContact(contact);
  if (!normalized) return null;
  const result = await db(
    `
    SELECT *
    FROM users
    WHERE is_active = TRUE
      AND (email = $1 OR phone = $1)
    LIMIT 1
    `,
    [normalized]
  );
  return result.rows[0] || null;
}

function registrationOptions(user, credentials, challenge, context) {
  return {
    challengeId: challenge.id,
    publicKey: {
      challenge: challenge.challenge,
      rp: {
        id: context.rpId,
        name: context.rpName
      },
      user: {
        id: Buffer.from(String(user.id), "utf8").toString("base64url"),
        name: user.email || user.phone || `user-${user.id}`,
        displayName: user.name || "Ladies First"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required"
      },
      excludeCredentials: credentials.map(row => ({
        id: row.credential_id,
        type: "public-key",
        transports: safeTransports(row.transports)
      }))
    }
  };
}

function authenticationOptions(credentials, challenge, context) {
  return {
    challengeId: challenge.id,
    publicKey: {
      challenge: challenge.challenge,
      rpId: context.rpId,
      timeout: 60000,
      userVerification: "required",
      allowCredentials: credentials.map(row => ({
        id: row.credential_id,
        type: "public-key",
        transports: safeTransports(row.transports)
      }))
    }
  };
}

function registerPasskeyRoutes(app, deps) {
  const { db, requireAuth } = deps;

  app.get("/api/passkeys/status", requireAuth, async (req, res) => {
    try {
      const result = await db(
        `
        SELECT credential_id, label, transports, created_at, last_used_at
        FROM passkey_credentials
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );
      return res.json({
        ok: true,
        enabled: result.rowCount > 0,
        credentials: result.rows.map(row => ({
          id: row.credential_id,
          label: row.label,
          transports: safeTransports(row.transports),
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at
        }))
      });
    } catch (error) {
      console.error("[PASSKEY STATUS]", error);
      return res.status(500).json({ ok: false, message: "تعذر تحميل حالة البصمة" });
    }
  });

  app.post("/api/passkeys/register/options", requireAuth, async (req, res) => {
    try {
      const user = await findUserById(db, req.user.id);
      if (!user) return res.status(404).json({ ok: false, message: "الحساب غير موجود" });

      const credentials = await db(
        "SELECT credential_id, transports FROM passkey_credentials WHERE user_id = $1 ORDER BY id",
        [user.id]
      );
      const context = getWebAuthnContext(req);
      const challenge = await createChallenge(db, user.id, "register", context);

      return res.json({
        ok: true,
        ...registrationOptions(user, credentials.rows, challenge, context)
      });
    } catch (error) {
      console.error("[PASSKEY REGISTER OPTIONS]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "PASSKEY_OPTIONS_ERROR",
        message: error.message || "تعذر بدء تفعيل البصمة"
      });
    }
  });

  app.post("/api/passkeys/register/verify", requireAuth, async (req, res) => {
    try {
      const challenge = await consumeChallenge(
        db,
        req.body?.challengeId,
        "register",
        req.user.id
      );

      const credential = req.body?.credential || {};
      const response = credential.response || {};
      verifyClientData(response.clientDataJSON, "webauthn.create", challenge);
      const auth = verifyAuthenticatorData(response.authenticatorData, challenge.rp_id);
      const publicKey = verifyPublicKey(response.publicKey);
      const credentialId = normalizeCredentialId(credential.rawId || credential.id);
      const idFromBrowser = credential.id ? normalizeCredentialId(credential.id) : credentialId;
      if (idFromBrowser !== credentialId) {
        throw passkeyError(400, "PASSKEY_ID_MISMATCH", "معرّف البصمة غير متطابق");
      }

      const transports = safeTransports(response.transports);
      const label = String(req.body?.label || "هذا الجهاز").trim().slice(0, 120) || "هذا الجهاز";

      const existing = await db(
        "SELECT user_id FROM passkey_credentials WHERE credential_id = $1 LIMIT 1",
        [credentialId]
      );
      if (existing.rowCount && Number(existing.rows[0].user_id) !== Number(req.user.id)) {
        throw passkeyError(409, "PASSKEY_ALREADY_USED", "هذه البصمة مرتبطة بحساب آخر");
      }

      await db(
        `
        INSERT INTO passkey_credentials
          (user_id, credential_id, public_key_der, key_type, sign_count, transports, label, created_at)
        VALUES
          ($1,$2,$3,$4,$5,$6::jsonb,$7,NOW())
        ON CONFLICT (credential_id)
        DO UPDATE SET
          public_key_der = EXCLUDED.public_key_der,
          key_type = EXCLUDED.key_type,
          sign_count = EXCLUDED.sign_count,
          transports = EXCLUDED.transports,
          label = EXCLUDED.label
        `,
        [
          req.user.id,
          credentialId,
          publicKey.der.toString("base64url"),
          publicKey.keyType,
          auth.signCount,
          JSON.stringify(transports),
          label
        ]
      );

      return res.json({
        ok: true,
        enabled: true,
        message: "تم تفعيل الدخول بالبصمة على هذا الجهاز"
      });
    } catch (error) {
      console.error("[PASSKEY REGISTER VERIFY]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "PASSKEY_REGISTER_ERROR",
        message: error.message || "تعذر تفعيل البصمة"
      });
    }
  });

  app.post("/api/passkeys/login/options", async (req, res) => {
    try {
      const user = await findUserByContact(db, req.body?.contact);
      if (!user) {
        return res.status(404).json({
          ok: false,
          code: "PASSKEY_NOT_AVAILABLE",
          message: "لا توجد بصمة مفعلة لهذا الحساب"
        });
      }

      const credentials = await db(
        "SELECT credential_id, transports FROM passkey_credentials WHERE user_id = $1 ORDER BY id",
        [user.id]
      );
      if (!credentials.rowCount) {
        return res.status(404).json({
          ok: false,
          code: "PASSKEY_NOT_AVAILABLE",
          message: "لا توجد بصمة مفعلة لهذا الحساب"
        });
      }

      const context = getWebAuthnContext(req);
      const challenge = await createChallenge(db, user.id, "login", context);
      return res.json({
        ok: true,
        ...authenticationOptions(credentials.rows, challenge, context)
      });
    } catch (error) {
      console.error("[PASSKEY LOGIN OPTIONS]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "PASSKEY_OPTIONS_ERROR",
        message: error.message || "تعذر بدء الدخول بالبصمة"
      });
    }
  });

  app.post("/api/passkeys/login/verify", async (req, res) => {
    try {
      const challenge = await consumeChallenge(
        db,
        req.body?.challengeId,
        "login"
      );

      const credential = req.body?.credential || {};
      const response = credential.response || {};
      const credentialId = normalizeCredentialId(credential.rawId || credential.id);

      const stored = await db(
        `
        SELECT *
        FROM passkey_credentials
        WHERE user_id = $1
          AND credential_id = $2
        LIMIT 1
        `,
        [challenge.user_id, credentialId]
      );
      if (!stored.rowCount) {
        throw passkeyError(401, "PASSKEY_UNKNOWN", "بصمة الجهاز غير معروفة لهذا الحساب");
      }

      const row = stored.rows[0];
      const clientDataBuffer = verifyClientData(
        response.clientDataJSON,
        "webauthn.get",
        challenge
      );
      const auth = verifyAuthenticatorData(
        response.authenticatorData,
        challenge.rp_id
      );
      const signature = decodeBase64Url(response.signature, 16384);
      const publicKey = verifyPublicKey(row.public_key_der);

      const clientDataHash = crypto.createHash("sha256").update(clientDataBuffer).digest();
      const signedData = Buffer.concat([auth.buffer, clientDataHash]);
      const valid = crypto.verify("sha256", signedData, publicKey.key, signature);
      if (!valid) {
        throw passkeyError(401, "PASSKEY_SIGNATURE_INVALID", "تعذر التحقق من بصمة الجهاز");
      }

      const previousCount = Number(row.sign_count || 0);
      if (
        previousCount > 0 &&
        auth.signCount > 0 &&
        auth.signCount <= previousCount
      ) {
        throw passkeyError(401, "PASSKEY_COUNTER_REPLAY", "تم رفض بصمة قديمة أو معاد استخدامها");
      }

      const user = await findUserById(db, challenge.user_id);
      if (!user) {
        throw passkeyError(403, "PASSKEY_ACCOUNT_DISABLED", "هذا الحساب غير مفعل");
      }

      await db(
        `
        UPDATE passkey_credentials
        SET sign_count = $1,
            last_used_at = NOW()
        WHERE id = $2
        `,
        [auth.signCount, row.id]
      );

      const token = createToken(user);
      return res.json({
        ok: true,
        token,
        user: sanitizeUser(user),
        greeting: getGenderGreeting(user.gender)
      });
    } catch (error) {
      console.error("[PASSKEY LOGIN VERIFY]", error);
      return res.status(error.status || 500).json({
        ok: false,
        code: error.code || "PASSKEY_LOGIN_ERROR",
        message: error.message || "تعذر تسجيل الدخول بالبصمة"
      });
    }
  });

  app.delete("/api/passkeys/:credentialId", requireAuth, async (req, res) => {
    try {
      const credentialId = normalizeCredentialId(req.params.credentialId);
      const result = await db(
        `
        DELETE FROM passkey_credentials
        WHERE user_id = $1
          AND credential_id = $2
        RETURNING id
        `,
        [req.user.id, credentialId]
      );
      if (!result.rowCount) {
        return res.status(404).json({ ok: false, message: "البصمة غير موجودة" });
      }
      return res.json({ ok: true, message: "تم حذف البصمة من الحساب" });
    } catch (error) {
      console.error("[PASSKEY DELETE]", error);
      return res.status(error.status || 500).json({
        ok: false,
        message: error.message || "تعذر حذف البصمة"
      });
    }
  });
}

module.exports = {
  initPasskeys,
  registerPasskeyRoutes,
  getWebAuthnContext,
  verifyClientData,
  verifyAuthenticatorData,
  verifyPublicKey,
  normalizeCredentialId,
  safeTransports
};
