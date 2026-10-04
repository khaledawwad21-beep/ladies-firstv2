"use strict";

const express = require("express");
const { requireAdmin } = require("./auth");
const router = express.Router();

const TRIPO_BASE_URL = "https://api.tripo3d.ai/v2/openapi";
const DEFAULT_MODEL = "v3.1-20260211";

function getApiKey() { return String(process.env.TRIPO_API_KEY || "").trim(); }
function authHeader() {
  const apiKey = getApiKey();
  if (!apiKey) throw Object.assign(new Error("مفتاح Tripo غير موجود على Render (TRIPO_API_KEY)"), { status: 503, code: "TRIPO_NOT_CONFIGURED" });
  return { Authorization: `Bearer ${apiKey}` };
}

async function parseResponse(response) {
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text || "Invalid response from Tripo" }; }
  if (!response.ok || (payload?.code !== undefined && payload.code !== 0)) {
    const e = new Error([payload?.message, payload?.suggestion].filter(Boolean).join(" — ") || `Tripo request failed (${response.status})`);
    e.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    e.code = payload?.code ? `TRIPO_${payload.code}` : "TRIPO_API_ERROR";
    e.details = payload;
    e.traceId = response.headers.get("x-tripo-trace-id") || null;
    throw e;
  }
  return payload;
}

async function tripoJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${TRIPO_BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeader(), "Content-Type": "application/json", ...(options.headers || {}) },
      signal: AbortSignal.timeout(45000)
    });
  } catch (err) {
    throw Object.assign(new Error(`تعذر الاتصال بخدمة Tripo: ${err.message}`), { status: 502, code: "TRIPO_NETWORK_ERROR" });
  }
  return parseResponse(response);
}

function decodeImage(dataUrl) {
  const m = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) throw Object.assign(new Error("صيغة الصورة غير صالحة. استخدم PNG أو JPG"), { status: 400 });
  const buffer = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw Object.assign(new Error("حجم كل صورة يجب ألا يتجاوز 20MB"), { status: 400 });
  return { buffer, mime: m[1], ext: m[1].includes("jpeg") ? "jpg" : "png" };
}

