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

test('Skills access never uses an unrelated community checkout identity', async t => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  t.after(() => context.close());
  await context.addInitScript(() => {
    const oldBuyer = { name: 'Outra Compradora', email: 'outra.compra@example.invalid', phone: '21987654322', cpfCnpj: '52998224725', version: 1, expiresAt: new Date(Date.now() + 3600000).toISOString() };
    sessionStorage.setItem('imobiturbo:checkout:upsell-buyer:v1', JSON.stringify(oldBuyer));
    localStorage.setItem('imobiturbo:vagas:checkout:v1', JSON.stringify({ ...oldBuyer, expiresAt: Date.now() + 1800000, step: 3, plan: 'anual' }));
  });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseURL && !route.request().url().includes('/api/') ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(baseURL + '/skills-ia-obrigado/?src=skills-ia-upsell&sck=completo', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#accessEmailFallback').isVisible(), true);
  assert.match(await page.locator('#acessos').textContent(), /e-mail usado na compra das Skills/);
  assert.doesNotMatch(await page.locator('#acessos').textContent(), /outra\.compra/);
  assert.equal(await page.locator('#skillsAccessLink').getAttribute('href'), 'https://club.imobiturbo.com.br/login');
});

for (const [landing, entry, plan] of [
  ['/skills-ia-obrigado', 'main', 'anual'],
  ['/skills-ia-obrigado/?utm_source=wiapy&utm_medium=upsell&utm_campaign=skills-regression&is_test=true', 'main', 'anual'],
  ['/skills-ia-obrigado/?utm_source=wiapy&utm_medium=upsell&utm_campaign=skills-regression&is_test=true', 'vsl', 'anual'],
  ['/skills-ia-obrigado/?is_test=true', 'main', 'trimestral'],
  ['/skills-ia-obrigado/?is_test=true', 'main', 'mensal'],
]) {
  for (const method of ['PIX', 'CREDIT_CARD']) test(`${entry} ${landing}: ${plan}/${method} checkout preserves attribution and waits for payment approval`, async t => {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    t.after(() => context.close());
    const page = await context.newPage();
    const errors = [], payments = [];
    let confirmed = false;
    const monthlyPix = plan === 'mensal' && method === 'PIX';
    const amount = method === 'PIX' ? { anual: 997, trimestral: 357, mensal: 147 }[plan] : { anual: 1164, trimestral: 381, mensal: 147 }[plan];
    const payment = {
      success: true, managedCommunity: true, gateway: 'asaas', checkoutOrderId: '11111111-1111-4111-8111-111111111111', paymentId: 'pay_skills_fixture', eventId: 'evt_skills_fixture',
      invoiceUrl: 'https://www.asaas.com/i/synthetic_skills_not_payable', status: 'PENDING',
      productId: 'comunidade-imobiturbo', plan, amount, chargeAmount: amount, installmentCount: method === 'PIX' ? 1 : { anual: 12, trimestral: 3, mensal: 1 }[plan],
      ...(monthlyPix ? { pixAutomatic: true } : {}),
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: '' },
    };
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.href === payment.invoiceUrl) return route.fulfill({ contentType: 'text/html', body: '<h1>Checkout fixture — not payable</h1>' });
      if (url.origin !== baseURL) return route.abort();
      if (url.pathname === '/api/checkout' && request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        assert.equal(payload.gateway, 'asaas');
        assert.equal(payload.plan, plan);
        assert.equal(payload.installments, payment.installmentCount);
        assert.equal(payload.pixAutomatic, monthlyPix ? true : undefined);
        assert.equal(payload.paymentMethod, method);
        assert.equal(payload.checkoutMode, 'hosted');
        assert.match(payload.idempotencyKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        assert.equal(payload.creditCard, undefined);
        payment.idempotencyKey = payload.idempotencyKey;
        payment.eventId = payload.eventId;
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
    await page.locator('input[name="plano"][value="' + plan + '"]').check({ force: true });
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
    assert.equal(await page.locator('#chkCardNumber').count(), 0);
    assert.equal(await page.locator('#chkCardCvv').count(), 0);
    await page.locator('#chkBuyerCpf').fill('529.982.247-25');
    await page.locator('#chkTabPix').click();
    assert.equal(await page.locator('#chkBuyerCpf').inputValue(), '529.982.247-25');
    await page.locator('#chkTabCard').click();
    assert.equal(await page.locator('#chkBuyerCpf').inputValue(), '529.982.247-25');
    if (method === 'PIX') await page.locator('#chkTabPix').click();
    await page.locator(method === 'PIX' ? '#chkGeneratePixBtn' : '#chkContinuePaymentBtn').evaluate(button => { button.click(); button.click(); });
    if (monthlyPix) await page.locator('#chkPendingNotice').waitFor({ state: 'visible' });
    else await page.waitForURL(payment.invoiceUrl);
    assert.equal(payments.length, 1, 'double click creates only one intention');
    if (landing.includes('utm_source')) {
      assert.equal(payments[0].tracking.utm_source, 'wiapy');
      assert.equal(payments[0].tracking.utm_medium, 'upsell');
      assert.equal(payments[0].tracking.utm_campaign, 'skills-regression');
    }
    if (!monthlyPix) await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.locator('#chkPendingNotice').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('imobiturbo:checkout:community:v2')).paid), false);
    assert.equal(payments.length, 1, 'returning retains the original order');
    confirmed = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
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
