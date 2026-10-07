"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("waitlist restock e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { app, initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { db, closeDatabase } = require("../src/db");
  const { hashPassword } = require("../src/auth");
  const { runWhatsAppAutomation } = require("../src/whatsapp-automation");

  let server;
  let baseUrl;

  async function api(path, options = {}) {
    const response = await fetch(baseUrl + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(body.message || `HTTP_${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return { status: response.status, body };
  }

  async function ensureOwnerToken() {
    try {
      const login = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          contact: "owner-e2e@example.test",
          password: "owner-password-123"
        })
      });
      return login.body.token;
    } catch {}

    const setup = await api("/api/setup/status");
    if (setup.body.setupRequired) {
      const created = await api("/api/auth/bootstrap-owner", {
        method: "POST",
        body: JSON.stringify({
          name: "CI Owner",
          email: "owner-e2e@example.test",
          password: "owner-password-123",
          gender: "male",
          age: 30
        })
      });
      return created.body.token;
    }

    const password = "waitlist-owner-pass-123";
    const passwordHash = await hashPassword(password);
    await db(
      `INSERT INTO users
        (name,email,password_hash,role,is_owner,is_active)
       VALUES
        ('CI Waitlist Owner','waitlist-owner-e2e@example.test',$1,'owner',TRUE,TRUE)
       ON CONFLICT(email) DO UPDATE SET
         password_hash=EXCLUDED.password_hash,
         role='owner',
         is_owner=TRUE,
         is_active=TRUE,
         updated_at=NOW()`,
      [passwordHash]
    );
    const login = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: "waitlist-owner-e2e@example.test",
        password
      })
    });
    return login.body.token;
  }

  test.before(async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "ci-access";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "ci-phone-id";
    process.env.WHATSAPP_WAITLIST_TEMPLATE = "ci_waitlist";
    delete process.env.WHATSAPP_ABANDONED_TEMPLATE;
    delete process.env.WHATSAPP_LOW_STOCK_TEMPLATE;
    delete process.env.WHATSAPP_CAMPAIGN_TEMPLATE;

    await initDatabase();
    await migrateDatabase();

    await db("DELETE FROM whatsapp_automation_log WHERE reminder_type='waitlist_restock'");
    await db("DELETE FROM waitlist_requests");

    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  test.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const key of [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_WAITLIST_TEMPLATE",
      "WHATSAPP_ABANDONED_TEMPLATE",
      "WHATSAPP_LOW_STOCK_TEMPLATE",
      "WHATSAPP_CAMPAIGN_TEMPLATE"
    ]) delete process.env[key];
    await closeDatabase();
  });

  test("variant waitlist stays waiting until that exact option is restocked, then notifies once", async () => {
    const ownerToken = await ensureOwnerToken();
    assert.ok(ownerToken);
    const ownerHeaders = { Authorization: "Bearer " + ownerToken };

    const created = await api("/api/admin/products", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Waitlist Variant Product",
        description: "Variant-specific waitlist integration product",
        price: 90,
        cost_price: 30,
        images: ["https://example.com/ci-waitlist-product.jpg"],
        category: "CI Waitlist Category",
        brand: "CI Waitlist Brand",
        active: true,
        variants: [
          { name: "وردي", stock: 0 },
          { name: "أسود", stock: 2 }
        ]
      })
    });

    const productId = Number(created.body.product.id);
    assert.ok(productId > 0);
    assert.equal(Number(created.body.product.stock), 2);

    const first = await api("/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        productId,
        name: "CI Waitlist Customer",
        phone: "+970599000041",
        variant: "وردي"
      })
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.alreadyWaiting, false);
    assert.equal(first.body.product.id, productId);
    assert.equal(first.body.product.image, "https://example.com/ci-waitlist-product.jpg");
    const waitlistId = Number(first.body.request.id);
    assert.ok(waitlistId > 0);

    const duplicate = await api("/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        productId,
        name: "CI Waitlist Customer",
        phone: "+970599000041",
        variant: "وردي"
      })
    });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.alreadyWaiting, true);
    assert.equal(Number(duplicate.body.request.id), waitlistId);

    const adminWaiting = await api(
      "/api/admin/waitlist?status=waiting&search=CI%20Waitlist%20Customer",
      { headers: ownerHeaders }
    );
    const waitingRow = adminWaiting.body.requests.find(x => Number(x.id) === waitlistId);
    assert.ok(waitingRow);
    assert.equal(waitingRow.productName, "CI Waitlist Variant Product");
    assert.equal(waitingRow.productImage, "https://example.com/ci-waitlist-product.jpg");
    assert.equal(waitingRow.variant, "وردي");

    const calls = [];
    const fakeSender = async (config, phone, templateName, parameters) => {
      calls.push({ phone, templateName, parameters });
      return { id: "ci-waitlist-message-" + calls.length };
    };

    const beforeRestock = await runWhatsAppAutomation(db, { sendTemplate: fakeSender });
    assert.equal(beforeRestock.configured, true);
    assert.equal(beforeRestock.sent, 0);
    assert.equal(beforeRestock.failed, 0);
    assert.equal(calls.length, 0);

    const restocked = await api(`/api/admin/products/${productId}`, {
      method: "PUT",
      headers: ownerHeaders,
      body: JSON.stringify({
        name: "CI Waitlist Variant Product",
        description: "Variant-specific waitlist integration product",
        price: 90,
        cost_price: 30,
        images: ["https://example.com/ci-waitlist-product.jpg"],
        category: "CI Waitlist Category",
        brand: "CI Waitlist Brand",
        active: true,
        variants: [
          { name: "وردي", stock: 3 },
          { name: "أسود", stock: 2 }
        ]
      })
    });
    assert.equal(Number(restocked.body.product.stock), 5);

    const afterRestock = await runWhatsAppAutomation(db, { sendTemplate: fakeSender });
    assert.equal(afterRestock.sent, 1);
    assert.equal(afterRestock.failed, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].templateName, "ci_waitlist");
    assert.equal(calls[0].phone, "+970599000041");
    assert.deepEqual(calls[0].parameters, [
      "CI Waitlist Customer",
      "CI Waitlist Variant Product"
    ]);

    const adminNotified = await api(
      "/api/admin/waitlist?status=notified&search=CI%20Waitlist%20Customer",
      { headers: ownerHeaders }
    );
    const notifiedRow = adminNotified.body.requests.find(x => Number(x.id) === waitlistId);
    assert.ok(notifiedRow);
    assert.equal(notifiedRow.status, "notified");
    assert.ok(notifiedRow.notifiedAt);

    const log = await db(
      `SELECT reminder_type,status,recipient,template_name
       FROM whatsapp_automation_log
       WHERE waitlist_id=$1
       ORDER BY id`,
      [waitlistId]
    );
    assert.equal(log.rowCount, 1);
    assert.equal(log.rows[0].reminder_type, "waitlist_restock");
    assert.equal(log.rows[0].status, "sent");
    assert.equal(log.rows[0].recipient, "970599000041");
    assert.equal(log.rows[0].template_name, "ci_waitlist");

    const secondRun = await runWhatsAppAutomation(db, { sendTemplate: fakeSender });
    assert.equal(secondRun.sent, 0);
    assert.equal(secondRun.failed, 0);
    assert.equal(calls.length, 1);

    const closed = await api(`/api/admin/waitlist/${waitlistId}`, {
      method: "PATCH",
      headers: ownerHeaders,
      body: JSON.stringify({ status: "closed" })
    });
    assert.equal(closed.body.request.status, "closed");
  });
}
