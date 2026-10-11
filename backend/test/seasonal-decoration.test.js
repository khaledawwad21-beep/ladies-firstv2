'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../../frontend/seasonal-themes.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../../frontend/seasonal-themes.css'),'utf8');
class Element {
  constructor(){this.children=[];this.classes=new Set();this.attributes={};this.classList={add:(...names)=>names.forEach(x=>this.classes.add(x))};}
  setAttribute(name,value){this.attributes[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  insertAdjacentElement(where,child){if(where!=='afterend')throw Error('Unsupported');this.added=child;}
}
function render(active){
  const header=new Element(),footer=new Element(),root=new Element(),hero=new Element(),cats=new Element(),discovery=new Element();
  hero.parentNode={};cats.parentNode={};
  const panels=Array.from({length:3},()=>new Element());
  const headings=Array.from({length:4},()=>new Element());
  const doc={
    createElementNS:()=>new Element(),
    createElement:()=>new Element(),
    getElementById:id=>({lfSeasonalWelcome:root,cats,storeDiscoveryIdeas:discovery}[id]||null),
    querySelector:selector=>({'body > header':header,'body > footer':footer,'.heroSlider':hero}[selector]||null),
    querySelectorAll:selector=>selector==='.featureBlock'?panels:selector.startsWith('.sectionTitle')?headings:[]
  };
  const window={__LF_SEASONAL__:{active,greetings:{ramadan:'رمضان كريم','eid-fitr':'عيد سعيد'},labels:{ramadan:'رمضان','eid-fitr':'عيد الفطر'},year:2027}};
  vm.runInNewContext(source,{window,document:doc});
  return {header,footer,root,hero,cats,discovery,panels,headings};
}
test('no decorative DOM is created while the default theme is active',()=>{
  const x=render('none');
  for(const node of [x.header,x.footer,x.root,x.hero,x.cats,x.discovery,...x.panels,...x.headings])
    assert.equal(node.children.length,0);
});
test('active seasons receive header, banner, multiple section and footer SVG motifs',()=>{
  for(const id of ['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year']){
    const x=render(id);
    assert.equal(x.header.children.length,2,id+' header');
    assert.equal(x.footer.children.length,2,id+' footer');
    assert.equal(x.root.children.length,1,id+' welcome');
    assert.ok(x.hero.added?.classes.has('lf-seasonal-divider'),id+' hero separator');
    assert.ok(x.cats.added?.classes.has('lf-seasonal-divider'),id+' category separator');
    assert.ok(x.panels.every(y=>y.children.length===1),id+' promotions');
    assert.ok(x.headings.every(y=>y.children.length===1),id+' headings');
    assert.ok(x.discovery.children.length===2,id+' featured ideas');
    assert.equal(x.header.children[0].attributes['aria-hidden'],'true');
  }
});
test('seasonal motifs use the active theme only and do not block controls',()=>{
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/data-theme="none"/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(source,/setInterval|localStorage|addEventListener\(['"]scroll/);
});
