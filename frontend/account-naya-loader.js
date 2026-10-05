/* Load the isolated stability layer after the legacy storefront has initialized. */
(() => {
  'use strict';
  const head = document.head || document.documentElement;
  if (!document.querySelector('link[data-lf-naya-stability]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'account-naya-stability.css';
    css.dataset.lfNayaStability = '1';
    head.appendChild(css);
  }
  if (!document.querySelector('script[data-lf-naya-stability]')) {
    const script = document.createElement('script');
    script.src = 'account-naya-stability.js';
    script.defer = true;
    script.dataset.lfNayaStability = '1';
    (document.body || head).appendChild(script);
  }
})();
