'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PgParameters = require('pg/lib/connection-parameters');
const { databaseConnectionOptions: options } = require('../src/database-security');
const base = { NODE_ENV: 'production', DATABASE_URL: 'postgres://test:test@db.example.test/shop' };
test('external database verifies certificates and requires TLS 1.2', () => {
  const config = new PgParameters(options(base));
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.minVersion, 'TLSv1.2');
});
test('URL SSL parameters cannot override verification in pg', () => {
  for (const query of ['sslmode=disable', 'sslmode=no-verify', 'ssl=false', 'sslmode=require&uselibpqcompat=true']) {
    const config = new PgParameters(options({ ...base, DATABASE_URL: base.DATABASE_URL + '?' + query }));
    assert.equal(config.ssl.rejectUnauthorized, true);
  }
});
test('self-signed exception is limited to Render internal Postgres', () => {
  const internal = { ...base, RENDER: 'true', DATABASE_URL: 'postgres://test:test@dpg-example-a/shop' };
  assert.equal(options(internal).ssl.rejectUnauthorized, false);
  assert.equal(options({ ...internal, RENDER: '' }).ssl.rejectUnauthorized, true);
  assert.equal(options({ ...base, RENDER: 'true' }).ssl.rejectUnauthorized, true);
  assert.equal(options({ ...internal, DB_SSL_CA: 'test-ca' }).ssl.rejectUnauthorized, true);
});
test('production cannot disable TLS but local tests can', () => {
  assert.throws(() => options({ ...base, DB_SSL: 'false' }), /not permitted/);
  assert.equal(options({ ...base, NODE_ENV: 'test', DB_SSL: 'false' }).ssl, false);
});
test('malformed database URL errors do not reveal credentials', () => {
  assert.throws(() => options({ DATABASE_URL: 'secret-credential' }), { message: 'DATABASE_URL is invalid' });
});
