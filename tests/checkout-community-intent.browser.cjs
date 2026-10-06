// VPS3 only. All checkout/provider/analytics traffic is intercepted; no real charge or message.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.VAGAS_ROOT || path.join(__dirname, '..'));
const INTENT = 'imobiturbo:checkout:community-intent:v1';
const SESSION = 'imobiturbo:checkout:community:v2';
const ORDER = '11111111-1111-4111-8111-111111111111';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let browser, server, origin;
before(async () => {
  server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
async function visit(t, routePath, options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const state = { posts: [], queries: [], recovered: !options.loseResponse, persistedBeforePost: [], paid: false };
  let page;
  function result() {
    const payload = state.posts[0];
    if (!payload) return { success: true, status: 'MISSING', paid: false, retryCreationAllowed: true };
    const total = payload.paymentMethod === 'PIX' ? { mensal: 147, trimestral: 357, anual: 997 }[payload.plan] : { mensal: 147, trimestral: 381, anual: 1164 }[payload.plan];
    const meta = { success: true, managedCommunity: true, gateway: 'asaas', checkoutOrderId: ORDER, orderId: ORDER,
      plan: payload.plan, productId: 'comunidade-imobiturbo', eventId: payload.eventId, paid: state.paid,
      amount: total, installmentCount: payload.installments, installmentValue: total / payload.installments,
      expiresAt: new Date(Date.now() + 1800000).toISOString() };
    return state.recovered ? { ...meta, orderStatus: 'created', paymentId: 'pay_synthetic_not_payable', status: state.paid ? 'CONFIRMED' : 'PENDING',
      ...(options.hostedInvoice ? { invoiceUrl: 'https://www.asaas.com/i/synthetic_not_payable' } : {}),
      billingType: payload.paymentMethod, pix: payload.paymentMethod === 'PIX' ? { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: 'data:image/png;base64,dGVzdA==', expiresAt: meta.expiresAt } : undefined } :
      { ...meta, orderStatus: 'uncertain', status: 'UNCERTAIN', recoverable: true };
  }
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (options.hostedInvoice && url.href === 'https://www.asaas.com/i/synthetic_not_payable') return route.fulfill({ contentType: 'text/html', body: '<h1>Checkout fixture — not payable</h1>' });
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/api/checkout' && req.method() === 'POST') {
      state.persistedBeforePost.push(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), INTENT));
      state.posts.push(req.postDataJSON());
      if (options.loseResponse) return route.abort('connectionfailed');
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result()) });
    }
    if (url.pathname === '/api/checkout/status' && req.method() === 'GET') {
      state.queries.push(Object.fromEntries(url.searchParams));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result()) });
    }
    if (req.method() !== 'GET' || url.pathname.startsWith('/api/') || /\.(mp4|webm|m3u8)$/.test(url.pathname)) return route.abort();
    if (url.pathname.endsWith('/site-tracking.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  await context.addInitScript(() => {
    window.HubTracker = Object.fromEntries(['track', 'lead', 'initiateCheckout', 'purchase'].map(name => [name, () => {}]));
  });
  page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'checkout has no uncaught script errors'));
  await page.goto(origin + routePath, { waitUntil: 'load' });
  return { page, state };
}
async function paymentStep(page, plan) {
  await page.locator('.psel-row').filter({ has: page.locator('input[name="plano"][value="' + plan + '"]') }).click();
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill('Auditoria Imobiturbo'); await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11963824751'); await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('auditoria@example.invalid'); await page.locator('#chkStep3Btn').click();
  assert.ok(await page.locator('#chkStepPane4').isVisible());
}
async function submit(page, method) {
  if (method === 'PIX') {
    await page.locator('#chkTabPix').click(); await page.locator('#chkPixCpf').fill('52998224725');
  } else {
    if (await page.locator('#chkCardNumber').count()) {
      await page.locator('#chkCardNumber').fill('4111111111111111');
      await page.locator('#chkCardHolder').fill('Auditoria Imobiturbo');
      await page.locator('#chkCardExpiry').fill('12/30'); await page.locator('#chkCardCvv').fill('123');
    }
    await page.locator('#chkCardCpf').fill('52998224725');
  }
  // Real DOM call sites receive a double click while the first fetch is pending.
  await page.locator(method === 'PIX' ? '#chkGeneratePixBtn' : '#chkContinuePaymentBtn').evaluate(button => { button.click(); button.click(); });
}
for (const route of ['/vagas/', '/vagas-v2/']) {
  for (const [plan, count, pix, card] of [['mensal',1,147,147], ['trimestral',3,357,381], ['anual',12,997,1164]]) {
    for (const method of route === '/vagas/' && plan === 'mensal' ? ['CREDIT_CARD'] : ['PIX', 'CREDIT_CARD']) test(`${route} ${plan}/${method}: one POST, durable key, canonical payload and recovered payment`, async t => {
      const { page, state } = await visit(t, route);
      await paymentStep(page, plan);
      assert.equal(await page.locator('#chkInstallments option').count(), 1, 'only the frozen card count is purchasable');
      assert.equal(await page.locator('#chkInstallments').inputValue(), String(count));
      await submit(page, method);
      await page.waitForFunction(key => Boolean(JSON.parse(localStorage.getItem(key) || 'null')?.paymentId), SESSION);
      assert.equal(state.posts.length, 1);
      const payload = state.posts[0], before = state.persistedBeforePost[0];
      if (route === '/vagas/') { assert.equal(payload.checkoutMode, 'hosted'); assert.equal(payload.creditCard, undefined); }
      assert.equal(payload.plan, plan); assert.equal(payload.paymentMethod, method);
      assert.equal(payload.installments, method === 'PIX' ? 1 : count);
      assert.match(payload.idempotencyKey, UUID); assert.notEqual(payload.idempotencyKey, payload.eventId);
      assert.equal(before.idempotencyKey, payload.idempotencyKey); assert.equal(before.state, 'submitting');
      assert.ok(!JSON.stringify(before).includes(payload.cpfCnpj)); assert.ok(!JSON.stringify(before).includes('4111111111111111'));
      const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SESSION);
      assert.equal(stored.amount, method === 'PIX' ? pix : card);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => !document.getElementById('chkPendingNotice').hidden);
      assert.equal(state.posts.length, 1);
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).idempotencyKey, INTENT), payload.idempotencyKey);
      assert.ok(await page.locator('#chkGeneratePixBtn').isDisabled());
    });
  }
  test(`${route} lost response/reload: reconcile same intention before any possible retry`, async t => {
    const { page, state } = await visit(t, route, { loseResponse: true });
    await paymentStep(page, 'trimestral'); await submit(page, 'PIX');
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.state === 'uncertain', INTENT);
    const original = state.posts[0]; assert.equal(state.posts.length, 1);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !document.getElementById('chkPendingNotice').hidden);
    assert.ok(state.queries.some(q => q.idempotencyKey === original.idempotencyKey));
    assert.equal(state.posts.length, 1);
    state.recovered = true;
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.paymentId === 'pay_synthetic_not_payable', SESSION);
    const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), INTENT);
    assert.equal(persisted.idempotencyKey, original.idempotencyKey); assert.equal(persisted.eventId, original.eventId);
    assert.equal(state.posts.length, 1);
  });
}

for (const width of [320, 390, 1440]) test(`hosted monthly ${width}px: native button delegates payment and captures no card data`, async t => {
  const { page, state } = await visit(t, '/vagas/', { hostedInvoice: true });
  await page.setViewportSize({ width, height: 844 });
  await paymentStep(page, 'mensal');
  assert.equal(await page.locator('#chkCardNumber').count(), 0);
  assert.equal(await page.locator('#chkCardCvv').count(), 0);
  assert.equal(await page.locator('#chkTabPix').isVisible(), false, JSON.stringify(await page.locator('#chkTabPix').evaluate(n => ({hidden:n.hidden,style:n.getAttribute('style'),display:getComputedStyle(n).display,plan:window.currentSelectedPlan}))));
  await submit(page, 'CREDIT_CARD');
  await page.waitForURL('https://www.asaas.com/i/synthetic_not_payable');
  assert.equal(state.posts.length, 1);
  assert.equal(state.posts[0].checkoutMode, 'hosted');
  assert.equal(state.posts[0].creditCard, undefined);
});
