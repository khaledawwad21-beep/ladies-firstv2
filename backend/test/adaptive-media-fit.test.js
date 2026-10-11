"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../../frontend/',p),'utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(read('admin-product-upload.js'),ctx);
const shape=(w,h,slot)=>vm.runInContext('adminPlacementGeometry('+w+','+h+','+JSON.stringify(slot)+')',ctx);

test('desktop banners are normalized for the slider without removing embedded content',()=>{
  const g=shape(720,1280,'hero-desktop');
  assert.equal(g.width,1920);
  assert.equal(g.height,900);
  assert.equal(g.fit,'framed');
  assert.ok(g.x>0 && g.drawWidth<g.width);
  assert.ok(g.drawHeight<=g.height);
});
test('mobile images preserve the original ratio rather than letterboxing into 4:5',()=>{
  const g=shape(1920,900,'hero-mobile');
  assert.equal(g.fit,'natural');
  assert.equal(g.width,1080);
  assert.equal(g.height,506);
  assert.equal(g.x,0);
});
test('greeting cards have printable 3:2 frames with no destructive cropping',()=>{
  const g=shape(900,1800,'greeting-card');
  assert.equal(g.width,1500);
  assert.equal(g.height,1000);
  assert.ok(g.x>0 && g.drawHeight===g.height);
});
test('product images retain their proportions inside pixel/size bounds',()=>{
  const g=shape(4000,6000,'product');
  assert.equal(g.width,1200);
  assert.equal(g.height,1800);
  assert.equal(g.fit,'natural');
  assert.throws(()=>shape(0,700,'hero-desktop'));
});
test('hero uses actual natural dimensions and CSS avoids hardcoded minimum height',()=>{
  const js=read('app.js'),css=read('seasonal-themes.css');
  assert.match(js,/--lf-banner-ratio/);
  assert.match(js,/preload\.naturalWidth,preload\.naturalHeight/);
  assert.match(css,/\.heroSlider \.heroCard\.lf-adaptive-slide/);
  assert.match(css,/min-height:0!important/);
  assert.match(css,/aspect-ratio:var\(--lf-banner-ratio/);
});
