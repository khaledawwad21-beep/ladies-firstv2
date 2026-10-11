"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { encryptBackup, decryptBackup } = require("../scripts/backup-crypto");
const { checkLive } = require("../scripts/live-smoke");
const { onlinePaymentUnavailable } = require("../src/payment-availability");
const password = "test-only-backup-passphrase-123456789";
const sha = "a".repeat(40);

test("production blocks unintegrated Visa while cash remains available", () => {
  assert.equal(onlinePaymentUnavailable("visa", { NODE_ENV: "production" }), true);
  assert.equal(onlinePaymentUnavailable("cash", { NODE_ENV: "production" }), false);
  assert.equal(onlinePaymentUnavailable("visa", { NODE_ENV: "test" }), false);
});

test("encrypted backups round-trip binary data and randomize each archive", () => {
  const data = Buffer.from([0, 255, 1, 2, 3]);
  const first = encryptBackup(data, password);
  assert.deepEqual(decryptBackup(first, password), data);
  assert.notDeepEqual(first, encryptBackup(data, password));
});

test("backup authentication rejects wrong keys, tampering and truncation", () => {
  const original = encryptBackup(Buffer.from("private customer data"), password);
  assert.throws(() => decryptBackup(original, password + "wrong"));
  for (const index of [9, 25, 37, 53]) {
    const changed = Buffer.from(original); changed[index] ^= 1;
    assert.throws(() => decryptBackup(changed, password));
  }
  assert.throws(() => decryptBackup(original.subarray(0, 30), password));
  assert.throws(() => encryptBackup(Buffer.from("x"), "short"));
});

function mockFetch(override = {}) {
  return async url => {
    const endpoint = new URL(url).pathname;
    const body = endpoint === "/api/health" ? { ok: true, database: true, databaseConfigured: true, gitCommit: sha, gitBranch: "main", ...override.health } : { ok: true };
    return { ok: override.failed !== endpoint, status: override.failed === endpoint ? 500 : 200,
      json: async () => endpoint === override.badApi ? { ok: false } : body,
      text: async () => "Ladies First" };
  };
}

test("live release requires correct commit, database and successful HTTP responses", async () => {
  const options = { baseUrl: "https://example.test", expectedSha: sha };
  assert.equal(await checkLive({ ...options, fetchFn: mockFetch() }), sha);
  for (const override of [{ health: { gitCommit: "b".repeat(40) } }, { health: { database: false } },
    { failed: "/" }, { failed: "/api/products" }, { badApi: "/api/settings" }]) {
    await assert.rejects(checkLive({ ...options, fetchFn: mockFetch(override) }));
  }
});
