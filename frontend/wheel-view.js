(()=>{'use strict';
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const colors=['#63345e','#b57e99','#825177','#b08a4d','#724369','#c190a8','#8b657c','#a67d48'];
 function image(p){return p.type==='gift'&&/^\/api\/product-images\/[1-9]\d*\/(?:hero|all|main|sub)\/\d+$/.test(p.image||'')?p.image:'';}
 function markup(prizes,{preview=false}={}){
  const n=prizes.length;
  return '<div class="lf-wheel-stage"><div class="lf-wheel-pointer" aria-hidden="true"></div><div class="lf-wheel-disc'+(preview?' wheel-preview-disc':'')+'" role="img" aria-label="'+E(prizes.map((p,i)=>(i+1)+'. '+p.label).join('، '))+'" style="background:conic-gradient('+prizes.map((p,i)=>colors[i%colors.length]+' '+i*100/n+'% '+(i+1)*100/n+'%').join(',')+')">'+prizes.map((p,i)=>{
   const degrees=(i+.5)*360/n,radians=degrees*Math.PI/180,src=image(p);
   return '<span class="lf-wheel-slot" data-wheel-slot="'+i+'" style="left:'+(50+Math.sin(radians)*30).toFixed(3)+'%;top:'+(50-Math.cos(radians)*30).toFixed(3)+'%;transform:translate(-50%,-50%) rotate('+degrees+'deg)">'+(src?'<img data-wheel-image src="'+E(src)+'" alt="'+E(p.label)+'" draggable="false">':'<i aria-hidden="true">'+(p.type==='none'?'✦':p.type==='shipping'?'↗':p.type==='gift'?'🎁':p.type==='fixed'?'₪':'%')+'</i>')+'<b title="'+E(p.label)+'">'+E(p.label)+'</b></span>';
  }).join('')+'<div class="lf-wheel-hub" aria-hidden="true">LF</div></div></div>';
 }
 function hydrate(root){root.querySelectorAll('[data-wheel-image]').forEach(img=>{const fallback=()=>{img.hidden=true;};img.addEventListener('error',fallback,{once:true});if(img.complete&&!img.naturalWidth)fallback();});}
 window.LFWheelView={markup,hydrate};
})();