async function uploadImageToTripo(dataUrl, filename = "naya.png") {
  const { buffer, mime, ext } = decodeImage(dataUrl);
  const form = new FormData();
  const safe = String(filename || `naya.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  form.append("file", new Blob([buffer], { type: mime }), safe);
  let response;
  try {
    // Tripo's direct image-upload endpoint. It returns data.image_token;
    // that token is supplied as file_token to image/multiview generation.
    response = await fetch(`${TRIPO_BASE_URL}/upload/sts`, {
      method: "POST",
      headers: authHeader(),
      body: form,
      signal: AbortSignal.timeout(30000)
    });
  } catch (err) {
    throw Object.assign(new Error(`تعذر رفع الصورة إلى Tripo: ${err.message}`), { status: 502, code: "TRIPO_UPLOAD_NETWORK_ERROR" });
  }
  const payload = await parseResponse(response);
  const token = payload?.data?.image_token || payload?.data?.file_token;
  if (!token) throw Object.assign(new Error("Tripo قبل رفع الصورة لكنه لم يرجع image_token"), { status: 502, code: "TRIPO_UPLOAD_NO_TOKEN", details: payload });
  return { token, type: ext === "jpg" ? "jpeg" : ext };
}

function qualityBody(source = {}) {
  const faceLimit = Math.min(20000, Math.max(1000, Number(source.face_limit || 12000)));
  return {
    model_version: String(source.model_version || source.model || DEFAULT_MODEL),
    texture: true,
    pbr: true,
    face_limit: faceLimit,
    export_uv: true,
    geometry_quality: "standard",
    enable_image_autofix: true
  };
}
function taskOutput(d = {}) {
  const o = d.output || {};
  return { modelUrl: o.pbr_model || o.model || o.model_url || o.base_model || null, previewUrl: o.rendered_image || o.rendered_image_url || o.preview || null };
}

router.get("/status", (req, res) => res.json({ ok: true, configured: Boolean(getApiKey()), apiVersion: "v2/openapi", uploadMode: "upload/sts", model: DEFAULT_MODEL }));
router.use(requireAdmin);

router.get("/balance", async (req, res, next) => { try { const r = await tripoJson("/user/balance", { method: "GET" }); res.json({ ok: true, data: r.data || r }); } catch (e) { next(e); } });

router.post("/naya/upload-view", async (req, res, next) => {
  try {
    const image = req.body?.image || req.body?.dataUrl;
    if (!image) return res.status(400).json({ ok: false, message: "الصورة مطلوبة" });
    const uploaded = await uploadImageToTripo(image, req.body?.filename || "naya-view.jpg");
    res.json({ ok: true, fileToken: uploaded.token, fileType: uploaded.type });
  } catch (e) { next(e); }
});

async function imageTask(req, res, next) {
  try {
    const image = req.body?.image || req.body?.dataUrl;
    if (!image) return res.status(400).json({ ok: false, message: "صورة نايا مطلوبة" });
    const uploaded = await uploadImageToTripo(image, req.body?.filename || "naya-reference.png");
    const r = await tripoJson("/task", { method: "POST", body: JSON.stringify({ type: "image_to_model", file: { type: uploaded.type, file_token: uploaded.token }, ...qualityBody(req.body || {}) }) });
    const taskId = r?.data?.task_id;
    if (!taskId) throw Object.assign(new Error("Tripo قبل الطلب لكنه لم يرجع رقم مهمة"), { status: 502 });
    res.status(202).json({ ok: true, taskId, fileToken: uploaded.token, data: r.data || r });
  } catch (e) { next(e); }
}
router.post("/image-to-model", imageTask);
router.post("/naya/generate", imageTask);

router.post("/naya/multiview", async (req, res, next) => {
  try {
    const order = ["front", "left", "back", "right"];
    const tokens = req.body?.fileTokens || null;
    let uploaded = {};

    if (tokens && typeof tokens === "object") {
      for (const k of order) if (tokens[k]?.fileToken) uploaded[k] = { token: String(tokens[k].fileToken), type: String(tokens[k].fileType || "jpeg") };
    } else {
      const views = req.body?.views || {};
      const suppliedViews = order.filter(k => views[k]?.image);
      const results = await Promise.all(suppliedViews.map(async k => [k, await uploadImageToTripo(views[k].image, views[k].filename || `naya-${k}.jpg`)]));
      uploaded = Object.fromEntries(results);
    }

    if (!uploaded.front) return res.status(400).json({ ok: false, message: "الصورة الأمامية FRONT مطلوبة" });
    const supplied = order.filter(k => uploaded[k]);
    if (supplied.length < 2) return res.status(400).json({ ok: false, message: "يلزم صورتان على الأقل: FRONT + زاوية أخرى" });

    const files = order.map(k => uploaded[k] ? { type: uploaded[k].type, file_token: uploaded[k].token } : {});
    const r = await tripoJson("/task", { method: "POST", body: JSON.stringify({ type: "multiview_to_model", files, ...qualityBody(req.body || {}) }) });
    const taskId = r?.data?.task_id;
    if (!taskId) throw Object.assign(new Error("Tripo قبل طلب Multi-View لكنه لم يرجع رقم مهمة"), { status: 502 });
    res.status(202).json({ ok: true, taskId, message: `بدأ إنشاء نايا من ${supplied.length} زوايا`, data: r.data || r });
  } catch (e) { next(e); }
});

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || "").trim();
    if (!/^[-_a-zA-Z0-9]+$/.test(taskId)) return res.status(400).json({ ok: false, message: "رقم المهمة غير صالح" });
    const r = await tripoJson(`/task/${encodeURIComponent(taskId)}`, { method: "GET" });
    const d = r.data || r, out = taskOutput(d);
    res.json({ ok: true, status: d.status || null, progress: d.progress ?? 0, modelUrl: out.modelUrl, previewUrl: out.previewUrl, creditsConsumed: d.credits ?? d.credits_consumed ?? d.consumed_credit ?? null, data: d });
  } catch (e) { next(e); }
});

module.exports = router;
