"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");
const policy = fs.readFileSync(path.join(__dirname, "..", "src", "request-policy.js"), "utf8");
const migrations = fs.readFileSync(path.join(__dirname, "..", "src", "database-migrations.js"), "utf8");

test("customer and owner passwords require the agreed 12 characters", () => {
  assert.doesNotMatch(server, /String\(password\)\.length\s*<\s*[68]\b/);
  assert.match(policy, /MIN_PASSWORD_LENGTH\s*=\s*12/);
  assert.match(policy, /\/api\/auth\/register/);
  assert.match(policy, /\/api\/auth\/bootstrap-owner/);
});

test("production migration makes loyalty reversal a non-null boolean", () => {
  assert.match(migrations, /TYPE BOOLEAN/i);
  assert.match(migrations, /SET DEFAULT FALSE/i);
  assert.match(migrations, /SET NOT NULL/i);
  assert.match(migrations, /data_type\s*!==\s*"boolean"/i);
});

test("cancellation and returns use the canonical inventory movement schema", () => {
  assert.doesNotMatch(server, /inventory_movements\s*\([^)]*movement_type/is);
  assert.match(server, /quantity_change/i);
  assert.match(server, /reason/i);
});

test("loyalty transaction schema supports audit notes", () => {
  assert.match(server + migrations, /ADD COLUMN IF NOT EXISTS note TEXT/);
});
