'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../../frontend');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
function fn(name){const start=app.indexOf('function '+name+'(');const end=app.indexOf('\nfunction ',start+1);return app.slice(start,end<0?undefined:end);}
function decode(text){return text.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
test('all shipped JavaScript bundles parse',()=>{
 for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
});
test('catalog names stay inert inside rendered event attributes',()=>{
 const payload="');globalThis.probe=1;//";
 const elements=Object.fromEntries(['cats','filter','brandFilter','sideCats','sideBrands'].map(k=>[k,{innerHTML:''}]));
 const ctx=vm.createContext({LOGO:'/safe.png',cats:{[payload]:{ar:payload}},brands:{},products:[],currentLang:'ar',document:{getElementById:id=>elements[id]},setCat:value=>{assert.equal(value,payload)},toggleSideMenu:()=>{}});
 vm.runInContext(['esc','safeImg','jsAttr','renderCats'].map(fn).join('\n'),ctx);vm.runInContext('renderCats()',ctx);
 for(const id of ['cats','sideCats']){
  const event=elements[id].innerHTML.match(/onclick="([^"]*)"/)[1];vm.runInContext(decode(event),ctx);assert.equal(ctx.probe,undefined);
 }
});
test('image sources reject executable protocols and attribute breakouts',()=>{
 const ctx=vm.createContext({LOGO:'/safe.png'});vm.runInContext(fn('safeImg'),ctx);
 for(const value of ['javascript:alert(1)','https://example.com/x" onerror="probe=1','data:text/html,test'])assert.equal(ctx.safeImg(value),'/safe.png');
 assert.equal(ctx.safeImg('https://example.com/product.png'),'https://example.com/product.png');
});
