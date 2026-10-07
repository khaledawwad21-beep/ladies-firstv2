'use strict';
const {transaction} = require('./db');
const {requireAdmin} = require('./auth');

function invalid(message) {
  const e=new Error(message);
  e.status=400;
  throw e;
}

function registerProductOffers(app) {
  app.patch('/api/admin/products/:id/offers',requireAdmin,async(req,res,next)=>{
    try {
      if(!/^[1-9]\d*$/.test(req.params.id))invalid('رقم المنتج غير صالح');

      const body=req.body||{},patch={};

      for(const key of ['top5','quickOffer','onSale']) {
        if(Object.hasOwn(body,key)) {
          if(typeof body[key]!=='boolean')invalid('حالة العرض غير صالحة');
          patch[key]=body[key];
        }
      }

      for(const key of ['offerExpiry','quickOfferExpiry']) {
        if(Object.hasOwn(body,key)) {
          const value=body[key];
          if(value!==''&&value!==null) {
            if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))invalid('تاريخ انتهاء العرض غير صالح');
            const date=new Date(value+'T00:00:00Z');
            if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)invalid('تاريخ انتهاء العرض غير صالح');
          }
          patch[key]=value||'';
        }
      }

      const hasSalePrice=Object.hasOwn(body,'salePrice')||Object.hasOwn(body,'price');
      const hasOriginalPrice=Object.hasOwn(body,'originalPrice')||Object.hasOwn(body,'oldPrice')||Object.hasOwn(body,'old_price');
      const salePrice=hasSalePrice?Number(body.salePrice??body.price):null;
      const originalRaw=body.originalPrice??body.oldPrice??body.old_price;
      const originalPrice=hasOriginalPrice&&(originalRaw!==''&&originalRaw!==null)?Number(originalRaw):null;

      if(hasSalePrice&&(!Number.isFinite(salePrice)||salePrice<0))invalid('سعر العرض غير صالح');
      if(hasOriginalPrice&&originalPrice!==null&&(!Number.isFinite(originalPrice)||originalPrice<0))invalid('السعر الأصلي غير صالح');
      if(!Object.keys(patch).length&&!hasSalePrice&&!hasOriginalPrice)invalid('لا توجد بيانات عرض للتعديل');

      const saved=await transaction(async client=>{
        const found=await client.query('SELECT metadata, price, old_price FROM products WHERE id=$1 FOR UPDATE',[req.params.id]);
        if(!found.rows.length){const e=new Error('المنتج غير موجود');e.status=404;throw e;}

        const product=found.rows[0];
        const merged={...(product.metadata||{}),...patch};
        const nextPrice=hasSalePrice?salePrice:Number(product.price||0);
        const nextOldPrice=hasOriginalPrice?originalPrice:(product.old_price===null?null:Number(product.old_price));

        if(merged.onSale&&!(Number(nextOldPrice)>Number(nextPrice))) {
          invalid('السعر الأصلي يجب أن يكون أعلى من سعر العرض لتفعيل التخفيض');
        }

        const updated=await client.query(
          `UPDATE products
           SET metadata=$1::jsonb,
               price=$2,
               old_price=$3,
               is_featured=CASE WHEN $4::boolean IS NULL THEN is_featured ELSE $4::boolean END,
               updated_at=NOW()
           WHERE id=$5
           RETURNING price,old_price`,
          [JSON.stringify(merged),nextPrice,nextOldPrice,patch.top5??null,req.params.id]
        );

        return {
          metadata:merged,
          price:Number(updated.rows[0].price||0),
          oldPrice:updated.rows[0].old_price===null?null:Number(updated.rows[0].old_price)
        };
      });

      res.json({ok:true,...saved});
    } catch(error) {
      next(error);
    }
  });
}

module.exports={registerProductOffers};
