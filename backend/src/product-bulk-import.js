'use strict';

const { transaction } = require('./db');
const { requireAdmin } = require('./auth');
const { cleanMetadata } = require('./product-write');

function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function normalizeDigits(value) {
  return String(value).replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  }).replace(/٫/g, '.').replace(/٬/g, '');
}
function amount(value, label, whole = false) {
  if (value === undefined || value === null || value === '') invalid(`${label} غير صالح`);
  const n = Number(normalizeDigits(value));
  if (!Number.isFinite(n) || n < 0 || (whole && !Number.isInteger(n))) invalid(`${label} غير صالح`);
  return n;
}
function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (['نعم', 'yes', 'true', '1', 'فعال', 'فعّال'].includes(s)) return true;
  if (['لا', 'no', 'false', '0', 'متوقف', 'غير فعال'].includes(s)) return false;
  invalid('قيمة نعم/لا غير صالحة');
}
function split(value) { return String(value || '').split('|').map(x => x.trim()).filter(Boolean); }
function image(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[<>"'\\\x00-\x20]/.test(value) || !(/^(https?:\/\/|\/api\/images\/|\/uploads\/)/.test(value))) invalid('رابط الصورة غير صالح');
  return value;
}
function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 200) invalid('حمّلي من صنف واحد إلى 200 صنف في الدفعة');
  const barcodes = new Set();
  return rows.map((row, index) => {
    const n = index + 1;
    const name = String(row.name || '').trim();
    const categoryName = String(row.category || '').trim();
    if (!name) invalid(`اسم الصنف مطلوب في الصف ${n}`);
    if (!categoryName) invalid(`الفئة مطلوبة في الصف ${n}`);
    const price = amount(row.price, `سعر البيع في الصف ${n}`);
    const oldPrice = row.oldPrice === '' || row.oldPrice == null ? null : amount(row.oldPrice, `السعر الأصلي في الصف ${n}`);
    const cost = row.costPrice === '' || row.costPrice == null ? 0 : amount(row.costPrice, `التكلفة في الصف ${n}`);
    const stock = amount(row.stock === '' || row.stock == null ? 0 : row.stock, `المخزون في الصف ${n}`, true);
    const active = bool(row.active, false);
    const mainImages = row.mainImage ? [image(String(row.mainImage).trim())] : [];
    const subImages = split(row.subImages).map(image);
    if (mainImages.length + subImages.length > 40) invalid(`الحد الأقصى 40 صورة للصنف في الصف ${n}`);
    if (active && !mainImages.length) invalid(`أضيفي رابط الصورة الرئيسية قبل تفعيل الصنف في الصف ${n}`);
    const barcode = String(row.barcode || '').trim() || null;
    if (barcode && barcode.length > 100) invalid(`الباركود طويل في الصف ${n}`);
    if (barcode && barcodes.has(barcode)) invalid(`الباركود مكرر داخل الملف في الصف ${n}`);
    if (barcode) barcodes.add(barcode);
    const videos = split(row.videos);
    const saleStartsAt = String(row.saleStartsAt || '').trim();
    const saleEndsAt = String(row.saleEndsAt || '').trim();
    const metadata = cleanMetadata({
      videos,
      scentTags: split(row.scentTags),
      styleTags: split(row.styleTags),
      occasionTags: split(row.occasionTags),
      exclusiveLaunch: bool(row.exclusiveLaunch, false),
      saleStartsAt,
      saleEndsAt
    });
    if (saleStartsAt || saleEndsAt) {
      if (!(oldPrice > price)) invalid(`سعر التخفيض يجب أن يكون أقل من السعر الأصلي في الصف ${n}`);
      if (!saleStartsAt || !saleEndsAt || saleStartsAt > saleEndsAt) invalid(`راجعي تاريخي التخفيض في الصف ${n}`);
    }
    return { ...row, name, categoryName, brandName: String(row.brand || '').trim(), barcode, price, oldPrice, cost, stock, active, mainImages, subImages, metadata };
  });
}
async function taxonomy(client, table, name) {
  const label = String(name || '').trim();
  const found = await client.query(`SELECT id FROM ${table} WHERE name=$1 ORDER BY id LIMIT 1`, [label]);
  if (found.rows.length) return Number(found.rows[0].id);
  return Number((await client.query(`INSERT INTO ${table}(name) VALUES($1) RETURNING id`, [label])).rows[0].id);
}

