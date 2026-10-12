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
 const{buildNayaMessages,buildStoreAssistantMessages}=require("../src/naya-ai");
 const messages=buildNayaMessages({message:"بدي تجميعة",catalog:[],history:[]});
 const prompt=messages.filter(x=>x.role==="system").map(x=>x.content).join(" ");
 assert.match(prompt,/هل هي للعميل نفسه أم هدية لشخص آخر/);
 assert.match(prompt,/اسألي عن عمر وجنس المستلم والمناسبة/);
 assert.match(prompt,/لا تفترضي الذوق أو نوع المنتجات المناسبة من الجنس وحده/);
});
test("Naya passes only sanitized self profile and says not to use it for gifts",()=>{
 const{buildNayaMessages,buildStoreAssistantMessages}=require("../src/naya-ai");
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
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret",OPENAI_TTS_VOICE:"marin"},fetchImpl:async(_url,o)=>{captured=o;return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"أهلًا",recommendationIds:[]})}}]})}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"مرحبا"})});
 assert.equal(res.status,200);assert.equal(JSON.parse(captured.body).model,"gpt-6-luna");
});

test("Naya transcribes Arabic customer audio without exposing the server key",async t=>{
 let captured;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,json:async()=>({text:"بدي ساعة هدية"})}}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const audio=Buffer.from([1,2,3,4]);
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/ai/transcribe`,{method:"POST",headers:{"Content-Type":"audio/webm;codecs=opus"},body:audio});
 const result=await res.json();
 assert.equal(res.status,200);assert.deepEqual(result,{ok:true,text:"بدي ساعة هدية"});
 assert.equal(captured.url,"https://api.openai.com/v1/audio/transcriptions");assert.equal(captured.o.headers.Authorization,"Bearer secret");
 const form=captured.o.body;assert.equal(form.get("model"),"gpt-4o-mini-transcribe");assert.equal(form.get("language"),"ar");
 const file=form.get("file");assert.equal(file.type,"audio/webm");assert.equal(file.name,"customer-question.webm");assert.deepEqual(Buffer.from(await file.arrayBuffer()),audio);
});

test("Naya transcription has its own rate limit",async t=>{
 let captured;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},rateLimiter:async input=>{captured=input;return{allowed:false,retryAfterSeconds:30,requestCount:11}}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/ai/transcribe`,{method:"POST",headers:{"Content-Type":"audio/webm"},body:Buffer.from([1])});
 assert.equal(res.status,429);assert.equal(captured.scope,"naya-transcribe");assert.equal(captured.limit,10);
});

test("Naya voice endpoint uses the server key and returns uncached audio",async t=>{
 let captured;
 const bytes=Buffer.from([1,2,3,4]);
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async(url,o)=>{captured={url,o};return{ok:true,body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1,2]));setTimeout(()=>{controller.enqueue(new Uint8Array([3,4]));controller.close()},35)}})}}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"أهلًا وسهلًا سيدتي"})});
 assert.equal(res.status,200);assert.equal(res.headers.get("content-type"),"audio/mpeg");assert.equal(res.headers.get("cache-control"),"no-store");
 assert.equal(captured.url,"https://api.openai.com/v1/audio/speech");assert.equal(captured.o.headers.Authorization,"Bearer secret");
 const payload=JSON.parse(captured.o.body);assert.equal(payload.model,"gpt-4o-mini-tts");assert.equal(payload.voice,"shimmer");assert.equal(payload.speed,1);assert.match(payload.instructions,/distinctly feminine, light, youthful voice/);assert.match(payload.instructions,/natural urban Lebanese \(Beirut\) colloquial accent/);assert.match(payload.instructions,/subtly playful and sweet/);assert.doesNotMatch(payload.instructions,/deep or masculine timbre|announcer delivery|drawn-out syllables/);
 const reader=res.body.getReader(),chunks=[];while(true){const part=await reader.read();if(part.done)break;chunks.push(Buffer.from(part.value))}assert.deepEqual(Buffer.concat(chunks),bytes);
});

test("Naya voice endpoint refuses text without an API key",async t=>{
 const app=express();app.use(express.json());app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{}}));
 const s=app.listen(0);t.after(()=>s.close());await new Promise(r=>s.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${s.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"مرحبًا"})});
 assert.equal(res.status,503);assert.equal((await res.json()).code,"NAYA_AI_NOT_CONFIGURED");
});

