"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("password recovery e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { closeDatabase, db } = require("../src/db");
  const { hashRecoveryCode } = require("../src/password-recovery");

  let server;
  let baseUrl;

  async function api(path, options = {}) {
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(body.message || ("HTTP_" + response.status));
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  test.before(async () => {
    await initDatabase();
    await migrateDatabase();
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    baseUrl = "http://127.0.0.1:" + server.address().port;
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  });

  test("recovery confirmation changes password once and keeps account accessible", async () => {
    const oldPassword = "old-" + "a".repeat(12);
    const newPassword = "new-" + "b".repeat(12);
    const laterPassword = "later-" + "c".repeat(12);

    const registered = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "CI Recovery Customer",
        email: "recovery-e2e@example.test",
        password: oldPassword,
        gender: "female",
        age: 27
      })
    });
    const userId = Number(registered.user.id);
    assert.ok(userId > 0);

    const requestId = "ci-recovery-request-1";
    const code = "123456";

    await db(
      `INSERT INTO password_recovery_requests
        (id,user_id,contact,channel,code_hash,delivery_status,expires_at,created_at)
       VALUES
        ($1,$2,$3,'email',$4,'sent',NOW() + INTERVAL '15 minutes',NOW())`,
      [
        requestId,
        userId,
        "recovery-e2e@example.test",
        hashRecoveryCode(requestId, code)
      ]
    );

    const confirmed = await api("/api/auth/password-recovery/confirm", {
      method: "POST",
      body: JSON.stringify({
        contact: "recovery-e2e@example.test",
        code,
        newPassword
      })
    });
    assert.equal(confirmed.ok, true);

    let oldLoginError = null;
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          contact: "recovery-e2e@example.test",
          password: oldPassword
        })
      });
    } catch (error) {
      oldLoginError = error;
    }
    assert.equal(oldLoginError?.status, 401);

    const newLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "recovery-e2e@example.test",
        password: newPassword
      })
    });
    assert.ok(newLogin.token);
    assert.equal(Number(newLogin.user.id), userId);

    let reusedError = null;
    try {
      await api("/api/auth/password-recovery/confirm", {
        method: "POST",
        body: JSON.stringify({
          contact: "recovery-e2e@example.test",
          code,
          newPassword: laterPassword
        })
      });
    } catch (error) {
      reusedError = error;
    }
    assert.equal(reusedError?.status, 400);
    assert.equal(reusedError?.body?.code, "RECOVERY_CODE_EXPIRED");

    const me = await api("/api/auth/me", {
      headers: { Authorization: "Bearer " + newLogin.token }
    });
    assert.equal(Number(me.user.id), userId);
  });
}
