'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { db } = require('./db');
const { requireAdmin } = require('./auth');

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_TYPES = new Set(['video/mp4','video/webm','video/quicktime']);

async function initMedia() {
  await db(`CREATE TABLE IF NOT EXISTS uploaded_images (
    id TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await db(`CREATE TABLE IF NOT EXISTS uploaded_videos (
    id TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function validVideoBytes(mime, bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length) return false;
  if (mime === 'video/webm') {
    return bytes.length >= 4 && bytes.subarray(0,4).equals(Buffer.from('1a45dfa3','hex'));
  }
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    return bytes.length >= 12 && bytes.toString('ascii',4,8) === 'ftyp';
  }
  return false;
}

function registerMedia(app) {
  app.post('/api/admin/uploads/image', requireAdmin, async (req, res, next) => {
    try {
      const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(req.body?.data || '');
      if (!match) return res.status(400).json({ message: 'صيغة الصورة غير صالحة. استخدمي PNG أو JPG أو WebP.' });
      const bytes = Buffer.from(match[2], 'base64');
      const mime = match[1];
      const valid = mime === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
        : mime === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!valid || !bytes.length || bytes.length > MAX_IMAGE_BYTES) {
        return res.status(400).json({ message: 'الصورة غير صالحة أو أكبر من 3 ميغابايت بعد الضغط.' });
      }
      const id = crypto.createHash('sha256').update(bytes).digest('hex');
      await db('INSERT INTO uploaded_images (id, mime_type, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [id, mime, bytes]);
      res.status(201).json({ ok: true, url: '/api/images/' + id });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/admin/uploads/video',
    requireAdmin,
    express.raw({type:[...VIDEO_TYPES],limit:MAX_VIDEO_BYTES}),
    async (req,res,next)=>{
      try{
        const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
        const bytes=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
        if(!VIDEO_TYPES.has(mime))return res.status(400).json({ok:false,message:'صيغة الفيديو غير مدعومة. استخدمي MP4 أو WebM.'});
        if(!validVideoBytes(mime,bytes))return res.status(400).json({ok:false,message:'ملف الفيديو غير صالح.'});
        if(bytes.length>MAX_VIDEO_BYTES)return res.status(413).json({ok:false,message:'حجم الفيديو أكبر من 50 ميغابايت.'});
        const id=crypto.createHash('sha256').update(bytes).digest('hex');
        await db('INSERT INTO uploaded_videos (id,mime_type,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',[id,mime,bytes]);
        return res.status(201).json({ok:true,url:'/api/videos/'+id,mimeType:mime,size:bytes.length});
      }catch(error){
        next(error);
      }
    }
  );

  app.get('/api/images/:id', async (req, res, next) => {
    try {
      if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.sendStatus(404);
      const result = await db('SELECT mime_type, data FROM uploaded_images WHERE id = $1', [req.params.id]);
      const row = result.rows[0];
      if (!row) return res.sendStatus(404);
      res.set({
        'Content-Type': row.mime_type,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }).send(Buffer.from(row.data));
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/videos/:id', async (req,res,next)=>{
    try{
      if(!/^[a-f0-9]{64}$/.test(req.params.id))return res.sendStatus(404);
      const result=await db('SELECT mime_type,data FROM uploaded_videos WHERE id=$1',[req.params.id]);
      const row=result.rows[0];
      if(!row)return res.sendStatus(404);
      const bytes=Buffer.from(row.data),total=bytes.length;
      const common={
        'Content-Type':row.mime_type,
        'Accept-Ranges':'bytes',
        'Cache-Control':'public, max-age=31536000, immutable',
        'X-Content-Type-Options':'nosniff'
      };
      const range=String(req.headers.range||'');
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(match){
        let start=match[1]?Number(match[1]):0;
        let end=match[2]?Number(match[2]):total-1;
        if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start>=total||end<start)return res.status(416).set('Content-Range',`bytes */${total}`).end();
        end=Math.min(end,total-1);
        const chunk=bytes.subarray(start,end+1);
        return res.status(206).set({...common,'Content-Range':`bytes ${start}-${end}/${total}`,'Content-Length':String(chunk.length)}).send(chunk);
      }
      return res.status(200).set({...common,'Content-Length':String(total)}).send(bytes);
    }catch(error){
      next(error);
    }
  });
}

module.exports = { initMedia, registerMedia, validVideoBytes };
