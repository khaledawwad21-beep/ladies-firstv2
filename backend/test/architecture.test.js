"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..", "..");
const src = path.join(root, "backend", "src");

function read(name) {
  return fs.readFileSync(path.join(src, name), "utf8");
}

test("production entrypoint owns process startup", () => {
  const start = read("start.js");
  const server = read("server.js");
  assert.match(start, /\.listen\s*\(/, "start.js must start the HTTP server");
  assert.doesNotMatch(server, /\.listen\s*\(/, "server.js must not start a second HTTP server");
});

test("JWT has no hard-coded fallback secret", () => {
  const auth = read("auth.js");
  assert.match(auth, /JWT_SECRET/);
  assert.doesNotMatch(auth, /JWT_SECRET\s*\|\|\s*["'][^"']+["']/);
});

test("Tripo uses V2 direct upload endpoint", () => {
  const tripo = read("tripo.js");
  assert.match(tripo, /\/v2\/openapi\/upload/);
  assert.doesNotMatch(tripo, /\/v2\/openapi\/upload\/sts["'`]/);
});

test("obsolete patch runner is not part of runtime", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "backend", "package.json"), "utf8"));
  const scripts = Object.values(packageJson.scripts || {}).join(" ");
  assert.doesNotMatch(scripts, /server-fix|apply-backend-fix/);
});
