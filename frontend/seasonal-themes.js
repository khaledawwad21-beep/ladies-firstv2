'use strict';
/* Seasonal flourishes stay in empty space beside text and over category photos only. */
(function () {
  const settings=window.__LF_SEASONAL__;
  if(!settings || settings.active==='none')return;
  const id=settings.active;
  const labels=settings.labels||{},greetings=settings.greetings||{};
  const svgNs='http://www.w3.org/2000/svg';
  function flourish(className) {
    const svg=document.createElementNS(svgNs,'svg');
    svg.setAttribute('viewBox','0 0 160 90');
    svg.setAttribute('width','112');
    svg.setAttribute('height','76');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.classList.add('lf-seasonal-flourish',className);
    const isCard=className==='lf-seasonal-flourish--card';
    const isEnd=className==='lf-seasonal-flourish--end' || (isCard && false);
    svg.style.position='absolute';
    svg.style.pointerEvents='none';
    svg.style.zIndex=isCard?'2':'1';
    if(isCard){
      svg.style.top='8px';svg.style.width='48px';svg.style.height='40px';
      svg.style.insetInlineEnd='8px';
    }else{
      svg.style.top='50%';svg.style.width='clamp(68px,8vw,112px)';svg.style.height='clamp(56px,5.5vw,76px)';
      svg.style.insetInlineStart='10px';svg.style.transform='translateY(-50%)';
    }
    const artStyle=document.createElementNS(svgNs,'style');
    artStyle.textContent='.lf-flourish-stem{fill:none;stroke:var(--season-icon-stroke,#63345e);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.lf-flourish-leaf{stroke:var(--season-icon-stroke,#63345e);stroke-width:1.8;stroke-linejoin:round}.lf-flourish-leaf--main{fill:var(--season-icon-main,#91aabd)}.lf-flourish-leaf--secondary{fill:var(--season-icon-secondary,#c2a5c7)}.lf-flourish-leaf--soft{fill:var(--season-icon-soft,#f7f5fb)}.lf-flourish-berry{fill:var(--season-icon-deep,#617c96);stroke:#fff;stroke-width:1}';
    svg.appendChild(artStyle);
    svg.innerHTML+= [
      "<path class='lf-flourish-stem' d='M6 82C37 73 47 56 68 42S111 27 151 8'/>",
      "<path class='lf-flourish-stem' d='M39 65C31 53 27 44 28 31M68 43C64 30 66 19 73 9M101 29c-1-12 3-20 11-26M121 22c8 3 15 9 19 17'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--main' d='M28 47C14 41 10 28 13 17c15 1 25 11 25 24-3 4-6 6-10 6Z'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--secondary' d='M39 66C23 67 13 58 9 47c13-7 27-4 34 7 0 5-1 9-4 12Z'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--secondary' d='M70 43C55 37 50 25 54 13c15 2 24 13 21 26-2 3-4 4-5 4Z'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--main' d='M74 13C68 1 72-10 80-17c12 9 14 23 5 33-4 1-8 0-11-3Z' transform='translate(0 20)'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--soft' d='M108 26C97 16 99 3 106-6c14 6 19 19 13 31-4 2-8 2-11 1Z' transform='translate(0 12)'/>",
      "<path class='lf-flourish-leaf lf-flourish-leaf--secondary' d='M129 30c8-12 21-14 32-8-4 14-16 22-29 18-3-3-4-7-3-10Z' transform='translate(-14 -3)'/>",
      "<circle class='lf-flourish-berry' cx='146' cy='8' r='3'/><circle class='lf-flourish-berry' cx='136' cy='15' r='2.3'/>",
      "<circle class='lf-flourish-berry' cx='47' cy='61' r='2.2'/>"
    ].join('');
    return svg;
  }
  const root=document.getElementById('lfSeasonalWelcome');
  if(root){
    root.classList.add('lf-seasonal');
    root.setAttribute('aria-label',labels[id]||'مناسبة موسمية');
    const layout=document.createElement('div');layout.className='lf-seasonal__layout';
    const title=document.createElement('strong');title.textContent=greetings[id]||labels[id]||'';
    layout.appendChild(title);
    if(id==='new-year'){
      const year=document.createElement('span');year.className='lf-seasonal__year';
      year.textContent=String(settings.year||'');layout.appendChild(year);
    }
    const left=flourish('lf-seasonal-flourish--start');
    const right=flourish('lf-seasonal-flourish--end');
    left.style.insetInlineStart='10px';left.style.insetInlineEnd='auto';
    right.style.insetInlineStart='auto';right.style.insetInlineEnd='10px';right.style.transform='translateY(-50%) scaleX(-1)';
    layout.style.position='relative';layout.style.zIndex='2';
    root.append(left,layout,right);
  }
  const cards=document.querySelectorAll('#cats .cat');
  cards.forEach((card,index)=>{
    if(card.querySelector('.lf-seasonal-flourish--card'))return;
    const art=flourish('lf-seasonal-flourish--card');
    const mirror=index%2===1;
    art.classList.add(mirror?'lf-seasonal-flourish--start':'lf-seasonal-flourish--end');
    if(mirror){art.style.insetInlineEnd='auto';art.style.insetInlineStart='8px';art.style.transform='scaleX(-1)';}
    const image=card.querySelector('img');
    if(image)image.insertAdjacentElement('afterend',art);
  });
})();
