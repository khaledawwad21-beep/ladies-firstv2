/* Ladies First — first-visit offer inspired by the reference screenshot.
   It only advertises a real, in-stock product discount already present in the catalog. */
(() => {
  'use strict';
  const SEEN_KEY = 'lf_welcome_offer_seen_at';
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const money = value => `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} ₪`;

  function currentProducts() {
    try { return Array.isArray(products) ? products : []; } catch { return []; }
  }

  function findOffer() {
    return currentProducts()
      .map(product => {
        const price = Number(product?.price) || 0;
        const oldPrice = Number(product?.oldPrice) || 0;
        let stock = 0;
        try { stock = typeof totalStock === 'function' ? totalStock(product) : Number(product?.stock) || 0; } catch {}
        return { product, price, oldPrice, stock, savings: oldPrice - price };
      })
      .filter(item => item.price > 0 && item.oldPrice > item.price && item.stock > 0)
      .sort((a, b) => b.savings - a.savings)[0] || null;
  }

  function imageFor(product) {
    try {
      const images = typeof mainImagesOf === 'function' ? mainImagesOf(product) : [];
      if (images?.[0]) return images[0];
    } catch {}
    return product?.image || product?.images?.[0] || '';
  }

  function makePopup(offer) {
    if (document.getElementById('lfWelcomeOffer')) return;
    const { product, price, oldPrice, savings } = offer;
    const overlay = document.createElement('section');
    overlay.id = 'lfWelcomeOffer';
    overlay.className = 'lf-welcome-offer';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'lfWelcomeOfferTitle');

    const backdrop = document.createElement('button');
    backdrop.className = 'lf-welcome-offer__backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'إغلاق العرض');

    const card = document.createElement('div');
    card.className = 'lf-welcome-offer__card';
    const close = document.createElement('button');
    close.className = 'lf-welcome-offer__close';
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق');
    close.textContent = '×';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'lf-welcome-offer__eyebrow';
    eyebrow.textContent = 'هدية ترحيب من Ladies First';

    const title = document.createElement('h2');
    title.id = 'lfWelcomeOfferTitle';
    title.textContent = 'اختيار مميز بسعر أجمل';

    const productRow = document.createElement('div');
    productRow.className = 'lf-welcome-offer__product';
    const image = document.createElement('img');
    image.src = imageFor(product);
    image.alt = String(product?.name || 'منتج من المتجر');
    image.loading = 'eager';
    const details = document.createElement('div');
    details.className = 'lf-welcome-offer__details';
    const name = document.createElement('strong');
    name.textContent = String(product?.name || 'قطعة مميزة');
    const prices = document.createElement('div');
    prices.className = 'lf-welcome-offer__prices';
    const old = document.createElement('del');
    old.textContent = money(oldPrice);
    const now = document.createElement('b');
    now.textContent = money(price);
    prices.append(old, now);
    details.append(name, prices);
    productRow.append(image, details);

    const ticket = document.createElement('div');
    ticket.className = 'lf-welcome-offer__ticket';
    const amount = document.createElement('strong');
    amount.textContent = `وفّري ${money(savings)}`;
    const caption = document.createElement('span');
    caption.textContent = 'خصم مباشر على هذه القطعة';
    ticket.append(amount, caption);

    const actions = document.createElement('div');
    actions.className = 'lf-welcome-offer__actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'lf-welcome-offer__primary';
    go.textContent = 'شوفي العرض';
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'lf-welcome-offer__later';
    later.textContent = 'تصفّحي المتجر';
    actions.append(go, later);

    const note = document.createElement('p');
    note.className = 'lf-welcome-offer__note';
    note.textContent = 'السعر والخصم ظاهرين على المنتج مباشرة.';
    card.append(close, eyebrow, title, productRow, ticket, actions, note);
    overlay.append(backdrop, card);
    document.body.append(overlay);

    const dismiss = () => {
      overlay.classList.remove('is-open');
      document.body.classList.remove('lf-welcome-offer-open');
      window.setTimeout(() => overlay.remove(), 220);
    };
    const openProduct = () => {
      dismiss();
      try { if (typeof window.openProduct === 'function') window.openProduct(product.id); } catch {}
    };
    close.addEventListener('click', dismiss);
    backdrop.addEventListener('click', dismiss);
    later.addEventListener('click', dismiss);
    go.addEventListener('click', openProduct);
    overlay.addEventListener('keydown', event => { if (event.key === 'Escape') dismiss(); });
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      document.body.classList.add('lf-welcome-offer-open');
      close.focus({ preventScroll: true });
    });
  }

  function tryShow() {
    const lastSeen = Number(localStorage.getItem(SEEN_KEY)) || 0;
    if (Date.now() - lastSeen < COOLDOWN_MS) return false;
    const offer = findOffer();
    if (!offer) return false;
    // Avoid stacking this welcome card on another open shop dialog.
    const naya = document.getElementById('nayaAssistant');
    if (naya?.classList.contains('open')) return false;
    if (document.querySelector('.lf-idea-modal[aria-hidden="false"],.lfImageZoom.open')) return false;
    makePopup(offer);
    localStorage.setItem(SEEN_KEY, String(Date.now()));
    return true;
  }

  function start() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryShow() || attempts >= 40) window.clearInterval(timer);
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
