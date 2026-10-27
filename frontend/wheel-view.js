(()=>{'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const colors=['#fcf6eb','#ead2df','#f5e8ce','#e3c2d2','#fcf6eb','#ead2df','#f5e8ce','#e3c2d2'];
 const glyph={gift:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v11H3zM2 6h20v4H2zM12 6v15M12 6C5 7 5 0 9 2c2 1 3 4 3 4Zm0 0c7 1 7-6 3-4-2 1-3 4-3 4Z"/></svg>',shipping:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h12v13H2zM14 10h4l4 5v3h-8M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',none:'✧',percent:'%',fixed:'₪'};
 function label(p){const value=Number(p.value)||0;if(p.type==='percent')return 'خصم '+value+'%';if(p.type==='fixed')return 'خصم '+value+' ₪';if(p.type==='shipping')return 'توصيل مجاني';if(p.type==='none')return 'حظ أوفر';return p.productName?'هدية: '+p.productName:p.label?.startsWith('هدية:')?p.label:'هدية منتج';}
 function sources(p){
  if(p.type!=='gift')return [];
  let base;try{base=new URL(window.LF_API_URL||location.origin);}catch{return [];}
  const paths=[p.image,...(p.imageSources||[])].filter(Boolean),urls=[];
  for(const value of paths){try{const u=new URL(value,base);if(['http:','https:'].includes(u.protocol)&&u.origin===base.origin&&/^\/api\/product-images\/[1-9]\d*\/(?:hero|all|main|sub)\/\d+$/.test(u.pathname)&&!u.search&&!u.hash)urls.push(u.href);}catch{}}
  return [...new Set(urls)].slice(0,4);
 }
 function markup(prizes,{preview=false}={}){
  const n=prizes.length;
  return '<div class="lf-wheel-stage"><div class="lf-wheel-pointer" aria-hidden="true"></div><div class="lf-wheel-rim"><div class="lf-wheel-disc'+(preview?' wheel-preview-disc':'')+'" role="img" aria-label="'+E(prizes.map((p,i)=>(i+1)+'. '+label(p)).join('، '))+'" style="background:conic-gradient('+prizes.map((p,i)=>colors[i%colors.length]+' '+(i*100/n)+'% '+((i+1)*100/n-.25)+'%,#fff9 '+((i+1)*100/n-.25)+'% '+((i+1)*100/n)+'%').join(',')+')">'+prizes.map((p,i)=>{
   const degrees=(i+.5)*360/n,radians=degrees*Math.PI/180,photos=sources(p),name=label(p);
   return '<span class="lf-wheel-slot" data-wheel-slot="'+i+'" style="left:'+(50+Math.sin(radians)*32).toFixed(3)+'%;top:'+(50-Math.cos(radians)*32).toFixed(3)+'%">'+(photos.length?'<span class="lf-wheel-photo"><img data-wheel-image data-wheel-sources="'+E(JSON.stringify(photos))+'" src="'+E(photos[0])+'" alt="'+E(name)+'" decoding="async" loading="eager" draggable="false"><i class="lf-wheel-image-fallback" aria-hidden="true">'+glyph.gift+'</i></span>':'<i class="lf-wheel-symbol" aria-hidden="true">'+(glyph[p.type]||glyph.gift)+'</i>')+'<b dir="auto" title="'+E(name)+'">'+E(name)+'</b></span>';
  }).join('')+'<div class="lf-wheel-hub" aria-hidden="true"><b>LF</b><small>LADIES FIRST</small></div></div></div><div class="lf-wheel-pedestal" aria-hidden="true"></div></div>';
 }
 function hydrate(root){root.querySelectorAll('[data-wheel-image]').forEach(img=>{
  let urls=[];try{urls=JSON.parse(img.dataset.wheelSources);}catch{}let next=1;
  const fallback=()=>{if(next<urls.length){img.src=urls[next++];return;}img.hidden=true;img.closest('.lf-wheel-photo')?.classList.add('image-unavailable');img.alt='صورة الهدية غير متاحة';};
  img.addEventListener('error',fallback);if(img.complete&&!img.naturalWidth)fallback();
 });}
 window.LFWheelView={markup,hydrate,label,sources};
})();
