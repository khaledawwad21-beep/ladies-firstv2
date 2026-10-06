'use strict';
const {db} = require('./db');

async function getBestSellers() {
  const result = await db(`
    WITH eligible_sales AS (
      SELECT oi.product_id,
        SUM(oi.quantity) AS all_quantity,
        COALESCE(SUM(oi.quantity) FILTER (
          WHERE o.created_at >= NOW() - INTERVAL '7 days'
        ), 0) AS week_quantity
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE LOWER(o.status) NOT IN ('cancelled', 'canceled', 'ملغي')
        AND o.created_at <= NOW()
        AND oi.quantity > 0
        AND p.is_active = TRUE
        AND CASE WHEN EXISTS (
          SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.is_active = TRUE
        ) THEN COALESCE((
          SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = TRUE
        ), 0) ELSE p.stock END > 0
      GROUP BY oi.product_id
    ), period AS (
      SELECT EXISTS(SELECT 1 FROM eligible_sales WHERE week_quantity > 0) AS weekly
    )
    SELECT product_id AS "productId",
      CASE WHEN weekly THEN week_quantity ELSE all_quantity END AS quantity,
      CASE WHEN weekly THEN 'week' ELSE 'all_time' END AS period
    FROM eligible_sales CROSS JOIN period
    WHERE CASE WHEN weekly THEN week_quantity ELSE all_quantity END > 0
    ORDER BY quantity DESC, product_id ASC
    LIMIT 5
  `);
  return {
    period: result.rows[0]?.period || 'all_time',
    bestSellers: result.rows.map(row => ({productId: row.productId, quantity: Number(row.quantity)}))
  };
}

function registerBestSellers(app) {
  app.get('/api/store/best-sellers', async (req, res) => {
    try {res.json({ok:true, ...await getBestSellers()});}
    catch(error) {
      console.error('[BEST SELLERS]', error);
      res.status(500).json({ok:false,message:'تعذر تحميل المنتجات الأكثر مبيعًا'});
    }
  });
}
module.exports = {getBestSellers, registerBestSellers};
