// Run only on VPS3. Both checkout APIs are mocked; no real payment is submitted.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(process.env.CHECKOUT_TEST_ROOT || path.join(__dirname, '..'));
const buyer = {
  name: 'Mariana Compradora',
  email: 'mariana.prefill@example.invalid',
  phone: '21987654322',
  cpfCnpj: '52998224725',
  cardHolderName: 'Mariana Titular',
};
const profileKey = 'imobiturbo:checkout:upsell-buyer:v1';
let server;
let browser;
let baseURL;

before(async () => {
  const contentTypes = {
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4': 'video/mp4',
  };
  server = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    let file = path.resolve(root, `.${pathname}`);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    response.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
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

for (const landing of ['/vagas/', '/vagas-v2/']) for (const method of ['PIX', 'CREDIT_CARD']) {
  test(`confirmed ${method} purchase from ${landing} carries only buyer details into the upsell`, async t => {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    t.after(() => context.close());
    const page = await context.newPage();
    const pageErrors = [];
    const payments = [];
    const created = new Map();
    page.on('pageerror', error => pageErrors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== baseURL) return route.abort();
      if (url.pathname === '/api/checkout' && request.method() === 'POST') {
        const payload = JSON.parse(request.postData() || '{}');
        payments.push(payload);
        assert.equal(payload.paymentMethod, method);
        const payment = {
          success: true,
          gateway: 'asaas',
          paymentId: `pay_prefill_${method.toLowerCase()}`,
          eventId: `evt_prefill_${method.toLowerCase()}`,
          productId: 'comunidade-imobiturbo',
          plan: payload.plan,
          amount: 997,
          chargeAmount: 997,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          pix: method === 'PIX' ? { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: '' } : {},
        };
        created.set(payment.paymentId, payment);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payment) });
      }
      if (url.pathname === '/api/checkout/status') {
        const payment = created.get(url.searchParams.get('paymentId'));
        if (!payment) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          success: true, paid: true, status: 'RECEIVED', gateway: 'asaas',
          paymentId: payment.paymentId, productId: payment.productId, plan: payment.plan,
          amount: payment.amount, expiresAt: payment.expiresAt,
        }) });
      }
      if (request.method() !== 'GET') return route.abort();
      if (/\.(mp4|webm|m3u8)$/.test(url.pathname)) return route.abort();
      return route.continue();
    });

    await page.goto(`${baseURL}${landing}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#checkoutBtn').click();
    await page.locator('#chkName').fill(buyer.name);
    await page.locator('#chkStep1Btn').click();
    await page.locator('#chkPhone').fill('(21) 98765-4322');
    await page.locator('#chkStep2Btn').click();
    await page.locator('#chkEmail').fill(buyer.email);
    await page.locator('#chkStep3Btn').click();
    await page.locator('#chkStepPane4').waitFor({ state: 'visible' });

    if (method === 'PIX') {
      await page.locator('#chkTabPix').click();
      await page.locator('#chkPixCpf').fill('529.982.247-25');
      await page.locator('#chkGeneratePixBtn').click();
    } else {
      await page.locator('#chkCardNumber').fill('4111111111111111');
      await page.locator('#chkCardHolder').fill(buyer.cardHolderName);
      await page.locator('#chkCardExpiry').fill('12/30');
      await page.locator('#chkCardCvv').fill('123');
      await page.locator('#chkCardCpf').fill('529.982.247-25');
      await page.locator('#chkContinuePaymentBtn').click();
    }

    await page.waitForURL('**/vagas-obrigado*', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('#buyerName')?.value === 'Mariana Compradora');
    assert.equal(await page.locator('#buyerEmail').inputValue(), buyer.email);
    assert.equal((await page.locator('#buyerPhone').inputValue()).replace(/\D/g, ''), buyer.phone);
    assert.equal(await page.locator('#buyerCpf').inputValue(), '529.982.247-25');
    assert.equal(await page.locator('#cardHolder').inputValue(), method === 'CREDIT_CARD' ? buyer.cardHolderName : '');
    for (const id of ['cardNumber', 'cardExpiry', 'cardCvv', 'cardPostalCode', 'cardAddressNumber']) {
      assert.equal(await page.locator(`#${id}`).inputValue(), '', `${id} must remain blank`);
    }

    const persisted = await page.evaluate(key => ({
      buyer: JSON.parse(sessionStorage.getItem(key)),
      payment: JSON.parse(localStorage.getItem('imobiturbo:checkout:community:v2')),
    }), profileKey);
    assert.deepEqual(Object.keys(persisted.buyer).sort(), ['version', 'expiresAt', 'name', 'email', 'phone', 'cpfCnpj', 'cardHolderName'].sort());
    assert.equal(persisted.payment.cpfCnpj, undefined);
    assert.equal(persisted.payment.creditCard, undefined);
    assert.equal(JSON.stringify(persisted.buyer).includes('4111111111111111'), false);
    assert.equal(JSON.stringify(persisted.buyer).includes('123'), false);
    assert.equal(payments.length, 1);
    assert.deepEqual(pageErrors, []);
  });
}
