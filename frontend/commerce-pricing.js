(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.LFCommerce=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'});
  function localDay(now){
    const parts=dateFormat.formatToParts(new Date(now));
    const part=name=>parts.find(p=>p.type===name).value;
    return part('year')+'-'+part('month')+'-'+part('day');
  }
  function validDay(day){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
    const date=new Date(day+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
  }
  function pricing(product,variant=null,now=Date.now()){
    const p=product||{},m=p.metadata||{};
    const sale=Number(p.salePrice??p.price),original=Number(p.old_price??p.oldPrice??p.old);
    const start=String(m.saleStartsAt??p.saleStartsAt??''),end=String(m.saleEndsAt??p.saleEndsAt??'');
    // Legacy offerExpiry applies to an explicitly discounted product too.
    const expiry=String(m.offerExpiry??p.offerExpiry??'');
    const scheduled=!!(start||end),hasDiscount=Number.isFinite(original)&&original>sale;
    const day=localDay(now);
    const inWindow=scheduled?validDay(start)&&validDay(end)&&start<=end&&day>=start&&day<=end:!expiry||validDay(expiry)&&day<=expiry;
    const enabled=(m.onSale??p.onSale)!==false;
    const active=hasDiscount&&sale>0&&enabled&&inWindow;
    // Unscheduled legacy products keep their configured current price.
    const base=hasDiscount&&(scheduled||expiry)&&!active?original:sale;
    const variantPrice=variant?.price;
    const price=variantPrice!==null&&variantPrice!==undefined&&variantPrice!==''?Number(variantPrice):base;
    return {price,salePrice:sale,originalPrice:original,active,scheduled,inWindow,purchasable:Number.isFinite(price)&&price>0};
  }
  return {pricing,localDay};
});
