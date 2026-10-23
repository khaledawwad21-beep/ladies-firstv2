'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns/promises');
const net = require('node:net');
const { watermarkProductImage } = require('./product-watermark');

const MAX_REMOTE_BYTES = 8 * 1024 * 1024;
const renderCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isPublicIpv4(address) {
  if (net.isIP(address) !== 4) return false;
  const [a, b, c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 168 || b === 0 || b === 88 && c === 99) ||
    a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) ||
    a === 203 && b === 0 && c === 113);
}

async function fetchRemoteImage(source, redirects = 0) {
  const url = new URL(source);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80'))) {
    throw new Error('Unsafe image URL');
  }
  const resolved = await dns.lookup(url.hostname, { all: true, family: 4 });
  if (!resolved.length || resolved.some(entry => !isPublicIpv4(entry.address))) throw new Error('Unsafe image host');
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {
      timeout: 8000,
      agent: false,
      lookup: (_hostname, _options, callback) => callback(null, resolved[0].address, 4),
      headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png' }
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && redirects < 3 && response.headers.location) {
        response.resume();
        const redirected = new URL(response.headers.location, url).toString();
        resolve(fetchRemoteImage(redirected, redirects + 1));
        return;
      }
      if (response.statusCode !== 200 || !/^image\/(?:jpeg|png|webp|avif|gif)$/i.test(String(response.headers['content-type'] || '').split(';')[0])) {
        response.resume();
        reject(new Error('Remote image unavailable'));
        return;
      }
      const chunks = [];
      let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > MAX_REMOTE_BYTES) { response.destroy(new Error('Image too large')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Image timed out')));
    request.on('error', reject);
  });
}

async function cachedWatermark(source, getBytes) {
  const now = Date.now();
  const cached = renderCache.get(source);
  if (cached && cached.expires > now) return cached.value;
  const value = Promise.resolve().then(getBytes).then(watermarkProductImage);
  renderCache.set(source, { value, expires: now + CACHE_TTL_MS });
  while (renderCache.size > 75) renderCache.delete(renderCache.keys().next().value);
  try { return await value; }
  catch (error) { renderCache.delete(source); throw error; }
}

function publicProductImageUrls(product) {
  const base = '/api/product-images/' + product.id + '/';
  const convert = (images, kind) => (images || []).map((url, index) => url ? `${base}${kind}/${index}` : url);
  return {
    ...product,
    imageUrl: product.imageUrl ? `${base}hero/0` : product.imageUrl,
    mainImages: convert(product.mainImages, 'main'),
    subImages: convert(product.subImages, 'sub'),
    images: convert(product.images, 'all')
  };
}

function registerProtectedProductImages(app, { db, uploadsDir }) {
  // Legacy local product URLs must not bypass the watermark via express.static.
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    if (!filename || filename.startsWith('.') || filename.includes('/') || filename.includes('\\')) return res.sendStatus(404);
    try {
      const url = '/uploads/' + filename;
      const use = await db(`SELECT EXISTS (
        SELECT 1 FROM products WHERE RIGHT(image_url,LENGTH($1))=$1
        UNION ALL SELECT 1 FROM product_images WHERE RIGHT(image_url,LENGTH($1))=$1
      ) AS is_product`, [url]);
      if (!use.rows[0]?.is_product) return next();
      const image = await cachedWatermark(url, () => fs.readFile(path.join(uploadsDir, filename)));
      return res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' }).send(image);
    } catch (error) { return next(error); }
  });

  async function getProductImageSource(productId, kind, index) {
    const product = await db('SELECT id, image_url FROM products WHERE id=$1 AND is_active=TRUE', [productId]);
    if (!product.rows.length) return null;
    if (kind === 'hero') return index === 0 ? product.rows[0].image_url : null;
    const predicate = kind === 'main' ? 'AND is_primary=TRUE' : kind === 'sub' ? 'AND is_primary=FALSE' : '';
    const images = await db(`SELECT image_url FROM product_images WHERE product_id=$1 ${predicate} ORDER BY sort_order,id LIMIT 1 OFFSET $2`, [productId, index]);
    return images.rows[0]?.image_url || null;
  }

  async function bytesForSource(source) {
    const managed = /^(?:https?:\/\/[^/]+)?\/api\/images\/([a-f0-9]{64})$/.exec(source);
    if (managed) {
      const image = await db('SELECT data FROM uploaded_images WHERE id=$1', [managed[1]]);
      if (!image.rows.length) throw new Error('Missing uploaded image');
      return Buffer.from(image.rows[0].data);
    }
    if (source.startsWith('/uploads/')) {
      const filename = source.slice('/uploads/'.length);
      if (!filename || filename.includes('/') || filename.includes('\\') || filename.startsWith('.')) throw new Error('Invalid local image path');
      return fs.readFile(path.join(uploadsDir, filename));
    }
    return fetchRemoteImage(source);
  }

  app.get('/api/product-images/:productId/:kind/:index', async (req, res) => {
    const id = Number(req.params.productId);
    const index = Number(req.params.index);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isInteger(index) || index < 0 || index > 39 ||
      !['hero', 'main', 'sub', 'all'].includes(req.params.kind)) return res.sendStatus(404);
    try {
      const source = await getProductImageSource(id, req.params.kind, index);
      if (!source) return res.sendStatus(404);
      const image = await cachedWatermark(source, () => bytesForSource(source));
      return res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' }).send(image);
    } catch (error) {
      console.warn('[PRODUCT IMAGE]', error.message);
      return res.sendStatus(502);
    }
  });
}

module.exports = { publicProductImageUrls, registerProtectedProductImages, fetchRemoteImage, isPublicIpv4 };
