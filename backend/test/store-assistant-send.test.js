'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/store-assistant.js'),'utf8');
function setup(){
 const requests=[],rows=[];
 const node=()=>({children:[],append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},setAttribute(){},addEventListener(){},remove(){this.removed=true},focus(){}});
 const input={value:'Help me choose a gift',focus(){}},box=node();box.appendChild=row=>rows.push(row);
 const status=node(),mic=node();
 const document={readyState:'loading',addEventListener(){},querySelector:s=>({'#lfStoreAiInput':input,'#lfStoreAiMessages':box,'#lfStoreAiRecordingStatus':status,'.lf-store-ai-mic':mic}[s]),createElement:node,createTextNode:text=>({textContent:text})};
 const window={lfAiHeaders:async()=>({'Content-Type':'application/json',Authorization:'Bearer owner'}),addEventListener(){}};
 const fetch=async(url,options)=>{requests.push({url,options});return{ok:true,json:async()=>url.endsWith('/transcribe')?{ok:true,text:'بدي هدية'}:{ok:true,reply:'Who is the gift for?',recommendations:[]}}};
 vm.runInNewContext(source.replace('window.openStoreAIAssistant=open;','window.testSend=send;window.testTranscribe=transcribe;window.openStoreAIAssistant=open;'),{window,document,fetch,location:{origin:'https://store.test'},URL});
 return{window,requests,rows,input};
}
test('shopping assistant sends typed messages with auth and carries the conversation forward',async()=>{
 const s=setup();await s.window.testSend();
 assert.equal(s.requests[0].url,'https://store.test/api/ai/store-chat');
 assert.equal(s.requests[0].options.headers.Authorization,'Bearer owner');
 assert.equal(JSON.parse(s.requests[0].options.body).message,'Help me choose a gift');
 assert.equal(s.input.value,'');assert.ok(s.rows.some(r=>r.className==='lf-store-ai-message assistant'));
 await s.window.testSend('For my sister');
 assert.equal(JSON.parse(s.requests[1].options.body).history.length,2);
});
test('shopping assistant sends the transcribed voice question to chat',async()=>{
 const s=setup();await s.window.testTranscribe({type:'audio/webm'});
 assert.equal(s.requests[0].url,'https://store.test/api/ai/transcribe');
 assert.equal(s.requests[1].url,'https://store.test/api/ai/store-chat');
 assert.equal(JSON.parse(s.requests[1].options.body).message,'بدي هدية');
});

function productReturnSetup(){
 const classes=()=>({add(){},remove(){}}),originalMessages={transcript:'original conversation',scrollTop:147};
 const body={style:{position:'relative',top:'3px',width:'95%'},classList:classes()};
 const html={style:{overflow:'auto'}};
 const dialog={hidden:true},modal={hidden:false,style:{display:'none'}},input={value:'لسه عندي سؤال',focus(){}};
 const observers=[],document={readyState:'loading',body,documentElement:html,addEventListener(){},querySelector:s=>({'#lfStoreAiDialog':dialog,'#modal':modal,'#lfStoreAiInput':input,'#lfStoreAiMessages':originalMessages}[s])};
 const window={scrollY:250,scrollTo(x,y){this.restoredScroll=y},openProduct(){modal.style.display='flex'}};
 class Observer{constructor(cb){this.callback=cb;observers.push(this)}observe(){this.active=true}disconnect(){this.active=false}}
 const exposed=source.replace('window.openStoreAIAssistant=open;','window.testOpenRecommendedProduct=openRecommendedProduct;window.openStoreAIAssistant=open;');
 vm.runInNewContext(exposed,{window,document,location:{origin:'https://store.test'},URL,MutationObserver:Observer,getComputedStyle:el=>el.style});
 return {window,dialog,modal,input,messages:originalMessages,body,html,observers};
}
test('closing a recommended product restores the same Naya conversation, draft, reading position and page lock',()=>{
 const s=productReturnSetup(),trigger={isConnected:true,focus(){this.focused=true}};
 s.window.openStoreAIAssistant();s.window.openStoreAIAssistant();
 s.window.testOpenRecommendedProduct(7,trigger);assert.equal(s.dialog.hidden,true);assert.equal(s.modal.style.display,'flex');
 s.modal.style.display='none';s.observers[0].callback();
 assert.equal(s.dialog.hidden,false);assert.equal(s.input.value,'لسه عندي سؤال');assert.equal(s.messages.transcript,'original conversation');assert.equal(s.messages.scrollTop,147);assert.equal(trigger.focused,true);assert.equal(s.body.style.position,'fixed');assert.equal(s.observers[0].active,false);
 s.window.closeStoreAIAssistant();assert.equal(s.body.style.position,'relative');assert.equal(s.body.style.top,'3px');assert.equal(s.body.style.width,'95%');assert.equal(s.html.style.overflow,'auto');assert.equal(s.window.restoredScroll,250);
});
test('explicitly leaving Naya while a product is open cancels the automatic return',()=>{
 const s=productReturnSetup();s.window.openStoreAIAssistant();s.window.testOpenRecommendedProduct(7,null);s.window.closeStoreAIAssistant();s.modal.style.display='none';s.observers[0].callback();assert.equal(s.dialog.hidden,true);assert.equal(s.observers[0].active,false);
});
test('invalid or unavailable product navigation keeps Naya visible',()=>{
 const s=productReturnSetup();s.window.openStoreAIAssistant();s.window.testOpenRecommendedProduct(NaN,null);assert.equal(s.dialog.hidden,false);assert.equal(s.observers.length,0);
 s.window.openProduct=()=>{};s.window.testOpenRecommendedProduct(7,null);assert.equal(s.dialog.hidden,false);assert.equal(s.observers[0].active,false);
});
