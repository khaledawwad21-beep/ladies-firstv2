'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {NAYA_STYLE,NAYA_VOICE_STYLE}=require('../src/naya-persona');
const {buildNayaMessages,buildStoreAssistantMessages}=require('../src/naya-ai');

test('both chat routes receive the entire approved brief including all vocabulary groups and examples',()=>{
 for(const build of [buildNayaMessages,buildStoreAssistantMessages]){
  const messages=build({message:'بدي هدية',catalog:[],history:[]});
  assert.ok(messages[0].content.includes(NAYA_STYLE));
  for(const section of ['ترحيب:','طلب وسؤال:','موافقة وتأكيد:','مجاملة:','شرح وتوضيح:','تأكيد وطمأنة:','تسهيل واقتراح:','ختام:','مقاس:','هدية:','تردّد:','انتهاء الرسائل اليومية:'])assert.ok(messages[0].content.includes(section),section);
  for(const word of ['بيكمّلك الطلّة','تكرمي عيوني','هيدا','هيدي','هلّق','كرمال','بيحلو معك'])assert.ok(messages[0].content.includes(word),word);
  assert.doesNotMatch(messages[0].content,/بحد أقصى 35 كلمة|عند غياب المعلومة استعملي صياغة محايدة/);
 }
});
test('voice instructions preserve the text and specify Lebanese pronunciation instead of only generic softness',()=>{
 assert.match(NAYA_VOICE_STYLE,/Beirut Lebanese Arabic/);
 assert.match(NAYA_VOICE_STYLE,/هلّق, هيدا, هيدي, كرمال, لأنو, فيكي/);
 assert.match(NAYA_VOICE_STYLE,/Read the supplied text exactly/);
 assert.match(NAYA_VOICE_STYLE,/For English, speak natural English without translating/);
});
