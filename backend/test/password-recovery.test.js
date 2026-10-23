"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const recovery = require("../src/password-recovery");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");
const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
const workflow = fs.readFileSync(path.join(__dirname, "../../.github/workflows/production-regression.yml"), "utf8");

test("password recovery normalizes contact and validates 6-digit codes", () => {
  assert.equal(recovery.channelForContact("x@example.com"), "email");
  assert.equal(recovery.channelForContact("+970599000000"), "whatsapp");
  assert.equal(recovery.normalizeRecoveryContact(" USER@EXAMPLE.COM "), "user@example.com");
  assert.equal(recovery.safeCode("123456"), "123456");
  assert.throws(() => recovery.safeCode("12345"), /6 أرقام/);
});

test("recovery matches Palestinian phone numbers in local and international formats", () => {
  assert.ok(recovery.recoveryPhoneCandidates("+970599123456").includes("0599123456"));
  assert.ok(recovery.recoveryPhoneCandidates("0599123456").includes("+970599123456"));
  assert.deepEqual(recovery.recoveryPhoneCandidates("user@example.com"), []);
});

test("recovery codes are one-way hashed with the configured secret", () => {
  const previous = process.env.PASSWORD_RECOVERY_SECRET;
  process.env.PASSWORD_RECOVERY_SECRET = "test-recovery-secret";
  try {
    const first = recovery.hashRecoveryCode("request-1", "123456");
    const second = recovery.hashRecoveryCode("request-1", "123456");
    const changed = recovery.hashRecoveryCode("request-1", "654321");
    assert.equal(first, second);
    assert.notEqual(first, changed);
    assert.match(first, /^[a-f0-9]{64}$/);
  } finally {
    if (previous === undefined) delete process.env.PASSWORD_RECOVERY_SECRET;
    else process.env.PASSWORD_RECOVERY_SECRET = previous;
  }
});

test("server initializes and exposes password recovery endpoints", () => {
  assert.match(server, /initPasswordRecovery\(db\)/);
  assert.match(server, /registerPasswordRecoveryRoutes\(app/);
  assert.match(server, /transaction/);
});

test("customer account exposes request and confirm recovery flow", () => {
  assert.match(app, /showCustomerRecovery\(/);
  assert.match(app, /requestCustomerRecovery\(/);
  assert.match(app, /confirmCustomerRecovery\(/);
  assert.match(app, /\/api\/auth\/password-recovery\/request/);
  assert.match(app, /\/api\/auth\/password-recovery\/confirm/);
  assert.match(app, /maxlength="6"/);
});

test("admin recovery UI uses the same production recovery endpoints", () => {
  assert.match(admin, /\/api\/auth\/password-recovery\/request/);
  assert.match(admin, /\/api\/auth\/password-recovery\/confirm/);
  assert.match(admin, /minlength="12"/);
});


test("CI executes the isolated password recovery PostgreSQL E2E", () => {
  assert.match(workflow, /Run isolated password recovery E2E/);
  assert.match(workflow, /password-recovery-e2e\.integration\.test\.js/);
});
