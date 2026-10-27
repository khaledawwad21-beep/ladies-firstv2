/* Session-only recommendation ranking: no external behavioral profiles. */
(function(root){'use strict';
 function pick(products,views=[],cartIds=[]){
  const ids=new Set(cartIds.map(String)),rank=new Map();
  const available=products.filter(p=>p.active!==false&&p.isActive!==false&&(Array.isArray(p.variants)&&p.variants.length?p.variants.some(v=>Number(v.stock)>0):Number(p.stock)>0)&&Number(p.price)>0&&!ids.has(String(p.id)));
  for(const p of available){let score=0;views.slice(-25).forEach((v,i)=>{const weight=1+i/25;if(String(v.id)===String(p.id))score+=8*weight;if(v.category&&v.category===(p.category||p.cat))score+=4*weight;if(v.brand&&v.brand===p.brand)score+=2*weight;});rank.set(String(p.id),score);}
  return available.map((p,i)=>({p,i,score:rank.get(String(p.id))})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,3).map(x=>x.p);
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={pick};return;}
 let config={exitEnabled:false},views=[],activeAccount='',shown=false,dialog=null,started=Date.now(),maxScroll=0;
 const english=()=>document.documentElement.lang==='en',male=()=>window.getAccount?.()?.gender==='male';
 function consent(){try{return sessionStorage.getItem('lf_marketing_consent_v1')==='yes';}catch{return false;}}
 function key(){return String(window.getAccount?.()?.id||'guest');}
 function reset(){const next=key();if(next===activeAccount)return;activeAccount=next;views=[];try{const old=JSON.parse(sessionStorage.getItem('lf_exit_views')||'{}');if(old.account===next&&consent())views=old.views||[];}catch{} }
 function record(event,id){if(event!=='product_view')return;if(!consent()){views=[];try{sessionStorage.removeItem('lf_exit_views');}catch{}return;}reset();const p=typeof products!=='undefined'?products.find(p=>String(p.id)===String(id)):null;if(!p)return;views.push({id:p.id,category:p.cat||p.category||'',brand:p.brand||''});views=views.slice(-25);try{sessionStorage.setItem('lf_exit_views',JSON.stringify({account:activeAccount,views}));}catch{} }
 function blocked(){return document.hidden||!!document.querySelector('dialog[open],.modal[style*="flex"],#nayaAssistant.open')||document.body.classList.contains('lf-store-ai-open');}
 function open(manual=false){if(!config.exitEnabled||!manual&&(shown||Date.now()-started<20000)||blocked())return;reset();const catalog=typeof products!=='undefined'?products:[],cartIds=typeof cart!=='undefined'?cart.map(x=>x.id):[];const choices=pick(catalog,consent()?views:[],cartIds);if(!choices.length)return;
  if(!dialog){dialog=document.createElement('dialog');dialog.className='lf-exit-dialog';dialog.setAttribute('aria-labelledby','lfExitTitle');document.body.append(dialog);}
  dialog.replaceChildren();const title=document.createElement('h2');title.id='lfExitTitle';title.textContent=english()?'Before you go, take a look':male()?'شوف هدول قبل ما تطلع':'شوفي هدول قبل لا تطلعي';const desc=document.createElement('p');desc.textContent=english()?'A few available picks you may like.':consent()&&views.length?'اختيارات متوفرة قريبة من القطع اللي اهتمّيت فيها.':'اختيارات متوفرة ممكن تعجبك.';const grid=document.createElement('div');grid.className='lf-exit-grid';
  for(const p of choices){const button=document.createElement('button');button.type='button';button.className='lf-exit-product';const src=p.mainImages?.[0]||p.images?.[0]||p.imageUrl;if(src){const img=document.createElement('img');img.src=typeof safeImg==='function'?safeImg(src):src;img.alt='';button.append(img);}const name=document.createElement('b');name.textContent=english()?(p.en||p.name):p.name;const price=document.createElement('span');price.textContent=Number(p.price)+' ₪';button.append(name,price);button.onclick=()=>{dialog.close();window.openProduct?.(p.id);};grid.append(button);}
  const close=document.createElement('button');close.type='button';close.className='lf-exit-close';close.textContent=english()?'Maybe later':'مش هلأ';close.onclick=()=>dialog.close();dialog.append(title,desc,grid,close);dialog.showModal();shown=true;try{sessionStorage.setItem('lf_exit_seen','yes');}catch{}
 }
 async function init(){try{config=await (await fetch((window.LF_API_URL||'')+'/api/growth/config')).json();}catch{return;}if(!config.exitEnabled)return;try{shown=sessionStorage.getItem('lf_exit_seen')==='yes';}catch{}reset();
  const style=document.createElement('style');style.textContent='.lf-exit-dialog{width:min(650px,calc(100% - 28px));box-sizing:border-box;border:1px solid #dbc6d4;border-radius:22px;padding:22px;color:#63345e;background:#fffaf4;max-height:85dvh;overflow:auto}.lf-exit-dialog::backdrop{background:#27172399}.lf-exit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lf-exit-product{display:flex;flex-direction:column;gap:9px;background:#fff;color:#63345e;border:1px solid #eadde5;border-radius:14px;padding:9px;min-width:0;font:inherit}.lf-exit-product img{width:100%;aspect-ratio:1;object-fit:contain}.lf-exit-product b{font-size:12px;overflow-wrap:anywhere}.lf-exit-close{display:block;margin:18px auto 0;background:#63345e;color:#fff;border:0;border-radius:20px;padding:10px 24px}.lf-exit-entry{display:block;margin:14px auto;border:0;background:transparent;color:#63345e;text-decoration:underline;font:inherit}';document.head.append(style);
  const b=document.createElement('button');b.type='button';b.className='lf-exit-entry';b.textContent=english()?'A few picks before you go':male()?'شوف اختيارات قبل ما تطلع':'شوفي اختيارات قبل ما تطلعي';b.onclick=()=>open(true);(document.querySelector('footer')||document.body).append(b);
  const tracker=window.LFMarketing?.track;if(tracker)window.LFMarketing.track=function(event,id){record(event,id);return tracker.apply(this,arguments);};
  document.addEventListener('mouseleave',e=>{if(e.clientY<=0)open();});
  let t;window.addEventListener('scroll',()=>{const y=window.scrollY;maxScroll=Math.max(maxScroll,y);clearTimeout(t);if(maxScroll-y>350&&maxScroll>600)t=setTimeout(()=>open(),600);},{passive:true});
  document.addEventListener('lf:accountchange',()=>{reset();b.textContent=english()?'A few picks before you go':male()?'شوف اختيارات قبل ما تطلع':'شوفي اختيارات قبل ما تطلعي';});
  document.addEventListener('lf:languagechange',()=>{b.textContent=english()?'A few picks before you go':male()?'شوف اختيارات قبل ما تطلع':'شوفي اختيارات قبل ما تطلعي';if(dialog?.open){dialog.close();open(true);}});
 }
 document.addEventListener('lf:measurementchange',e=>{if(!e.detail?.allowed){views=[];try{sessionStorage.removeItem('lf_exit_views');}catch{}}});
 root.LFExitRecommendations={open,pick};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
