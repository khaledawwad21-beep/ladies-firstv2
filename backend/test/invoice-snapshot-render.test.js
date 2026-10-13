"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("printed invoice uses the order-time recipient, not subsequently changed profile details", async () => {
  const admin = fs.readFileSync(path.join(__dirname, "../../frontend/admin.js"), "utf8");
  const start = admin.indexOf("async function invoice(id){");
  const end = admin.indexOf("function invoicePrompt()", start);
  assert.ok(start >= 0 && end > start, "print-invoice function must exist");

  const printRoot = { innerHTML: "" };
  const qrCodes = [];
  let printed = 0;
  const contexts = {
    Date,
    location: { origin: "https://ladies-firstv2.onrender.com" },
    window: { print: () => { printed++; } },
    $: selector => selector === "#print" ? printRoot : { selector },
    QRCode: function QRCode(target, options) { qrCodes.push({ target, options }); },
    E: value => String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    M: value => Number(value || 0).toFixed(2),
    safeMediaUrl: () => "",
    table: (columns, rows) => "<table>" + rows.join("") + "</table>",
    invoiceThankYouPhrase: () => "شكراً لطلبك",
    api: async endpoint => {
      if (endpoint === "/api/admin/orders/123") {
        return {
          order: {
            customer_name: "الاسم وقت الطلب",
            customer_phone: "+970599111111",
            user_name: "الاسم المعدل لاحقاً",
            user_phone: "+970599999999",
            user_email: "buyer@example.test",
            created_at: "2026-10-10T12:00:00.000Z",
            shipping_address: "العنوان وقت الطلب",
            shipping_region: "westbank",
            subtotal: 100,
            shipping_base_cost: 20,
            shipping_cost: 20,
            total: 120,
            payment_method: "cash"
          },
          items: [{ product_name: "منتج الاختبار", quantity: 1, unit_price: 100, total: 100 }]
        };
      }
      if (endpoint === "/api/admin/orders/123/public-link")
        return { path: "/order/123?token=isolated-test" };
      if (endpoint === "/api/admin/settings")
        return { settings: { store_name: "Ladies First" } };
      throw Error("Unexpected API request " + endpoint);
    }
  };

  const invoice = vm.runInNewContext(admin.slice(start, end) + "\ninvoice", contexts);
  await invoice(123);
  const html = printRoot.innerHTML;
  assert.match(html, /العميل: الاسم وقت الطلب — الهاتف: \+970599111111/);
  assert.doesNotMatch(html, /الاسم المعدل لاحقاً/);
  assert.doesNotMatch(html, /\+970599999999/);
  assert.match(html, /العنوان وقت الطلب/);
  assert.match(html, /منتج الاختبار/);
  assert.match(html, /رسوم التوصيل الأصلية/);
  assert.match(html, /الإجمالي النهائي/);
  assert.equal(qrCodes.length, 2, "invoice must render store and order QR codes");
  assert.equal(qrCodes[0].options.text, "https://ladies-firstv2.onrender.com");
  assert.equal(qrCodes[1].options.text, "https://ladies-firstv2.onrender.com/order/123?token=isolated-test");
  assert.equal(printed, 1);
});
