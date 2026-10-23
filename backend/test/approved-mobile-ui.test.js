"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const frontend = path.resolve(__dirname, "../../frontend");
const html = fs.readFileSync(path.join(frontend, "index.html"), "utf8");
const script = fs.readFileSync(path.join(frontend, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(frontend, "approved-mobile-ui.css"), "utf8");

test("approved customer UI is loaded on the storefront", () => {
  assert.match(html, /approved-mobile-ui\.css\?v=/);
  assert.match(html, /<details class="accountTrackBox">/);
  assert.match(html, /<summary>🔎 تتبّع طلب بدون تسجيل دخول<\/summary>/);
  assert.match(html, /id="customerOrderTrackingResult"/);
  assert.match(html, /id="accountModalTitle"/);
  assert.match(html, /id="bottomWhatsLink"/);
});

test("guest auth and favorites remain functional without crowding the dialog", () => {
  assert.match(script, /<details class="lf-login-favorites">/);
  assert.match(script, /id="accountCountryCode"/);
  assert.match(script, /id="accountSubmit"/);
  assert.match(script, /setAccountActionMode\(accountActionMode\)/);
  assert.match(script, /setAccountMode\(accountMode\)/);
  assert.match(script, /renderSideAccountGreeting\(\)/);
  execFileSync(process.execPath, ["--check", path.join(frontend, "app.js")]);
});

test("mobile layout preserves bottom navigation and email/phone switching", () => {
  assert.match(styles, /#sideMenuOverlay #sideCats/);
  assert.match(styles, /#accountModal #accountContent #accountCountryTools\[style\*="display: none"\]\{display:none!important;/);
  assert.match(styles, /#accountModal #accountSubmit/);
  assert.match(styles, /#accountModal #accountRecoveryButton/);
  assert.match(styles, /@media\(max-width:760px\)/);
});
