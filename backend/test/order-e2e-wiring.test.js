"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const db=fs.readFileSync(path.join(__dirname,"../src/db.js"),"utf8");
const workflow=fs.readFileSync(path.join(__dirname,"../../.github/workflows/production-regression.yml"),"utf8");

test("database layer supports explicitly disabling SSL for isolated CI",()=>{
  assert.match(db,/databaseConnectionOptions\(process.env\)/);
  const { databaseConnectionOptions } = require('../src/database-security');
  assert.equal(databaseConnectionOptions({ NODE_ENV: 'test', DATABASE_URL: 'postgres://test:test@localhost/test', DB_SSL: 'false' }).ssl, false);
});

test("production regression runs isolated PostgreSQL order lifecycle E2E",()=>{
  assert.match(workflow,/services:\s*\n\s*postgres:/);
  assert.match(workflow,/postgres:16/);
  assert.match(workflow,/RUN_DB_E2E:/);
  assert.match(workflow,/order-e2e\.integration\.test\.js/);
  assert.match(workflow,/DB_SSL:/);
});

test("checkout locks only the products table when category and brand joins are nullable",()=>{
  const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
  assert.match(server,/WHERE p\.id = \$1\s+FOR UPDATE OF p/);
});

test("orders use a boolean loyalty reversal flag consistently",()=>{
  const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
  assert.match(server,/loyalty_points_reversed BOOLEAN\s+NOT NULL DEFAULT FALSE/);
  assert.match(server,/\$21,\s+FALSE,\s+'pending'/);
});

test("daily sales report aggregates costs by date without correlated ungrouped columns",()=>{
  const server=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
  assert.match(server,/WITH order_days AS/);
  assert.match(server,/cost_days AS/);
  assert.match(server,/LEFT JOIN cost_days cd ON cd\.date = od\.date/);
  assert.doesNotMatch(server,/DATE\(po\.created_at\) = DATE\(orders\.created_at\)/);
});
