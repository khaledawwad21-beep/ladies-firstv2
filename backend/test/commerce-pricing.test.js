'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {pricing}=require('../../frontend/commerce-pricing');
test('sale dates include the full Palestinian day across the UTC boundary',()=>{
 const p={price:100,old_price:150,metadata:{onSale:true,saleStartsAt:'2026-06-01',saleEndsAt:'2026-06-01'}};
 for(const [time,price] of [['2026-05-31T20:59:59Z',150],['2026-05-31T21:00:00Z',100],['2026-06-01T20:59:59Z',100],['2026-06-01T21:00:00Z',150]])assert.equal(pricing(p,null,Date.parse(time)).price,price,time);
});
test('invalid windows fail closed and public catalog prices keep the stored sale for reevaluation',()=>{
 const p={price:150,salePrice:100,oldPrice:150,metadata:{onSale:true,saleStartsAt:'2099-01-01',saleEndsAt:'2099-01-02'}};
 assert.equal(pricing(p,null,Date.parse('2099-01-01T10:00:00Z')).price,100);
 assert.equal(pricing({...p,metadata:{saleStartsAt:'2026-02-30',saleEndsAt:'2026-03-02'}}).price,150);
 assert.equal(pricing({...p,metadata:{saleStartsAt:'2026-05-02',saleEndsAt:'2026-05-01'}}).active,false);
});
test('legacy expiry restores the original price while explicit variant prices and zero checks remain authoritative',()=>{
 const p={price:100,old_price:150,metadata:{onSale:true,offerExpiry:'2000-01-01'}};
 assert.equal(pricing(p).price,150);assert.equal(pricing(p).active,false);
 assert.equal(pricing({price:100},{price:125}).price,125);
 assert.equal(pricing({price:100},{price:0}).purchasable,false);
 assert.equal(pricing({price:0}).purchasable,false);
 assert.equal(pricing({price:0,old_price:120}).active,false);
 assert.equal(pricing({price:100,old_price:150,metadata:{onSale:false}}).active,false);
});
