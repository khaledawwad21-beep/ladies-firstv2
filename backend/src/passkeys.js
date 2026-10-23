"use strict";

const crypto = require("node:crypto");
const {
  createToken,
  normalizeContact,
  sanitizeUser,
  getGenderGreeting
} = require("./auth");

let simpleWebAuthnPromise = null;

async function webAuthnServer() {
  if (!simpleWebAuthnPromise) {
    simpleWebAuthnPromise = import("@simplewebauthn/server");
  }
  return simpleWebAuthnPromise;
}

function passkeyError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function cleanCredentialId(value) {
  const text = String(value || "").trim();
  if (!text || text.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(text)) {
    throw passkeyError(400, "BAD_PASSKEY_ID", "معرّف البصمة غير صالح");
  }
  return Buffer.from(text, "base64url").toString("base64url");
}

function safeTransports(value) {
  const allowed = new Set([
    "internal",
    "hybrid",
    "usb",
    "nfc",
    "ble",
    "cable",
    "smart-card"
  ]);
  return Array.isArray(value)
    ? [...new Set(
        value
          .map(x => String(x || "").trim())
          .filter(x => allowed.has(x))
      )].slice(0, 10)
    : [];
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
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    const protocol = forwardedProto || req.protocol || "https";
    origin = `${protocol}://${req.get("host")}`;
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw passkeyError(
      400,
      "BAD_WEBAUTHN_ORIGIN",
      "تعذر تحديد نطاق تسجيل البصمة"
    );
  }

  if (parsed.protocol !== "https:" && !validLocalHttp(parsed)) {
    throw passkeyError(
      400,
      "WEBAUTHN_REQUIRES_HTTPS",
      "الدخول بالبصمة يحتاج اتصال HTTPS آمن"
    );
  }

  if (configuredOrigin && requestOrigin) {
    let requestParsed;
    try {
      requestParsed = new URL(requestOrigin);
    } catch {
      throw passkeyError(
        403,
        "WEBAUTHN_ORIGIN_MISMATCH",
        "مصدر طلب البصمة غير مسموح"
      );
    }
    if (requestParsed.origin !== parsed.origin) {
      throw passkeyError(
        403,
        "WEBAUTHN_ORIGIN_MISMATCH",
        "مصدر طلب البصمة غير مسموح"
      );
    }
  }

  const rpId = String(
    process.env.WEBAUTHN_RP_ID || parsed.hostname
  ).trim().toLowerCase();

  if (!rpId || rpId.includes("/") || rpId.includes(":")) {
    throw passkeyError(
      500,
      "BAD_WEBAUTHN_RP_ID",
      "إعداد نطاق البصمة غير صالح"
    );
  }

  return {
    origin: parsed.origin,
    rpId,
    rpName:
      String(process.env.WEBAUTHN_RP_NAME || "Ladies First").trim() ||
      "Ladies First"
  };
}

