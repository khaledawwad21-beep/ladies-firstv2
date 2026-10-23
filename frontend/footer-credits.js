(() => {
  'use strict';
  const currentYear = String(new Date().getFullYear());
  document.querySelectorAll('.lf-footer-year').forEach((year) => {
    year.textContent = currentYear;
    year.setAttribute('datetime', currentYear);
  });
})();
