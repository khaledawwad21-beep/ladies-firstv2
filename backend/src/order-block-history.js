"use strict";

async function exec(executor,sql,values=[]){
  if(typeof executor==="function")return executor(sql,values);
  if(executor&&typeof executor.query==="function")return executor.query(sql,values);
  throw new Error("Database executor is required");
}

async function initOrderBlockHistory(db){
  await exec(db,`
    CREATE TABLE IF NOT EXISTS customer_order_block_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      reason TEXT,
      blocked_until TIMESTAMPTZ,
      actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await exec(db,`
    CREATE INDEX IF NOT EXISTS customer_order_block_events_user_created_idx
    ON customer_order_block_events(user_id,created_at DESC,id DESC)
  `);
}

async function recordOrderBlockEvent(executor,event={}){
  const userId=Number(event.userId);
  if(!Number.isInteger(userId)||userId<=0)return null;
  const allowed=new Set(["blocked","unblocked","updated","auto_blocked"]);
  const action=allowed.has(String(event.action||""))?String(event.action):"updated";
  const source=String(event.source||"manual").slice(0,50);
  const reason=event.reason?String(event.reason).slice(0,500):null;
  const actorUserId=Number.isInteger(Number(event.actorUserId))&&Number(event.actorUserId)>0?Number(event.actorUserId):null;
  const blockedUntil=event.blockedUntil||null;
  const result=await exec(executor,`
    INSERT INTO customer_order_block_events
      (user_id,action,source,reason,blocked_until,actor_user_id)
    VALUES($1,$2,$3,$4,$5,$6)
    RETURNING *
  `,[userId,action,source,reason,blockedUntil,actorUserId]);
  return result.rows?.[0]||null;
}

function registerOrderBlockHistoryRoutes(app,{db,requireAdmin}){
  app.get("/api/admin/users/:id/order-block-history",requireAdmin,async(req,res)=>{
    const userId=Number(req.params.id);
    if(!Number.isInteger(userId)||userId<=0){
      return res.status(400).json({ok:false,message:"رقم المستخدم غير صالح"});
    }
    try{
      const exists=await db("SELECT id FROM users WHERE id=$1 LIMIT 1",[userId]);
      if(!exists.rowCount)return res.status(404).json({ok:false,message:"المستخدم غير موجود"});
      const result=await db(`
        SELECT
          e.id,
          e.user_id AS "userId",
          e.action,
          e.source,
          e.reason,
          e.blocked_until AS "blockedUntil",
          e.actor_user_id AS "actorUserId",
          COALESCE(actor.name,actor.email,actor.phone) AS "actorName",
          e.created_at AS "createdAt"
        FROM customer_order_block_events e
        LEFT JOIN users actor ON actor.id=e.actor_user_id
        WHERE e.user_id=$1
        ORDER BY e.created_at DESC,e.id DESC
        LIMIT 100
      `,[userId]);
      return res.json({ok:true,events:result.rows});
    }catch(error){
      console.error("[ORDER BLOCK HISTORY]",error);
      return res.status(500).json({ok:false,message:"تعذر تحميل سجل منع الطلب"});
    }
  });
}

module.exports={
  initOrderBlockHistory,
  recordOrderBlockEvent,
  registerOrderBlockHistoryRoutes
};
