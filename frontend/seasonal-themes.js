'use strict';
/* Theme choice is server-rendered to prevent a flash; this script only syncs
   the root attribute and keeps the legacy welcome slot empty. Visuals live in
   seasonal-themes.css and the selected campaign appears once in the carousel. */
(function () {
  const settings = window.__LF_SEASONAL__;
  if (!settings || typeof settings.active !== 'string') return;

  const allowed = new Set([
    'none', 'ramadan', 'eid-fitr', 'eid-adha', 'halloween', 'christmas',
    'new-year', 'spring', 'summer', 'autumn', 'winter'
  ]);
  if (!allowed.has(settings.active)) return;

  document.documentElement.setAttribute('data-theme', settings.active);
  const welcome = document.getElementById('lfSeasonalWelcome');
  if (welcome) {
    welcome.replaceChildren();
    welcome.hidden = true;
    welcome.setAttribute('aria-hidden', 'true');
  }
})();
