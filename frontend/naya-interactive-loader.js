/* Ladies First — Naya interactive product experience loader */
(()=>{'use strict';
 const head=document.head||document.documentElement;
 if(!document.querySelector('link[data-lf-naya-engine]')){
  const l=document.createElement('link');l.rel='stylesheet';l.href='naya-interactive.css';l.dataset.lfNayaEngine='1';head.appendChild(l);
 }
 if(!document.querySelector('script[data-lf-naya-engine]')){
  const s=document.createElement('script');s.src='naya-interactive.js';s.defer=true;s.dataset.lfNayaEngine='1';(document.body||head).appendChild(s);
 }
})();