// VPS3 only. Both checkout endpoints are fixtures; no charge or tracking event leaves the browser.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.CHECKOUT_TEST_ROOT || path.join(__dirname, '../.cloudflare-pages'));
let server, browser, baseURL;

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) return response.writeHead(404).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    response.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

for (const [landing, entry] of [
  ['/skills-ia-obrigado', 'main'],
  ['/skills-ia-obrigado/?utm_source=wiapy&utm_medium=upsell&utm_campaign=skills-regression&is_test=true', 'main'],
  ['/skills-ia-obrigado/?utm_source=wiapy&utm_medium=upsell&utm_campaign=skills-regression&is_test=true', 'vsl'],
]) {
  for (const method of ['PIX', 'CREDIT_CARD']) test(`${entry} ${landing}: ${method} checkout preserves attribution and waits for payment approval`, async t => {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    t.after(() => context.close());
    const page = await context.newPage();
    const errors = [], payments = [];
    let confirmed = false;
    const payment = {
      success: true, gateway: 'asaas', paymentId: 'pay_skills_fixture', eventId: 'evt_skills_fixture',
      productId: 'comunidade-imobiturbo', plan: 'anual', amount: 997, chargeAmount: 997,
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: '' },
    };
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== baseURL) return route.abort();
      if (url.pathname === '/api/checkout' && request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        assert.equal(payload.gateway, 'asaas');
        assert.equal(payload.plan, 'anual');
        assert.equal(payload.paymentMethod, method);
        payments.push(payload);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payment) });
      }
      if (url.pathname === '/api/checkout/status') {
        assert.equal(url.searchParams.get('paymentId'), payment.paymentId);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...payment, paid: confirmed, status: confirmed ? 'RECEIVED' : 'PENDING' }) });
      }
      if (url.pathname.startsWith('/api/') || request.method() !== 'GET' || /\.(mp4|webm|m3u8)$/.test(url.pathname)) return route.abort();
      return route.continue();
    });

    await page.goto(baseURL + landing, { waitUntil: 'domcontentloaded' });
    assert.match(await page.title(), /54 Skills de IA/);
    assert.equal(await page.locator('#skillsAccessLink').getAttribute('href'), 'https://club.imobiturbo.com.br/login');
    assert.equal(await page.locator('#skillsAccessLink').isVisible(), true);
    assert.match(await page.locator('.journey-steps').textContent(), /Comunidade\s+opcional/);
    assert.match(await page.locator('.access-disclaimer').textContent(), /assinatura é opcional/i);
    assert.ok(await page.evaluate(() => [...document.styleSheets].some(sheet => sheet.href?.includes('/vagas/vagas.css'))));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(payments.length, 0, 'visiting the upsell creates no charge');
    if (entry === 'vsl') {
      await page.evaluate(() => window.openCheckoutWithCurrentPlan());
      await page.locator('#leadFullname').fill('Mariana Compradora');
      await page.locator('#leadPhone').fill('(21) 98765-4322');
      await page.locator('#leadEmail').fill('mariana.skills@example.invalid');
      await page.locator('#leadCheckoutForm button[type=submit]').click();
      assert.equal(await page.locator('#chkName').inputValue(), 'Mariana Compradora');
      assert.equal(await page.locator('#chkEmail').inputValue(), 'mariana.skills@example.invalid');
    } else {
      await page.locator('#checkoutBtn').click();
      await page.locator('#chkName').fill('Mariana Compradora');
      await page.locator('#chkStep1Btn').click();
      await page.locator('#chkPhone').fill('(21) 98765-4322');
      await page.locator('#chkStep2Btn').click();
      await page.locator('#chkEmail').fill('mariana.skills@example.invalid');
      await page.locator('#chkStep3Btn').click();
    }
    await page.locator('#chkStepPane4').waitFor({ state: 'visible' });
    if (method === 'PIX') {
      await page.locator('#chkTabPix').click();
      await page.locator('#chkPixCpf').fill('529.982.247-25');
      await page.locator('#chkGeneratePixBtn').click();
    } else {
      await page.locator('#chkCardNumber').fill('4111111111111111');
      await page.locator('#chkCardHolder').fill('Mariana Compradora');
      await page.locator('#chkCardExpiry').fill('12/30');
      await page.locator('#chkCardCvv').fill('123');
      await page.locator('#chkCardCpf').fill('529.982.247-25');
      await page.locator('#chkContinuePaymentBtn').click();
    }
    await page.locator('#chkPendingNotice').waitFor({ state: 'visible' });
    assert.ok(page.url().includes('/skills-ia-obrigado'), 'pending payment stays in the checkout');
    assert.equal(payments.length, 1);
    if (landing.includes('utm_source')) {
      assert.equal(payments[0].tracking.utm_source, 'wiapy');
      assert.equal(payments[0].tracking.utm_medium, 'upsell');
      assert.equal(payments[0].tracking.utm_campaign, 'skills-regression');
    }
    confirmed = true;
    await page.waitForURL('**/vagas-obrigado*', { timeout: 15000, waitUntil: 'domcontentloaded' });
    const receipt = await page.evaluate(() => JSON.parse(localStorage.getItem('imobiturbo:checkout:community:v2')));
    assert.equal(receipt.paid, true);
    assert.equal(receipt.productId, 'comunidade-imobiturbo');
    assert.equal(receipt.method, method);
    assert.equal(receipt.cpfCnpj, undefined);
    assert.equal(receipt.creditCard, undefined);
    assert.equal(payments.length, 1, 'confirmation creates no second charge');
    assert.deepEqual(errors, []);
  });
}
