"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");
const { migrateOwnerGender } = require("../src/owner-profile-migration");

test("owner gender correction targets the approved owner and runs once", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE users (id BIGINT PRIMARY KEY, email TEXT, role TEXT,
        is_owner BOOLEAN DEFAULT FALSE, gender TEXT, updated_at TIMESTAMPTZ);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB);
      INSERT INTO users VALUES
        (1, 'khaledawwad21@gmail.com', 'owner', TRUE, NULL, NULL),
        (2, 'customer@example.com', 'customer', FALSE, 'female', NULL),
        (3, 'other@example.com', 'owner', TRUE, 'female', NULL);
    `);
    await migrateOwnerGender(db);
    assert.deepEqual((await db.query('SELECT gender FROM users ORDER BY id')).rows,
      [{ gender: 'male' }, { gender: 'female' }, { gender: 'female' }]);
    assert.equal((await db.query('SELECT * FROM settings')).rows.length, 1);
    await db.exec("UPDATE users SET gender = 'female' WHERE id = 1");
    await migrateOwnerGender(db);
    assert.equal((await db.query('SELECT gender FROM users WHERE id = 1')).rows[0].gender, 'female');
  } finally { await db.close(); }
});

test("a matching customer is never treated as the owner", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE users (id BIGINT PRIMARY KEY, email TEXT, role TEXT,
        is_owner BOOLEAN DEFAULT FALSE, gender TEXT, updated_at TIMESTAMPTZ);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value JSONB);
      INSERT INTO users VALUES (1, 'khaledawwad21@gmail.com', 'customer', FALSE, 'female', NULL);
    `);
    await migrateOwnerGender(db);
    assert.equal((await db.query('SELECT gender FROM users')).rows[0].gender, 'female');
    assert.equal((await db.query('SELECT * FROM settings')).rows.length, 0);
  } finally { await db.close(); }
});
