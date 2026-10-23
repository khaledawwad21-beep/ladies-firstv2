'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/app.js'),'utf8');
function setup(products,query=''){
 const elements=[];
 function element(tag){const el={tag,children:[],value:'',dataset:{},listeners:{},setAttribute(){},append(...children){children.forEach(c=>this.appendChild(c))},appendChild(child){this.children.push(child);if(this.tag==='select'&&this.children.length===1)this.value=child.value;},replaceChildren(){this.children=[]},addEventListener(type,fn){this.listeners[type]=fn}};elements.push(el);return el;}
 const context=vm.createContext({document:{createElement:element},products,cats:{'شنط':{ar:'شنط'},'عطور':{ar:'عطور'},'ساعات ستاتي':{},'ساعات رجالي':{},'مكياج':{},'اكسسوارات':{},'هدايا':{}},currentLang:'ar',isOfferActive:p=>p.active,totalStock:p=>p.stock,safeImg:v=>v,mainImagesOf:()=>['photo'],LOGO:'logo'});
 vm.runInContext(source.slice(source.indexOf('function nayaOfferDiscount('),source.indexOf('function nayaLocalAnswer(')),context);
 context.nayaAppendOfferBrowser(element('div'),query);
 return{get:cls=>elements.find(e=>e.className===cls)};
}
test('Naya offer filters show every store category even when only bags have an offer',()=>{
 const s=setup([{id:1,name:'شنطة',cat:'شنط',price:100,old:150,stock:2,active:true},{id:2,name:'عطر',cat:'عطور',price:50,stock:2,active:false}]);
 const options=s.get('naya-offer-category').children;
 assert.equal(options.length,8);
 assert.equal(options.find(o=>o.value==='شنط').textContent,'شنط (1)');
 assert.match(options.find(o=>o.value==='عطور').textContent,/بلا عروض حاليًا/);
 const select=s.get('naya-offer-category');select.value='عطور';select.listeners.change();
 assert.equal(s.get('naya-offer-results').children.length,1);
 assert.match(s.get('naya-offer-results').children[0].textContent,/ما في عروض نشطة بهالفئة/);
 select.value='';select.listeners.change();assert.equal(s.get('naya-offer-results').children[0].dataset.nayaOfferId,'1');
});
test('Naya keeps categories visible with no active offers and preselects an empty requested category',()=>{
 const s=setup([],'شو عروض عطور');
 assert.equal(s.get('naya-offer-category').value,'عطور');
 assert.equal(s.get('naya-offer-category').children.length,8);
 assert.match(s.get('naya-offer-results').children[0].textContent,/ما في عروض نشطة بهالفئة/);
});
test('Naya preselects an inferred product category without an explicit cat field',()=>{
 const s=setup([{id:1,name:'شنطة',price:50,old:100,stock:1,active:true}],'شو عروض شنط');
 assert.equal(s.get('naya-offer-category').value,'شنط');
 assert.equal(s.get('naya-offer-results').children[0].dataset.nayaOfferId,'1');
});