test("Naya voice endpoint replaces the legacy Sage setting with Shimmer",async t=>{
 let captured;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret",NAYA_TTS_VOICE:"sage"},fetchImpl:async(_url,o)=>{captured=o;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const res=await fetch(`http://127.0.0.1:${server.address().port}/api/ai/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"مرحبًا"})});
 assert.equal(res.status,200);assert.equal(JSON.parse(captured.body).voice,"shimmer");
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

test("Naya prompt identifies a friendly sales employee and includes the live WhatsApp contact",()=>{
 const{buildNayaMessages}=require("../src/naya-ai");
 const prompt=buildNayaMessages({message:"أريد عطرًا",catalog:[],whatsappNumber:"+972 (56) 249-9924"}).find(x=>x.role==="system").content;
 assert.ok(prompt.includes("موظفة مبيعات ودودة"));assert.ok(prompt.includes("سأسأل الفريق"));assert.ok(prompt.includes("لهجة لبنانية محكية حضرية"));assert.ok(prompt.includes("هيدي"));assert.ok(prompt.includes("هلّق"));assert.ok(prompt.includes("972562499924"));assert.ok(prompt.includes("https://wa.me/972562499924?text="));const storePrompt=buildStoreAssistantMessages({message:"أريد عطرًا",catalog:[]})[0].content;assert.ok(storePrompt.includes("بلهجة لبنانية محكية حضرية"));assert.ok(storePrompt.includes("هيدي"));
});
test("Naya rejects messages over 1000 characters before calling OpenAI",async t=>{
 let upstreamCalled=false;const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async()=>{upstreamCalled=true;throw Error("must not call upstream")}}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const res=await fetch("http://127.0.0.1:"+server.address().port+"/api/ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"ا".repeat(1001)})});
 assert.equal(res.status,413);assert.equal((await res.json()).code,"NAYA_MESSAGE_TOO_LONG");assert.equal(upstreamCalled,false);
});
test("Naya guest rate limit ignores resettable browser IDs and uses IP; accounts use customer ID",async t=>{
 const identities=[];const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({optionalAuth:(req,res,next)=>{if(req.headers.authorization==="Bearer customer-token")req.user={id:42};next()},rateLimiter:async input=>{identities.push(input.clientId);return{allowed:true,retryAfterSeconds:0,requestCount:1}},db:async()=>({rows:[]}),env:{OPENAI_API_KEY:"secret"},fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"أهلًا",recommendationIds:[]})}}]})})}));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const url="http://127.0.0.1:"+server.address().port+"/api/ai/chat";
 for(const clientId of ["browser-customer-123456","new-id-after-clearing-storage"]){const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"مرحبا",clientId})});assert.equal(res.status,200)}
 const signed=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer customer-token"},body:JSON.stringify({message:"مرحبا",clientId:"another-browser-id"})});assert.equal(signed.status,200);
 assert.equal(identities[0],identities[1]);assert.match(identities[0],/^ip:/);assert.equal(identities[2],"customer:42");assert.doesNotMatch(identities[0],/browser-customer|new-id/);
});

test("owner account bypasses Naya AI quotas while customer role stays rate limited",async t=>{
 let rateCalls=0,dailyCalls=0;
 const app=express();app.use(express.json());
 app.use("/api/ai",createRouter({
  optionalAuth:(req,res,next)=>{req.user=req.headers.authorization==="Bearer owner-token"?{id:1,role:"owner"}:{id:2,role:"customer"};next()},
  rateLimiter:async()=>{rateCalls++;return{allowed:false,retryAfterSeconds:60}},
  db:async query=>{if(/INSERT INTO store_ai_daily_usage/.test(query))dailyCalls++;return{rows:[]}},
  env:{OPENAI_API_KEY:"secret"},
  fetchImpl:async url=>url.includes("/audio/speech")?{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}:{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({reply:"أهلًا",recommendationIds:[]})}}]})}
 }));
 const server=app.listen(0);t.after(()=>server.close());await new Promise(r=>server.once("listening",r));
 const base="http://127.0.0.1:"+server.address().port+"/api/ai";
 for(const [path,body] of [["/chat",{message:"مرحبا"}],["/store-chat",{message:"مرحبا"}],["/tts",{text:"مرحبا"}]]){
  const response=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer owner-token"},body:JSON.stringify(body)});
  assert.equal(response.status,200,path);
 }
 assert.equal(rateCalls,0);assert.equal(dailyCalls,0);
 const customer=await fetch(base+"/chat",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer customer-token"},body:JSON.stringify({message:"مرحبا",role:"owner"})});
 assert.equal(customer.status,429);assert.equal(rateCalls,1);assert.equal(dailyCalls,0);
});
