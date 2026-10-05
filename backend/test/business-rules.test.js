"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const server = fs.readFileSync(path.join(__dirname, "..", "src", "server.js"), "utf8");

test("customer and owner passwords require the agreed 12 characters", () => {
  assert.doesNotMatch(server, /String\(password\)\.length\s*<\s*[68]\b/);
  const checks = server.match(/String\(password\)\.length\s*<\s*12\b/g) || [];
  assert.ok(checks.length >= 2, "register and owner bootstrap must both enforce 12 characters");
});

test("loyalty reversal column is boolean because code treats it as a flag", () => {
  assert.match(server, /loyalty_points_reversed\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+FALSE/i);
});

test("cancellation and returns use the canonical inventory movement schema", () => {
  assert.doesNotMatch(server, /inventory_movements\s*\([^)]*movement_type/is);
  assert.match(server, /quantity_change/i);
  assert.match(server, /reason/i);
});

test("loyalty transaction schema supports audit notes", () => {
  assert.match(server, /ALTER TABLE loyalty_points_transactions ADD COLUMN IF NOT EXISTS note TEXT/);
});
