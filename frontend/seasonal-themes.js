'use strict';
(function () {
  const config=window.__LF_SEASONAL__;
  if(!config || config.active==='none')return;
  const id=config.active;
  const labels=config.labels||{}, greetings=config.greetings||{}, banner=(config.banners||{})[id]||{};
  const emblems={'ramadan':['☾','✧'],'eid-fitr':['✿','☾'],'eid-adha':['♧','✦'],halloween:['✦','☽'],christmas:['✶','❄'],'new-year':['✧','✦']};
  function safeUrl(str) {
    if(typeof str!=='string')return '';
    if(/^\/(?!\/)[A-Za-z0-9._~/%-]+(?:\?[A-Za-z0-9._~%=&-]+)?$/.test(str))return str;
    try{const u=new URL(str);if((u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password)return u.href;}catch{}
    return '';
  }
  const root=document.getElementById('lfSeasonalWelcome');
  if(!root)return;
  root.className='lf-seasonal';
  root.setAttribute('aria-label',labels[id]||'مناسبة موسمية');
  const picUrl=safeUrl(banner.desktop),mobileUrl=safeUrl(banner.mobile);
  if(picUrl||mobileUrl){
    const picture=document.createElement('picture');
    picture.className='lf-seasonal__picture';
    if(mobileUrl){const source=document.createElement('source');source.media='(max-width: 760px)';source.srcset=mobileUrl;picture.append(source)}
    const image=document.createElement('img');image.src=picUrl||mobileUrl;image.alt=(labels[id]||'')+' — Ladies First';image.decoding='async';image.loading='eager';
    picture.append(image);root.append(picture);
  }
  const layout=document.createElement('div');layout.className='lf-seasonal__layout';
  const title=document.createElement('strong');
  title.textContent=greetings[id]||labels[id]||'';
  const left=document.createElement('span');left.className='lf-seasonal__ornament';left.textContent=(emblems[id]||[])[0]||'✧';left.setAttribute('aria-hidden','true');
  const right=document.createElement('span');right.className='lf-seasonal__ornament lf-seasonal__ornament--right';right.textContent=(emblems[id]||[])[1]||'✧';right.setAttribute('aria-hidden','true');
  layout.append(left,title);
  if(id==='new-year'){
    const year=document.createElement('span');year.className='lf-seasonal__year';year.textContent=String(config.year||'');layout.append(year);
  }
  layout.append(right);
  root.append(layout);
})();
