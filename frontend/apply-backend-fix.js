const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "server.js");
let s = fs.readFileSync(file, "utf8");

const oldInventory = `INSERT INTO inventory_movements (
                    product_id,
                    variant_id,
                    quantity,
                    movement_type,
                    reference_type,
                    reference_id,
                    note,
                    created_at
                  )
                  VALUES (
                    $1,
                    $2,
                    $3,
                    'return',
                    'order',
                    $4,
                    'إرجاع مخزون بسبب إلغاء الطلب',
                    NOW()
                  )`;

const newInventory = `INSERT INTO inventory_movements (
                    product_id,
                    variant_id,
                    quantity_change,
                    reason,
                    order_id,
                    created_at
                  )
                  VALUES (
                    $1,
                    $2,
                    $3,
                    'إرجاع مخزون بسبب إلغاء الطلب',
                    $4,
                    NOW()
                  )`;

const oldPoints = `INSERT INTO loyalty_points_transactions (
                      user_id,
                      order_id,
                      points,
                      transaction_type,
                      note,
                      created_at
                    )
                    VALUES (
                      $1,
                      $2,
                      $3,
                      'order_reversal',
                      $4,
                      NOW()
                    )`;

const newPoints = `INSERT INTO loyalty_points_transactions (
                      user_id,
                      order_id,
                      points,
                      transaction_type,
                      created_at
                    )
                    VALUES (
                      $1,
                      $2,
                      $3,
                      'order_reversal',
                      NOW()
                    )`;

const oldArgs = `[
                      order.user_id,
                      orderId,
                      -awardedPoints,
                      \`عكس نقاط الطلب #\${orderId}\`
                    ]`;

const newArgs = `[
                      order.user_id,
                      orderId,
                      -awardedPoints
                    ]`;

for (const [a,b] of [[oldInventory,newInventory],[oldPoints,newPoints],[oldArgs,newArgs]]) {
  if (!s.includes(a)) {
    throw new Error("Expected backend block was not found; refusing to modify server.js.");
  }
  s = s.replace(a,b);
}

fs.writeFileSync(file, s, "utf8");
console.log("Ladies First admin backend fixes applied.");