function registerProductBulkImport(app) {
  app.post('/api/admin/products/bulk-import', requireAdmin, async (req, res, next) => {
    try {
      const prepared = validateRows(req.body?.products);
      const options = Array.isArray(req.body?.options) ? req.body.options : [];
      if (options.length > 1000) invalid('الحد الأقصى 1000 خيار في الدفعة');
      const refs = new Map();
      for (const product of prepared) {
        const ref = String(product.ref || '').trim();
        if (ref && refs.has(ref)) invalid(`مرجع الصنف مكرر داخل الملف: ${ref}`);
        if (ref) refs.set(ref, product);
        product.variants = [];
      }
      for (const option of options) {
        const ref = String(option.ref || '').trim();
        const product = refs.get(ref);
        if (!product) invalid(`خيار مرتبط بمرجع غير موجود: ${ref || 'فارغ'}`);
        const name = String(option.name || '').trim();
        if (!name) invalid(`اسم الخيار مطلوب للصنف ${ref}`);
        const stock = amount(option.stock, `مخزون الخيار للصنف ${ref}`, true);
        if (product.variants.some(v => v.name === name)) invalid(`الخيار ${name} مكرر للصنف ${ref}`);
        product.variants.push({ name, stock });
      }
      for (const product of prepared) if (product.variants.length) product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      const created = await transaction(async client => {
        const withBarcodes = prepared.filter(p => p.barcode).map(p => p.barcode);
        if (withBarcodes.length) {
          const existing = await client.query('SELECT barcode FROM products WHERE barcode = ANY($1::text[])', [withBarcodes]);
          if (existing.rows.length) { const error = new Error(`الباركود مستخدم من قبل: ${existing.rows[0].barcode}`); error.status = 409; throw error; }
        }
        const result = [];
        for (const p of prepared) {
          const categoryId = await taxonomy(client, 'categories', p.categoryName);
          const brandId = p.brandName ? await taxonomy(client, 'brands', p.brandName) : null;
          const seq = Number((await client.query(
            `INSERT INTO product_category_sequences(category_id,last_sequence) VALUES($1,1)
             ON CONFLICT(category_id) DO UPDATE SET last_sequence=product_category_sequences.last_sequence+1 RETURNING last_sequence`,
            [categoryId]
          )).rows[0].last_sequence);
          const productNumber = `${categoryId}-${seq}`;
          const saved = await client.query(
            `INSERT INTO products(name,description,price,old_price,stock,image_url,category_id,brand_id,is_active,is_featured,is_best_seller,cost_price,supplier_name,barcode,product_sequence,product_number,metadata)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,FALSE,$10,$11,$12,$13,$14,$15::jsonb) RETURNING id`,
            [p.name, String(p.description || ''), p.price, p.oldPrice, p.stock, p.mainImages[0] || null, categoryId, brandId, p.active,
              p.cost, String(p.supplier || '').trim().slice(0,200) || null, p.barcode, seq, productNumber, JSON.stringify(p.metadata)]
          );
          const id = Number(saved.rows[0].id);
          const allImages = [...p.mainImages, ...p.subImages];
          for (let i = 0; i < allImages.length; i++) await client.query(
            'INSERT INTO product_images(product_id,image_url,sort_order,is_primary) VALUES($1,$2,$3,$4)',
            [id, allImages[i], i, i === 0]
          );
          for (const v of p.variants) await client.query('INSERT INTO product_variants(product_id,color,stock) VALUES($1,$2,$3)', [id, v.name, v.stock]);
          result.push({ id, name: p.name, productNumber });
        }
        return result;
      });
      res.status(201).json({ ok: true, imported: created.length, products: created });
    } catch (error) {
      if (String(error.code) === '23505' && String(error.constraint || '').includes('barcode')) {
        error.status = 409; error.message = 'يوجد باركود مستخدم مسبقًا؛ لم يتم حفظ أي صنف من الدفعة';
      }
      next(error);
    }
  });
}

module.exports = { registerProductBulkImport, validateRows };
