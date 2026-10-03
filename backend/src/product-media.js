'use strict';
const crypto = require('node:crypto');
const { db } = require('./db');
const { requireAdmin } = require('./auth');
async function initMedia() {
  await db(`CREATE TABLE IF NOT EXISTS uploaded_images (
    id TEXT PRIMARY KEY, mime_type TEXT NOT NULL, data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
function registerMedia(app) {
  app.post('/api/admin/uploads/image', requireAdmin, async (req, res, next) => {
    try {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(req.body?.data || '');
      if (!match) return res.status(400).json({ message: 'صيغة الصورة غير صالحة. استخدمي PNG أو JPG أو WebP.' });
      const bytes = Buffer.from(match[2], 'base64');
      const mime = match[1];
      const valid = mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!valid || !bytes.length || bytes.length > 3 * 1024 * 1024) return res.status(400).json({ message: 'الصورة غير صالحة أو أكبر من 3 ميغابايت بعد الضغط.' });
      const id = crypto.createHash('sha256').update(bytes).digest('hex');
      await db('INSERT INTO uploaded_images (id, mime_type, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [id, mime, bytes]);
      res.status(201).json({ ok: true, url: '/api/images/' + id });
    } catch (error) { next(error); }
  });
  app.get('/api/images/:id', async (req, res, next) => {
    try {
      if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.sendStatus(404);
      const result = await db('SELECT mime_type, data FROM uploaded_images WHERE id = $1', [req.params.id]);
      const row = result.rows[0];
      if (!row) return res.sendStatus(404);
      res.set({ 'Content-Type': row.mime_type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(row.data));
    } catch (error) { next(error); }
  });
}
module.exports = { initMedia, registerMedia };
