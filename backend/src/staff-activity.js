'use strict';
async function initStaffActivity(db){
 await db(`CREATE TABLE IF NOT EXISTS staff_activity_log(id BIGSERIAL PRIMARY KEY,actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,actor_name TEXT NOT NULL,method TEXT NOT NULL,resource TEXT NOT NULL,target_id BIGINT,action TEXT NOT NULL,status_code INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 await db('CREATE INDEX IF NOT EXISTS staff_activity_actor_date ON staff_activity_log(actor_id,created_at DESC)');
 await db('ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by BIGINT REFERENCES users(id) ON DELETE SET NULL');
 await db('ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by_name TEXT');
 await db('ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ');
}
function activityMiddleware(db){return (req,res,next)=>{
 if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return next();
 const parts=String(req.originalUrl||req.url).split('?')[0].split('/').filter(Boolean).slice(2);
 const resource=parts[0]||'admin',target=parts.find(x=>/^\d+$/.test(x)),action=parts.filter(x=>!/^[0-9]+$/.test(x)).join('/').slice(0,180);
 let createdId=null;const json=res.json;res.json=function(payload){const id=payload?.id||payload?.order?.id||payload?.product?.id||payload?.user?.id;if(Number.isSafeInteger(Number(id))&&Number(id)>0)createdId=Number(id);return json.call(this,payload)};
 res.once('finish',()=>{if(!req.user||!['owner','admin','staff'].includes(req.user.role))return;
  db(`INSERT INTO staff_activity_log(actor_id,actor_name,method,resource,target_id,action,status_code) SELECT id,COALESCE(NULLIF(name,''),'موظف #'||id),$2,$3,$4,$5,$6 FROM users WHERE id=$1`,[req.user.id,req.method,resource,target||createdId||null,action,res.statusCode]).catch(e=>console.error('[STAFF ACTIVITY]',e.message));
 });next();
}}
function registerStaffActivity(app,{db,transaction,requireAdmin}){
 app.get('/api/admin/reports/staff-activity',requireAdmin,async(req,res,next)=>{try{
  const {from,to,employee}=req.query;
  const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  if(!validDate(from)||!validDate(to)||from>to)return res.status(400).json({ok:false,message:'اختاري فترة تاريخ صحيحة'});
  if(employee&&!/^\d+$/.test(employee))return res.status(400).json({ok:false,message:'الموظف غير صالح'});
  const page=Math.max(1,Math.min(10000,Math.floor(Number(req.query.page)||1))),values=[from,to,employee||null];
  const where=`created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Jerusalem') AND created_at < (($2::date+1)::timestamp AT TIME ZONE 'Asia/Jerusalem') AND ($3::bigint IS NULL OR actor_id=$3::bigint)`;
  const rows=await db(`SELECT * FROM staff_activity_log WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $4`,[...values,(page-1)*50]);
  const count=await db(`SELECT COUNT(*)::int AS total FROM staff_activity_log WHERE ${where}`,values);
  const employees=await db(`SELECT id,name,role FROM users WHERE role IN ('owner','admin','staff') ORDER BY name,id`);
  res.json({ok:true,rows:rows.rows,total:count.rows[0].total,page,employees:employees.rows});
 }catch(e){next(e)}});
 app.post('/api/admin/orders/:id/preparation',requireAdmin,async(req,res,next)=>{try{
  if(!/^\d+$/.test(req.params.id))return res.status(400).json({ok:false,message:'رقم الطلب غير صالح'});
  const order=await transaction(async client=>{
   const result=await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[req.params.id]);const order=result.rows[0];
   if(!order){const e=new Error('الطلب غير موجود');e.status=404;throw e;}
   if(order.prepared_at){if(Number(order.prepared_by)===Number(req.user.id))return order;const e=new Error('تم تسجيل تجهيز هذا الطلب باسم '+order.prepared_by_name);e.status=409;throw e;}
   if(['cancelled','delivered','completed'].includes(order.status)){const e=new Error('لا يمكن تسجيل تجهيز طلب ملغي أو مكتمل');e.status=409;throw e;}
   const actor=await client.query('SELECT name FROM users WHERE id=$1',[req.user.id]);
   const actorName=actor.rows[0]?.name||'موظف #'+req.user.id;
   const updated=await client.query(`UPDATE orders SET prepared_by=$2,prepared_by_name=$3,prepared_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,req.user.id,actorName]);return updated.rows[0];
  });res.json({ok:true,order});
 }catch(e){next(e)}});
}
module.exports={initStaffActivity,activityMiddleware,registerStaffActivity};
