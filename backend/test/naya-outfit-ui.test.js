"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../../frontend");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const outfit=fs.readFileSync(path.join(root,"naya-outfit.js"),"utf8");
test("Naya body-measurement action requests a generated image instead of stretching the source",()=>{
 assert.equal(app.includes("function nayaBodyScale"),false);
 assert.equal(app.includes("scaleX("),false);
 assert.ok(app.includes("generate(nayaBodyProfile)"));
 assert.ok(outfit.includes("async function generateMeasurementsProfile(profile)"));
 assert.ok(outfit.includes("items:[],measurements:profile,measurementsConsent:true"));
});
