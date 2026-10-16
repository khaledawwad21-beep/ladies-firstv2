"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const source=fs.readFileSync(path.join(__dirname,"../../frontend/admin-lama.js"),"utf8");
const context={};
vm.runInNewContext(source+";globalThis.parseSpokenPrices=lamaSpokenPriceFields;",context);

test("spoken cost and sale prices are mapped only when directly labeled",()=>{
  const text="شنطة جميلة، التكلفة 40 والبيع 85 والأسود 3";
  const fields=context.parseSpokenPrices(text);
  assert.equal(fields.cost_price.value,40);
  assert.equal(fields.price.value,85);
  assert.ok(text.includes(fields.cost_price.evidence));
  assert.ok(text.includes(fields.price.evidence));
  assert.equal(fields.stock,undefined);
});

test("spoken prices accept Arabic digits and purchase-price labels",()=>{
  const fields=context.parseSpokenPrices("سعر الشراء ٤٠، سعر البيع ٨٥٫٥");
  assert.equal(fields.cost_price.value,40);
  assert.equal(fields.price.value,85.5);
});

test("unlabeled numbers are not treated as prices",()=>{
  assert.deepEqual({...context.parseSpokenPrices("شنطة سوداء، 40، 85، مقاس 3")},{});
});
