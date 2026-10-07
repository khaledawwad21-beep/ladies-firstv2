"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { normalizeFavoriteIds } = require("../src/account-state");
const { normalizeCartItems } = require("../src/cart-tracking");

const server = fs.readFileSync(path.join(__dirname, "../src/server.js"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("favorite IDs are unique valid product IDs only", () => {
  assert.deepEqual(
    normalizeFavoriteIds([3, "3", 2, -1, 0, "x", 2]),
    [3, 2]
  );
});

test("cart snapshots preserve variant and gift packaging", () => {
  assert.deepEqual(
    normalizeCartItems([
      { productId: 7, qty: 2, variant: "Rose", packagingId: "paper-ribbon" },
      { productId: 7, qty: 1, variant: "Rose", packagingId: "clear-ribbon" }
    ]),
    [
      { productId: 7, qty: 2, variant: "Rose", packagingId: "paper-ribbon" },
      { productId: 7, qty: 1, variant: "Rose", packagingId: "clear-ribbon" }
    ]
  );
});

test("server initializes and protects persistent account favorites", () => {
  assert.match(server, /initAccountState\(db\)/);
  assert.match(server, /registerAccountStateRoutes\(app/);
  assert.match(server, /transaction/);
});

test("storefront syncs favorites and cart after login and startup", () => {
  assert.match(app, /async function lfSyncFavorites\(/);
  assert.match(app, /async function lfRestoreCartSnapshot\(/);
  assert.match(app, /async function lfSyncAccountState\(/);
  assert.match(app, /\/api\/account\/favorites/);
  assert.match(app, /\/api\/cart\/snapshot/);
  assert.match(app, /await lfSyncAccountState\(\)/);
});

test("cart persistence sends packaging selection to the server", () => {
  assert.match(app, /packagingId:i\.packagingId\|\|''/);
  assert.match(app, /mergeCartSnapshot\(/);
});


test("WhatsApp opt-in belongs to the customer profile route and is returned by auth/me", () => {
  const categoryStart = server.indexOf('app.patch(\n  "/api/admin/categories/:id"');
  const brandStart = server.indexOf('app.post(\n  "/api/admin/brands"', categoryStart);
  const categoryPatch = server.slice(categoryStart, brandStart);
  assert.doesNotMatch(categoryPatch, /whatsapp_opt_in/);

  const userStart = server.indexOf('app.patch(\n  "/api/users/me"');
  const loyaltyStart = server.indexOf('app.get(\n  "/api/loyalty"', userStart);
  const userPatch = server.slice(userStart, loyaltyStart);
  assert.match(userPatch, /whatsapp_opt_in/);
  assert.match(userPatch, /whatsapp_opt_in_updated_at/);

  const meStart = server.indexOf('app.get(\n  "/api/auth/me"');
  const ownerStart = server.indexOf('app.post(\n  "/api/auth/bootstrap-owner"', meStart);
  const meRoute = server.slice(meStart, ownerStart);
  assert.match(meRoute, /whatsapp_opt_in/);
  assert.match(meRoute, /whatsapp_opt_in_updated_at/);
});
