"use strict";

const express = require("express");

const router = express.Router();
const TRIPO_BASE_URL = "https://openapi.tripo3d.ai/v3";

function getApiKey() {
  return String(process.env.TRIPO_API_KEY || "").trim();
}

function tripoHeaders() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("TRIPO_API_KEY is not configured");
    error.status = 503;
    error.code = "TRIPO_NOT_CONFIGURED";
    throw error;
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

async function parseResponse(response) {
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "Invalid response from Tripo" };
  }

  if (!response.ok || (payload && payload.code !== undefined && payload.code !== 0)) {
    const error = new Error(
      payload?.message || payload?.suggestion || `Tripo request failed (${response.status})`
    );
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.code = "TRIPO_API_ERROR";
    error.details = payload;
    throw error;
  }

  return payload;
}

async function tripoFetch(path, options = {}) {
  const response = await fetch(`${TRIPO_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...tripoHeaders(),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });

  return parseResponse(response);
}

router.get("/status", (req, res) => {
  res.json({
    ok: true,
    configured: Boolean(getApiKey()),
    apiVersion: "v3"
  });
});

router.get("/balance", async (req, res, next) => {
  try {
    const result = await tripoFetch("/account/balance", { method: "GET" });
    res.json({ ok: true, data: result.data || result });
  } catch (error) {
    next(error);
  }
});

router.post("/image-to-model", async (req, res, next) => {
  try {
    const input = String(req.body?.input || req.body?.imageUrl || "").trim();

    if (!input) {
      return res.status(400).json({
        ok: false,
        message: "يلزم رابط صورة مباشر أو file_token من Tripo"
      });
    }

    const body = {
      input,
      model: String(req.body?.model || "tripo-v3.1"),
      texture: req.body?.texture !== false,
      pbr: req.body?.pbr !== false,
      texture_quality: String(req.body?.texture_quality || "detailed")
    };

    if (req.body?.enable_image_autofix !== undefined) {
      body.enable_image_autofix = Boolean(req.body.enable_image_autofix);
    }
    if (req.body?.orientation) body.orientation = String(req.body.orientation);
    if (req.body?.model_seed !== undefined) body.model_seed = Number(req.body.model_seed);

    const result = await tripoFetch("/generation/image-to-model", {
      method: "POST",
      body: JSON.stringify(body)
    });

    res.status(202).json({
      ok: true,
      taskId: result?.data?.task_id || null,
      data: result.data || result
    });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || "").trim();
    if (!/^[-_a-zA-Z0-9]+$/.test(taskId)) {
      return res.status(400).json({ ok: false, message: "رقم المهمة غير صالح" });
    }

    const result = await tripoFetch(`/tasks/${encodeURIComponent(taskId)}`, { method: "GET" });
    const data = result.data || result;

    res.json({
      ok: true,
      status: data.status || null,
      progress: data.progress ?? null,
      modelUrl: data.output?.model_url || null,
      previewUrl: data.output?.rendered_image_url || null,
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
