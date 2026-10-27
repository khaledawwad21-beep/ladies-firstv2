(()=>{'use strict';let attempted='',busy=false;
 function incoming(){try{const direct=new URL(location.href).searchParams.get('ref');if(direct&&/^[a-f0-9]{18}$/.test(direct)){const r={code:direct,expires:Date.now()+7*86400000};localStorage.setItem('lf_referral_incoming',JSON.stringify(r));return r;}const r=JSON.parse(localStorage.getItem('lf_referral_incoming')||'null');return r?.expires>Date.now()?r:null;}catch{return null;}}
 async function claim(){const r=incoming(),u=window.getAccount?.();if(!r||!u||!window.lfToken?.()||busy)return;const key=u.id+':'+r.code;if(attempted===key)return;busy=true;try{const d=await lfFetch('/api/growth/referrals/claim',{method:'POST',body:JSON.stringify({code:r.code})});if(d.ok)attempted=key;}catch{}finally{busy=false;}}
 incoming();document.addEventListener('lf:accountchange',claim);window.addEventListener('focus',claim);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',claim,{once:true});else claim();
})();
