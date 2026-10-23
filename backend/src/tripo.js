"use strict";

const express = require("express");
const { requireAdmin, requireRole } = require("./auth");
const router = express.Router();

const TRIPO_BASE_URL = "https://api.tripo3d.ai/v2/openapi";
const TRIPO_UPLOAD_URL = "https://api.tripo3d.ai/v2/openapi/upload";
const TRIPO_V3_BASE_URL = "https://openapi.tripo3d.ai/v3";
const DEFAULT_MODEL = "v3.1-20260211";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiKey() {
  return String(process.env.TRIPO_API_KEY || "").trim();
}

function authHeader() {
  const key = getApiKey();
  if (!key) {
    throw Object.assign(new Error("مفتاح Tripo غير موجود على Render (TRIPO_API_KEY)"), {
      status: 503,
      code: "TRIPO_NOT_CONFIGURED"
    });
  }
  return { Authorization: `Bearer ${key}` };
}

async function parseResponse(response) {
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { payload = { message: text || "Invalid response from Tripo" }; }

  if (!response.ok || (payload?.code !== undefined && payload.code !== 0)) {
    const error = new Error(
      [payload?.message, payload?.suggestion].filter(Boolean).join(" — ") ||
      `Tripo request failed (${response.status})`
    );
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.upstreamStatus = response.status;
    error.code = payload?.code ? `TRIPO_${payload.code}` : "TRIPO_API_ERROR";
    error.details = payload;
    error.traceId = response.headers.get("x-tripo-trace-id") || null;
    throw error;
  }
  return payload;
}

async function tripoJson(endpoint, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`${TRIPO_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(60000)
      });
      if ([502, 503, 504].includes(response.status) && attempt < 3) {
        await response.text();
        await sleep(1000 * attempt);
        continue;
      }
      return await parseResponse(response);
    } catch (error) {
      lastError = error;
      if (error?.upstreamStatus && ![502, 503, 504].includes(error.upstreamStatus)) throw error;
      if (attempt < 3) {
        await sleep(1000 * attempt);
        continue;
      }
    }
  }
  if (lastError?.status) throw lastError;
  throw Object.assign(
    new Error(`تعذر الاتصال بخدمة Tripo: ${lastError?.message || "network error"}`),
    { status: 502, code: "TRIPO_NETWORK_ERROR" }
  );
}

async function tripoV3(endpoint, options = {}) {
  const response = await fetch(`${TRIPO_V3_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...authHeader(), "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(90000)
  });
  return parseResponse(response);
}

function validTripoInput(value) {
  const v=String(value||"").trim();
  if (!v || v.length>500) throw Object.assign(new Error("مصدر موديل نايا غير صالح"),{status:400});
  return v;
}

function decodeImage(dataUrl) {
  const match = String(dataUrl || "").match(
    /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/i
  );
  if (!match) {
    throw Object.assign(new Error("صيغة الصورة غير صالحة. استخدم PNG أو JPG"), { status: 400 });
  }
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    throw Object.assign(new Error("حجم كل صورة يجب ألا يتجاوز 20MB"), { status: 400 });
  }
  return {
    buffer,
    mime: match[1],
    ext: match[1].includes("jpeg") ? "jpg" : "png"
  };
}

async function uploadToTripo(decoded, filename) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const form = new FormData();
      form.append(
        "file",
        new Blob([decoded.buffer], { type: decoded.mime }),
        filename || `naya.${decoded.ext}`
      );

      // V2 legacy multipart upload endpoint. /upload/sts is not a file-upload
      // endpoint; STS credentials live under /upload/sts/token.
      const response = await fetch(TRIPO_UPLOAD_URL, {
        method: "POST",
        headers: authHeader(),
        body: form,
        signal: AbortSignal.timeout(90000)
      });
      const payload = await parseResponse(response);
      const data = payload?.data || {};
      const fileToken =
        data.image_token ||
        data.file_token ||
        data.token ||
        payload.image_token ||
        payload.file_token;

      if (!fileToken) {
        throw Object.assign(
          new Error("Tripo رفع الصورة لكنه لم يرجع file_token"),
          { status: 502, code: "TRIPO_UPLOAD_NO_TOKEN", details: payload }
        );
      }
      return String(fileToken);
    } catch (error) {
      lastError = error;
      if (error?.upstreamStatus && ![502, 503, 504].includes(error.upstreamStatus)) throw error;
      if (attempt < 3) await sleep(1000 * attempt);
    }
  }
  if (lastError?.status) throw lastError;
  throw Object.assign(
    new Error(`تعذر رفع الصورة إلى Tripo: ${lastError?.message || "network error"}`),
    { status: 502, code: "TRIPO_UPLOAD_NETWORK_ERROR" }
  );
}

function qualityBody(source = {}) {
  const faceLimit = Math.min(20000, Math.max(1000, Number(source.face_limit || 12000)));
  return {
    model_version: String(source.model_version || source.model || DEFAULT_MODEL),
    texture: true,
    pbr: true,
    face_limit: faceLimit,
    export_uv: true,
    enable_image_autofix: true
  };
}

function taskOutput(data = {}) {
  const output = data.output || {};
  return {
    modelUrl: output.pbr_model || output.model || output.model_url || output.base_model || null,
    previewUrl: output.rendered_image || output.rendered_image_url || output.preview || null
  };
}

router.get("/status", (req, res) => {
  res.json({
    ok: true,
    configured: Boolean(getApiKey()),
    apiVersion: "v2/openapi",
    uploadMode: "v2-multipart-upload",
    model: DEFAULT_MODEL
  });
});

