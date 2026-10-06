const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("checkout sends the server shippingAddress contract", () => {
  assert.match(app, /shippingAddress:`\$\{city\} - \$\{address\}`/);
  assert.match(app, /customerName:name,customerPhone:phone,shippingAddress:/);
});

test("checkout only clears the cart after the order API succeeds", () => {
  const apiCall = app.indexOf("await lfFetch('/api/orders'");
  const clearCart = app.indexOf("cart=[]", apiCall);
  assert.ok(apiCall >= 0, "order API call is missing");
  assert.ok(clearCart > apiCall, "cart must only clear after a successful API response");
});
