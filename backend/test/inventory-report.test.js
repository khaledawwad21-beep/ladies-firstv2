'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {PGlite} = require('@electric-sql/pglite');
const database = new PGlite();
process.env.JWT_SECRET = 'isolated-inventory-report-tests';
require.cache[require.resolve('../src/db')] = {exports: {
  db: (sql, values) => database.query(sql, values),
  transaction: () => {throw Error('Report must be read-only');},
  getDatabaseStatus: async () => ({}), closeDatabase: async () => {}
}};
const {app} = require('../src/server');
const {createToken} = require('../src/auth');
let server, base;
before(async () => {
  await database.exec(`SET TIME ZONE 'UTC';
    CREATE TABLE users (id BIGINT PRIMARY KEY, role TEXT, is_active BOOLEAN, permissions JSONB, session_version INTEGER);
    INSERT INTO users VALUES(1,'owner',TRUE,'[]',0),(2,'customer',TRUE,'[]',0);
    CREATE TABLE products (id BIGINT PRIMARY KEY, name TEXT);
    CREATE TABLE product_variants (id BIGINT PRIMARY KEY, color TEXT, size TEXT, sku TEXT);
    CREATE TABLE inventory_movements (id BIGINT PRIMARY KEY, product_id BIGINT, variant_id BIGINT, quantity_change INT, reason TEXT, order_id BIGINT, created_at TIMESTAMPTZ);
    INSERT INTO products VALUES (1, 'Dress');
    INSERT INTO product_variants VALUES (2, 'Pink', 'M', 'D-P-M');
    INSERT INTO inventory_movements VALUES
      (1,1,2,-2,'sale: Dress',10,'2026-10-05 23:59:59+00'),
      (2,1,2,2,'order_cancel_return',10,'2026-10-06 00:00:00+00'),
      (3,NULL,NULL,1,'customer_return',11,'2026-10-06 23:59:59+00'),
      (4,1,2,-1,'sale: Dress',12,'2026-10-07 00:00:00+00');`);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {if(server) await new Promise(resolve => server.close(resolve)); await database.close();});
async function request(query = '', role = 'owner') {
  return fetch(base + '/api/admin/inventory/movements' + query, {headers: role ? {Authorization:'Bearer '+createToken({id:role==='customer'?2:1,role})} : {}});
}
test('movement report requires authentication and admin role', async () => {
  assert.equal((await request('', null)).status, 401);
  assert.equal((await request('', 'customer')).status, 403);
});
test('no range returns no movements; invalid calendar dates and reversed range return 400', async () => {
  assert.deepEqual((await (await request()).json()).movements, []);
  assert.equal((await (await request('?from=2026-10-06')).json()).requiresDateRange, true);
  for(const query of ['?from=2026-02-30&to=2026-03-01','?from=bad&to=2026-10-06','?from=2026-10-07&to=2026-10-06']) {
    assert.equal((await request(query)).status, 400);
  }
});
test('PostgreSQL date filter includes the full final day, excludes surrounding days and retains deleted-product movements', async () => {
  const response = await request('?from=2026-10-06&to=2026-10-06');
  assert.equal(response.status, 200);
  const {movements} = await response.json();
  assert.deepEqual(movements.map(x=>Number(x.id)), [3,2]);
  assert.equal(movements[0].product_name, null);
  assert.equal(movements[1].color, 'Pink');
  assert.equal(movements[1].variant_sku, 'D-P-M');
  assert.equal(movements[1].quantity_change, 2);
  assert.equal((await (await request('?start=2026-10-06&end=2026-10-06')).json()).movements.length, 2);
});
test('admin report waits for both dates, handles errors, escapes content and ignores stale responses', async () => {
  const nodes = {'#sections':{},'#movementRows':{},'#mf':{value:''},'#mtDate':{value:''}};
  const pending = [];
  const context = vm.createContext({document:{querySelector:s=>nodes[s]||null,querySelectorAll:()=>[],addEventListener:()=>{}}, localStorage:{getItem:()=>null},URLSearchParams,Date,console});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../../frontend/admin.js'),'utf8'),context);
  context.api = url => new Promise((resolve,reject)=>pending.push({url,resolve,reject}));
  context.inventoryMovements();
  assert.match(nodes['#sections'].innerHTML,/onchange="movementRun\(\)"/);
  await context.movementRun();assert.equal(pending.length,0);
  nodes['#mf'].value='2026-10-06';nodes['#mtDate'].value='2026-10-06';
  const first=context.movementRun();const second=context.movementRun();
  pending[1].resolve({movements:[{product_name:'<img onerror=bad>',quantity_change:2,reason:'order_cancel_return',created_at:'2026-10-06',order_id:10}]});
  await second;assert.match(nodes['#movementRows'].innerHTML,/&lt;img onerror=bad&gt;/);
  assert.match(nodes['#movementRows'].innerHTML,/إرجاع مخزون طلب ملغى/);
  const latest=nodes['#movementRows'].innerHTML;pending[0].resolve({movements:[]});await first;
  assert.equal(nodes['#movementRows'].innerHTML,latest);
  const third=context.movementRun();pending[2].reject(Error('تعذر الاتصال'));await third;
  assert.equal(nodes['#movementRows'].textContent,'تعذر الاتصال');
  nodes['#mf'].value='2026-10-07';await context.movementRun();assert.equal(pending.length,3);
});
