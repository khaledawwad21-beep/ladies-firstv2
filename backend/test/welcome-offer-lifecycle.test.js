'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/welcome-offer.js'),'utf8');
class Element {
 constructor(){this.children=[];this.style={};this.events={};const values=new Set();this.classList={add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};}
 setAttribute(){} append(...children){this.children.push(...children)} addEventListener(type,fn){this.events[type]=fn} focus(){} remove(){this.removed=true}
}
async function visit(blocked=false){
 const body=new Element(),intervals=new Map(),frames=[];let next=0;
 const document={body,readyState:'complete',createElement:()=>new Element(),getElementById:id=>body.children.find(e=>e.id===id&&!e.removed),querySelector:()=>blocked?{}:null};
 const window={setInterval:fn=>{intervals.set(++next,fn);return next},clearInterval:id=>intervals.delete(id),setTimeout:fn=>fn()};
 vm.runInNewContext(source,{document,window,requestAnimationFrame:fn=>frames.push(fn),fetch:async()=>({json:async()=>({offer:{enabled:true,scope:'all',startAt:'2020-01-01',endAt:'2099-01-01'}})})});
 await intervals.get(1)();
 return {body,intervals,frames,popup:body.children[0],release:()=>{blocked=false;}};
}
test('welcome close clears all timers and unlocks scrolling, including before first animation frame',async()=>{
 for(const beforeFrame of [false,true]){
  const {body,intervals,frames,popup}=await visit();
  assert.equal(intervals.size,1);
  if(!beforeFrame)frames.shift()();
  const close=popup.children[1].children[0];close.events.click();close.events.click();
  for(const frame of frames)frame();
  assert.equal(intervals.size,0);assert.equal(body.classList.contains('lf-welcome-offer-open'),false);assert.equal(popup.removed,true);
 }
 const nextVisit=await visit();assert.ok(nextVisit.popup); // No cross-visit suppression.
});

test('welcome waits for the wheel to close instead of stacking startup dialogs',async()=>{const page=await visit(true);assert.equal(page.body.children.length,0);page.release();await page.intervals.get(1)();assert.equal(page.body.children.length,1);});
