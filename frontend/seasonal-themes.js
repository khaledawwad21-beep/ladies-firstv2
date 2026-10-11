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
  const header=document.querySelector('body > header');
  decorate(header,'lf-seasonal-decor--header lf-seasonal-decor--start','filled');
  decorate(header,'lf-seasonal-decor--header lf-seasonal-decor--end','outline');
  const categories=document.getElementById('cats');
  decorate(categories,'lf-seasonal-decor--section lf-seasonal-decor--start','filled');
  decorate(categories,'lf-seasonal-decor--section lf-seasonal-decor--end','outline');
  const products=document.getElementById('products');
  decorate(products,'lf-seasonal-decor--section lf-seasonal-decor--start','outline');
  decorate(products,'lf-seasonal-decor--section lf-seasonal-decor--end','filled');
  [...document.querySelectorAll('.featureBlock')].forEach((panel,i)=>{
    decorate(panel,'lf-seasonal-decor--panel',i%2===0?'filled':'outline');
  });
  const discovery=document.getElementById('storeDiscoveryIdeas');
  decorate(discovery,'lf-seasonal-decor--discovery lf-seasonal-decor--start','filled');
  decorate(discovery,'lf-seasonal-decor--discovery lf-seasonal-decor--end','outline');
  const footer=document.querySelector('body > footer');
  decorate(footer,'lf-seasonal-decor--footer lf-seasonal-decor--start','filled');
  decorate(footer,'lf-seasonal-decor--footer lf-seasonal-decor--end','outline');
  function divider(after){
    if(!after || !after.parentNode)return;
    const el=document.createElement('div');el.className='lf-seasonal-divider';
    el.setAttribute('aria-hidden','true');
    el.appendChild(icon('lf-seasonal-divider__icon','outline'));
    after.insertAdjacentElement('afterend',el);
  }
  divider(document.querySelector('.heroSlider'));
  divider(document.getElementById('cats'));
  [...document.querySelectorAll('.sectionTitle h2,.featureTitle,.lf-store-ideas-head h2')].forEach((heading,i)=>{
    heading.appendChild(icon('lf-seasonal-title-icon',i%2===0?'filled':'outline'));
  });
})();
