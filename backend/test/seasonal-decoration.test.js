'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../../frontend/seasonal-themes.js'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../../frontend/seasonal-themes.css'),'utf8');
const app=fs.readFileSync(path.resolve(__dirname,'../../frontend/app.js'),'utf8');
class Element {
  constructor(){this.children=[];this.classes=new Set();this.attributes={};this.classList={add:(...names)=>names.forEach(x=>this.classes.add(x))};}
  setAttribute(name,value){this.attributes[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  append(...children){children.forEach(x=>this.appendChild(x));}
  insertAdjacentElement(where,child){if(where!=='afterend')throw Error('Unsupported');this.added=child;}
}
function render(active){
  const header=new Element(),footer=new Element(),root=new Element(),hero=new Element(),cats=new Element(),products=new Element(),discovery=new Element();
  hero.parentNode={};cats.parentNode={};
  const panels=Array.from({length:3},()=>new Element());
  const headings=Array.from({length:4},()=>new Element());
  const doc={
    createElementNS:()=>new Element(),
    createElement:()=>new Element(),
    getElementById:id=>({lfSeasonalWelcome:root,cats,products,storeDiscoveryIdeas:discovery}[id]||null),
    querySelector:selector=>({'body > header':header,'body > footer':footer,'.heroSlider':hero}[selector]||null),
    querySelectorAll:selector=>selector==='.featureBlock'?panels:selector.startsWith('.sectionTitle')?headings:[]
  };
  const window={__LF_SEASONAL__:{active,greetings:{ramadan:'رمضان كريم','eid-fitr':'عيد سعيد'},labels:{ramadan:'رمضان','eid-fitr':'عيد الفطر'},year:2027}};
  vm.runInNewContext(source,{window,document:doc});
  return {header,footer,root,hero,cats,products,discovery,panels,headings};
}
test('no decorative DOM is created while the default theme is active',()=>{
  const x=render('none');
  for(const node of [x.header,x.footer,x.root,x.hero,x.cats,x.products,x.discovery,...x.panels,...x.headings])
    assert.equal(node.children.length,0);
});
test('active seasons receive clear seasonal accents across the page',()=>{
  for(const id of ['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter']){
    const x=render(id);
    assert.equal(x.header.children.length,0,id+' avoids repeated header symbols');
    assert.equal(x.footer.children.length,1,id+' footer accent');
    assert.equal(x.root.children.length,1,id+' welcome');
    assert.ok(x.hero.added?.className==='lf-seasonal-divider',id+' hero separator');
    assert.ok(x.cats.added?.className==='lf-seasonal-divider',id+' category separator');
    assert.ok(x.panels.every(y=>y.children.length===0),id+' promotion panels stay uncluttered');
    assert.ok(x.headings.every(y=>y.children.length===0),id+' headings avoid repeated icons');
    assert.equal(x.discovery.children.length,1,id+' featured ideas accent');
    assert.equal(x.cats.children.length,1,id+' category accent');
    assert.equal(x.products.children.length,1,id+' product accent');
  }
});
test('seasonal motifs use the active theme only and do not block controls',()=>{
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/data-theme="none"/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(source,/setInterval|localStorage|addEventListener\(['"]scroll/);
});


test('seasonal accents use a restrained mix of filled and outline drawings',()=>{
  for(const id of ['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter']){
    const x=render(id),layout=x.root.children[0];
    assert.ok(layout.children[0].classes.has('lf-seasonal-vector--filled'),id+' primary seasonal drawing');
    assert.ok(layout.children.at(-1).classes.has('lf-seasonal-vector--outline'),id+' secondary seasonal drawing');
    assert.ok(x.cats.children[0].classes.has('lf-seasonal-vector--filled'),id+' category accent');
    assert.ok(x.products.children[0].classes.has('lf-seasonal-vector--outline'),id+' product accent');
    assert.ok(x.footer.children[0].classes.has('lf-seasonal-vector--filled'),id+' footer accent');
    assert.match(layout.children[0].innerHTML,/lf-seasonal-painted/);
    assert.doesNotMatch(layout.children.at(-1).innerHTML,/lf-seasonal-painted/);
  }
});
test('Eid al-Adha emblem is an anatomically legible sheep rather than a wool cloud',()=>{
  const x=render('eid-adha');
  const colored=x.cats.children[0].innerHTML;
  const outline=x.products.children[0].innerHTML;
  assert.match(colored,/M19 48h7v19h-7/); // separate legs before the wool
  assert.match(colored,/M55 25c5-7/); // recognizable head
  assert.match(colored,/lf-seasonal-eye/); // eye
  assert.match(colored,/M17 64h10v6H17/); // feet/hooves
  assert.match(outline,/M20 52v16h7V53/); // outline four legs
  assert.match(outline,/<circle cx='66' cy='31' r='2'/); // face details
  assert.notEqual(colored,outline);
});
test('filled icons use distinct color channels and outlined icons stay unfilled',()=>{
  assert.match(css,/--season-icon-main:/);
  assert.match(css,/--season-icon-secondary:/);
  assert.match(css,/--season-icon-soft:/);
  assert.match(css,/\.lf-seasonal-vector--outline path/);
  assert.match(css,/fill:none!important/);
  assert.match(css,/\.lf-seasonal-vector--filled \.lf-seasonal-painted-deep/);
  assert.match(css,/pointer-events:none!important/);
});

test('four season themes have expressive slide artwork and restrained section accents',()=>{
  for(const id of ['spring','summer','autumn','winter']){
    const x=render(id);
    assert.equal(x.root.children.length,1,id+' greeting');
    assert.equal(x.header.children.length,0,id+' avoids repeating the same symbol in the header');
    assert.equal(x.cats.children.length,1,id+' category accent');
    assert.equal(x.products.children.length,1,id+' product accent');
    assert.equal(x.footer.children.length,1,id+' footer accent');
    assert.ok(css.includes('html[data-theme="'+id+'"]'),id+' theme palette exists');
    assert.ok(x.root.children[0].children[0].classes.has('lf-seasonal-vector--filled'),id+' main seasonal drawing');
  }
});
test('four seasonal themes always add their own illustrated hero slide when no banner was uploaded',()=>{
  for(const id of ['spring','summer','autumn','winter']){
    const artwork=fs.statSync(path.resolve(__dirname,'../../frontend/seasonal-'+id+'.webp')).size;
    assert.ok(artwork>50000,id+' full-width editorial seasonal image exists');
    assert.match(app,new RegExp(id+':'),id+' fallback title is mapped');
  }
  assert.match(app,/else if\(\['spring','summer','autumn','winter'\]\.includes\(seasonal\.active\)\)/,'generated scenes are the fallback when no uploaded banner is configured');
  assert.match(app,/image:'\/seasonal-'\+seasonal\.active\+'\.webp\?v=20261011-season-art-polish2'/,'the active seasonal image is loaded from a local URL');
});
test('season decoration reaches both category and featured product areas',()=>{
  for(const target of ["getElementById('cats')","getElementById('products')"])
    assert.ok(source.includes(target),target+' receives seasonal ornaments');
  assert.match(css,/\.lf-seasonal-decor--section/);
  assert.match(css,/#products/);
  assert.match(css,/repeating-linear-gradient\(118deg/);
});
