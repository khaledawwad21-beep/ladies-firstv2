"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),express=require("express");
const{createNayaAiRouter,history,parseReply,product}=require("../src/naya-ai");
test("Naya limits conversation history and ignores unsupported roles",()=>{const h=history([{role:"system",content:"bad"},{role:"user",content:" أهلا "},{role:"assistant",content:"مرحبا"}]);assert.equal(h.length,2);assert.equal(h[0].content,"أهلا")});
test("Naya recommendations can only reference available catalog products",()=>{const c=[product({id:1,name:"عطر",price:50,stock:2}),product({id:2,name:"حقيبة",stock:0})];assert.deepEqual(parseReply(JSON.stringify({reply:"أنصحك",recommendationIds:[1,2,1,999]}),c).ids,[1])});
test("Naya route uses live catalog and keeps secrets/body profile off client and model input",async t=>{let captured;const app=express();app.use(express.json());app.use("/api/ai",createNayaAiRouter({db:async(q,p)=>{assert.match(q,/p.is_active=TRUE/);assert.deepEqual(p,[80]);return{rows:[{id:10,name:"عطر الورد",price:99,stock:3,variants:[]}] }},env:{OPENAI_API_KEY:"secret",NAYA_OPENAI_MODEL:"test-model"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"متوفر",recommendationIds:[10]})}}]})}}}));const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"عطر",bodyProfile:{waist:72},account:{name:"secret-user"}})});const b=await res.json();assert.equal(res.status,200);assert.equal(b.recommendations[0].id,10);assert.equal(captured.o.headers.Authorization,"Bearer secret");assert.equal(JSON.parse(captured.o.body).model,"test-model");assert.doesNotMatch(captured.o.body,/waist|secret-user/)});
test("Naya reports missing server key instead of pretending to answer",async t=>{const app=express();app.use(express.json());app.use("/api/ai",createNayaAiRouter({db:async()=>({rows:[]}),env:{}}));const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));const r=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"مرحبا"})});assert.equal(r.status,503);assert.equal((await r.json()).code,"NAYA_AI_NOT_CONFIGURED")});

test("Naya customer context accepts only a valid age and gender",()=>{
 const{sanitizeCustomerProfile}=require("../src/naya-ai");
 assert.deepEqual(sanitizeCustomerProfile({age:29,gender:"female",name:"private",phone:"123"}),{age:29,gender:"female"});
 assert.deepEqual(sanitizeCustomerProfile({age:12,gender:"other"}),null);
 assert.deepEqual(sanitizeCustomerProfile({age:35,gender:"male"}),{age:35,gender:"male"});
});
test("Naya distinguishes self recommendations from gifts and requests recipient details",()=>{
 const{buildNayaMessages}=require("../src/naya-ai");
 const messages=buildNayaMessages({message:"بدي تجميعة",catalog:[],history:[]});
 const prompt=messages.filter(x=>x.role==="system").map(x=>x.content).join(" ");
 assert.match(prompt,/هل هي للعميل نفسه أم هدية لشخص آخر/);
 assert.match(prompt,/اسألي عن عمر وجنس المستلم والمناسبة/);
 assert.match(prompt,/لا تفترضي الذوق أو نوع المنتجات المناسبة من الجنس وحده/);
});
test("Naya passes only sanitized self profile and says not to use it for gifts",()=>{
 const{buildNayaMessages}=require("../src/naya-ai");
 const messages=buildNayaMessages({message:"اقترحي عطرًا لي",catalog:[],history:[],customerProfile:{age:31,gender:"female",name:"private",phone:"123"}});
 const profile=messages.find(x=>x.role==="system"&&x.content.startsWith("بيانات ملف العميل"));
 assert.ok(profile);
 assert.match(profile.content,/"age":31/);
 assert.match(profile.content,/"gender":"female"/);
 assert.doesNotMatch(profile.content,/private|123/);
 assert.match(profile.content,/لا تستخدم هذه البيانات إذا كانت التوصية هدية لشخص آخر/);
});
