"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const index = fs.readFileSync(path.join(__dirname, "../../frontend/index.html"), "utf8");
const indexCss = fs.readFileSync(path.join(__dirname, "../../frontend/index.css"), "utf8");
const stability = fs.readFileSync(path.join(__dirname, "../../frontend/store-stability.css"), "utf8");
const app = fs.readFileSync(path.join(__dirname, "../../frontend/app.js"), "utf8");

test("storefront stability CSS is loaded through the real index.css chain", () => {
  assert.match(index, /<link rel="stylesheet" href="index\.css">/);
  assert.match(indexCss, /@import\s+["']\.\/store-stability\.css["']/);
});

test("language switch persists Arabic or English and updates document direction", () => {
  assert.match(app, /const LANG_KEY='lf_lang'/);
  assert.match(app, /localStorage\.getItem\(LANG_KEY\)\|\|'ar'/);
  assert.match(app, /currentLang=currentLang==='ar'\?'en':'ar'/);
  assert.match(app, /localStorage\.setItem\(LANG_KEY,currentLang\)/);
  assert.match(app, /document\.documentElement\.lang=currentLang/);
  assert.match(app, /document\.documentElement\.dir=currentLang==='ar'\?'rtl':'ltr'/);
  assert.match(app, /renderStaticLang\(\);renderNewUiLang\(\);renderCats\(\);renderProducts\(\);renderFeatureSections\(\);renderCart\(\)/);
  assert.match(app, /Top 5 Offers/);
  assert.match(app, /Best Sellers/);
  assert.match(app, /أقوى 5 عروض/);
  assert.match(app, /الأكثر مبيعًا/);
});

test("Top 5 and best sellers keep arrows touch dragging and autoplay", () => {
  assert.match(index, /moveFeatureCarousel\('top5Grid',-1\)/);
  assert.match(index, /moveFeatureCarousel\('top5Grid',1\)/);
  assert.match(index, /moveFeatureCarousel\('bestSellersGrid',-1\)/);
  assert.match(index, /moveFeatureCarousel\('bestSellersGrid',1\)/);

  assert.match(app, /function bindFeatureCarousel\(/);
  assert.match(app, /addEventListener\('pointerdown'/);
  assert.match(app, /addEventListener\('pointermove'/);
  assert.match(app, /addEventListener\('touchstart'/);
  assert.match(app, /addEventListener\('touchmove'/);
  assert.match(app, /function moveFeatureCarousel\(/);
  assert.match(app, /function autoFeatureCarousels\(/);
  assert.match(app, /setInterval\(autoFeatureCarousels,3500\)/);
});

test("mobile rails remain horizontally scrollable without blocking page scroll", () => {
  assert.match(stability, /\.product-slider,\.offers-slider,\.mini-slider-track,\.bestSellersGrid,\.featureGrid\s*\{/);
  assert.match(stability, /overflow-x:auto!important/);
  assert.match(stability, /overflow-y:hidden!important/);
  assert.match(stability, /touch-action:pan-x pan-y!important/);
  assert.match(stability, /-webkit-overflow-scrolling:touch!important/);
  assert.match(stability, /scroll-snap-type:x proximity!important/);
  assert.match(stability, /body:not\(\.modal-open\):not\(\.drawer-open\)\{overflow-y:auto!important/);
});

test("closed menu and overlays cannot intercept storefront touches", () => {
  assert.match(stability, /\.mobile-menu\[hidden\],\.page-overlay\[hidden\],\.drawer\[hidden\],\.modal\[hidden\],\.galleryModal\[hidden\]/);
  assert.match(stability, /\.mobile-menu:not\(\.open\),\.page-overlay:not\(\.open\)\{pointer-events:none!important\}/);
  assert.match(stability, /\.mobile-menu\.open,\.page-overlay\.open\{pointer-events:auto!important\}/);
});
