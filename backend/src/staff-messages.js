"use strict";

const crypto=require("node:crypto");

const STAFF_MESSAGE_ROLES=Object.freeze(["owner","admin","staff"]);

function normalizeTargetRoles(value){
  const roles=Array.isArray(value)
    ? value.map(x=>String(x||"").trim().toLowerCase()).filter(x=>STAFF_MESSAGE_ROLES.includes(x))
    : [];
  return [...new Set(roles.length?roles:STAFF_MESSAGE_ROLES)];
}

async function initStaffMessages(db){
  await db(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS staff_message_seen_version TEXT
  `);
}

async function getSetting(db,key,fallback=null){
  const result=await db("SELECT value FROM settings WHERE key=$1 LIMIT 1",[key]);
  return result.rowCount?result.rows[0].value:fallback;
}

async function setSetting(db,key,value){
  await db(
    `INSERT INTO settings(key,value,updated_at)
     VALUES($1,$2::jsonb,NOW())
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,
    [key,JSON.stringify(value)]
  );
}

function normalizeMessage(value){
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  return {
    version:String(raw.version||""),
    message:String(raw.message||"").trim().slice(0,3000),
    active:raw.active===true,
    createdAt:raw.createdAt||null,
    createdBy:raw.createdBy||null,
    targetRoles:normalizeTargetRoles(raw.targetRoles)
  };
}

function registerStaffMessageRoutes(app,{db,requireAdmin}){
  app.get("/api/staff-message",requireAdmin,async(req,res)=>{
    try{
      const message=normalizeMessage(await getSetting(db,"staff_general_message",{}));
      const user=await db(
        "SELECT staff_message_seen_version FROM users WHERE id=$1 LIMIT 1",
        [req.user.id]
      );
      const seenVersion=String(user.rows[0]?.staff_message_seen_version||"");
      const shouldShow=Boolean(
        message.active&&
        message.version&&
        message.message&&
        message.targetRoles.includes(String(req.user?.role||"").toLowerCase())&&
        seenVersion!==message.version
      );
      return res.json({ok:true,message,seenVersion,shouldShow});
    }catch(error){
      console.error("[STAFF MESSAGE READ]",error);
      return res.status(500).json({ok:false,message:"تعذر تحميل رسالة الإدارة"});
    }
  });

  app.post("/api/staff-message/read",requireAdmin,async(req,res)=>{
    try{
      const current=normalizeMessage(await getSetting(db,"staff_general_message",{}));
      const version=String(req.body?.version||"").trim();
      if(!current.targetRoles.includes(String(req.user?.role||"").toLowerCase())){
        return res.status(403).json({ok:false,code:"MESSAGE_NOT_TARGETED",message:"هذه الرسالة ليست موجهة لهذا الدور"});
      }
      if(!current.version||version!==current.version){
        return res.status(409).json({ok:false,message:"الرسالة تغيرت، يرجى إعادة فتحها"});
      }
      await db(
        "UPDATE users SET staff_message_seen_version=$1,updated_at=NOW() WHERE id=$2",
        [version,req.user.id]
      );
      return res.json({ok:true,version});
    }catch(error){
      console.error("[STAFF MESSAGE ACK]",error);
      return res.status(500).json({ok:false,message:"تعذر تسجيل قراءة الرسالة"});
    }
  });

  app.get("/api/admin/settings/staff-message",requireAdmin,async(req,res)=>{
    try{
      const message=normalizeMessage(await getSetting(db,"staff_general_message",{}));
      const placeholders=message.targetRoles.map((_,index)=>"$"+(index+2)).join(",");
      const counts=await db(
        `SELECT
           COUNT(*) FILTER (WHERE is_active=TRUE)::int AS eligible,
           COUNT(*) FILTER (
             WHERE is_active=TRUE
               AND $1<>'' 
               AND COALESCE(staff_message_seen_version,'')=$1
           )::int AS seen
         FROM users
         WHERE role IN (${placeholders})`,
        [message.version,...message.targetRoles]
      );
      return res.json({
        ok:true,
        message,
        eligible:Number(counts.rows[0]?.eligible||0),
        seen:Number(counts.rows[0]?.seen||0)
      });
    }catch(error){
      console.error("[STAFF MESSAGE ADMIN GET]",error);
      return res.status(500).json({ok:false,message:"تعذر تحميل الرسالة العامة للموظفين"});
    }
  });

  app.post("/api/admin/settings/staff-message",requireAdmin,async(req,res)=>{
    if(!["owner","admin"].includes(String(req.user?.role||"").toLowerCase())){
      return res.status(403).json({ok:false,code:"MANAGEMENT_ONLY",message:"نشر رسالة الموظفين متاح للمالك أو Admin فقط"});
    }
    const message=String(req.body?.message||"").trim().slice(0,3000);
    const requestedRoles=Array.isArray(req.body?.targetRoles)?req.body.targetRoles:null;
    const targetRoles=normalizeTargetRoles(requestedRoles);
    if(requestedRoles&&requestedRoles.length&&requestedRoles.every(role=>!STAFF_MESSAGE_ROLES.includes(String(role||"").trim().toLowerCase()))){
      return res.status(400).json({ok:false,message:"الأدوار المستهدفة غير صالحة"});
    }
    if(!message){
      return res.status(400).json({ok:false,message:"اكتب نص الرسالة أولًا"});
    }
    try{
      const value={
        version:crypto.randomUUID(),
        message,
        active:true,
        createdAt:new Date().toISOString(),
        createdBy:Number(req.user.id)||null,
        targetRoles
      };
      await setSetting(db,"staff_general_message",value);
      return res.status(201).json({ok:true,message:value});
    }catch(error){
      console.error("[STAFF MESSAGE PUBLISH]",error);
      return res.status(500).json({ok:false,message:"تعذر نشر الرسالة للموظفين"});
    }
  });

  app.patch("/api/admin/settings/staff-message",requireAdmin,async(req,res)=>{
    if(!["owner","admin"].includes(String(req.user?.role||"").toLowerCase())){
      return res.status(403).json({ok:false,code:"MANAGEMENT_ONLY",message:"تغيير حالة رسالة الموظفين متاح للمالك أو Admin فقط"});
    }
    try{
      const current=normalizeMessage(await getSetting(db,"staff_general_message",{}));
      const active=req.body?.active===true;
      const value={...current,active};
      await setSetting(db,"staff_general_message",value);
      return res.json({ok:true,message:value});
    }catch(error){
      console.error("[STAFF MESSAGE TOGGLE]",error);
      return res.status(500).json({ok:false,message:"تعذر تغيير حالة رسالة الموظفين"});
    }
  });
}

module.exports={initStaffMessages,registerStaffMessageRoutes,normalizeMessage,normalizeTargetRoles};
