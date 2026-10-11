'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize,renderHomeHTML,targetNewYear,safeState}=require('../src/seasonal-themes');

test('stores only supported seasonal themes and banner fields',()=>{
 const result=normalize({active:'eid-fitr',banners:{'eid-fitr':{desktop:'/api/images/abc',mobile:'',card:'https://example.com/card.webp'}}});
 assert.equal(result.active,'eid-fitr');
 assert.equal(result.banners['eid-fitr'].card,'https://example.com/card.webp');
 assert.deepEqual(safeState({active:'invalid'}),{active:'none',banners:{}});
 assert.throws(()=>normalize({active:'unknown'}));
 assert.throws(()=>normalize({active:'ramadan',banners:{ramadan:{desktop:'javascript:alert(1)'}}}));
 assert.throws(()=>normalize({active:'ramadan',banners:{none:{}}}));
});

test('renders selected season into first HTML response without client-side storage',()=>{
 const html=renderHomeHTML('<!doctype html><html lang="ar" dir="rtl"><head></head><body>متجر</body></html>',{active:'ramadan',banners:{}});
 assert.match(html,/data-theme="ramadan"/);
 assert.match(html,/window\.__LF_SEASONAL__/);
 assert.match(html,/رمضان كريم/);
 assert.doesNotMatch(html,/localStorage\.(getItem|setItem)/);
});

test('automatically resolves New Year around the year boundary in Hebron',()=>{
 assert.equal(targetNewYear(new Date('2026-10-11T12:00:00Z')),2027);
 assert.equal(targetNewYear(new Date('2027-01-10T12:00:00Z')),2027);
 assert.equal(targetNewYear(new Date('2027-12-20T12:00:00Z')),2028);
});
