"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),express=require("express");
const{createNayaAiRouter,buildStoreAssistantMessages}=require("../src/naya-ai");
const allowRateLimit=async()=>({allowed:true,retryAfterSeconds:0,requestCount:1});
test("store assistant is focused on shopping and separate from Naya",()=>{
 const messages=buildStoreAssistantMessages({message:"بدي هدية",catalog:[]});
 const prompt=messages.filter(x=>x.role==="system").map(x=>x.content).join(" ");
 assert.match(prompt,/مساعد تسوق ذكي داخل متجر Ladies First/);
 assert.match(prompt,/هل هي للعميل نفسه أم هدية/);
 assert.match(prompt,/لا تخترع منتجات أو أسعارًا/);
 assert.doesNotMatch(prompt,/أنتِ نايا/);
});
test("store AI uses authenticated customer quota and catalog-backed recommendations",async t=>{
 let captured,quotaArgs;
 const app=express();app.use(express.json());
 app.use("/api/ai",createNayaAiRouter({rateLimiter:allowRateLimit,db:async(q,p)=>{if(/INSERT INTO store_ai_daily_usage/.test(q)){quotaArgs=p;return{rows:[{message_count:1}]}}if(/SELECT p.id/.test(q))return{rows:[{id:10,name:"عطر ورد",price:95,stock:2,variants:[]},{id:11,name:"ساعة",price:120,stock:0,variants:[]}]};return{rows:[]}},optionalAuth:(req,_res,next)=>{req.user={id:27};next()},env:{OPENAI_API_KEY:"secret",STORE_AI_DAILY_LIMIT:"12"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"هذا العطر متوفر",recommendationIds:[10,11]})}}]})}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/store-chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"اقترحي عطرًا"})});
 const body=await res.json();
 assert.equal(res.status,200);assert.deepEqual(body.recommendations.map(x=>x.id),[10]);
 assert.equal(quotaArgs[0],"user:27");assert.equal(quotaArgs[2],12);
 assert.equal(captured.url,"https://api.openai.com/v1/chat/completions");
 const request=JSON.parse(captured.o.body);assert.equal(request.model,"gpt-6-luna");assert.match(request.messages[0].content,/لا تخترع منتجات/);
});
test("store AI blocks a customer after the configured daily message limit",async t=>{
 let upstreamCalled=false;
 const app=express();app.use(express.json());
 app.use("/api/ai",createNayaAiRouter({rateLimiter:allowRateLimit,db:async q=>/INSERT INTO store_ai_daily_usage/.test(q)?{rows:[]}:{rows:[]},optionalAuth:(req,_res,next)=>{req.user={id:27};next()},env:{OPENAI_API_KEY:"secret",STORE_AI_DAILY_LIMIT:"1"},fetchImpl:async()=>{upstreamCalled=true;return{ok:true,json:async()=>({})}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/store-chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"اختاري لي هدية"})});
 assert.equal(res.status,429);assert.equal((await res.json()).code,"STORE_AI_DAILY_LIMIT");assert.equal(upstreamCalled,false);
});

