const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: process.env.CHROMIUM_NO_SANDBOX === '1' ? ['--no-sandbox'] : []});
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const csp = fs.readFileSync('netlify.toml', 'utf8').match(/Content-Security-Policy = "([^"]+)"/)[1];
    // Serve the deployment CSP locally too. HTTP upgrade is only meaningful on the deployed HTTPS origin.
    await page.route('**/*', async route => {
      const response = await route.fetch();
      await route.fulfill({response, headers: {...response.headers(), 'content-security-policy': csp.replace('; upgrade-insecure-requests', '')}});
    });
    await page.goto('http://127.0.0.1:8080');
    check(await page.locator('.package').count() === 6, 'Six packages');
    const amounts = ['2.300','6.000','11.000','20.000','35.000','90.000'];
    for (let i = 0; i < amounts.length; i++) check((await page.locator('.price').nth(i).innerText()).includes(amounts[i]), 'Correct price ' + amounts[i]);
    check(await page.locator('[value="520"]').isChecked(), 'Featured package selected');
    await page.locator('#prepare-button').click();
    check(await page.locator('#customer-name').getAttribute('aria-invalid') === 'true', 'Missing name rejected');
    await page.locator('#customer-name').fill('Cliente Prueba');
    await page.locator('#player-id').fill('123456789');
    await page.locator('#confirmation').check();
    await page.locator('#prepare-button').click();
    check(await page.locator('#ready-panel').isHidden(), 'Empty config blocks purchase');
    check(await page.locator('#whatsapp-link').getAttribute('href') === null, 'No unconfigured WhatsApp link');
    // Nonproduction placeholders; confined to the browser response and never written to config.js.
    await page.route('**/config.js', route => route.fulfill({contentType: 'application/javascript', body: 'window.NAILO_CONFIG = {nequiNumber:"3000000000",whatsappNumber:"573000000000",paymentHolder:"Titular de prueba"};'}));
    await page.reload();
    check((await page.locator('#nequi-details').innerText()).includes('3000000000'), 'Configured payment details');
    await page.locator('#customer-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#player-id').fill('123456789');
    await page.locator('#confirmation').check();
    await page.locator('#prepare-button').click();
    check(await page.locator('#ready-panel').isHidden(), 'Markup name rejected');
    check(await page.locator('img[src="x"]').count() === 0, 'No injected image');
    await page.locator('#customer-name').fill('María José');
    await page.locator('#player-id').fill('12e4567');
    await page.locator('#prepare-button').click();
    check(await page.locator('#player-id').getAttribute('aria-invalid') === 'true', 'Invalid player ID rejected');
    await page.locator('#player-id').fill('001234567');
    await page.locator('#confirmation').uncheck();
    await page.locator('#prepare-button').click();
    check(await page.locator('#confirmation').getAttribute('aria-invalid') === 'true', 'Consent required');
    await page.locator('#confirmation').check();
    await page.locator('#prepare-button').click();
    check(await page.locator('#ready-panel').isVisible(), 'Order ready');
    const link = new URL(await page.locator('#whatsapp-link').getAttribute('href'));
    check(link.origin === 'https://wa.me' && link.pathname === '/573000000000', 'Safe destination');
    const message = link.searchParams.get('text');
    check(message.includes('María José') && message.includes('001234567') && message.includes('520 diamantes') && message.includes('$11.000 COP'), 'Correct encoded message and leading zero ID');
    check(message.includes('no acredita precio, pago ni entrega'), 'Editable message warning');
    await page.locator('[value="100"]').check();
    check(await page.locator('#ready-panel').isHidden() && await page.locator('#whatsapp-link').getAttribute('href') === null, 'Package change invalidates link');
    check((await page.locator('#summary-price').innerText()) === '$2.300 COP', 'Summary price changes');
    await page.locator('#prepare-button').click();
    await page.locator('#customer-name').fill('Otro Cliente');
    check(await page.locator('#ready-panel').isHidden(), 'Name change invalidates order');
    check(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ''), 'No browser storage');
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({width, height:900});
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width);
    }
    // Simulate an ordinary host with no CSP, with JavaScript disabled or app.js unavailable.
    for (const javaScriptEnabled of [false, true]) {
      const fallback = await browser.newContext({javaScriptEnabled});
      const fallbackPage = await fallback.newPage();
      await fallbackPage.route('**/*', async route => {
        if (javaScriptEnabled && route.request().url().endsWith('/app.js')) return route.abort();
        const response = await route.fetch();
        if (route.request().resourceType() === 'document') {
          const body = (await response.text()).replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '');
          const headers = {...response.headers()};
          delete headers['content-security-policy'];
          await route.fulfill({response, headers, body});
        } else await route.fulfill({response});
      });
      await fallbackPage.goto('http://127.0.0.1:8080');
      check(await fallbackPage.locator('form').count() === 0, 'No native form without CSP');
      for (const id of ['customer-name', 'player-id', 'confirmation', 'prepare-button']) {
        check(await fallbackPage.locator('#' + id).isDisabled(), 'Fail closed: ' + id);
      }
      check(await fallbackPage.locator('#whatsapp-link').getAttribute('href') === null, 'No link on initialization failure');
      await fallback.close();
    }
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
    check(await page.locator('#customer-name').inputValue() === '' && await page.locator('#player-id').inputValue() === '', 'History restoration clears personal data');
    check(await page.locator('#whatsapp-link').getAttribute('href') === null, 'History restoration clears order');
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'/tmp/nailo-desktop.png',fullPage:true});
    await page.setViewportSize({width:375,height:900});
    await page.screenshot({path:'/tmp/nailo-mobile.png',fullPage:true});
    check(errors.length === 0, 'No JavaScript runtime errors: ' + errors.join(', '));
    console.log(`${checks} checks passed. No WhatsApp messages sent.`);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
