/* Progressive live search for product/taxonomy selectors; original controls stay intact. */
(()=>{'use strict';
 const records=new WeakMap();let catalog=new Map(),request=null;
 const style=document.createElement('style');style.textContent='.lf-select-search{position:relative;margin:6px 0}.lf-select-search input{width:100%;box-sizing:border-box;border:1px solid #dcc9d7;border-radius:10px;padding:10px;background:#fff;color:#4f2849;font:inherit}.lf-select-results{max-height:240px;overflow:auto;display:grid;gap:4px;margin-top:4px}.lf-select-results:empty{display:none}.lf-select-results button{display:flex;align-items:center;gap:8px;text-align:start;padding:8px;border:1px solid #eadfe7;background:#fff;border-radius:8px;color:#4f2849;font:inherit}.lf-select-results img{width:34px;height:34px;object-fit:contain;border-radius:6px}.lf-select-results p{margin:5px;color:#76616f;font-size:12px}';document.head.append(style);
 function products(){if(!request)request=fetch((window.LF_API_URL||'')+'/api/products').then(r=>r.json()).then(d=>{catalog=new Map((d.products||[]).map(p=>[String(p.id),p]));}).catch(()=>{});return request;}
 function productSelect(s){return /product|replacement|(?:^|_)pid/i.test(s.id+' '+s.name+' '+s.dataset.key)||s.dataset.productSelect!==undefined;}
 function enhance(s){if(s.multiple||s.closest('[data-no-live-search]')||s.options.length<2||!productSelect(s)&&s.options.length<10)return;
  let r=records.get(s);if(r){r.input.disabled=s.disabled;return;}
  const wrap=document.createElement('div');wrap.className='lf-select-search';const input=document.createElement('input'),list=document.createElement('div');input.type='search';input.autocomplete='off';input.placeholder='بحث مباشر بالاسم أو الباركود أو رقم الصنف';input.setAttribute('aria-label',input.placeholder);input.disabled=s.disabled;
  const id='lfSelectResults'+Math.random().toString(36).slice(2);list.id=id;list.className='lf-select-results';list.setAttribute('role','listbox');input.setAttribute('role','combobox');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');wrap.append(input,list);s.before(wrap);r={input,list,wrap};records.set(s,r);
  function render(){list.replaceChildren();const q=input.value.trim().toLowerCase();input.setAttribute('aria-expanded',q?'true':'false');if(!q||s.disabled)return;let count=0;
   for(const option of s.options){if(!option.value||option.disabled)continue;const p=productSelect(s)?catalog.get(option.value):null;const tokens=[option.textContent,p?.name,p?.barcode,p?.productNumber,p?.product_number].filter(Boolean).join(' ').toLowerCase();if(!tokens.includes(q))continue;
    const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.value===s.value));
    if(p){const src=p.imageUrl||p.images?.[0];if(src&&/^(?:https?:\/\/|\/(?!\/))/.test(src)){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';button.append(img);}}
    const text=document.createElement('span');text.textContent=option.textContent;button.append(text);button.onclick=()=>{s.value=option.value;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));input.value='';list.replaceChildren();input.setAttribute('aria-expanded','false');s.focus();};list.append(button);if(++count===40)break;
   }if(!count){const p=document.createElement('p');p.textContent='لا توجد نتائج مطابقة';list.append(p);}
  }
  input.addEventListener('input',render);input.addEventListener('focus',()=>{if(productSelect(s))products().then(render);else render();});input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus();}if(e.key==='Escape'){input.value='';render();}});
  list.addEventListener('keydown',e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus();}if(e.key==='Escape')input.focus();});
 }
 function scan(){document.querySelectorAll('select').forEach(enhance);}
 let queued=false;new MutationObserver(rs=>{if(rs.some(r=>r.target instanceof HTMLSelectElement||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('select')||n.querySelector('select'))))&&!queued){queued=true;queueMicrotask(()=>{queued=false;scan();});}}).observe(document.body,{childList:true,subtree:true});
 window.LFSelectSearch={scan};scan();
})();
