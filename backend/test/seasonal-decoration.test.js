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
  constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.hidden=false;this.style={};}
  setAttribute(name,value){this.attributes[name]=value;}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
}
function render(active,banners={}){
  const root=new Element(),htmlRoot=new Element();
  const doc={documentElement:htmlRoot,getElementById:id=>id==='lfSeasonalWelcome'?root:null,createElement:tag=>new Element(tag)};
  const window={__LF_SEASONAL__:{active,banners,labels:{ramadan:'رمضان',summer:'الصيف'}}};
  vm.runInNewContext(source,{window,document:doc});
  return {root,htmlRoot};
}

test('no-theme keeps the persistent campaign slot empty',()=>{
  const x=render('none');
  assert.equal(x.htmlRoot.attributes['data-theme'],'none');
  assert.equal(x.root.hidden,true);
  assert.equal(x.root.attributes['aria-hidden'],'true');
  assert.deepEqual(x.root.children,[]);
});

test('each selected theme renders a persistent, accessible campaign banner',()=>{
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter'];
  for(const id of ids){
    const x=render(id);
    assert.equal(x.htmlRoot.attributes['data-theme'],id);
    assert.equal(x.root.hidden,false);
    assert.equal(x.root.className,'lf-seasonal-banner');
    assert.equal(x.root.children[0].tag,'a');
    assert.equal(x.root.children[0].children[0].tag,'picture');
    assert.equal(x.root.children[0].children[0].children.at(-1).tag,'img');
  }
});

test('uploaded responsive artwork takes priority and falls back safely',()=>{
  const x=render('summer',{summer:{desktop:'/uploads/summer.webp',mobile:'https://cdn.example/summer-mobile.webp'}});
  const picture=x.root.children[0].children[0];
  assert.equal(picture.children[0].tag,'source');
  assert.equal(picture.children[0].media,'(max-width: 700px)');
  assert.equal(picture.children[0].srcset,'https://cdn.example/summer-mobile.webp');
  assert.equal(picture.children[1].src,'/uploads/summer.webp');
  assert.equal(picture.children[1].alt,'الصيف');
  const invalid=render('summer',{summer:{desktop:'javascript:alert(1)'}});
  assert.equal(invalid.root.children[0].children[0].children[0].src,'/seasonal-summer.webp');
});

test('every theme has a distinct palette and visible styling across the storefront',()=>{
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year','spring','summer','autumn','winter'];
  for(const id of ids)assert.match(css,new RegExp('html\\[data-theme="'+id+'"\\] \\{--season-main:'),id+' palette');
  for(const id of ids){
    assert.match(css,new RegExp('html\\[data-theme="'+id+'"\\] \\{--season-ornament:url'),id+' ornament mapping');
    const ornament=fs.readFileSync(path.join(frontend,'seasonal-ornaments',id+'.svg'),'utf8');
    assert.match(ornament,/^<svg[\s>]/);assert.match(ornament,/<\/svg>\s*$/);assert.ok(ornament.length>300,id+' seasonal illustration');
  }
  for(const area of ['body > header','.top','.heroSlider','#lfSeasonalWelcome','#cats','.cat','.sectionTitle','.featureBlock','.lf-store-ideas','.featureCard','.quickOfferCard','.grid','body > footer','.bottomNav'])assert.ok(css.includes(area),area+' theme styling');
  assert.match(css,/\.sectionTitle::before/);assert.match(css,/#lfSeasonalWelcome::after/);assert.match(css,/\.featureBlock::before/);assert.match(css,/body > footer::before/);assert.match(css,/width:136px;height:52px/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/#cats::before|#cats::after|lf-seasonal-decor/);
  assert.doesNotMatch(css,/season-icon|repeating-linear-gradient/);
  assert.doesNotMatch(css,/#lfSeasonalWelcome \{display:none!important\}/);
});

test('campaign stays outside the auto-rotating hero and is cache-busted',()=>{
  const assets={ramadan:'seasonal-art/ramadan-desktop.webp','eid-fitr':'seasonal-art/eid-fitr-desktop.webp','eid-adha':'seasonal-eid-adha-gifts.svg',halloween:'seasonal-art/halloween-desktop.webp',christmas:'seasonal-art/christmas-desktop.webp','new-year':'seasonal-art/new-year-desktop.webp',spring:'seasonal-spring.webp',summer:'seasonal-summer.webp',autumn:'seasonal-autumn.webp',winter:'seasonal-winter.webp'};
  for(const [id,file] of Object.entries(assets))assert.ok(fs.statSync(path.join(frontend,file)).size>500,id+' art asset');
  const slides=app.slice(app.indexOf('function heroSlides()'),app.indexOf('function heroMobileImageFor'));
  assert.doesNotMatch(slides,/__LF_SEASONAL__|seasonal:true/);
  assert.match(app,/function restartHeroTimer\(\)\{clearTimeout\(heroTimer\);if\(heroSlides\(\)\.length<2\)return/);
  assert.match(html,/seasonal-rebuild-v4/);
});

test('theme selection remains server-backed and does not add persistent client state or overlays',()=>{
  assert.match(css,/html\[data-theme\]:not\(\[data-theme="none"\]\)/);
  assert.match(css,/#lfSeasonalWelcome:not\(\[hidden\]\)/);
  assert.doesNotMatch(source,/localStorage|setInterval|addEventListener\(['"]scroll/);
  assert.match(html,/id="lfSeasonalWelcome"/);
});
