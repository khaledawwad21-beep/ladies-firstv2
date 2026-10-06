"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  ADMIN_PERMISSIONS,
  normalizePermissions,
  permissionForAdminRequest
} = require("../src/admin-permissions");

test("admin permissions normalize to the supported unique set", () => {
  assert.deepEqual(
    normalizePermissions(["products", "orders", "products", "unknown", " reports "]),
    ["products", "orders", "reports"]
  );
  assert.ok(ADMIN_PERMISSIONS.includes("coupons"));
  assert.ok(ADMIN_PERMISSIONS.includes("offers"));
});

test("admin request paths map to granular permissions", () => {
  const req = path => ({ originalUrl: path });
  assert.equal(permissionForAdminRequest(req("/api/admin/products/12")), "products");
  assert.equal(permissionForAdminRequest(req("/api/admin/products/12/offers")), "offers");
  assert.equal(permissionForAdminRequest(req("/api/admin/orders/55")), "orders");
  assert.equal(permissionForAdminRequest(req("/api/admin/waitlist")), "orders");
  assert.equal(permissionForAdminRequest(req("/api/admin/reports/sales")), "reports");
  assert.equal(permissionForAdminRequest(req("/api/admin/whatsapp-campaigns/preview")), "offers");
  assert.equal(permissionForAdminRequest(req("/api/admin/staff")), "staff");
});

test("server initializes and enforces staff permissions before admin routes", () => {
  const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
  assert.match(server, /initAdminPermissions\(db\)/);
  assert.match(server, /createAdminPermissionGuard\(db, requireAuth\)/);
  assert.match(server, /permissions = \$2::jsonb/);
  assert.match(server, /permissions,/);
});

test("admin UI hides unauthorized sections and supports permission editing", () => {
  const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
  assert.match(admin, /sectionPermissions=/);
  assert.match(admin, /applyAdminPermissions\(\)/);
  assert.match(admin, /selectedStaffPermissions\(\)/);
  assert.match(admin, /saveStaffEdit\(/);
  assert.match(admin, /بدون صلاحيات/);
});
