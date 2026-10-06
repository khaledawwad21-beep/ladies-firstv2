"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const db=fs.readFileSync(path.join(__dirname,"../src/db.js"),"utf8");
const workflow=fs.readFileSync(path.join(__dirname,"../../.github/workflows/production-regression.yml"),"utf8");

test("database layer supports explicitly disabling SSL for isolated CI",()=>{
  assert.match(db,/DB_SSL/);
  assert.match(db,/dbSslDisabled/);
  assert.match(db,/ssl:\s*DATABASE_URL && !dbSslDisabled/);
});

test("production regression runs isolated PostgreSQL order lifecycle E2E",()=>{
  assert.match(workflow,/services:\s*\n\s*postgres:/);
  assert.match(workflow,/postgres:16/);
  assert.match(workflow,/RUN_DB_E2E:/);
  assert.match(workflow,/order-e2e\.integration\.test\.js/);
  assert.match(workflow,/DB_SSL:/);
});
