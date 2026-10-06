"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");

test("finance dashboard uses the real sales and profit report", () => {
  assert.match(admin, /async function financeRun\(/);
  assert.match(admin, /\/api\/admin\/reports\/sales\?from=/);
  assert.match(admin, /تكلفة البضاعة/);
  assert.match(admin, /صافي الربح/);
  assert.match(admin, /الطلبات الملغاة لا تدخل في المبيعات أو الربح/);
});

test("order search toolbar has no stray markup after the search button", () => {
  assert.doesNotMatch(admin, /بحث<\/button>>/);
  assert.match(admin, /بحث<\/button><\/div>/);
});
