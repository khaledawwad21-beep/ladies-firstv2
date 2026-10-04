"use strict";

const express = require("express");
const { requireAdmin } = require("./auth");

const router = express.Router();
const TRIPO_BASE_URL = "https://openapi.tripo3d.ai/v3";
const DEFAULT_MODEL = "v3.1-20260211";

function getApiKey() {
  return String(process.env.TRIPO_API_KEY || "").trim();
}

function authHeader() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("TRIPO_API_KEY is not configured");
    error.status = 503;
    error.code = "TRIPO_NOT_CONFIGURED";
    throw error;
  }
  return { Authorization: `Bearer ${apiKey}` };
}

async function parseResponse(response) {
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "Invalid response from Tripo" };
  }

  if (!response.ok || (payload?.code !== undefined && payload.code !== 0)) {
    const error = new Error(payload?.message || payload?.suggestion || `Tripo request failed (${response.status})`);
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.code = "TRIPO_API_ERROR";
    error.details = payload;
    throw error;
  }
  return payload;
}

async function tripoJson(path, options = {}) {
  const response = await fetch(`${TRIPO_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(60000)
  });
  return parseResponse(response);
}

function decodeImage(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    const error = new Error("صيغة الصورة غير صالحة. استخدم PNG أو JPEG أو WebP");
    error.status = 400;
    throw error;
  }
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    const error = new Error("حجم الصورة يجب ألا يتجاوز 20MB");
    error.status = 400;
    throw error;
  }
  const ext = match[1].split("/")[1].replace("jpeg", "jpg");
  return { buffer, mime: match[1], ext };
}

async function uploadImageToTripo(dataUrl, filename = "naya.png") {
  const { buffer, mime, ext } = decodeImage(dataUrl);
  const form = new FormData();
  const safeName = String(filename || `naya.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  form.append("file", new Blob([buffer], { type: mime }), safeName);

  const response = await fetch(`${TRIPO_BASE_URL}/files`, {
    method: "POST",
    headers: authHeader(),
    body: form,
    signal: AbortSignal.timeout(60000)
  });
  const payload = await parseResponse(response);
  const token = payload?.data?.file_token;
  if (!token) {
    const error = new Error("Tripo did not return a file token");
    error.status = 502;
    throw error;
  }
  return token;
}

function generationBody(input, source = {}) {
  return {
    input,
    model: String(source.model || DEFAULT_MODEL),
    enable_image_autofix: source.enable_image_autofix !== false,
    texture_alignment: "original_image",
    orientation: "align_image",
    face_limit: Math.min(100000, Math.max(10000, Number(source.face_limit || 80000))),
    texture: true,
    pbr: true,
    texture_quality: String(source.texture_quality || "detailed"),
    geometry_quality: String(source.geometry_quality || "detailed"),
    auto_size: true,
    export_uv: true
  };
}

router.get("/status", (req, res) => {
  res.json({ ok: true, configured: Boolean(getApiKey()), apiVersion: "v3", model: DEFAULT_MODEL });
});

// Everything that can consume Tripo credits is admin-only.
router.use(requireAdmin);

router.get("/balance", async (req, res, next) => {
  try {
    const result = await tripoJson("/account/balance", { method: "GET" });
    res.json({ ok: true, data: result.data || result });
  } catch (error) { next(error); }
});

router.post("/image-to-model", async (req, res, next) => {
  try {
    const input = String(req.body?.input || req.body?.imageUrl || "").trim();
    if (!input) return res.status(400).json({ ok: false, message: "يلزم رابط صورة مباشر أو file_token من Tripo" });

    const result = await tripoJson("/generation/image-to-model", {
      method: "POST",
      body: JSON.stringify(generationBody(input, req.body || {}))
    });
    res.status(202).json({ ok: true, taskId: result?.data?.task_id || null, data: result.data || result });
  } catch (error) { next(error); }
});

// Mobile-friendly: send a data URL, upload it to Tripo, then start Naya generation.
router.post("/naya/generate", async (req, res, next) => {
  try {
    const image = req.body?.image || req.body?.dataUrl;
    if (!image) return res.status(400).json({ ok: false, message: "صورة نايا مطلوبة" });

    const fileToken = await uploadImageToTripo(image, req.body?.filename || "naya-reference.png");
    const result = await tripoJson("/generation/image-to-model", {
      method: "POST",
      body: JSON.stringify(generationBody(fileToken, req.body || {}))
    });

    res.status(202).json({
      ok: true,
      fileToken,
      taskId: result?.data?.task_id || null,
      message: "بدأ إنشاء نموذج نايا ثلاثي الأبعاد",
      data: result.data || result
    });
  } catch (error) { next(error); }
});

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || "").trim();
    if (!/^[-_a-zA-Z0-9]+$/.test(taskId)) return res.status(400).json({ ok: false, message: "رقم المهمة غير صالح" });

    const result = await tripoJson(`/tasks/${encodeURIComponent(taskId)}`, { method: "GET" });
    const data = result.data || result;
    res.json({
      ok: true,
      status: data.status || null,
      progress: data.progress ?? null,
      modelUrl: data.output?.model_url || null,
      previewUrl: data.output?.rendered_image_url || null,
      creditsConsumed: data.credits_consumed ?? null,
      data
    });
  } catch (error) { next(error); }
});

module.exports = router;
