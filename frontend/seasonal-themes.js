'use strict';
/* Seasonal welcome text only. Decorative marks stay off text and are handled by category framing in CSS. */
(function () {
  const settings=window.__LF_SEASONAL__;
  if(!settings || settings.active==='none')return;
  const id=settings.active;
  const labels=settings.labels||{},greetings=settings.greetings||{};
  const root=document.getElementById('lfSeasonalWelcome');
  if(!root)return;
  root.classList.add('lf-seasonal');
  root.setAttribute('aria-label',labels[id]||'مناسبة موسمية');
  const layout=document.createElement('div');
  layout.className='lf-seasonal__layout';
  const title=document.createElement('strong');
  title.textContent=greetings[id]||labels[id]||'';
  layout.appendChild(title);
  if(id==='new-year'){
    const year=document.createElement('span');
    year.className='lf-seasonal__year';
    year.textContent=String(settings.year||'');
    layout.appendChild(year);
  }
  root.appendChild(layout);
})();
