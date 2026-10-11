'use strict';
/* Seasonal decoration: small inline vector strokes, no image library, no scrolling overlays. */
(function () {
  const config=window.__LF_SEASONAL__;
  if(!config || config.active==='none')return;
  const id=config.active, labels=config.labels||{}, greetings=config.greetings||{};
  const icons={
    ramadan:`<path d="M40 5v11m-12 6h24l4 7-3 37H27l-3-37 4-7Zm-1 8h26M29 57h22M34 66v8h12v-8M35 16h10M31 72h18"/><path d="M40 32c-12 9-10 19 0 23 10-4 12-14 0-23Z"/><path d="M65 12a11 11 0 1 0 4 19 10 10 0 1 1-4-19Z"/><path d="M9 20h8m-4-4v8"/>`,
    'eid-fitr':`<circle cx="39" cy="39" r="26"/><path d="M39 13c6-7 11 3 16 0s10 6 8 11 9 9 2 15 3 13-4 17-9 12-16 10-13 5-17-2-14-2-13-11-8-12-2-16 0-14 8-17 9-10 18-7Z"/><circle cx="39" cy="39" r="17"/><path d="M39 22v34m-17-17h34M27 27l24 24M51 27 27 51"/><circle cx="39" cy="39" r="7"/><circle cx="69" cy="62" r="7"/><path d="m65 62 4-4 4 4-4 4Z"/>`,
    'eid-adha':`<path d="M17 43c-7-6-4-17 5-17-1-11 13-14 19-7 8-7 22-1 20 10 9 4 9 17 1 22-7 9-24 5-32 5-9 1-17-4-13-13Z"/><path d="M22 56v12m9-12v12m23-12v12m-7-12v12M12 36c-10-2-10 12-1 14"/><path d="M58 31q8-9 15-2l3 8-1 12-8 5-11-5"/><path d="m70 30 7-3-2 9M67 54l-1 8M69 40h1"/><path d="M20 36q4-7 10-2m4-7q6-5 10 2m-21 17q5 5 11 1m6-11q6-4 11 1"/>`,
    halloween:`<path d="M40 21c-12-10-31 1-28 20-4 17 11 30 28 28 17 2 32-11 28-28 3-19-16-30-28-20Z"/><path d="M40 21c-3 12-5 34 0 48M40 21c3 12 5 34 0 48M40 22c1-11 8-13 11-12"/><path d="m24 44 9-5 2 8Zm32 0-9-5-2 8ZM27 54q13 11 26 0"/><path d="M65 13h10m-5-5v10"/>`,
    christmas:`<path d="M40 7 21 35h9L16 54h16l-7 11h30l-7-11h16L50 35h9L40 7Zm0 58v9m-8 0h16"/><path d="M40 18v4m-13 19h26m-22 8h18"/><circle cx="39" cy="35" r="2"/><circle cx="49" cy="52" r="2"/><path d="M8 65v10h12V65Zm6 0v10m-6-5h12"/><path d="M67 18h7m-3.5-3.5v7"/>`,
    'new-year':`<path d="M40 7v15m0 36v15M7 40h15m36 0h15M16 16l11 11m26 26 11 11m0-48L53 27M27 53 16 64"/><path d="m40 25 4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z"/><path d="M12 5v12m-6-6h12M68 63v12m-6-6h12"/><circle cx="62" cy="14" r="3"/><circle cx="15" cy="62" r="2"/>`
  };
  const svgNS='http://www.w3.org/2000/svg';
  function icon(cls){
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 80 80');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.7');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.classList.add('lf-seasonal-vector');
    if(cls)svg.classList.add(cls);
    svg.innerHTML=icons[id]||icons.ramadan;
    return svg;
  }
  function decorate(host,classes){
    if(!host)return;
    const mark=icon('lf-seasonal-decor');
    for(const name of classes.split(' '))if(name)mark.classList.add(name);
    host.appendChild(mark);
  }
  const root=document.getElementById('lfSeasonalWelcome');
  if(root){
    root.classList.add('lf-seasonal');
    root.setAttribute('aria-label',labels[id]||'مناسبة موسمية');
    const layout=document.createElement('div');layout.className='lf-seasonal__layout';
    const title=document.createElement('strong');title.textContent=greetings[id]||labels[id]||'';
    const a=icon('lf-seasonal__ornament'),b=icon('lf-seasonal__ornament');
    b.classList.add('lf-seasonal__ornament--right');
    layout.append(a,title);
    if(id==='new-year'){
      const year=document.createElement('span');
      year.className='lf-seasonal__year';
      year.textContent=String(config.year||'');
      layout.appendChild(year);
    }
    layout.appendChild(b);root.appendChild(layout);
  }
  // Keep action controls clickable. Ornaments are purely decorative SVGs.
  const header=document.querySelector('body > header');
  decorate(header,'lf-seasonal-decor--header lf-seasonal-decor--start');
  decorate(header,'lf-seasonal-decor--header lf-seasonal-decor--end');
  for(const panel of document.querySelectorAll('.featureBlock')){
    decorate(panel,'lf-seasonal-decor--panel');
  }
  const discovery=document.getElementById('storeDiscoveryIdeas');
  decorate(discovery,'lf-seasonal-decor--discovery lf-seasonal-decor--start');
  decorate(discovery,'lf-seasonal-decor--discovery lf-seasonal-decor--end');
  const footer=document.querySelector('body > footer');
  decorate(footer,'lf-seasonal-decor--footer lf-seasonal-decor--start');
  decorate(footer,'lf-seasonal-decor--footer lf-seasonal-decor--end');
  function divider(after){
    if(!after || !after.parentNode)return;
    const el=document.createElement('div');el.className='lf-seasonal-divider';
    el.setAttribute('aria-hidden','true');
    el.appendChild(icon('lf-seasonal-divider__icon'));
    after.insertAdjacentElement('afterend',el);
  }
  divider(document.querySelector('.heroSlider'));
  divider(document.getElementById('cats'));
  for(const heading of document.querySelectorAll('.sectionTitle h2,.featureTitle,.lf-store-ideas-head h2')){
    heading.appendChild(icon('lf-seasonal-title-icon'));
  }
})();
