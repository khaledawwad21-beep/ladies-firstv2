'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.JWT_SECRET = 'local-regression-test-secret-not-used-in-production';
const auth = require('../src/auth');

const queries = [];
const settings = new Map();
const users = new Map([
  ['1', { id: '1', role: 'owner', name: 'Owner', email: 'owner@example.test', is_active: true }],
  ['2', { id: '2', role: 'customer', name: 'Customer', phone: '+970500000000', gender: 'female', age: 20, is_active: true }]
]);

require.cache[require.resolve('../src/db')] = {
  exports: {
    async db(sql, values = []) {
      queries.push({ sql, values });

      if (/FROM settings/.test(sql)) {
        return { rows: [...settings].map(([key, value]) => ({ key, value })) };
      }

      if (/UPDATE users/.test(sql)) {
        const row = users.get(String(values.at(-1)));
        if (!row) return { rows: [], rowCount: 0 };

        for (const match of sql.matchAll(/(\w+)\s*=\s*\$(\d+)/g)) {
          if (match[1] !== 'id') row[match[1]] = values[Number(match[2]) - 1];
        }

        return { rows: [{ ...row }], rowCount: 1 };
      }

      if (/FROM users/.test(sql)) {
        const rows = /WHERE\s+id\s*=/.test(sql)
          ? [users.get(String(values[0]))].filter(Boolean)
          : [...users.values()];
        return { rows: rows.map((x) => ({ ...x })), rowCount: rows.length };
      }

      throw new Error('Unexpected query in regression test: ' + sql.replace(/\s+/g, ' ').trim());
    },

    async transaction(callback) {
      return callback({
        async query(sql, values) {
          assert.match(sql, /INSERT INTO settings/);
          settings.set(values[0], JSON.parse(values[1]));
        }
      });
    },

    getDatabaseStatus: async () => ({ configured: false }),
    closeDatabase: async () => {}
  }
};

const { app } = require('../src/server');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function token(role = 'owner') {
  const id = role==='owner'?'1':role==='customer'?'2':role==='admin'?'3':'4';
  if(!users.has(id))users.set(id,{id,role,is_active:true,permissions:['users']});
  return auth.createToken(users.get(id));
}

async function call(route, bearer, body, method = 'PATCH') {
  const response = await fetch(base + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: 'Bearer ' + bearer } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  return { status: response.status, data: await response.json() };
}

test('admin user writes require a valid admin bearer', async () => {
  for (const [bearer, expected] of [
    [null, 401],
    ['invalid', 401],
    [token('customer'), 403]
  ]) {
    const count = queries.length;
    const result = await call('/api/admin/users/2', bearer, { name: 'Blocked' });
    assert.equal(result.status, expected);
    assert.equal(queries.length, count + (expected===403?1:0));
  }

  for (const role of ['owner', 'admin', 'staff']) {
    const result = await call('/api/admin/users/2', token(role), {
      name: 'Updated',
      phone: '+970 511-111-111',
      gender: 'male',
      age: 34
    });
    assert.equal(result.status, 200);
    assert.equal(result.data.user.gender, 'male');
    assert.equal(result.data.user.contact, '+970511111111');
  }
});

test('admin user update validates values and persists normalized contact', async () => {
  let result = await call('/api/admin/users/2', token(), {
    name: 'Khaled',
    email: 'UPDATED@example.test',
    gender: 'male',
    age: 34
  });
  assert.equal(result.status, 200);
  assert.equal(users.get('2').email, 'updated@example.test');

  result = await call('/api/admin/users/2', token(), { age: 999 });
  assert.equal(result.status, 400);
  assert.match(result.data.message, /العمر غير صالح/);

  result = await call('/api/admin/users/999', token(), { name: 'Missing' });
  assert.equal(result.status, 404);
  assert.match(result.data.message, /المستخدم غير موجود/);
});

test('admin password reset route hashes the new 12+ character password', async () => {
  const result = await call(
    '/api/admin/users/2/password',
    token(),
    { newPassword: 'New-test-password-123' }
  );
  assert.equal(result.status, 200);
  assert.equal(
    await auth.verifyPassword('New-test-password-123', users.get('2').password_hash),
    true
  );
});

test('user list exposes compatibility fields without password hashes', async () => {
  const result = await call('/api/admin/users', token(), null, 'GET');
  assert.equal(result.status, 200);
  const customer = result.data.users.find((user) => user.id === '2');
  assert.equal(customer.is_owner, 0);
  assert.equal(customer.password_hash, undefined);
  assert.equal(auth.sanitizeUser({ ...users.get('1'), password_hash: 'secret' }).is_owner, 1);
});

test('owner guard authenticates before authorizing role', async () => {
  for (const [role, expected] of [
    ['owner', 200],
    ['admin', 403],
    ['customer', 403]
  ]) {
    let status = 200;
    let reached = false;
    const res = {
      status(code) { status = code; return this; },
      json() {}
    };
    await auth.requireOwner(
      { headers: { authorization: 'Bearer ' + token(role) } },
      res,
      () => { reached = true; }
    );
    assert.equal(status, expected);
    assert.equal(reached, role === 'owner');
  }
});

test('owner settings sync saves through the supported endpoint', async () => {
  const save = await call('/api/admin/settings', token(), { cats: ['Accessories'] }, 'PUT');
  assert.equal(save.status, 200);
  const result = await call('/api/admin/settings', token(), null, 'GET');
  assert.deepEqual(result.data.settings.cats, ['Accessories']);
});

test('admin frontend uses the external admin bundle and real API routes', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../frontend/admin.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../../frontend/admin.js'), 'utf8');

  assert.match(html, /src="\/admin\.js/);
  assert.match(js, /async function users\(/);
  assert.match(js, /async function saveUser\(/);
  assert.match(js, /\/api\/admin\/users\//);
  assert.match(js, /minlength="12"/);
});
