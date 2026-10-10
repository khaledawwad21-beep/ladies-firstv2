"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { resolveFrontendPath } = require("../src/safe-frontend-path");

test("frontend path resolver accepts files inside the frontend root", () => {
  const root = path.resolve("/app/frontend");
  assert.equal(
    resolveFrontendPath(root, "/assets/app.css"),
    path.join(root, "assets", "app.css")
  );
});

test("frontend path resolver rejects traversal and the root directory", () => {
  const root = path.resolve("/app/frontend");
  for (const requestPath of [
    "/../../app/backend/package.json",
    "/../../../app/backend/src/auth.js",
    "/../../../../proc/self/environ",
    "/../frontend-private/secret.txt",
    "/"
  ]) {
    assert.equal(resolveFrontendPath(root, requestPath), null, requestPath);
  }
});

test("frontend path resolver rejects non-path inputs", () => {
  assert.equal(resolveFrontendPath("/app/frontend", "assets/app.css"), null);
  assert.equal(resolveFrontendPath("/app/frontend", null), null);
});
