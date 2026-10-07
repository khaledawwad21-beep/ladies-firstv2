"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_ADMIN_PERMISSIONS_E2E !== "1") {
  test("admin permissions e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { closeDatabase } = require("../src/db");

  let server;
  let baseUrl;

  async function request(path, options = {}) {
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    return { response, body };
  }

  async function api(path, options = {}) {
    const { response, body } = await request(path, options);
    if (!response.ok) {
      const error = new Error(body.message || `HTTP_${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  async function ensureOwner() {
    const credentials = {
      contact: "owner-e2e@example.test",
      password: "owner-password-123"
    };
    try {
      return await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
    } catch (error) {
      if (error.status !== 401) throw error;
      return api("/api/auth/bootstrap-owner", {
        method: "POST",
        body: JSON.stringify({
          name: "CI Owner",
          email: credentials.contact,
          password: credentials.password,
          gender: "male",
          age: 30
        })
      });
    }
  }

  test.before(async () => {
    await initDatabase();
    await migrateDatabase();
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await closeDatabase();
  });

  test("staff permissions are enforced live and react to owner edits immediately", async () => {
    const owner = await ensureOwner();
    const ownerHeaders = { Authorization: "Bearer " + owner.token };

    const created = await api("/api/admin/staff", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Orders Staff",
        email: "orders-staff-e2e@example.test",
        password: "orders-staff-pass-123",
        role: "staff",
        permissions: ["orders"]
      })
    });
    const staffId = Number(created.staff.id);
    assert.ok(staffId > 0);
    assert.deepEqual(created.staff.permissions, ["orders"]);

    const staffLogin = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "orders-staff-e2e@example.test",
        password: "orders-staff-pass-123"
      })
    });
    assert.equal(staffLogin.user.role, "staff");
    assert.deepEqual(staffLogin.user.permissions, ["orders"]);
    const staffHeaders = { Authorization: "Bearer " + staffLogin.token };

    const ordersAllowed = await request("/api/admin/orders", { headers: staffHeaders });
    assert.equal(ordersAllowed.response.status, 200);
    assert.equal(ordersAllowed.body.ok, true);

    for (const path of [
      "/api/admin/reports/sales",
      "/api/admin/users",
      "/api/admin/settings"
    ]) {
      const denied = await request(path, { headers: staffHeaders });
      assert.equal(denied.response.status, 403, path + " must be denied");
      assert.equal(denied.body.code, "ADMIN_PERMISSION_DENIED");
    }

    const updated = await api("/api/admin/staff/" + staffId, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({
        role: "staff",
        permissions: ["reports"],
        is_active: true
      })
    });
    assert.deepEqual(updated.staff.permissions, ["reports"]);

    const ordersDeniedAfterEdit = await request("/api/admin/orders", { headers: staffHeaders });
    assert.equal(ordersDeniedAfterEdit.response.status, 403);
    assert.equal(ordersDeniedAfterEdit.body.permission, "orders");

    const reportsAllowedWithoutRelogin = await request("/api/admin/reports/sales", { headers: staffHeaders });
    assert.equal(reportsAllowedWithoutRelogin.response.status, 200);
    assert.equal(reportsAllowedWithoutRelogin.body.ok, true);

    await api("/api/admin/staff/" + staffId, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ is_active: false })
    });

    const disabledToken = await request("/api/admin/reports/sales", { headers: staffHeaders });
    assert.equal(disabledToken.response.status, 403);
    assert.match(String(disabledToken.body.message || ""), /غير مفعل/);

    const disabledLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "orders-staff-e2e@example.test",
        password: "orders-staff-pass-123"
      })
    });
    assert.equal(disabledLogin.response.status, 403);
  });
}
