/* Ladies First - account + Naya stability layer */
(() => {
  'use strict';

  const MIN_PASSWORD = 12;
  const NAYA_IMAGE = 'naya-fullbody-clean.png';

  function passwordFields(root = document) {
    return [...root.querySelectorAll('input[type="password"]')];
  }

  function enforcePasswordPolicy(root = document) {
    passwordFields(root).forEach((input) => {
      input.minLength = MIN_PASSWORD;
      if (!input.placeholder || /8|ثمان/.test(input.placeholder)) {
        input.placeholder = 'كلمة المرور — 12 خانة على الأقل';
      }
    });
  }

  function productFromElement(el) {
    const card = el.closest('[data-product-id], .card, .featureCard, .product-card, .productModal');
    if (!card) return {};
    const id = card.dataset.productId || card.getAttribute('data-id') || '';
    const name = card.querySelector('h1,h2,h3,b,.productName,.name')?.textContent?.trim() || 'المنتج المختار';
    const image = card.querySelector('img')?.src || '';
    return { id, name, image };
  }

  function ensureNayaModal() {
    let modal = document.getElementById('lfNayaTryOn');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'lfNayaTryOn';
    modal.className = 'lf-naya-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="lf-naya-backdrop" data-naya-close></div>
      <section class="lf-naya-sheet" role="dialog" aria-modal="true" aria-labelledby="lfNayaTitle">
        <button class="lf-naya-close" type="button" data-naya-close aria-label="إغلاق">×</button>
        <div class="lf-naya-visual"><img src="${NAYA_IMAGE}" alt="نايا — مساعدة Ladies First"></div>
        <div class="lf-naya-copy">
          <small>Ladies First</small>
          <h2 id="lfNayaTitle">أنا نايا</h2>
          <p id="lfNayaProduct">اختاري منتجًا وسأساعدك في تصور الإطلالة.</p>
          <div class="lf-naya-actions">
            <button type="button" class="lf-naya-primary" data-naya-action="try">جربيها علي</button>
            <button type="button" class="lf-naya-secondary" data-naya-close>رجوع للمتجر</button>
          </div>
          <p class="lf-naya-privacy">القياسات التي تدخلينها للتجربة لا يتم حفظها أو استخدامها خارج جلسة التجربة.</p>
        </div>
      </section>`;
    document.body.appendChild(modal);
    return modal;
  }

  function setPageLocked(locked) {
    document.documentElement.classList.toggle('lf-naya-open', locked);
    document.body.classList.toggle('lf-naya-open', locked);
  }

  function closeNaya() {
    const modal = document.getElementById('lfNayaTryOn');
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('open');
    setPageLocked(false);
  }

  function openNaya(product = {}) {
    const modal = ensureNayaModal();
    modal.hidden = false;
    modal.classList.add('open');
    modal.dataset.productId = product.id || '';
    const copy = modal.querySelector('#lfNayaProduct');
    if (copy) copy.textContent = product.name ? `اختيارك: ${product.name}. خلينا نشوف كيف ممكن تكتمل الإطلالة.` : 'اختاري منتجًا وسأساعدك في تصور الإطلالة.';
    setPageLocked(true);
    requestAnimationFrame(() => modal.querySelector('[data-naya-close]')?.focus());
  }

  function looksLikeTryOn(el) {
    const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
    return /جربيها\s*علي|جرّبيها\s*علي|try\s*on|نايا/i.test(text) && !el.closest('#lfNayaTryOn');
  }

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-naya-close]');
    if (close) { event.preventDefault(); closeNaya(); return; }
    const trigger = event.target.closest('button,a,[role="button"]');
    if (trigger && looksLikeTryOn(trigger)) {
      if (trigger.closest('#nayaOutfit,#lfStoreAiDialog,#lfStoreAiCard')) return;
      if (window.LadiesFirstNayaOutfit) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (/جربيها|جرّبيها|جرّبيها على|try\s*on/i.test(trigger.textContent)) window.LadiesFirstNayaOutfit.open(productFromElement(trigger));
        else window.openStoreAIAssistant?.();
        return;
      }
      event.preventDefault(); openNaya(productFromElement(trigger));
    }
  }, true);

  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNaya(); });
  document.addEventListener('submit', (event) => {
    const invalid = passwordFields(event.target).find((field) => field.value && field.value.length < MIN_PASSWORD);
    if (!invalid) return;
    event.preventDefault(); event.stopImmediatePropagation(); invalid.focus();
    alert('كلمة المرور يجب أن تكون 12 خانة على الأقل');
  }, true);

  const observer = new MutationObserver(() => enforcePasswordPolicy());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enforcePasswordPolicy();
  window.LadiesFirstNaya = { open: openNaya, close: closeNaya };
})();
