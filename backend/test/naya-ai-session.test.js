'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const frontend=path.join(__dirname,'../../frontend');
const source=fs.readFileSync(path.join(frontend,'ai-session.js'),'utf8');
function setup(values={},role='owner',status=200){
 const requests=[],window={LF_API_URL:'https://store.test'};
 const context=vm.createContext({window,location:{origin:'https://store.test'},localStorage:{getItem:key=>values[key]||null},fetch:async(url,options)=>{requests.push({url,options});return{ok:status===200,status,json:async()=>({user:{role}})}}});
 vm.runInContext(source,context);return{window,requests};
}
test('AI uses server-verified owner session while leaving customer session intact',async()=>{
 const values={lf_token:'customer',lf_admin_token:'owner'},s=setup(values);
 assert.equal(await s.window.lfAiToken(),'owner');
 assert.equal(s.requests[0].url,'https://store.test/api/auth/me');
 assert.equal(s.requests[0].options.headers.Authorization,'Bearer owner');
 assert.equal(values.lf_token,'customer');
 assert.equal((await s.window.lfAiHeaders()).Authorization,'Bearer owner');
});
test('AI does not promote staff or expired admin sessions',async()=>{
 for(const [role,status] of [['staff',200],['admin',200],['owner',401]]){
  const s=setup({lf_token:'customer',lf_admin_token:'admin'},role,status);
  assert.equal(await s.window.lfAiToken(),'customer');
 }
 const guest=setup();assert.equal(await guest.window.lfAiToken(),'');assert.equal(guest.requests.length,0);
});
test('AI rechecks owner session removal and server role revocation',async()=>{
 const values={lf_token:'customer',lf_admin_token:'owner'},s=setup(values);
 assert.equal(await s.window.lfAiToken(),'owner');delete values.lf_admin_token;
 assert.equal(await s.window.lfAiToken(),'customer');
 const revoked=setup({lf_token:'customer',lf_admin_token:'old-owner'},'customer');
 assert.equal(await revoked.window.lfAiToken(),'customer');
});
test('owner verification outage is visible instead of silently using customer quota',async()=>{
 const s=setup({lf_token:'customer',lf_admin_token:'owner'},'owner',503);
 await assert.rejects(s.window.lfAiToken(),/جلسة المالك/);
});
test('all Naya chat and voice requests attach the shared authenticated headers',()=>{
 for(const file of ['app.js','store-assistant.js']){
  const text=fs.readFileSync(path.join(frontend,file),'utf8');
  assert.match(text,/api\/ai\/tts'.{0,90}headers:await window.lfAiHeaders\(\)/);
 }
 const app=fs.readFileSync(path.join(frontend,'app.js'),'utf8');
 assert.match(app,/api\/ai\/chat'.{0,90}headers:await window.lfAiHeaders\(\)/);
 const outfit=fs.readFileSync(path.join(frontend,'naya-outfit.js'),'utf8');
 assert.match(outfit,/const token=\(\)=>window.lfAiToken\(\)/);
});
