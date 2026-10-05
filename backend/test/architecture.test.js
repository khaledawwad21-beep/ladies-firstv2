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

test("core server keeps store routes in the real runtime and has no missing store-routes dependency", () => {
  const server = read("server.js");
  assert.doesNotMatch(server, /require\(["']\.\/store-routes["']\)/, "server.js must not require a non-existent store-routes module");
  assert.match(server, /\/api\/admin\/users/, "admin user routes must remain registered in server.js");
  assert.match(server, /\/api\/admin\/coupons/, "coupon routes must remain registered in server.js");
  assert.match(server, /\/api\/admin\/inventory\/movements/, "inventory routes must remain registered in server.js");
});

test("every local runtime require resolves to an existing source file", () => {
  for (const filename of fs.readdirSync(src).filter((name) => name.endsWith(".js"))) {
    const source = read(filename);
    const requires = [...source.matchAll(/require\(["'](\.\/[^"']+)["']\)/g)].map((match) => match[1]);
    for (const dependency of requires) {
      const target = path.resolve(src, dependency);
      const candidates = [target, `${target}.js`, path.join(target, "index.js")];
      assert.ok(candidates.some((candidate) => fs.existsSync(candidate)), `${filename} requires missing local module ${dependency}`);
    }
  }
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
