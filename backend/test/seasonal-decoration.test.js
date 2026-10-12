'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const frontend=path.resolve(__dirname,'../../frontend');
const source=fs.readFileSync(path.join(frontend,'seasonal-themes.js'),'utf8');
const css=fs.readFileSync(path.join(frontend,'seasonal-themes.css'),'utf8');
const app=fs.readFileSync(path.join(frontend,'app.js'),'utf8');
const html=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
class Element {
  constructor(){this.children=[];this.attributes={};this.hidden=false;}
  setAttribute(name,value){this.attributes[name]=value;}
  replaceChildren(...children){this.children=children;}
}
function render(active){
  const root=new Element(),htmlRoot=new Element();
  const doc={documentElement:htmlRoot,getElementById:id=>id==='lfSeasonalWelcome'?root:null};
  const window={__LF_SEASONAL__:{active}};
  vm.runInNewContext(source,{window,document:doc});
  return {root,htmlRoot};
}

test('default theme clears the welcome slot and preserves the no-theme attribute',()=>{
  const x=render('none');
  assert.equal(x.htmlRoot.attributes['data-theme'],'none');
  assert.equal(x.root.hidden,true);
  assert.equal(x.root.attributes['aria-hidden'],'true');
  assert.deepEqual(x.root.children,[]);
});

test('all ten selectable themes are synchronized without injecting overlay elements',()=>{
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter'];
  for(const id of ids){
    const x=render(id);
    assert.equal(x.htmlRoot.attributes['data-theme'],id);
    assert.equal(x.root.hidden,true);
    assert.deepEqual(x.root.children,[]);
  }
  assert.doesNotMatch(source,/appendChild|insertAdjacent|createElement/);
});

test('every theme has a distinct color palette and the full store receives theme framing',()=>{
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter'];
  for(const id of ids){
    assert.match(css,new RegExp('html\\[data-theme="'+id+'"\\] \\{--season-main:'),id+' palette');
  }
  for(const area of ['body > header','.top','.heroSlider','#cats','.cat','.featureBlock','.lf-store-ideas','.featureCard','.quickOfferCard','.grid','body > footer']){
    assert.ok(css.includes(area),area+' theme styling');
  }
  assert.match(css,/object-fit:contain!important/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/#cats::before|#cats::after|lf-seasonal-decor/);
  assert.doesNotMatch(css,/season-icon|repeating-linear-gradient/);
});

test('seasonal campaign fallback covers all ten occasions and configured art takes priority',()=>{
  const assets={
    ramadan:'seasonal-art/ramadan-desktop.webp','eid-fitr':'seasonal-art/eid-fitr-desktop.webp',
    'eid-adha':'seasonal-eid-adha-gifts.svg',halloween:'seasonal-art/halloween-desktop.webp',
    christmas:'seasonal-art/christmas-desktop.webp','new-year':'seasonal-art/new-year-desktop.webp',
    spring:'seasonal-spring.webp',summer:'seasonal-summer.webp',autumn:'seasonal-autumn.webp',winter:'seasonal-winter.webp'
  };
  for(const [id,file] of Object.entries(assets)){
    assert.ok(app.includes("'"+id+"':")||app.includes(id+":"),id+' campaign mapping');
    assert.ok(fs.statSync(path.join(frontend,file)).size>500,id+' art asset');
  }
  assert.match(app,/const image=desktop\|\|mobile\|\|defaultImage/);
  assert.match(app,/seasonal:true/);
  assert.match(html,/seasonal-rebuild-v1/);
});

test('no-theme pages receive no seasonal skin, animation, or extra canvas layers',()=>{
  assert.match(css,/html\[data-theme\]:not\(\[data-theme="none"\]\)/);
  assert.match(css,/#lfSeasonalWelcome \{display:none!important\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(source,/setInterval|localStorage|addEventListener\(['"]scroll/);
});
