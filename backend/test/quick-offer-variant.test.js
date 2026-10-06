const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../../frontend/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../../frontend/store-stability.css"),"utf8");

test("quick offers require an explicit variant choice when variants exist",()=>{
  assert.match(app,/if\(vs\.length&&!variant\)return alert/);
  assert.doesNotMatch(app,/if\(vs\.length&&!variant\)variant=vs\.find/);
  assert.match(app,/id="quickVariant-\$\{p\.id\}"/);
  assert.match(app,/اختاري اللون\/الخيار/);
});

test("sold-out quick-offer variants stay visible but disabled",()=>{
  assert.match(app,/Number\(v\.stock\)<=0\?'disabled':''/);
  assert.match(app,/— خلص/);
});

test("quick offer buy still opens checkout directly after the selected variant is added",()=>{
  assert.match(app,/quickBuy\(\$\{p\.id\},\$\{buyArg\}\)/);
  assert.match(app,/setTimeout\(\(\)=>openCheckoutForm\(\),100\)/);
  assert.match(app,/هاد الصنف موجود أصلًا بسلتك/);
});

test("quick offer variant selector is mobile-friendly",()=>{
  assert.match(css,/\.quickOfferVariant/);
  assert.match(css,/min-height:40px/);
  assert.match(css,/width:100%/);
});
