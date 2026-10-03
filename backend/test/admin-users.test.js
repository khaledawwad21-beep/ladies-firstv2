'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
process.env.JWT_SECRET = 'local-regression-test-secret-not-used-in-production';
const auth = require('../src/auth');
const queries = [];
const settings = new Map();
const users = new Map([
  ['1', { id: '1', role: 'owner', name: 'Owner', email: 'owner@example.test', is_active: true }],
  ['2', { id: '2', role: 'customer', name: 'Customer', phone: '+970500000000', gender: 'female', age: 20, is_active: true }]
]);
// Isolate production route handlers from the live database.
require.cache[require.resolve('../src/db')] = { exports: {
  async db(sql, values = []) {
    queries.push({ sql, values });
    if (/FROM settings/.test(sql)) return { rows: [...settings].map(([key, value]) => ({ key, value })) };
    if (/UPDATE users/.test(sql)) {
      const row = users.get(String(values.at(-1)));
      if (!row) return { rows: [], rowCount: 0 };
      for (const match of sql.matchAll(/(\w+)\s*=\s*\$(\d+)/g)) {
        if (match[1] !== 'id') row[match[1]] = values[Number(match[2]) - 1];
      }
      return { rows: [{ ...row }], rowCount: 1 };
    }
    if (/FROM users/.test(sql)) {
      const rows = /WHERE\s+id =/.test(sql) ? [users.get(String(values[0]))].filter(Boolean) : [...users.values()];
      return { rows: rows.map(x => ({ ...x })), rowCount: rows.length };
    }
    throw new Error('Unexpected query in regression test');
  }, async transaction(callback) { return callback({ async query(sql, values) { assert.match(sql, /INSERT INTO settings/); settings.set(values[0], JSON.parse(values[1])); } }); }, getDatabaseStatus: async () => ({ configured: false }), closeDatabase: async () => {}
} };
const { app } = require('../src/server');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
function token(role = 'owner') { return auth.createToken({ id: '1', role }); }
async function call(path, bearer, body, method = 'PATCH') {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
const html = fs.readFileSync(require('node:path').join(__dirname, '../../frontend/admin.html'), 'utf8');
function frontend(extra = {}) {
  const context = vm.createContext({ API_BASE: base, fetch, apiToken: () => token(), ...extra });
  for (const name of ['apiFetch', 'updateRegisteredUser', 'resetUserPassword', 'getRegisteredUsers', 'saveAdminSetting']) {
    const lines = html.split('\n').filter(line => new RegExp('^(async )?function ' + name + '\\(').test(line));
    assert.ok(lines.length, name);
    vm.runInContext(lines.at(-1), context);
  }
  return context;
}
test('valid admin bearer reaches save; missing, invalid and customer tokens cannot write', async () => {
  for (const [bearer, expected] of [[null, 401], ['invalid', 401], [token('customer'), 403]]) {
    const count = queries.length;
    assert.equal((await call('/api/admin/users/2', bearer, { name: 'Blocked' })).status, expected);
    assert.equal(queries.length, count);
  }
  for (const role of ['owner', 'admin', 'staff']) {
    const result = await call('/api/admin/users/2', token(role), { name: 'Updated', phone: '+970 511-111-111', gender: 'male', age: 34 });
    assert.equal(result.status, 200);
    assert.equal(result.data.user.gender, 'male');
    assert.equal(result.data.user.contact, '+970511111111');
  }
  const reread = await call('/api/admin/users', token(), null, 'GET');
  assert.equal(reread.data.users.find(u => u.id === '2').age, 34);
});
test('frontend submit sends real fields and reflects server validation messages', async () => {
  const alerts = [], values = { userName_2: 'Khaled', userContact_2: 'UPDATED@example.test', userGender_2: 'male', userAge_2: '34' };
  let syncs = 0;
  const context = frontend({ document: { getElementById: id => ({ value: values[id] }) }, alert: message => alerts.push(message), syncAdminData: async () => { syncs++; }, render() {} });
  await context.updateRegisteredUser('2');
  assert.equal(users.get('2').email, 'updated@example.test');
  assert.equal(syncs, 1);
  assert.match(alerts[0], /بنجاح/);
  values.userContact_2 = '+970522222222';
  await context.updateRegisteredUser('2');
  assert.equal(auth.sanitizeUser(users.get('2')).contact, '+970522222222');
  assert.equal(syncs, 2);
  values.userAge_2 = '';
  await context.updateRegisteredUser('2');
  assert.equal(syncs, 2);
  assert.match(alerts.at(-1), /عمر صحيح/);
  await assert.rejects(context.apiFetch('/api/admin/users/2', { method: 'PATCH', body: JSON.stringify({ age: 999 }) }), /العمر غير صالح/);
  await assert.rejects(context.apiFetch('/api/admin/users/999', { method: 'PATCH', body: JSON.stringify({ name: 'Missing' }) }), /المستخدم غير موجود/);
});
test('password button uses server PATCH route and hashes new password', async () => {
  const alerts = [];
  const context = frontend({ prompt: () => 'New-test-password-123', confirm: () => true, alert: message => alerts.push(message) });
  await context.resetUserPassword('2');
  assert.match(alerts[0], /بنجاح/);
  assert.equal(await auth.verifyPassword('New-test-password-123', users.get('2').password_hash), true);
});
test('list includes compatible owner/contact fields without secrets or fabricated local users', () => {
  const safe = auth.sanitizeUser({ ...users.get('1'), password_hash: 'secret' });
  assert.equal(safe.is_owner, 1);
  assert.equal(safe.contact, 'owner@example.test');
  assert.equal(safe.password_hash, undefined);
  assert.equal(auth.sanitizeUser(users.get('2')).is_owner, 0);
  const context = frontend({ load: key => key === 'lf_users' ? [] : { name: 'Stale local account' } });
  assert.equal(context.getRegisteredUsers().length, 0);
});
test('owner guard authenticates token before authorizing role', () => {
  for (const [role, expected] of [['owner', 200], ['admin', 403], ['customer', 403]]) {
    let status = 200, reached = false;
    const res = { status(code) { status = code; return this; }, json() {} };
    auth.requireOwner({ headers: { authorization: 'Bearer ' + token(role) } }, res, () => { reached = true; });
    assert.equal(status, expected);
    assert.equal(reached, role === 'owner');
  }
});

test('owner settings sync saves through the supported endpoint', async () => {
  const context = frontend();
  await context.saveAdminSetting('cats', ['Accessories']);
  const result = await call('/api/admin/settings', token(), null, 'GET');
  assert.deepEqual(result.data.settings.cats, ['Accessories']);
});
