"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),express=require("express");
const{createNayaAiRouter:baseCreateNayaAiRouter,history,parseReply,product}=require("../src/naya-ai");
const allowRateLimit=async()=>({allowed:true,retryAfterSeconds:0,requestCount:1});
const createRouter=options=>baseCreateNayaAiRouter({...options,rateLimiter:options?.rateLimiter||allowRateLimit});
test("Naya limits conversation history and ignores unsupported roles",()=>{const h=history([{role:"system",content:"bad"},{role:"user",content:" أهلا "},{role:"assistant",content:"مرحبا"}]);assert.equal(h.length,2);assert.equal(h[0].content,"أهلا")});
test("Naya recommendations can only reference available catalog products",()=>{const c=[product({id:1,name:"عطر",price:50,stock:2}),product({id:2,name:"حقيبة",stock:0})];assert.deepEqual(parseReply(JSON.stringify({reply:"أنصحك",recommendationIds:[1,2,1,999]}),c).ids,[1])});
test("Naya route uses live catalog and keeps secrets/body profile off client and model input",async t=>{let captured;const app=express();app.use(express.json());app.use("/api/ai",createRouter({db:async(q,p)=>{assert.match(q,/p.is_active=TRUE/);assert.deepEqual(p,[80]);return{rows:[{id:10,name:"عطر الورد",price:99,stock:3,variants:[]}] }},env:{OPENAI_API_KEY:"secret",NAYA_OPENAI_MODEL:"test-model"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"متوفر",recommendationIds:[10]})}}]})}}}));const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"عطر",bodyProfile:{waist:72},account:{name:"secret-user"}})});const b=await res.json();assert.equal(res.status,200);assert.equal(b.recommendations[0].id,10);assert.equal(captured.o.headers.Authorization,"Bearer secret");assert.equal(JSON.parse(captured.o.body).model,"test-model");assert.doesNotMatch(captured.o.body,/waist|secret-user/)});
test("Naya reports missing server key instead of pretending to answer",async t=>{const app=express();app.use(express.json());app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{}}));const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));const r=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"مرحبا"})});assert.equal(r.status,503);assert.equal((await r.json()).code,"NAYA_AI_NOT_CONFIGURED")});

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


test("Naya defaults to the selected cost-efficient OpenAI model",async t=>{
 let captured;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async(_url,o)=>{captured=o;return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"أهلًا",recommendationIds:[]})}}]})}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"مرحبا"})});
 assert.equal(res.status,200);assert.equal(JSON.parse(captured.body).model,"gpt-6-luna");
});

test("Naya voice endpoint uses the server key and returns uncached audio",async t=>{
 let captured;
 const bytes=Buffer.from([1,2,3,4]);
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"أهلًا وسهلًا سيدتي"})});
 assert.equal(res.status,200);assert.equal(res.headers.get("content-type"),"audio/mpeg");assert.equal(res.headers.get("cache-control"),"no-store");
 assert.equal(captured.url,"https://api.openai.com/v1/audio/speech");assert.equal(captured.o.headers.Authorization,"Bearer secret");
 const payload=JSON.parse(captured.o.body);assert.equal(payload.model,"gpt-4o-mini-tts");assert.equal(payload.voice,"coral");assert.match(payload.instructions,/فلسطينية حضرية/);
 assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
});

test("Naya voice endpoint refuses text without an API key",async t=>{
 const app=express();app.use(express.json());app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"مرحبًا"})});
 assert.equal(res.status,503);assert.equal((await res.json()).code,"NAYA_AI_NOT_CONFIGURED");
});

test("Naya voice endpoint honors the Render OPENAI_TTS_VOICE setting",async t=>{
 let captured;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret",OPENAI_TTS_VOICE:"marin"},fetchImpl:async(_url,o)=>{captured=o;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"مرحبًا"})});
 assert.equal(res.status,200);assert.equal(JSON.parse(captured.body).voice,"marin");
});

test("Naya chat endpoints share a persistent rate-limit scope and TTS has its own scope",async t=>{
 const calls=[];
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},rateLimiter:async input=>{calls.push(input);return{allowed:true,retryAfterSeconds:0,requestCount:1}}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const base=`http://127.0.0.1:${server.address().port}/api/ai`;
 for(const [path,body] of [["/chat",{message:"مرحبا"}],["/store-chat",{message:"مرحبا"}],["/tts",{text:"مرحبا"}]]){
  await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 }
 assert.deepEqual(calls.map(x=>x.scope),["naya-chat","naya-chat","naya-tts"]);
 assert.deepEqual(calls.map(x=>x.limit),[20,20,10]);
});
