/* Ladies First WhatsApp intent picker.
   Opens only for customer support shortcuts; order-share links remain unchanged. */
(() => {
  'use strict';
  if (window.LadiesFirstWhatsAppContact) return;
  const intents = [
    ['product', 'استفسار عن منتج', 'أحتاج معلومات عن منتج أو توفر لون ومقاس.'],
    ['order', 'متابعة طلب', 'أريد الاستفسار عن حالة طلبي.'],
    ['delivery', 'التوصيل والمناطق', 'أريد الاستفسار عن التوصيل والرسوم.'],
    ['returns', 'تبديل أو إرجاع', 'أريد الاستفسار عن التبديل أو الإرجاع.'],
    ['offers', 'العروض والكوبونات', 'أريد معرفة العروض والكوبونات المتوفرة.'],
    ['complaint', 'شكوى أو ملاحظة', 'لدي ملاحظة وأرغب بالتواصل مع خدمة العملاء.'],
    ['other', 'استفسار آخر', 'لدي استفسار آخر.']
  ];
  const byId = new Map(intents.map(([id, label, text]) => [id, { label, text }]));
  let lastFocus = null;

  const safe = value => String(value || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function storeNumber() {
    if (typeof window.storeWhatsAppDigits === 'function') {
      return String(window.storeWhatsAppDigits());
    }
    return '970562499924';
  }
  function create() {
    let modal = document.getElementById('lfWhatsAppContact');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'lfWhatsAppContact';
    modal.className = 'lf-wa-overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="lf-wa-dialog" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="lfWaHeading">
        <div class="lf-wa-head">
          <div><small>خدمة عملاء Ladies First</small><h2 id="lfWaHeading">كيف فينا نساعدك؟</h2></div>
          <button type="button" id="lfWaClose" aria-label="إغلاق">×</button>
        </div>
        <p class="lf-wa-intro">لتسهيل التواصل مع فريقنا، حدّد سبب التواصل من الخيارات التالية وسنجهّز رسالتك على واتساب.</p>
        <div class="lf-wa-grid" role="group" aria-label="سبب التواصل">
          ${intents.map(([id, label]) => `<button type="button" class="lf-wa-purpose"
            data-purpose="${id}" aria-pressed="false">${safe(label)}</button>`).join('')}
        </div>
        <label class="lf-wa-label" for="lfWaDetails">تفاصيل إضافية <span>(اختياري)</span></label>
        <textarea id="lfWaDetails" rows="2" maxlength="450" placeholder="مثل رقم الطلب أو اسم المنتج، بدون معلومات دفع أو كلمات مرور"></textarea>
        <div class="lf-wa-actions">
          <button type="button" class="lf-wa-send" id="lfWaSend" disabled>الانتقال إلى واتساب ←</button>
          <button type="button" class="lf-wa-cancel" id="lfWaCancel">إلغاء</button>
        </div>
        <p class="lf-wa-note">سيفتح واتساب برسالة جاهزة، ويجب الضغط على إرسال داخل واتساب. الرد الآلي متاح عند تفعيل خدمة WhatsApp Business رسميًا.</p>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#lfWaClose').addEventListener('click', close);
    modal.querySelector('#lfWaCancel').addEventListener('click', close);
    modal.querySelectorAll('[data-purpose]').forEach(button => {
      button.addEventListener('click', () => {
        modal.dataset.purpose = button.dataset.purpose;
        modal.querySelectorAll('[data-purpose]').forEach(x => {
          x.setAttribute('aria-pressed', String(x === button));
        });
        modal.querySelector('#lfWaSend').disabled = false;
      });
    });
    modal.querySelector('#lfWaSend').addEventListener('click', () => {
      const selected = byId.get(modal.dataset.purpose);
      if (!selected) return;
      const details = modal.querySelector('#lfWaDetails').value.trim().slice(0, 450);
      // Meta webhook can route on the explicit purpose label.
      const message = ['مرحباً فريق Ladies First 🌸',
        'الغرض: ' + selected.label, selected.text,
        ...(details ? ['التفاصيل: ' + details] : [])
      ].join('\n');
      const url = 'https://wa.me/' + storeNumber() + '?text=' + encodeURIComponent(message);
      close();
      // Same-window navigation is intercepted by the Flutter WebView delegate.
      // Avoid window.open(), which can be blocked by Android WebView popups.
      window.location.assign(url);
    });
    return modal;
  }

  function open() {
    const modal = create();
    lastFocus = document.activeElement;
    modal.dataset.purpose = '';
    modal.querySelector('#lfWaDetails').value = '';
    modal.querySelector('#lfWaSend').disabled = true;
    modal.querySelectorAll('[data-purpose]').forEach(x => x.setAttribute('aria-pressed', 'false'));
    modal.hidden = false;
    document.body.classList.add('lf-wa-open');
    modal.querySelector('#lfWaClose').focus();
  }
  function close() {
    const modal = document.getElementById('lfWhatsAppContact');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('lf-wa-open');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest && event.target.closest('a');
    if (!anchor) return;
    const isCustomerContact = anchor.matches('#bottomWhatsLink,#whatsappFloat,a.social-wa');
    if (!isCustomerContact) return;
    // Don't hijack a custom WhatsApp link to a third-party merchant number.
    event.preventDefault();
    event.stopPropagation();
    open();
  }, true);

  document.addEventListener('keydown', event => {
    const modal = document.getElementById('lfWhatsAppContact');
    if (!modal || modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const focusables = [...modal.querySelectorAll('button:not(:disabled),textarea')];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  window.LadiesFirstWhatsAppContact = { open, close };
})();
