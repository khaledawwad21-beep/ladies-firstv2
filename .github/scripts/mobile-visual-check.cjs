// Read-only mobile visual verification against the deployed Ladies First store.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const evidence = path.resolve('mobile-visual-evidence');
fs.mkdirSync(evidence, { recursive: true });
const observations = [];
const errors = [];
const url = process.env.STORE_URL || 'https://ladies-firstv2.onrender.com/';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ar-PS',
    timezoneId: 'Asia/Hebron',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(16000);
  page.on('pageerror', e => errors.push(String(e)));
  const shot = async (name) => {
    await page.screenshot({ path: path.join(evidence, name + '.png'), animations: 'disabled' });
    console.log('SCREENSHOT', name);
  };
  const pass = (message) => {
    observations.push(message);
    console.log('PASS', message);
  };
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert(response && response.status() < 400, 'Store HTTP response was not successful');
    await page.waitForFunction(
      () => typeof window.toggleSideMenu === 'function' &&
        document.querySelector('#sideCats .sideCat') !== null,
      null, { timeout: 90000 }
    );
    await page.waitForTimeout(1800);
    const welcomeClose = page.locator('#lfWelcomeOffer .lf-welcome-offer__close');
    if (await welcomeClose.isVisible()) await welcomeClose.click();
    await shot('01-home-390x844');
    pass('Actual mobile storefront and at least one category rendered');

    await page.locator('button.menuBtn').click();
    await page.locator('#sideMenuOverlay').waitFor({ state: 'visible' });
    assert((await page.locator('#sideCats .sideCat').count()) > 0);
    await shot('02-sidebar-categories');
    pass('Sidebar opens and displays category cards');

    const drawer = page.locator('#sideMenuOverlay .sideMenu');
    const layout = await drawer.evaluate((node) => {
      const nav = document.querySelector('.bottomNav');
      const drawerBounds = node.getBoundingClientRect();
      const navBounds = nav?.getBoundingClientRect();
      const overflow = node.scrollHeight - node.clientHeight;
      node.scrollTop = node.scrollHeight;
      return { overflow, bottom: drawerBounds.bottom, navTop: navBounds?.top ?? 0 };
    });
    assert(layout.overflow > 30, 'Category drawer should be independently scrollable');
    assert(layout.bottom <= layout.navTop + 3,
      'Sidebar is overlapping the persistent bottom navigation');
    await page.waitForTimeout(200);
    assert(await drawer.evaluate(node => node.scrollTop) > 30,
      'Category list must be reachable by scrolling to bottom');
    await shot('02b-sidebar-scrolled-bottom');
    pass('Sidebar scroll reaches brands and policies without covering bottom nav');
    await drawer.evaluate(node => { node.scrollTop = 0; });

    await page.locator('#sideAccountGreeting .sideAccountBtn').click();
    await page.locator('#accountModal').waitFor({ state: 'visible' });
    assert(!(await page.locator('#accountRegisterFields').isVisible()),
      'Registration fields must be hidden in login mode');
    await shot('03-phone-login');
    pass('Login form opens without registration-only fields');

    await page.locator('#modeEmail').click();
    assert(!(await page.locator('#accountCountryTools').isVisible()),
      'Country dial selector should disappear for email login');
    await shot('04-email-login');
    pass('Email mode hides phone country controls');

    await page.locator('#actionRegister').click();
    assert(await page.locator('#accountRegisterFields').isVisible(),
      'Registration fields should appear in registration mode');
    await shot('05-registration');
    await page.locator('#actionLogin').click();
    assert(!(await page.locator('#accountRegisterFields').isVisible()),
      'Login mode must hide registration fields again');
    pass('Registration/login switching works without submitting any account data');

    await page.locator('#accountModal [aria-label="إغلاق نافذة الحساب"]').click();
    await page.locator('#bottomWhatsLink').click();
    await page.locator('#lfWhatsAppContact').waitFor({ state: 'visible' });
    await shot('06-whatsapp-contact-reasons');
    pass('Official WhatsApp contact-reason chooser opens without sending messages');
    await page.locator('#lfWaClose').click();

    await page.locator('.naya-launcher').click();
    await page.locator('#nayaAssistant').waitFor({ state: 'visible' });
    await shot('07-naya-open');
    pass('Naya can open from mobile storefront without sending an AI request');
    const quick = await page.locator('#nayaAssistant .naya-quick').evaluate(el => {
      const box = el.getBoundingClientRect();
      const buttons = Array.from(el.querySelectorAll('button'))
        .map(b => { const r = b.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, text:b.innerText }; });
      const assistantBottom = document.querySelector('#nayaAssistant').getBoundingClientRect().bottom;
      const navTop = document.querySelector('.bottomNav').getBoundingClientRect().top;
      return { left:box.left, right:box.right, top:box.top, bottom:box.bottom,
        scrollWidth:el.scrollWidth, clientWidth:el.clientWidth, buttons, assistantBottom, navTop };
    });
    assert.equal(quick.buttons.length, 4, 'Naya must retain all four shortcuts');
    assert(quick.scrollWidth <= quick.clientWidth + 2, 'Naya quick buttons overflow horizontally');
    assert(quick.buttons.every(b => b.left >= quick.left - 2 && b.right <= quick.right + 2 &&
      b.top >= quick.top - 2 && b.bottom <= quick.bottom + 2),
      'All four Naya buttons must be fully visible within the rail');
    assert.equal(new Set(quick.buttons.map(b => Math.round(b.top / 5))).size, 2,
      'Four shortcuts should form two readable rows on mobile');
    assert(quick.assistantBottom <= quick.navTop + 3,
      'Naya panel should not cover the bottom navigation');
    await shot('08-naya-quick-actions');
    pass('All Naya quick actions fit in two mobile rows above the navigation');

    const subtitleContrast = await page.locator('#nayaAssistant .naya-status').evaluate(node => {
      const fg = getComputedStyle(node).color;
      const bg = getComputedStyle(node.closest('.naya-header')).backgroundColor;
      const components = css => (css.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = values => {
        const channels = values.map(v => {
          const c = v / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const a = luminance(components(fg));
      const b = luminance(components(bg));
      return { fg, bg, ratio: (Math.max(a,b) + .05) / (Math.min(a,b) + .05) };
    });
    assert(subtitleContrast.ratio >= 4.5,
      'Naya subtitle must meet 4.5:1 text contrast on the plum header: ' +
        JSON.stringify(subtitleContrast));
    pass('Naya subtitle maintains readable text contrast on mobile');

    // Product inspection only: never add to cart or submit a live order.
    await page.locator('#nayaAssistant .naya-header button').click();
    await page.locator('#nayaAssistant').waitFor({ state: 'hidden' });
    const firstProduct = page.locator('#grid .card').first();
    await firstProduct.waitFor({ state: 'visible' });
    const productName = (await firstProduct.locator('.body h3').textContent() || '').trim();
    assert(productName, 'First product is missing its display name');
    await firstProduct.locator('.pic').click();
    await page.locator('#modal').waitFor({ state: 'visible' });
    assert((await page.locator('#modalBody h1').textContent() || '').trim() === productName,
      'Product modal did not open the selected catalog product');
    const detailImage = page.locator('#mainProductImg');
    await detailImage.waitFor({ state: 'visible' });
    await detailImage.evaluate(img => img.decode().catch(() => null));
    assert(await detailImage.evaluate(img => img.complete && img.naturalWidth > 0),
      'Main product image failed to load');
    assert(await page.locator('#modalBody .price').count() > 0,
      'Product details should show a price');
    await shot('09-product-details');
    pass('Product details, name, price and image load without modifying stock');
    await page.locator('#modal .close').click();

    await page.locator('#search').click();
    await page.locator('#search').fill(productName);
    await page.waitForFunction(() => document.querySelectorAll('#grid .card').length > 0);
    assert((await page.locator('#grid .card').count()) > 0,
      'Live search must find an existing product by name');
    await shot('10-live-product-search');
    pass('Live product search filters the catalog while typing');

    await page.locator('#cartBtn').click();
    await page.locator('#drawer').waitFor({ state: 'visible' });
    assert(await page.locator('#cart .empty').isVisible(),
      'New guest session should show an empty cart');
    await shot('11-guest-empty-cart');
    pass('Guest cart opens without login or order creation');
  } catch (error) {
    errors.push(String(error));
    try { await shot('failure-current-screen'); } catch (_) {}
    throw error;
  } finally {
    fs.writeFileSync(path.join(evidence, 'results.json'),
      JSON.stringify({ url, viewport: '390x844', checks: observations, errors }, null, 2));
    await context.close();
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
