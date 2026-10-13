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
