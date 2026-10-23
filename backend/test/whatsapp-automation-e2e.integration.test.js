"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

if (process.env.RUN_DB_E2E !== "1") {
  test("WhatsApp automation e2e requires isolated postgres", { skip: true }, () => {});
} else {
  const { initDatabase } = require("../src/server");
  const { migrateDatabase } = require("../src/database-migrations");
  const { db, closeDatabase } = require("../src/db");
  const {
    runWhatsAppAutomation,
    runWhatsAppCampaign
  } = require("../src/whatsapp-automation");

  test.before(async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "ci-access";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "ci-phone-id";
    process.env.WHATSAPP_ABANDONED_TEMPLATE = "ci_abandoned";
    process.env.WHATSAPP_LOW_STOCK_TEMPLATE = "ci_low_stock";
    process.env.WHATSAPP_WAITLIST_TEMPLATE = "ci_waitlist";
    process.env.WHATSAPP_CAMPAIGN_TEMPLATE = "ci_campaign";
    await initDatabase();
    await migrateDatabase();

    await db("DELETE FROM whatsapp_automation_log");
    await db("DELETE FROM cart_snapshots");
    await db("DELETE FROM waitlist_requests");
    await db("UPDATE users SET whatsapp_opt_in=FALSE WHERE role='customer'");
  });

  test.after(async () => {
    for (const key of [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_ABANDONED_TEMPLATE",
      "WHATSAPP_LOW_STOCK_TEMPLATE",
      "WHATSAPP_WAITLIST_TEMPLATE",
      "WHATSAPP_CAMPAIGN_TEMPLATE"
    ]) delete process.env[key];
    await closeDatabase();
  });

  test("automation sends abandoned low-stock waitlist once and campaign only to opted-in customers", async () => {
    const optedIn = await db(
      `INSERT INTO users
        (name,email,phone,password_hash,gender,age,role,is_active,whatsapp_opt_in)
       VALUES
        ('CI WhatsApp Opt In','wa-optin@example.test','+970599000010','test-hash','female',30,'customer',TRUE,TRUE)
       RETURNING id`
    );
    const optedOut = await db(
      `INSERT INTO users
        (name,email,phone,password_hash,gender,age,role,is_active,whatsapp_opt_in)
       VALUES
        ('CI WhatsApp Opt Out','wa-optout@example.test','+970599000011','test-hash','female',31,'customer',TRUE,FALSE)
       RETURNING id`
    );
    const userId = Number(optedIn.rows[0].id);
    assert.ok(userId > 0);
    assert.ok(Number(optedOut.rows[0].id) > 0);

    const product = await db(
      `INSERT INTO products
        (name,description,price,cost_price,stock,is_active)
       VALUES
        ('CI Low Stock Product','WhatsApp E2E',50,20,2,TRUE)
       RETURNING id`
    );
    const productId = Number(product.rows[0].id);

    await db(
      `INSERT INTO cart_snapshots
        (user_id,items,item_count,last_activity_at,updated_at)
       VALUES
        ($1,$2::jsonb,1,NOW() - INTERVAL '8 days',NOW() - INTERVAL '8 days')`,
      [userId, JSON.stringify([{ productId, qty: 1, variant: "", packagingId: "" }])]
    );

    const waitlist = await db(
      `INSERT INTO waitlist_requests
        (product_id,user_id,customer_name,phone,status)
       VALUES
        ($1,$2,'CI WhatsApp Opt In','+970599000010','waiting')
       RETURNING id`,
      [productId, userId]
    );
    const waitlistId = Number(waitlist.rows[0].id);

    await db(
      `INSERT INTO settings(key,value,updated_at) VALUES
        ('abandoned_cart_whatsapp_enabled','true'::jsonb,NOW()),
        ('low_stock_whatsapp_enabled','true'::jsonb,NOW()),
        ('waitlist_whatsapp_auto_enabled','true'::jsonb,NOW())
       ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`
    );

    const calls = [];
    const fakeSender = async (config, phone, templateName, parameters) => {
      calls.push({ phone, templateName, parameters });
      return { id: "ci-message-" + calls.length };
    };

    const first = await runWhatsAppAutomation(db, { sendTemplate: fakeSender });
    assert.equal(first.configured, true);
    assert.equal(first.failed, 0);
    assert.equal(first.sent, 3);
    assert.deepEqual(
      calls.slice(0, 3).map(x => x.templateName).sort(),
      ["ci_abandoned", "ci_low_stock", "ci_waitlist"].sort()
    );

    const waitlistAfter = await db(
      "SELECT status,notified_at FROM waitlist_requests WHERE id=$1",
      [waitlistId]
    );
    assert.equal(waitlistAfter.rows[0].status, "notified");
    assert.ok(waitlistAfter.rows[0].notified_at);

    const log = await db(
      `SELECT reminder_type,status
       FROM whatsapp_automation_log
       WHERE status='sent'
       ORDER BY reminder_type`
    );
    assert.deepEqual(
      log.rows.map(x => x.reminder_type).sort(),
      ["abandoned_cart", "low_stock_cart", "waitlist_restock"].sort()
    );

    const second = await runWhatsAppAutomation(db, { sendTemplate: fakeSender });
    assert.equal(second.sent, 0);
    assert.equal(second.failed, 0);
    assert.equal(calls.length, 3);

    const campaign = await runWhatsAppCampaign(
      db,
      {
        title: "CI Offer",
        message: "CI campaign message",
        link: "https://example.com/offer"
      },
      { sendTemplate: fakeSender }
    );
    assert.equal(campaign.recipients, 1);
    assert.equal(campaign.sent, 1);
    assert.equal(campaign.failed, 0);
    assert.equal(calls.length, 4);
    assert.equal(calls[3].templateName, "ci_campaign");
    assert.equal(calls[3].phone, "+970599000010");

    const campaignLog = await db(
      `SELECT recipient,status
       FROM whatsapp_automation_log
       WHERE reminder_type='campaign'`
    );
    assert.equal(campaignLog.rowCount, 1);
    assert.equal(campaignLog.rows[0].recipient, "970599000010");
    assert.equal(campaignLog.rows[0].status, "sent");
  });
}
