'use strict';
const {transaction} = require('./db');
const {requireAdmin} = require('./auth');
function invalid(message) {const e=new Error(message);e.status=400;throw e;}
function registerProductOffers(app) {
  app.patch('/api/admin/products/:id/offers',requireAdmin,async(req,res,next)=>{
    try {
      if(!/^[1-9]\d*$/.test(req.params.id))invalid('رقم المنتج غير صالح');
      const body=req.body||{},patch={};
      for(const key of ['top5','quickOffer','onSale']) if(Object.hasOwn(body,key)) {
        if(typeof body[key]!=='boolean')invalid('حالة العرض غير صالحة');
        patch[key]=body[key];
      }
      for(const key of ['offerExpiry','quickOfferExpiry']) if(Object.hasOwn(body,key)) {
        const value=body[key];
        if(value!==''&&value!==null) {
          if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))invalid('تاريخ انتهاء العرض غير صالح');
          const date=new Date(value+'T00:00:00Z');
          if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)invalid('تاريخ انتهاء العرض غير صالح');
        }
        patch[key]=value||'';
      }
      if(!Object.keys(patch).length)invalid('لا توجد بيانات عرض للتعديل');
      const metadata=await transaction(async client=>{
        const found=await client.query('SELECT metadata, price, old_price FROM products WHERE id=$1 FOR UPDATE',[req.params.id]);
        if(!found.rows.length){const e=new Error('المنتج غير موجود');e.status=404;throw e;}
        const product=found.rows[0],merged={...(product.metadata||{}),...patch};
        if(merged.onSale&&!(Number(product.old_price)>Number(product.price)))invalid('لتفعيل التخفيض، عدّلي السعر السابق ليكون أعلى من السعر الحالي في قسم المنتجات');
        await client.query(`UPDATE products SET metadata=$1::jsonb,
          is_featured=CASE WHEN $2::boolean IS NULL THEN is_featured ELSE $2::boolean END,
          updated_at=NOW() WHERE id=$3`,[JSON.stringify(merged),patch.top5??null,req.params.id]);
        return merged;
      });
      res.json({ok:true,metadata});
    }catch(error){next(error);}
  });
}
module.exports={registerProductOffers};
