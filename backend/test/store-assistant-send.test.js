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
