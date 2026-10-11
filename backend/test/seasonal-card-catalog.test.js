'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const frontend=path.resolve(__dirname,'../../frontend');

test('six seasonal occasions provide 3 card layouts each and exactly 10 greetings per gender',()=>{
  const html=fs.readFileSync(path.join(frontend,'gift-cards/index.html'),'utf8');
  const found=/Object\.assign\(phrases,(\{[^\n]+\})\);/.exec(html);
  assert.ok(found,'Seasonal greeting corpus is available');
  const phrases=JSON.parse(found[1]);
  const ids=['ramadan','eid-fitr','eid-adha','halloween','christmas','new-year'];
  assert.deepEqual(Object.keys(phrases).sort(),ids.slice().sort());
  for(const id of ids){
    for(const gender of ['f','m']){
      assert.equal(phrases[id][gender].length,10,id+' '+gender);
      for(const message of phrases[id][gender]){
        assert.ok(message.trim().split(/\s+/).length<=12,'At most 12 words on a card: '+message);
      }
    }
  }
  assert.match(html,/\['إطلالة ملكية','تفاصيل الاحتفال','إطار مخملي'\]/);
  assert.match(html,/card2/);
  assert.match(html,/card3/);
});
test('seasonal card variant filenames are accepted by both checkout and API',()=>{
 const frontendJs=fs.readFileSync(path.join(frontend,'app.js'),'utf8');
 const backendJs=fs.readFileSync(path.resolve(__dirname,'../src/server.js'),'utf8');
 for(const src of [frontendJs,backendJs]) {
   assert.match(src,/season-\(\?:ramadan\|eid-fitr\|eid-adha\|halloween\|christmas\|new-year\)-\[123\]/);
 }
});
test('admin importer supports all three greeting layouts and persistent uploaded images',()=>{
 const js=fs.readFileSync(path.join(frontend,'admin-seasonal.js'),'utf8');
 assert.match(js,/function seasonalReadStoredZip/);
 assert.match(js,/seasonalImportZip/);
 assert.match(js,/await adminUploadMany\(\[file\]\)/);
 assert.match(js,/await api\('\/api\/admin\/seasonal-theme'/);
});
