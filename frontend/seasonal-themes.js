'use strict';
/* Ladies First seasonal motifs. SVG markup is hard-coded, never sourced from users.
   Alternating colored and open-line silhouettes keep the fashion-store identity. */
(function () {
  const settings=window.__LF_SEASONAL__;
  if(!settings || settings.active==='none')return;
  const id=settings.active;
  const labels=settings.labels||{},greetings=settings.greetings||{};
  const motifs={
    ramadan:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-deep' d='M30 22h20l5 9-4 31H29l-4-31Z'/>",
        "<path class='lf-seasonal-painted' d='M32 32h16l-2 22H34Z'/>",
        "<path class='lf-seasonal-detail' d='M30 30h20m-20 27h20M34 22v-7h12v7M35 62v7h10v-7M40 35l6 9-6 9-6-9Z'/>",
        "<path class='lf-seasonal-painted-secondary' d='M57 11c-10 6-10 20 1 24-10 3-21-5-21-15 0-8 9-13 20-9Z'/>",
        "<path class='lf-seasonal-detail' d='M66 17v10m-5-5h10'/>"
      ].join(''),
      outline:[
        "<path d='M52 8a25 25 0 1 0 18 47A26 26 0 1 1 52 8Z'/>",
        "<path d='m25 19 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z'/>",
        "<path d='M50 46v13m-5-7h10M51 21l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z'/>"
      ].join('')
    },
    'eid-fitr':{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-secondary' d='M40 12c6-3 10 4 16 3 6 0 6 7 11 11 5 5 0 10 1 16s-6 8-9 14c-4 6-10 4-16 9-7 3-11-3-17-4-6-2-7-8-13-13-4-5 0-11 0-17 2-6 9-8 13-13 6-5 9 0 14-6Z'/>",
        "<circle class='lf-seasonal-painted' cx='40' cy='40' r='22'/>",
        "<path class='lf-seasonal-detail' d='M40 18v44M18 40h44M24 24l32 32M56 24 24 56M40 31c-9-6-14 9 0 18 14-9 9-24 0-18Z'/>",
        "<circle class='lf-seasonal-painted-soft' cx='40' cy='40' r='6'/>"
      ].join(''),
      outline:[
        "<path d='M40 12c7-4 12 4 17 3 6 2 6 8 11 13 4 5-1 11 0 17-1 6-8 7-12 14-5 5-11 2-16 7-6 2-11-3-17-4-6-2-7-9-11-14-3-6 0-11 1-17 2-7 8-8 13-13 5-5 10 0 14-6Z'/>",
        "<circle cx='40' cy='40' r='20'/>",
        "<path d='M40 20v40M20 40h40M26 26l28 28M54 26 26 54M40 32c-8-6-12 9 0 17 12-8 8-23 0-17Z'/>"
      ].join('')
    },
    'eid-adha':{
      // Recognizable side-view sheep: distinct body, neck, head/muzzle, ears,
      // FOUR separated legs/hooves and a tail. Not a generic wool cloud.
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-deep' d='M19 48h7v19h-7Zm13 2h7v17h-7Zm13 0h7v17h-7Zm10-1h6v18h-6Z'/>",
        "<path class='lf-seasonal-painted-secondary' d='M17 64h10v6H17Zm13 0h11v6H30Zm13 0h11v6H43Zm10 0h10v6H53Z'/>",
        "<path class='lf-seasonal-painted-soft' d='M14 28c-4-8 5-15 12-11 3-8 14-9 19-2 8-4 16 2 16 10 8 5 5 14 0 18 1 10-8 15-16 12-7 7-15 5-20 0-9 3-16-3-14-12-8-5-6-13 3-15Z'/>",
        "<path class='lf-seasonal-detail' d='M18 27c4 3 10 3 13-2m2 1c4 4 10 4 13 0M16 40c5 3 11 1 13-3m5 8c5-4 12-3 14 1M14 27l-6-3m8-1-4-4'/>",
        "<path class='lf-seasonal-painted-deep' d='M55 25c5-7 14-6 17-1 6 8 4 20-5 24-8 4-15-4-15-12 0-5 1-8 3-11Z'/>",
        "<path class='lf-seasonal-painted-secondary' d='M54 27c-8-6-12 3-6 9 2 3 8 4 10 0Z'/>",
        "<path class='lf-seasonal-painted' d='M63 34c5-2 13 1 14 6 1 4-2 9-7 10-6 0-9-4-9-9Z'/>",
        "<circle class='lf-seasonal-eye' cx='65' cy='31' r='2.3'/>",
        "<path class='lf-seasonal-detail' d='m73 42-3 1-2-1m2 2v3'/>"
      ].join(''),
      outline:[
        "<path d='M20 52v16h7V53m7 0v15h7V53m8-1v16h7V52M16 66h14m2 2h14m1 0h15'/>",
        "<path d='M15 25c-4-8 6-14 13-10 5-7 14-6 19 0 9-3 15 4 15 11 7 5 5 14 0 18 1 9-8 14-16 10-6 5-14 6-21 0-8 2-16-3-13-12-7-5-6-12 3-17Z'/>",
        "<path d='M56 25c7-8 16-4 19 3 5 10 0 19-8 20-9 0-15-8-15-14 0-4 2-7 4-9Z'/>",
        "<path d='M55 28c-8-6-14 1-7 8 3 3 9 3 11 0M64 39q11-3 13 5t-8 7q-10-1-8-9'/>",
        "<circle cx='66' cy='31' r='2'/>",
        "<path d='m73 44-3 1-2-1M18 29c4 4 11 4 15-1m3 2c4 3 10 3 12-1M17 44c5 2 11 0 13-4m4 6c5-5 11-4 15 0M14 28l-7-4'/>"
      ].join('')
    },
    spring:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted' d='M40 11c5 0 7 8 7 15 6-5 13-8 16-4 4 4 0 11-5 16 7 0 15 2 15 7s-8 7-15 7c5 6 9 12 5 16-4 4-11 0-16-5 0 8-2 15-7 15s-7-7-7-15c-5 5-12 9-16 5-4-4 0-10 5-16-7 0-15-2-15-7s8-7 15-7c-5-5-9-12-5-16 4-4 11-1 16 4 0-7 2-15 7-15Z' transform='translate(0 -5) scale(1 .9)'/>",
        "<circle class='lf-seasonal-painted-soft' cx='40' cy='36' r='8'/>",
        "<path class='lf-seasonal-painted-secondary' d='M40 48c-2 10-8 18-17 24m16-15c6 0 10-3 13-8m-25 10c-7-1-10-4-13-9'/>",
        "<path class='lf-seasonal-detail' d='M40 51v22m0-12 10-8m-10 13-9-7'/>"
      ].join(''),
      outline:[
        "<path d='M40 14c4 0 6 8 5 14 5-5 12-8 15-5 4 4 0 10-5 15 7-1 14 1 14 5s-7 6-14 5c5 5 9 11 5 15-3 3-10-1-15-6 1 7-1 14-5 14s-6-7-5-14c-5 5-12 9-15 6-4-4 0-10 5-15-7 1-14-1-14-5s7-6 14-5c-5-5-9-11-5-15 3-3 10 0 15 5-1-6 1-14 5-14Z'/>",
        "<circle cx='40' cy='39' r='6'/>",
        "<path d='M40 52v20m0-11 9-7m-9 13-8-6'/>"
      ].join('')
    },
    summer:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='39' r='35'/>",
        "<circle class='lf-seasonal-painted' cx='40' cy='32' r='14'/>",
        "<path class='lf-seasonal-detail' d='M40 7v7m0 36v7M15 32h7m36 0h7M22 14l5 6m26 24 5 6m0-36-5 6M27 44l-5 6'/>",
        "<path class='lf-seasonal-painted-secondary' d='M9 57c8-7 15 7 23 0s15 7 23 0 12 2 16 4v10H9Z'/>",
        "<path class='lf-seasonal-painted-soft' d='M9 67c8-7 15 7 23 0s15 7 23 0 12 2 16 4v5H9Z'/>",
        "<path class='lf-seasonal-detail' d='M10 57c8-7 15 7 23 0s15 7 23 0 12 2 15 4'/>"
      ].join(''),
      outline:[
        "<circle cx='40' cy='31' r='13'/>",
        "<path d='M40 6v7m0 36v7M15 31h7m36 0h7M22 13l5 6m26 25 5 6m0-37-5 6M27 44l-5 6'/>",
        "<path d='M8 58c9-8 16 8 25 0s16 8 25 0 12 2 14 4M8 69c9-8 16 8 25 0s16 8 25 0 12 2 14 4'/>"
      ].join('')
    },
    autumn:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted' d='M40 12c4 10 11 8 18 6-3 8-1 14 9 18-10 4-11 10-8 18-9-3-14-1-19 12-5-11-11-15-20-12 3-9 1-15-9-19 10-4 13-10 9-18 9 3 15 1 20-5Z'/>",
        "<path class='lf-seasonal-painted-secondary' d='M40 15v49M40 35 23 24m17 21 19-14M40 51 25 46m15 1 15 4'/>",
        "<path class='lf-seasonal-detail' d='M40 19v43M38 37 25 28m15 16 14-11M38 51l-11-4m15-1 11 4'/>",
        "<path class='lf-seasonal-painted-deep' d='M43 63c9 4 15 3 21-1-3 8-12 11-21 7Z'/>"
      ].join(''),
      outline:[
        "<path d='M40 12c4 10 11 8 18 6-3 8-1 14 9 18-10 4-11 10-8 18-9-3-14-1-19 12-5-11-11-15-20-12 3-9 1-15-9-19 10-4 13-10 9-18 9 3 15 1 20-5Z'/>",
        "<path d='M40 17v45M38 37 25 28m15 16 14-11M38 51l-11-4m15-1 11 4'/>",
        "<path d='M43 62c9 4 15 3 21-1-3 8-12 11-21 7Z'/>"
      ].join('')
    },
    winter:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted' d='M40 10v60M14 25l52 30M14 55l52-30'/>",
        "<path class='lf-seasonal-painted-secondary' d='m40 10 6 8m-6-8-6 8m6 42 6-8m-6 8-6-8M14 25l10 1m-10-1 4 9m38 21 4-9m-4 9 10-1M14 55l10-1m-10 1 4-9m38-21 4 9m-4-9 10 1'/>",
        "<circle class='lf-seasonal-painted-soft' cx='40' cy='40' r='7'/>",
        "<path class='lf-seasonal-detail' d='M40 4v72M9 22l62 36M9 58l62-36'/>",
        "<circle class='lf-seasonal-painted-deep' cx='65' cy='13' r='3'/><circle class='lf-seasonal-painted-deep' cx='15' cy='66' r='2'/>"
      ].join(''),
      outline:[
        "<path d='M40 8v64m-8-54 8 8 8-8m-16 46 8-8 8 8M12 24l56 32m-45-1 2-11 11 2m18 20-2-11 11 2M12 56l56-32m-45 1 2 11 11-2m18-20-2 11 11-2'/>",
        "<circle cx='40' cy='40' r='5'/>",
        "<path d='M8 13h10m-5-5v10m49 54h10m-5-5v10'/>"
      ].join('')
    },
    halloween:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-secondary' d='M40 22c-13-9-27 2-27 20S25 70 40 67c16 4 29-10 28-27S53 13 40 22Z'/>",
        "<path class='lf-seasonal-painted' d='M40 22c-8 7-12 35 0 45 11-10 7-37 0-45Z'/>",
        "<path class='lf-seasonal-detail' d='M40 22c-4-9 1-16 10-14M29 29c-11 17-6 29 2 35m20-35c10 17 8 29-1 35'/>",
        "<path class='lf-seasonal-painted-deep' d='m27 41 8-4 1 8Zm26 0-8-4-1 8ZM29 54q11 9 22 0'/>",
        "<path class='lf-seasonal-detail' d='M64 12v10m-5-5h10'/>"
      ].join(''),
      outline:[
        "<path d='M44 12a28 28 0 1 0 22 50A28 28 0 1 1 44 12Z'/>",
        "<path d='M16 21h12m-6-6v12m40 5h10m-5-5v10M33 54h9m-4-5v10'/>",
        "<path d='m58 14 2 5 5 2-5 3-2 5-3-5-5-3 5-2Z'/>"
      ].join('')
    },
    christmas:{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-deep' d='M40 12 25 33h10L18 52h13l-10 13h38L49 52h13L45 33h10Z'/>",
        "<path class='lf-seasonal-painted' d='m40 17-7 14h14ZM31 40l-7 10h32L49 40Z'/>",
        "<path class='lf-seasonal-painted-secondary' d='M36 65h8v10h-8Z'/>",
        "<path class='lf-seasonal-detail' d='M40 21v40M24 52h32M30 65h20M15 20h9m-4-5v10'/>",
        "<circle class='lf-seasonal-painted-soft' cx='33' cy='39' r='3'/><circle class='lf-seasonal-painted-soft' cx='47' cy='48' r='3'/>",
        "<path class='lf-seasonal-painted-secondary' d='m61 16 4 4 6 1-5 4 1 6-6-3-5 3 1-6-5-4 6-1Z'/>"
      ].join(''),
      outline:[
        "<path d='M40 10 24 35h9L17 54h15L22 67h36L48 54h15L47 35h9Z'/>",
        "<path d='M35 67v8h10v-8m-6-48 1 7m-6 16h12M25 54h31'/>",
        "<circle cx='38' cy='38' r='3'/><circle cx='45' cy='51' r='3'/>",
        "<path d='M63 13v14m-7-7h14M10 29l4 3m-4 6 4-3'/>"
      ].join('')
    },
    'new-year':{
      filled:[
        "<circle class='lf-seasonal-halo' cx='40' cy='40' r='36'/>",
        "<path class='lf-seasonal-painted-secondary' d='m40 8 7 24 25 8-25 7-7 25-8-25-24-7 24-8Z'/>",
        "<path class='lf-seasonal-painted' d='m40 20 4 17 16 3-16 4-4 17-4-17-16-4 16-3Z'/>",
        "<path class='lf-seasonal-detail' d='M40 4v8m0 56v8M4 40h8m56 0h8M15 15l7 7m36 36 7 7m0-50-7 7M22 58l-7 7'/>",
        "<circle class='lf-seasonal-painted-deep' cx='63' cy='13' r='3'/><circle class='lf-seasonal-painted-deep' cx='16' cy='66' r='3'/>"
      ].join(''),
      outline:[
        "<path d='M40 9v15m0 31v16M9 40h15m31 0h16M18 18l11 11m22 22 11 11m0-44L51 29M29 51 18 62'/>",
        "<path d='m40 25 5 11 11 4-11 5-5 11-4-11-11-5 11-4Z'/>",
        "<path d='M63 8v13m-6-6h13M13 59v13m-6-6h13'/>"
      ].join('')
    }
  };
  const scenes={"ramadan":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#8b5579\" stroke-width=\"3\"/><g stroke=\"#bc8b59\" stroke-width=\"2\"><path d=\"M75 29v12m105 32v-16m105-28v12\"/></g><g stroke=\"#63345e\" stroke-width=\"2\"><path d=\"M37 24c-14 16-11 38 7 45 18 8 37-5 36-25-11 14-31 13-41 0-5-7-6-14-2-20Z\" fill=\"#f4cf78\"/><path d=\"m180 42-5 13 9 9-13-2-7 11-1-13-12-5 13-4 4-12 4 11Z\" fill=\"#e8a1b6\"/><path d=\"m315 31-4 10 7 7-10-1-5 9-1-10-9-4 10-3 3-9 3 9Z\" fill=\"#caa4d3\"/></g><g stroke=\"#63345e\" stroke-width=\"2\"><path d=\"M62 41h25l-3 27H65Zm4-7h17v7H66Zm5-8h7v8h-7Z\" fill=\"#e8a1b6\"/><path d=\"M268 41h25l-3 27h-19Zm4-7h17v7h-17Zm5-8h7v8h-7Z\" fill=\"#a7c9ad\"/></g><g fill=\"#fff4d7\" stroke=\"#9b6d64\" stroke-width=\"1.5\"><path d=\"M74 48v12m-4-6h8m-8 8h8M280 48v12m-4-6h8m-8 8h8\"/></g><g fill=\"#cda96d\"><circle cx=\"116\" cy=\"46\" r=\"3\"/><circle cx=\"134\" cy=\"58\" r=\"2.5\"/><circle cx=\"224\" cy=\"58\" r=\"2.5\"/><circle cx=\"244\" cy=\"45\" r=\"3\"/></g></svg>","eid-fitr":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#a76f83\" stroke-width=\"3\"/><g fill=\"#f1d184\" stroke=\"#79536b\" stroke-width=\"2\"><path d=\"M34 35h34v31H34z\"/><path d=\"M30 35 51 23l21 12Z\"/><path d=\"M49 35v31m-15-16h30\" fill=\"#e9aac0\"/></g><g fill=\"#e5bd73\" stroke=\"#805a68\" stroke-width=\"2\"><ellipse cx=\"180\" cy=\"58\" rx=\"45\" ry=\"17\" fill=\"#fff7eb\"/><ellipse cx=\"180\" cy=\"54\" rx=\"33\" ry=\"12\" fill=\"#e7c07c\"/><circle cx=\"163\" cy=\"52\" r=\"6\" fill=\"#f6e5bd\"/><circle cx=\"180\" cy=\"49\" r=\"6\" fill=\"#f6e5bd\"/><circle cx=\"197\" cy=\"52\" r=\"6\" fill=\"#f6e5bd\"/><path d=\"m161 52 4-3 4 3-4 3Zm17-3 4-3 4 3-4 3Zm17 3 4-3 4 3-4 3Z\" fill=\"#d78ca3\"/></g><g fill=\"#c294ca\" stroke=\"#63345e\" stroke-width=\"2\"><path d=\"M284 39h39v29h-39z\" fill=\"#dca0b3\"/><path d=\"m278 39 25-17 26 17Z\" fill=\"#f0ce7c\"/><path d=\"M303 39v29m-19-15h38\" fill=\"none\"/><path d=\"M297 43h12v12h-12z\" fill=\"#fff1dc\"/></g><g fill=\"#fff4d7\" stroke=\"#8d6475\" stroke-width=\"1.5\"><path d=\"m112 24 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z\"/><path d=\"m244 27 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z\"/></g><g fill=\"#d49b74\"><circle cx=\"93\" cy=\"43\" r=\"3\"/><circle cx=\"261\" cy=\"45\" r=\"3\"/></g></svg>","eid-adha":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#90715b\" stroke-width=\"3\"/><path d=\"M70 24v15m220-15v15\" stroke=\"#b8996d\" stroke-width=\"2\"/><g stroke=\"#654b5c\" stroke-width=\"2\"><path d=\"M45 41h46v31H45z\" fill=\"#e2a8ad\"/><path d=\"M39 41 68 24l29 17Z\" fill=\"#f1d088\"/><path d=\"M68 41v31M46 56h44\" fill=\"none\"/><path d=\"M250 44h52v28h-52z\" fill=\"#b7c7a2\"/><path d=\"m244 44 32-20 32 20Z\" fill=\"#d9a2b7\"/><path d=\"M276 44v28m-24-14h48\" fill=\"none\"/></g><g fill=\"#f5d37f\" stroke=\"#76546a\" stroke-width=\"2\"><path d=\"M166 29c-19 13-17 42 5 49 20 7 40-8 39-29-10 15-31 19-43 7-9-8-10-18-1-27Z\"/></g><g fill=\"#fff4dc\" stroke=\"#8c6172\" stroke-width=\"1.5\"><path d=\"m136 48 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z\"/><path d=\"m230 28 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z\"/></g><g fill=\"#d59ba9\"><circle cx=\"119\" cy=\"32\" r=\"3\"/><circle cx=\"225\" cy=\"62\" r=\"3\"/><circle cx=\"320\" cy=\"36\" r=\"3\"/></g></svg>","halloween":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#684765\" stroke-width=\"3\"/><g stroke=\"#59364f\" stroke-width=\"2\"><path d=\"M49 54c-3-16 6-28 20-28 4-11 16-11 20 0 14 0 23 12 20 28-3 14-14 22-30 22S52 68 49 54Z\" fill=\"#e99b55\"/><path d=\"M78 27c-4-7 0-13 8-14m-22 29 10 5-11 5m30-10-10 5 11 5\" fill=\"none\"/><path d=\"M75 51q8 6 16 0\" fill=\"none\"/></g><g fill=\"#8c6ca0\" stroke=\"#59364f\" stroke-width=\"2\"><path d=\"M165 50c-9-12-21-10-25 1-5-9-17-9-22 1 8 0 12 5 12 14h23c0-9 4-14 12-16Z\"/><path d=\"M262 50c-9-12-21-10-25 1-5-9-17-9-22 1 8 0 12 5 12 14h23c0-9 4-14 12-16Z\"/></g><g fill=\"#f4d778\"><circle cx=\"172\" cy=\"30\" r=\"4\"/><circle cx=\"187\" cy=\"45\" r=\"3\"/><circle cx=\"202\" cy=\"28\" r=\"4\"/><circle cx=\"300\" cy=\"35\" r=\"3\"/></g><g fill=\"#fff3df\" stroke=\"#7b5d6d\" stroke-width=\"1.5\"><path d=\"m142 24 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z\"/><path d=\"m296 54 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z\"/></g></svg>","christmas":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#8e5a70\" stroke-width=\"3\"/><g stroke=\"#475d4d\" stroke-width=\"2\"><path d=\"M180 18 149 56h19l-28 20h80l-28-20h19Z\" fill=\"#86a987\"/><path d=\"M175 74h10v9h-10Z\" fill=\"#b68a68\"/></g><g fill=\"#f3d177\" stroke=\"#70465a\" stroke-width=\"1.5\"><path d=\"m180 8 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z\"/><circle cx=\"164\" cy=\"51\" r=\"4\"/><circle cx=\"195\" cy=\"59\" r=\"4\"/><circle cx=\"180\" cy=\"38\" r=\"4\"/></g><g stroke=\"#67485d\" stroke-width=\"2\"><path d=\"M53 51h34v25H53z\" fill=\"#dca1b6\"/><path d=\"M49 51 70 36l21 15Z\" fill=\"#f0d28a\"/><path d=\"M70 51v25M54 63h32\" fill=\"none\"/><path d=\"M278 56h34v21h-34z\" fill=\"#e1c47b\"/><path d=\"M274 56 295 42l21 14Z\" fill=\"#d99ab2\"/><path d=\"M295 56v21m-17-10h34\" fill=\"none\"/></g><g fill=\"#b8d1b2\"><circle cx=\"117\" cy=\"42\" r=\"4\"/><circle cx=\"239\" cy=\"42\" r=\"4\"/></g><g fill=\"#fff1d8\"><circle cx=\"120\" cy=\"63\" r=\"3\"/><circle cx=\"241\" cy=\"63\" r=\"3\"/><circle cx=\"132\" cy=\"30\" r=\"3\"/><circle cx=\"228\" cy=\"30\" r=\"3\"/></g></svg>","new-year":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#9a7090\" stroke-width=\"3\"/><g stroke=\"#76516c\" stroke-width=\"2\" fill=\"none\"><path d=\"M76 72V39m-13 13 13-13 13 13m-13-13 3-14m-3 14-10-10m10 10 12-8\"/><path d=\"M284 72V39m-13 13 13-13 13 13m-13-13 3-14m-3 14-10-10m10 10 12-8\"/></g><g fill=\"#f2ce79\" stroke=\"#8a6278\" stroke-width=\"1\"><circle cx=\"76\" cy=\"38\" r=\"5\"/><circle cx=\"284\" cy=\"38\" r=\"5\"/><circle cx=\"63\" cy=\"52\" r=\"3\"/><circle cx=\"89\" cy=\"52\" r=\"3\"/><circle cx=\"271\" cy=\"52\" r=\"3\"/><circle cx=\"297\" cy=\"52\" r=\"3\"/></g><g fill=\"#d999b4\" stroke=\"#704c66\" stroke-width=\"1.5\"><path d=\"m180 17 8 23 24 8-24 8-8 23-8-23-24-8 24-8Z\"/><path d=\"m180 35 4 11 12 2-12 4-4 11-4-11-12-4 12-2Z\" fill=\"#fff3d8\"/></g><g fill=\"#a7c9ad\"><circle cx=\"119\" cy=\"33\" r=\"3\"/><circle cx=\"240\" cy=\"30\" r=\"3\"/><circle cx=\"130\" cy=\"63\" r=\"3\"/><circle cx=\"228\" cy=\"62\" r=\"3\"/></g></svg>","spring":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#7d9870\" stroke-width=\"3\"/><path d=\"M178 77c-2-22 0-42 17-59m-14 39c-16-9-29-8-40-2m47-18c13-10 26-11 38-6\" fill=\"none\" stroke=\"#6e8b67\" stroke-width=\"4\" stroke-linecap=\"round\"/><g fill=\"#e7a0b9\" stroke=\"#805873\" stroke-width=\"1.5\"><circle cx=\"194\" cy=\"20\" r=\"8\"/><circle cx=\"188\" cy=\"30\" r=\"7\"/><circle cx=\"200\" cy=\"30\" r=\"7\"/><circle cx=\"145\" cy=\"55\" r=\"7\"/><circle cx=\"139\" cy=\"64\" r=\"6\"/><circle cx=\"151\" cy=\"64\" r=\"6\"/></g><g fill=\"#f2cf77\"><circle cx=\"194\" cy=\"27\" r=\"4\"/><circle cx=\"145\" cy=\"60\" r=\"3.5\"/></g><g fill=\"#e4a0ad\" stroke=\"#79536b\" stroke-width=\"1\"><path d=\"M60 56c9-8 17-8 25 0-8 9-17 10-25 0Z\"/><path d=\"M80 62c9-8 17-8 25 0-8 9-17 10-25 0Z\"/><path d=\"M260 58c9-8 17-8 25 0-8 9-17 10-25 0Z\"/></g><g fill=\"#f4d47e\"><circle cx=\"108\" cy=\"30\" r=\"3\"/><circle cx=\"241\" cy=\"36\" r=\"3\"/><circle cx=\"224\" cy=\"67\" r=\"3\"/></g></svg>","summer":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#5f9f9c\" stroke-width=\"3\"/><g fill=\"#f4cd72\" stroke=\"#826256\" stroke-width=\"2\"><circle cx=\"180\" cy=\"46\" r=\"26\"/><path d=\"M180 8v9m0 58v8m-38-37h9m58 0h9m-65-27 7 7m41 41 7 7m0-55-7 7m-41 41-7 7\" fill=\"none\" stroke-linecap=\"round\"/></g><path d=\"M35 70c15-11 28 11 43 0s28 11 43 0 28 11 43 0 28 11 43 0 28 11 43 0 28 11 43 0 28 11 43 0\" fill=\"none\" stroke=\"#69b8b2\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M45 81c13-9 25 9 38 0s25 9 38 0 25 9 38 0 25 9 38 0 25 9 38 0 25 9 38 0 25 9 38 0\" fill=\"none\" stroke=\"#e7a1b5\" stroke-width=\"4\" stroke-linecap=\"round\"/><g fill=\"#fff2d6\"><circle cx=\"89\" cy=\"35\" r=\"3\"/><circle cx=\"274\" cy=\"33\" r=\"3\"/><circle cx=\"116\" cy=\"50\" r=\"2.5\"/><circle cx=\"246\" cy=\"54\" r=\"2.5\"/></g></svg>","autumn":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#aa7650\" stroke-width=\"3\"/><g stroke=\"#6d574c\" stroke-width=\"2\"><path d=\"M69 24c7 13 16 24 29 35m-18-23-18 1m28 8 17-5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M62 23c-4-12 7-15 17-12 1 10-3 17-13 19Zm39 26c8-11 18-6 19 4-8 8-16 9-23 2Z\" fill=\"#df935e\"/><path d=\"M285 21c-8 15-16 26-29 39m18-24 18 1m-28 8-18-5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M292 20c5-12-6-16-16-13-2 10 2 17 12 20Zm-39 29c-8-11-18-6-19 4 8 8 16 9 23 2Z\" fill=\"#d5a154\"/></g><g fill=\"#f0cd7a\"><circle cx=\"158\" cy=\"42\" r=\"5\"/><circle cx=\"173\" cy=\"52\" r=\"5\"/><circle cx=\"189\" cy=\"44\" r=\"5\"/><circle cx=\"204\" cy=\"54\" r=\"5\"/></g><path d=\"M155 42q3-7 7 0m7 10q3-7 7 0m7-8q3-7 7 0m7 10q3-7 7 0\" fill=\"none\" stroke=\"#8c604c\" stroke-width=\"1.5\"/></svg>","winter":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 360 90\"><path d=\"M20 18 Q180 88 340 18\" fill=\"none\" stroke=\"#8191ad\" stroke-width=\"3\"/><g stroke=\"#536c84\" stroke-width=\"2\"><path d=\"M83 24 57 56h16L48 76h70L99 56h16Z\" fill=\"#789b9b\"/><path d=\"M79 76h9v8h-9Z\" fill=\"#b18a73\"/><path d=\"M280 25 257 53h14l-19 19h60l-19-19h14Z\" fill=\"#9bbab2\"/><path d=\"M276 72h8v11h-8Z\" fill=\"#b18a73\"/></g><g fill=\"#f3d184\" stroke=\"#675877\" stroke-width=\"1.3\"><circle cx=\"77\" cy=\"53\" r=\"4\"/><circle cx=\"98\" cy=\"62\" r=\"4\"/><circle cx=\"277\" cy=\"52\" r=\"3.5\"/><circle cx=\"293\" cy=\"62\" r=\"3.5\"/></g><g stroke=\"#7b6b95\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M180 20v34m-15-25 30 17m0-17-30 17m10-22 5 5 5-5m-20 16 6 1 1 6m18-7 6-1-1 7\"/><path d=\"M143 48v20m-9-15 18 10m0-10-18 10m6-13 3 3 3-3\"/></g><g fill=\"#e5a7bb\"><circle cx=\"229\" cy=\"38\" r=\"3\"/><circle cx=\"215\" cy=\"67\" r=\"2.5\"/><circle cx=\"129\" cy=\"30\" r=\"2.5\"/></g></svg>"};
  const sceneSvg=scenes[id];
  if(sceneSvg){
    const sceneStyle=document.createElement('style');
    const sceneUrl='data:image/svg+xml,'+encodeURIComponent(sceneSvg);
    sceneStyle.textContent='html[data-theme="'+id+'"] #cats::before{background-image:url("'+sceneUrl+'")!important;}';
    document.head.appendChild(sceneStyle);
  }
  const namespace='http://www.w3.org/2000/svg';
  function icon(cls,mode='outline'){
    const svg=document.createElementNS(namespace,'svg');
    svg.setAttribute('viewBox','0 0 80 80');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.85');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.classList.add('lf-seasonal-vector');
    svg.classList.add(mode==='filled'?'lf-seasonal-vector--filled':'lf-seasonal-vector--outline');
    if(cls)svg.classList.add(cls);
    svg.innerHTML=(motifs[id]||motifs.ramadan)[mode==='filled'?'filled':'outline'];
    return svg;
  }
  function decorate(host,classes,mode='outline'){
    if(!host)return;
    const mark=icon('lf-seasonal-decor',mode);
    for(const name of classes.split(' '))if(name)mark.classList.add(name);
    host.appendChild(mark);
  }
  const root=document.getElementById('lfSeasonalWelcome');
  if(root){
    root.classList.add('lf-seasonal');
    root.setAttribute('aria-label',labels[id]||'مناسبة موسمية');
    const layout=document.createElement('div');layout.className='lf-seasonal__layout';
    const title=document.createElement('strong');
    title.textContent=greetings[id]||labels[id]||'';
    const primary=icon('lf-seasonal__ornament','filled');
    const secondary=icon('lf-seasonal__ornament','outline');
    secondary.classList.add('lf-seasonal__ornament--right');
    layout.append(primary,title);
    if(id==='new-year'){
      const year=document.createElement('span');
      year.className='lf-seasonal__year';
      year.textContent=String(settings.year||'');
      layout.appendChild(year);
    }
    layout.appendChild(secondary);root.appendChild(layout);
  }
  // Visual-only icons: do not intercept taps, gestures, or keyboard navigation.
  const categories=document.getElementById('cats');
  decorate(categories,'lf-seasonal-decor--section lf-seasonal-decor--end','filled');
  const products=document.getElementById('products');
  decorate(products,'lf-seasonal-decor--section lf-seasonal-decor--start','outline');
  const discovery=document.getElementById('storeDiscoveryIdeas');
  decorate(discovery,'lf-seasonal-decor--discovery lf-seasonal-decor--start','filled');
  const footer=document.querySelector('body > footer');
  decorate(footer,'lf-seasonal-decor--footer lf-seasonal-decor--start','filled');
  function divider(after){
    if(!after || !after.parentNode)return;
    const el=document.createElement('div');el.className='lf-seasonal-divider';
    el.setAttribute('aria-hidden','true');
    el.appendChild(icon('lf-seasonal-divider__icon','outline'));
    after.insertAdjacentElement('afterend',el);
  }
  divider(document.querySelector('.heroSlider'));

  divider(document.getElementById('cats'));
})();
