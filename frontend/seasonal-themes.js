'use strict';
/* Render the selected campaign in its own persistent storefront slot. */
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
  if (!welcome) return;
  welcome.replaceChildren();

  if (settings.active === 'none') {
    welcome.hidden = true;
    welcome.setAttribute('aria-hidden', 'true');
    return;
  }

  const assets = {
    ramadan: '/seasonal-art/ramadan-desktop.webp',
    'eid-fitr': '/seasonal-art/eid-fitr-desktop.webp',
    'eid-adha': '/seasonal-eid-adha-gifts.svg',
    halloween: '/seasonal-art/halloween-desktop.webp',
    christmas: '/seasonal-art/christmas-desktop.webp',
    'new-year': '/seasonal-art/new-year-desktop.webp',
    spring: '/seasonal-spring.webp', summer: '/seasonal-summer.webp',
    autumn: '/seasonal-autumn.webp', winter: '/seasonal-winter.webp'
  };
  const safeImage = value => typeof value === 'string' &&
    (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)) ? value : '';
  const custom = settings.banners && settings.banners[settings.active] || {};
  const desktop = safeImage(custom.desktop) || assets[settings.active];
  const mobile = safeImage(custom.mobile);
  if (!desktop) return;

  const label = settings.labels && settings.labels[settings.active] || 'Ladies First';
  const link = document.createElement('a');
  link.href = '#cats';
  link.setAttribute('aria-label', label);
  const picture = document.createElement('picture');
  if (mobile) {
    const source = document.createElement('source');
    source.media = '(max-width: 700px)';
    source.srcset = mobile;
    picture.appendChild(source);
  }
  const image = document.createElement('img');
  image.src = desktop;
  image.alt = label;
  image.loading = 'eager';
  image.fetchPriority = 'high';
  picture.appendChild(image);
  link.appendChild(picture);
  welcome.className = 'lf-seasonal-banner';
  welcome.appendChild(link);
  welcome.hidden = false;
  welcome.setAttribute('aria-hidden', 'false');
})();
