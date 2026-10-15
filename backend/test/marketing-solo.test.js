'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {defaults,validateSettings,trialFor,rankCandidates,channelAdvice,today}=require('../src/marketing-solo');
test('solo trial needs costs and cap; budget respects risk, stock and goal',()=>{
 const c={unit_price:100,unit_cost:40,stock:2},s={...defaults(),risk_cap:100,extra_cost:10,goal:5};
 assert.equal(trialFor(c,defaults()).ready,false);
 const q=trialFor(c,s);assert.equal(q.target_cpa,35);assert.equal(q.amount,70);assert.equal(q.reserved_profit,15);assert.equal(q.limited_by,'stock');
 assert.equal(trialFor(c,{...s,risk_cap:10}).amount,10);assert.equal(trialFor(c,{...s,goal:1}).amount,35);
 assert.equal(trialFor(c,{...s,extra_cost:61}).ready,false);assert.equal(trialFor(c,{...s,risk_cap:0}).ready,false);
 for(const patch of [{risk_cap:-1},{extra_cost:'0'},{reserve:100},{goal:1.5},{days:31}])assert.throws(()=>validateSettings({...s,...patch}));
 assert.equal(today(new Date('2026-10-15T22:30:00Z')),'2026-10-16');
});
test('candidate choice respects variants, actual prices, known costs and available stock',()=>{
 const products=[{id:1,name:'Unknown',price:100,cost_price:0,stock:10},{id:2,name:'Options',price:100,cost_price:40,stock:20},{id:3,name:'Loss',price:20,cost_price:40,stock:8},{id:4,name:'Safe',price:100,cost_price:50,stock:4}];
 const variants=[{id:20,product_id:2,price:120,stock:0},{id:21,product_id:2,price:110,stock:1}];
 const picks=rankCandidates(products,variants,[{id:2,units:100,carts:20}]);
 assert.equal(picks.length,2);assert.equal(picks[0].product_id,4);assert.equal(picks[1].variant_id,21);assert.equal(picks[1].unit_price,110);assert.equal(picks[1].units,100);
});
test('channel decisions require delivered sample and margin, never auto-scaling',()=>{
 const data={budget:{ready:true,targetCPA:20},channels:[{source:'facebook',spend:100,paid_delivered:0},{source:'instagram',spend:200,paid_delivered:5},{source:'tiktok',spend:100,paid_delivered:5}]};
 assert.deepEqual(channelAdvice(data).map(x=>x.action),['collect','review','hold']);assert.ok(channelAdvice({...data,budget:{ready:false}}).every(x=>x.action==='collect'));
});
