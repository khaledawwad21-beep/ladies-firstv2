'use strict';
const { transaction } = require('./db');
const { requireAdmin } = require('./auth');
function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function numeric(value, label, whole = false) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (whole && !Number.isInteger(n))) invalid(label + ' غير صالح');
  return n;
}
function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[<>\"'\\\x00-\x20]/.test(value) || !(/^(https?:\/\/|\/api\/images\/|\/uploads\/)/.test(value))) invalid('رابط الصورة غير صالح');
  return value;
}
function videoUrl(value) {
  if (typeof value !== 'string') invalid('رابط الفيديو غير صالح');
  const url = value.trim();
  if (!url || url.length > 2048) invalid('رابط الفيديو غير صالح');
  try {
    const parsed = new URL(url);
    if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) invalid('رابط الفيديو غير صالح');
    return parsed.href;
  } catch {
    invalid('رابط الفيديو غير صالح');
  }
}
function cleanMetadata(value) {
  const metadata = value && typeof value === 'object' && !Array.isArray(value) ? {...value} : {};
  if (Object.hasOwn(metadata, 'videos')) {
    if (!Array.isArray(metadata.videos) || metadata.videos.length > 8) invalid('الحد الأقصى 8 فيديوهات للمنتج');
    metadata.videos = metadata.videos.map(videoUrl);
  }
  return metadata;
}
async function taxonomy(client, table, id, name) {
  if (id !== undefined && id !== null && id !== '') return numeric(id, 'القسم أو البراند', true);
  if (!String(name || '').trim()) return null;
  const label = String(name).trim();
  const found = await client.query(`SELECT id FROM ${table} WHERE name = $1 ORDER BY id LIMIT 1`, [label]);
  if (found.rows.length) return found.rows[0].id;
  const result = await client.query(`INSERT INTO ${table} (name) VALUES ($1) RETURNING id`, [label]);
  return result.rows[0].id;
}
function registerProductWrites(app, getProducts) {
  app.get('/api/admin/products', requireAdmin, async (req, res, next) => {
    try { res.json({ ok: true, products: await getProducts("", [], "p.created_at DESC", true) }); }
    catch (error) { next(error); }
  });
  async function save(req, res, next) {
    try {
      const body = req.body || {};
      const id = req.params.id;
      if (id && !/^[1-9]\d*$/.test(id)) invalid('رقم المنتج غير صالح');
      const name = String(body.name || '').trim();
      if (!name) invalid('اسم المنتج مطلوب');
      const price = numeric(body.price, 'السعر');
      const oldPrice = body.old_price ?? body.oldPrice ?? null;
      if (oldPrice !== null && oldPrice !== '') numeric(oldPrice, 'السعر السابق');
      const cost = numeric(body.cost_price ?? 0, 'التكلفة');
      const variants = body.variants;
      if (variants !== undefined && !Array.isArray(variants)) invalid('الألوان غير صالحة');
      const names = new Set();
      for (const v of variants || []) {
        const label = String(v.name || v.color || '').trim();
        if (!label || names.has(label)) invalid('أسماء الألوان مطلوبة ويجب ألا تتكرر');
        names.add(label); numeric(v.stock, 'مخزون اللون', true);
      }
      const stock = variants?.length ? variants.reduce((sum, v) => sum + Number(v.stock), 0) : numeric(body.stock ?? 0, 'المخزون', true);
      const suppliedImages = body.images !== undefined || body.mainImages !== undefined || body.imageUrl !== undefined || body.image_url !== undefined;
      let mains, subs;
      if (suppliedImages || !id) {
        if (body.mainImages !== undefined) {
          if (!Array.isArray(body.mainImages) || !Array.isArray(body.subImages ?? [])) invalid('قائمة الصور غير صالحة');
          mains = body.mainImages; subs = body.subImages || [];
        } else {
          const images = body.images ?? [body.imageUrl ?? body.image_url].filter(Boolean);
          if (!Array.isArray(images)) invalid('قائمة الصور غير صالحة');
          mains = images.slice(0, 1); subs = images.slice(1);
        }
        if (!mains.length) invalid('اختاري صورة رئيسية واحدة على الأقل');
        if (mains.length + subs.length > 40) invalid('الحد الأقصى 40 صورة للمنتج');
        mains.forEach(imageUrl); subs.forEach(imageUrl);
      }
      const metadata = cleanMetadata(body.metadata);
      const productId = await transaction(async client => {
        const existing = id ? (await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id])).rows[0] : null;
        if (id && !existing) { const error = new Error('المنتج غير موجود'); error.status = 404; throw error; }
        const mergedMetadata = {...(existing?.metadata || {}), ...metadata};
        const category = await taxonomy(client, 'categories', body.categoryId ?? body.category_id, body.category);
        const brand = await taxonomy(client, 'brands', body.brandId ?? body.brand_id, body.brand);
        const values = [name, String(body.description || ''), price, oldPrice === '' ? null : oldPrice, stock, mains ? mains[0] : existing.image_url,
          category, brand, body.active ?? body.isActive ?? true, body.isFeatured ?? mergedMetadata.top5 ?? existing?.is_featured ?? false, body.isBestSeller ?? existing?.is_best_seller ?? false, cost, JSON.stringify(mergedMetadata)];
        const result = id ? await client.query(`UPDATE products SET name=$1, description=$2, price=$3, old_price=$4, stock=$5, image_url=$6,
          category_id=$7, brand_id=$8, is_active=$9, is_featured=$10, is_best_seller=$11, cost_price=$12, metadata=$13::jsonb, updated_at=NOW() WHERE id=$14 RETURNING id`, [...values, id])
          : await client.query(`INSERT INTO products (name, description, price, old_price, stock, image_url, category_id, brand_id, is_active, is_featured, is_best_seller, cost_price, metadata)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING id`, values);
        const savedId = result.rows[0].id;
        if (mains) {
          await client.query('DELETE FROM product_images WHERE product_id = $1', [savedId]);
          const images = [...mains, ...subs];
          for (let i = 0; i < images.length; i++) await client.query('INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES ($1,$2,$3,$4)', [savedId, images[i], i, i < mains.length]);
        }
        if (variants !== undefined) {
          const previous = (await client.query('SELECT id, color, size FROM product_variants WHERE product_id = $1', [savedId])).rows;
          await client.query('UPDATE product_variants SET is_active = FALSE WHERE product_id = $1', [savedId]);
          for (const variant of variants) {
            const label = String(variant.name || variant.color).trim();
            const old = previous.find(v => String(v.id) === String(variant.id)) || previous.find(v => v.color === label);
            if (old) await client.query('UPDATE product_variants SET color=$1, stock=$2, is_active=TRUE, updated_at=NOW() WHERE id=$3 AND product_id=$4', [label, Number(variant.stock), old.id, savedId]);
            else await client.query('INSERT INTO product_variants (product_id, color, stock) VALUES ($1,$2,$3)', [savedId, label, Number(variant.stock)]);
          }
        }
        return savedId;
      });
      const products = await getProducts('AND p.id = $1', [productId], "p.created_at DESC", true);
      res.status(id ? 200 : 201).json({ ok: true, product: products[0] });
    } catch (error) { next(error); }
  }
  app.post('/api/admin/products', requireAdmin, save);
  app.put('/api/admin/products/:id', requireAdmin, save);
}
module.exports = { registerProductWrites, cleanMetadata, videoUrl };
