/* AI requests may use a server-verified owner session from the admin panel. */
(function(){
 'use strict';
 window.lfAiToken=async function(){
  const customer=localStorage.getItem('lf_token')||'';
  const admin=localStorage.getItem('lf_admin_token')||'';
  if(!admin||admin===customer)return customer;
  const base=String(window.LF_API_URL||location.origin).replace(/\/$/,'');
  const response=await fetch(base+'/api/auth/me',{headers:{Authorization:'Bearer '+admin},cache:'no-store'});
  if(response.ok){
   const result=await response.json();
   if(result.user?.role==='owner')return admin;
  }else if(response.status!==401&&response.status!==403){
   throw new Error('تعذر التحقق من جلسة المالك. حاولي مجددًا.');
  }
  return customer;
 };
 window.lfAiHeaders=async function(){
  const headers={'Content-Type':'application/json'},token=await window.lfAiToken();
  if(token)headers.Authorization='Bearer '+token;
  return headers;
 };
})();