router.use(requireAdmin, requireRole("owner", "admin"));

router.get("/balance", async (req, res, next) => {
  try {
    const result = await tripoJson("/user/balance", { method: "GET" });
    res.json({ ok: true, data: result.data || result });
  } catch (error) { next(error); }
});

router.post("/naya/upload-view", async (req, res, next) => {
  try {
    const image = req.body?.image || req.body?.dataUrl;
    if (!image) return res.status(400).json({ ok: false, message: "الصورة مطلوبة" });
    const decoded = decodeImage(image);
    const fileToken = await uploadToTripo(
      decoded,
      req.body?.filename || `naya.${decoded.ext}`
    );
    res.json({ ok: true, fileToken, fileType: decoded.ext, size: decoded.buffer.length });
  } catch (error) { next(error); }
});

router.post("/naya/multiview", async (req, res, next) => {
  try {
    const order = ["front", "left", "back", "right"];
    const refs = req.body?.fileTokens || req.body?.refs || {};
    if (!refs.front?.fileToken) {
      return res.status(400).json({ ok: false, message: "الصورة الأمامية FRONT مطلوبة" });
    }
    const supplied = order.filter((key) => refs[key]?.fileToken);
    if (supplied.length < 2) {
      return res.status(400).json({ ok: false, message: "يلزم صورتان على الأقل: FRONT + زاوية أخرى" });
    }

    // Tripo requires exactly four positions in this exact order. Missing views
    // are represented by empty objects, not by shortening/reordering the list.
    const files = order.map((key) =>
      refs[key]?.fileToken
        ? {
            type: String(refs[key].fileType || "jpg").replace("jpeg", "jpg"),
            file_token: String(refs[key].fileToken)
          }
        : {}
    );

    const result = await tripoJson("/task", {
      method: "POST",
      body: JSON.stringify({
        type: "multiview_to_model",
        files,
        ...qualityBody(req.body || {})
      })
    });
    const taskId = result?.data?.task_id;
    if (!taskId) {
      throw Object.assign(
        new Error("Tripo قبل طلب Multi-View لكنه لم يرجع رقم مهمة"),
        { status: 502, code: "TRIPO_NO_TASK_ID", details: result }
      );
    }
    res.status(202).json({
      ok: true,
      taskId,
      message: `بدأ إنشاء نايا من ${supplied.length} زوايا`,
      data: result.data || result
    });
  } catch (error) { next(error); }
});

router.post("/naya/rig-check", async (req,res,next)=>{
  try {
    const input=validTripoInput(req.body?.input || req.body?.taskId || req.body?.fileToken);
    const result=await tripoV3("/animations/rig-check",{method:"POST",body:JSON.stringify({input})});
    res.json({ok:true,data:result.data||result});
  } catch(error){next(error);}
});

router.post("/naya/rig", async (req,res,next)=>{
  try {
    const input=validTripoInput(req.body?.input || req.body?.taskId || req.body?.fileToken);
    const result=await tripoV3("/animations/rig",{method:"POST",body:JSON.stringify({
      input, model:"v1.0-20240301", rig_type:"biped", spec:"tripo", out_format:"glb"
    })});
    res.status(202).json({ok:true,taskId:result?.data?.task_id,data:result.data||result});
  } catch(error){next(error);}
});

router.post("/naya/animate", async (req,res,next)=>{
  try {
    const input=validTripoInput(req.body?.input || req.body?.taskId);
    const allowed=new Set(["idle","walk","run","jump","turn"]);
    const animations=(Array.isArray(req.body?.animations)?req.body.animations:["idle"])
      .map(x=>String(x).toLowerCase()).filter(x=>allowed.has(x)).slice(0,5);
    if(!animations.length) animations.push("idle");
    const result=await tripoV3("/animations/retarget",{method:"POST",body:JSON.stringify({
      input, animations:animations.map(preset=>`preset:${preset}`), out_format:"glb", bake_animation:true, animate_in_place:true
    })});
    res.status(202).json({ok:true,taskId:result?.data?.task_id,animations,data:result.data||result});
  } catch(error){next(error);}
});

router.get("/naya/v3-tasks/:taskId", async (req,res,next)=>{
  try {
    const id=String(req.params.taskId||"").trim();
    if(!/^[-_a-zA-Z0-9]+$/.test(id)) return res.status(400).json({ok:false,message:"رقم المهمة غير صالح"});
    const result=await tripoV3(`/tasks/${encodeURIComponent(id)}`,{method:"GET"});
    const data=result.data||result, output=data.output||{};
    res.json({ok:true,status:data.status||null,progress:data.progress??0,
      modelUrl:output.model_url||output.pbr_model||output.model||null,
      modelUrls:output.model_urls||null,creditsConsumed:data.credits_consumed??null,data});
  } catch(error){next(error);}
});

router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const taskId = String(req.params.taskId || "").trim();
    if (!/^[-_a-zA-Z0-9]+$/.test(taskId)) {
      return res.status(400).json({ ok: false, message: "رقم المهمة غير صالح" });
    }
    const result = await tripoJson(`/task/${encodeURIComponent(taskId)}`, { method: "GET" });
    const data = result.data || result;
    const output = taskOutput(data);
    res.json({
      ok: true,
      status: data.status || null,
      progress: data.progress ?? 0,
      modelUrl: output.modelUrl,
      previewUrl: output.previewUrl,
      creditsConsumed: data.credits ?? data.credits_consumed ?? data.consumed_credit ?? null,
      data
    });
  } catch (error) { next(error); }
});

module.exports = router;
