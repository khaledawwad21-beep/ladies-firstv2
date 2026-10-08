'use strict';
(()=>{
 const states=new WeakMap();
 const config=value=>({intervalSeconds:Math.max(2,Math.min(30,Number(value?.intervalSeconds)||3.5)),transition:['smooth','slide','fade','instant'].includes(value?.transition)?value.transition:'smooth'});
 const state=el=>{if(!states.has(el))states.set(el,{next:0,paused:0,frame:0});return states.get(el)};
 function move(el,direction,settings,wrap=false){
  if(!el)return;const s=state(el),c=config(settings);cancelAnimationFrame(s.frame);
  const rtl=getComputedStyle(el).direction==='rtl',sign=rtl?-1:1,max=Math.max(0,el.scrollWidth-el.clientWidth);
  const first=el.querySelector('.featureCard'),step=(first?.getBoundingClientRect().width||170)+(parseFloat(getComputedStyle(el).gap)||10);
  const position=Math.abs(el.scrollLeft);let target=position+direction*step;
  if(wrap&&target>max-2)target=position>=max-2?0:max;else target=Math.max(0,Math.min(max,target));
  const start=el.scrollLeft,end=target===0?0:sign*target;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(c.transition==='instant'||reduced){el.scrollLeft=end;return}
  const duration=c.transition==='smooth'?950:c.transition==='fade'?800:600;
  const snap=el.style.scrollSnapType;el.style.setProperty('scroll-snap-type','none','important');el.style.setProperty('scroll-behavior','auto','important');
  let began=null;
  const frame=time=>{if(began===null)began=time;const t=Math.min(1,(time-began)/duration),ease=1-Math.pow(1-t,3);el.scrollLeft=start+(end-start)*ease;
   if(c.transition==='fade')el.style.opacity=String(.35+.65*Math.abs(2*t-1));
   if(t<1)s.frame=requestAnimationFrame(frame);else{el.style.scrollSnapType=snap;el.style.opacity='';s.frame=0;}
  };s.frame=requestAnimationFrame(frame);
 }
 function bind(el){if(!el||el.dataset.motionBound)return;el.dataset.motionBound='1';const s=state(el);
  const pause=()=>{s.paused=Date.now()+8000;cancelAnimationFrame(s.frame);el.style.scrollSnapType='';el.style.opacity=''};
  ['pointerdown','touchstart','wheel'].forEach(name=>el.addEventListener(name,pause,{passive:true}));
  // Native touch scrolling keeps horizontal swipe and vertical page scrolling available.
  let drag=null,moved=false;
  el.addEventListener('dragstart',e=>e.preventDefault());
  el.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,input'))return;drag={x:e.clientX,left:el.scrollLeft,id:e.pointerId};moved=false});
  el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6){moved=true;el.setPointerCapture(drag.id);el.scrollLeft=drag.left-dx}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>el.addEventListener(name,()=>{drag=null}));
  el.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);
 }
 function tick(el,settings){if(!el||el.scrollWidth<=el.clientWidth+5)return;const s=state(el),now=Date.now(),c=config(settings);if(now<s.paused)return;const signature=c.intervalSeconds+'|'+c.transition;if(s.config!==signature){s.config=signature;s.next=now+c.intervalSeconds*1000;return}if(now>=s.next){s.next=now+c.intervalSeconds*1000;move(el,1,c,true)}}
 window.LFCarouselMotion={config,bind,move,tick};
})();