async function initPasskeys(db) {
  await db(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      sign_count BIGINT NOT NULL DEFAULT 0,
      transports JSONB NOT NULL DEFAULT '[]'::jsonb,
      device_type TEXT,
      backed_up BOOLEAN NOT NULL DEFAULT FALSE,
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

async function storeChallenge(
  db,
  userId,
  purpose,
  context,
  challenge
) {
  await clearExpiredChallenges(db);
  const id = crypto.randomUUID();

  await db(
    `
    INSERT INTO passkey_challenges
      (id, user_id, purpose, challenge, rp_id, origin, expires_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,NOW() + INTERVAL '5 minutes')
    `,
    [
      id,
      userId,
      purpose,
      challenge,
      context.rpId,
      context.origin
    ]
  );

  return id;
}

async function consumeChallenge(
  db,
  id,
  purpose,
  userId = null
) {
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
    throw passkeyError(
      400,
      "PASSKEY_CHALLENGE_EXPIRED",
      "انتهت جلسة البصمة. أعيدي المحاولة."
    );
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

function browserRegistrationResponse(credential) {
  const response = credential?.response || {};
  return {
    id: cleanCredentialId(credential?.id || credential?.rawId),
    rawId: cleanCredentialId(credential?.rawId || credential?.id),
    type: "public-key",
    response: {
      clientDataJSON: String(response.clientDataJSON || ""),
      attestationObject: String(response.attestationObject || ""),
      transports: safeTransports(response.transports)
    },
    clientExtensionResults:
      credential?.clientExtensionResults &&
      typeof credential.clientExtensionResults === "object"
        ? credential.clientExtensionResults
        : {},
    authenticatorAttachment:
      credential?.authenticatorAttachment === "cross-platform"
        ? "cross-platform"
        : "platform"
  };
}

function browserAuthenticationResponse(credential) {
  const response = credential?.response || {};
  return {
    id: cleanCredentialId(credential?.id || credential?.rawId),
    rawId: cleanCredentialId(credential?.rawId || credential?.id),
    type: "public-key",
    response: {
      clientDataJSON: String(response.clientDataJSON || ""),
      authenticatorData: String(response.authenticatorData || ""),
      signature: String(response.signature || ""),
      userHandle: response.userHandle
        ? String(response.userHandle)
        : undefined
    },
    clientExtensionResults:
      credential?.clientExtensionResults &&
      typeof credential.clientExtensionResults === "object"
        ? credential.clientExtensionResults
        : {},
    authenticatorAttachment:
      credential?.authenticatorAttachment === "cross-platform"
        ? "cross-platform"
        : "platform"
  };
}

function registerPasskeyRoutes(app, deps) {
  const { db, requireAuth } = deps;

  app.get(
    "/api/passkeys/status",
    requireAuth,
    async (req, res) => {
      try {
        const result = await db(
          `
          SELECT
            credential_id,
            label,
            transports,
            device_type,
            backed_up,
            created_at,
            last_used_at
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
            deviceType: row.device_type || null,
            backedUp: Boolean(row.backed_up),
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at
          }))
        });
      } catch (error) {
        console.error("[PASSKEY STATUS]", error);
        return res.status(500).json({
          ok: false,
          message: "تعذر تحميل حالة البصمة"
        });
      }
    }
  );

  app.post(
    "/api/passkeys/register/options",
    requireAuth,
    async (req, res) => {
      try {
        const user = await findUserById(
          db,
          req.user.id
        );

        if (!user) {
          return res.status(404).json({
            ok: false,
            message: "الحساب غير موجود"
          });
        }

        const existing = await db(
          `
          SELECT credential_id, transports
          FROM passkey_credentials
          WHERE user_id = $1
          ORDER BY id
          `,
          [user.id]
        );

        const context =
          getWebAuthnContext(req);

        const {
          generateRegistrationOptions
        } = await webAuthnServer();

        const publicKey =
          await generateRegistrationOptions({
            rpName: context.rpName,
            rpID: context.rpId,
            userID: Buffer.from(
              String(user.id),
              "utf8"
            ),
            userName:
              user.email ||
              user.phone ||
              `user-${user.id}`,
            userDisplayName:
              user.name ||
              "Ladies First",
            attestationType: "none",
            excludeCredentials:
              existing.rows.map(row => ({
                id:
                  row.credential_id,
                transports:
                  safeTransports(
                    row.transports
                  )
              })),
            authenticatorSelection: {
              authenticatorAttachment:
                "platform",
              residentKey:
                "preferred",
              userVerification:
                "required"
            },
            supportedAlgorithmIDs:
              [-7, -257]
          });

        const challengeId =
          await storeChallenge(
            db,
            user.id,
            "register",
            context,
            publicKey.challenge
          );

        return res.json({
          ok: true,
          challengeId,
          publicKey
        });
      } catch (error) {
        console.error(
          "[PASSKEY REGISTER OPTIONS]",
          error
        );

        return res.status(
          error.status || 500
        ).json({
          ok: false,
          code:
            error.code ||
            "PASSKEY_OPTIONS_ERROR",
          message:
            error.message ||
            "تعذر بدء تفعيل البصمة"
        });
      }
    }
  );

  app.post(
    "/api/passkeys/register/verify",
    requireAuth,
    async (req, res) => {
      try {
        const challenge =
          await consumeChallenge(
            db,
            req.body?.challengeId,
            "register",
            req.user.id
          );

        const response =
          browserRegistrationResponse(
            req.body?.credential
          );

        const {
          verifyRegistrationResponse
        } = await webAuthnServer();

        const verification =
          await verifyRegistrationResponse({
            response,
            expectedChallenge:
              challenge.challenge,
            expectedOrigin:
              challenge.origin,
            expectedRPID:
              challenge.rp_id,
            requireUserVerification:
              true
          });

        if (
          !verification.verified ||
          !verification.registrationInfo
        ) {
          throw passkeyError(
            401,
            "PASSKEY_REGISTRATION_NOT_VERIFIED",
            "تعذر التحقق من بصمة الجهاز"
          );
        }

        const {
          credential,
          credentialDeviceType,
          credentialBackedUp
        } =
          verification.registrationInfo;

        const credentialId =
          cleanCredentialId(
            credential.id
          );

        const existing =
          await db(
            `
            SELECT user_id
            FROM passkey_credentials
            WHERE credential_id = $1
            LIMIT 1
            `,
            [credentialId]
          );

        if (
          existing.rowCount &&
          Number(
            existing.rows[0].user_id
          ) !==
            Number(req.user.id)
        ) {
          throw passkeyError(
            409,
            "PASSKEY_ALREADY_USED",
            "هذه البصمة مرتبطة بحساب آخر"
          );
        }

        const label =
          String(
            req.body?.label ||
            "هذا الجهاز"
          )
            .trim()
            .slice(0, 120) ||
          "هذا الجهاز";

        await db(
          `
          INSERT INTO passkey_credentials
            (
              user_id,
              credential_id,
              public_key,
              sign_count,
              transports,
              device_type,
              backed_up,
              label,
              created_at
            )
          VALUES
            (
              $1,$2,$3,$4,
              $5::jsonb,$6,$7,$8,NOW()
            )
          ON CONFLICT (credential_id)
          DO UPDATE SET
            public_key =
              EXCLUDED.public_key,
            sign_count =
              EXCLUDED.sign_count,
            transports =
              EXCLUDED.transports,
            device_type =
              EXCLUDED.device_type,
            backed_up =
              EXCLUDED.backed_up,
            label =
              EXCLUDED.label
          `,
          [
            req.user.id,
            credentialId,
            Buffer.from(
              credential.publicKey
            ).toString("base64url"),
            Number(
              credential.counter || 0
            ),
            JSON.stringify(
              safeTransports(
                credential.transports
              )
            ),
            credentialDeviceType ||
              null,
            Boolean(
              credentialBackedUp
            ),
            label
          ]
        );

        return res.json({
          ok: true,
          enabled: true,
          message:
            "تم تفعيل الدخول بالبصمة على هذا الجهاز"
        });
      } catch (error) {
        console.error(
          "[PASSKEY REGISTER VERIFY]",
          error
        );

        return res.status(
          error.status || 400
        ).json({
          ok: false,
          code:
            error.code ||
            "PASSKEY_REGISTER_ERROR",
          message:
            error.message ||
            "تعذر تفعيل البصمة"
        });
      }
    }
  );

  app.post(
    "/api/passkeys/login/options",
    async (req, res) => {
      try {
        const user =
          await findUserByContact(
            db,
            req.body?.contact
          );

        if (!user) {
          return res.status(404).json({
            ok: false,
            code:
              "PASSKEY_NOT_AVAILABLE",
            message:
              "لا توجد بصمة مفعلة لهذا الحساب"
          });
        }

        const credentials =
          await db(
            `
            SELECT
              credential_id,
              transports
            FROM passkey_credentials
            WHERE user_id = $1
            ORDER BY id
            `,
            [user.id]
          );

        if (!credentials.rowCount) {
          return res.status(404).json({
            ok: false,
            code:
              "PASSKEY_NOT_AVAILABLE",
            message:
              "لا توجد بصمة مفعلة لهذا الحساب"
          });
        }

        const context =
          getWebAuthnContext(req);

        const {
          generateAuthenticationOptions
        } = await webAuthnServer();

        const publicKey =
          await generateAuthenticationOptions({
            rpID:
              context.rpId,
            allowCredentials:
              credentials.rows.map(
                row => ({
                  id:
                    row.credential_id,
                  transports:
                    safeTransports(
                      row.transports
                    )
                })
              ),
            userVerification:
              "required"
          });

        const challengeId =
          await storeChallenge(
            db,
            user.id,
            "login",
            context,
            publicKey.challenge
          );

        return res.json({
          ok: true,
          challengeId,
          publicKey
        });
      } catch (error) {
        console.error(
          "[PASSKEY LOGIN OPTIONS]",
          error
        );

        return res.status(
          error.status || 500
        ).json({
          ok: false,
          code:
            error.code ||
            "PASSKEY_OPTIONS_ERROR",
          message:
            error.message ||
            "تعذر بدء الدخول بالبصمة"
        });
      }
    }
  );

  app.post(
    "/api/passkeys/login/verify",
    async (req, res) => {
      try {
        const challenge =
          await consumeChallenge(
            db,
            req.body?.challengeId,
            "login"
          );

        const response =
          browserAuthenticationResponse(
            req.body?.credential
          );

        const credentialId =
          cleanCredentialId(
            response.id
          );

        const stored =
          await db(
            `
            SELECT *
            FROM passkey_credentials
            WHERE user_id = $1
              AND credential_id = $2
            LIMIT 1
            `,
            [
              challenge.user_id,
              credentialId
            ]
          );

        if (!stored.rowCount) {
          throw passkeyError(
            401,
            "PASSKEY_UNKNOWN",
            "بصمة الجهاز غير معروفة لهذا الحساب"
          );
        }

        const row =
          stored.rows[0];

        const {
          verifyAuthenticationResponse
        } = await webAuthnServer();

        const verification =
          await verifyAuthenticationResponse({
            response,
            expectedChallenge:
              challenge.challenge,
            expectedOrigin:
              challenge.origin,
            expectedRPID:
              challenge.rp_id,
            credential: {
              id:
                row.credential_id,
              publicKey:
                new Uint8Array(
                  Buffer.from(
                    row.public_key,
                    "base64url"
                  )
                ),
              counter:
                Number(
                  row.sign_count || 0
                ),
              transports:
                safeTransports(
                  row.transports
                )
            },
            requireUserVerification:
              true
          });

        if (
          !verification.verified
        ) {
          throw passkeyError(
            401,
            "PASSKEY_SIGNATURE_INVALID",
            "تعذر التحقق من بصمة الجهاز"
          );
        }

        const user =
          await findUserById(
            db,
            challenge.user_id
          );

        if (!user) {
          throw passkeyError(
            403,
            "PASSKEY_ACCOUNT_DISABLED",
            "هذا الحساب غير مفعل"
          );
        }

        await db(
          `
          UPDATE passkey_credentials
          SET
            sign_count = $1,
            last_used_at = NOW()
          WHERE id = $2
          `,
          [
            Number(
              verification
                .authenticationInfo
                ?.newCounter || 0
            ),
            row.id
          ]
        );

        const token =
          createToken(user);

        return res.json({
          ok: true,
          token,
          user:
            sanitizeUser(user),
          greeting:
            getGenderGreeting(
              user.gender
            )
        });
      } catch (error) {
        console.error(
          "[PASSKEY LOGIN VERIFY]",
          error
        );

        return res.status(
          error.status || 400
        ).json({
          ok: false,
          code:
            error.code ||
            "PASSKEY_LOGIN_ERROR",
          message:
            error.message ||
            "تعذر تسجيل الدخول بالبصمة"
        });
      }
    }
  );

  app.delete(
    "/api/passkeys/:credentialId",
    requireAuth,
    async (req, res) => {
      try {
        const credentialId =
          cleanCredentialId(
            req.params.credentialId
          );

        const result =
          await db(
            `
            DELETE FROM passkey_credentials
            WHERE user_id = $1
              AND credential_id = $2
            RETURNING id
            `,
            [
              req.user.id,
              credentialId
            ]
          );

        if (!result.rowCount) {
          return res.status(404).json({
            ok: false,
            message:
              "البصمة غير موجودة"
          });
        }

        return res.json({
          ok: true,
          message:
            "تم حذف البصمة من الحساب"
        });
      } catch (error) {
        console.error(
          "[PASSKEY DELETE]",
          error
        );

        return res.status(
          error.status || 500
        ).json({
          ok: false,
          message:
            error.message ||
            "تعذر حذف البصمة"
        });
      }
    }
  );
}

module.exports = {
  initPasskeys,
  registerPasskeyRoutes,
  getWebAuthnContext,
  cleanCredentialId,
  safeTransports,
  browserRegistrationResponse,
  browserAuthenticationResponse
};
