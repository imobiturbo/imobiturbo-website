// Execute on VPS3. Isolated Chromium; external traffic and writes are blocked.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.VAGAS_ROOT || path.join(__dirname, '..'));
const artifacts = process.env.VAGAS_ARTIFACTS;
const evidence = [];
let browser, server, baseURL;

before(async () => {
  if (artifacts) fs.mkdirSync(artifacts, { recursive: true });
  if (process.env.VAGAS_URL) baseURL = process.env.VAGAS_URL;
  else {
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4' };
    server = http.createServer((request, response) => {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}/vagas/`;
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'], proxy: process.env.VAGAS_PROXY ? { server: process.env.VAGAS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
});

after(async () => {
  if (artifacts) fs.writeFileSync(path.join(artifacts, 'measurements.json'), JSON.stringify(evidence, null, 2));
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(t, width = 390, allowMedia = false) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin || request.method() !== 'GET') return route.abort();
    if (!allowMedia && /\.(mp4|webm|m3u8)$/.test(url.pathname)) return route.abort();
    if (url.pathname.endsWith('/site-tracking.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  const page = await context.newPage(), errors = [];
  await page.addInitScript(() => {
    window.auditEvents = [];
    window.HubTracker = Object.fromEntries(['track', 'lead', 'initiateCheckout', 'purchase'].map(method => [method, (...args) => window.auditEvents.push({ method, args })]));
  });
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'page has no uncaught JavaScript error'));
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('video').forEach(video => video.pause());
  });
  return page;
}

async function revealVisibleImages(page) {
  for (const image of await page.locator('body img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(node => node.naturalWidth > 0, await image.elementHandle());
  }
  await page.evaluate(() => scrollTo(0, 0));
}

for (const width of [390, 320, 1440]) test(`restored page, original course carousel and plan navigation at ${width}px`, async t => {
  const page = await visit(t, width);
  assert.ok(await page.evaluate(() => window.auditEvents.some(event => event.method === 'track' && event.args[0] === 'LandingView' && event.args[1].lp_version === 'vagas-comunidade-headlines-20261002' && event.args[1].traffic_classification === 'confirmed_bot')));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
  assert.equal(await page.locator('#vslVideo').count(), 1, 'the presentation remains in the hero');
  await page.locator('main a.btn[href="#planos"]').first().click();
  await page.waitForFunction(() => { const top = document.getElementById('planos').getBoundingClientRect().top; return top >= 0 && top < 200; });
  evidence.push(await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth, planTop: document.getElementById('planos').getBoundingClientRect().top, version: document.body.dataset.lpVersion })));
  assert.ok(await page.locator('#planos').isVisible());
  if (artifacts) await page.screenshot({ path: path.join(artifacts, `${width}-plans.png`) });
  const course = page.locator('#cioCardsSlider');
  await course.scrollIntoViewIfNeeded();
  assert.ok(await course.isVisible(), 'original curriculum carousel stays available');
  const before = await course.evaluate(node => node.scrollLeft);
  await page.locator('#cioCarouselNext').click();
  await page.waitForFunction(previous => document.getElementById('cioCardsSlider').scrollLeft > previous, before);
  if (artifacts) await page.screenshot({ path: path.join(artifacts, `${width}-courses.png`) });
});

test('three plans show the correct hosted checkout price and monthly renewal', async t => {
  for (const [plan, installments, amount] of [['anual', '12', '997'], ['trimestral', '3', '357'], ['mensal', '1', '147']]) await t.test(plan, async t => {
    const page = await visit(t);
    const row = page.locator('.psel-row').filter({ has: page.locator(`input[name="plano"][value="${plan}"]`) });
    await row.click();
    await page.locator('#checkoutBtn').click();
    assert.ok(await page.locator('#checkoutModalOverlay').evaluate(node => node.contains(document.activeElement)), 'focus enters checkout');
    await page.locator('#chkStep1Btn').click();
    assert.ok(await page.locator('#chkStepPane1').isVisible(), 'invalid name does not advance');
    await page.locator('#chkName').fill('Auditoria Imobiturbo');
    await page.locator('#chkStep1Btn').click();
    await page.locator('#chkPhone').fill('11987654321');
    await page.locator('#chkStep2Btn').click();
    assert.ok(await page.locator('#chkStepPane2').isVisible(), 'dummy phone stays in its step');
    await page.locator('#chkPhone').fill('11963824751');
    await page.locator('#chkStep2Btn').click();
    await page.locator('#chkEmail').fill('auditoria@example.invalid');
    await page.locator('#chkStep3Btn').click();
    assert.ok(await page.locator('#chkStepPane4').isVisible());
    assert.equal(new URL(page.url()).pathname, '/vagas/', 'no external checkout navigation');
    assert.equal(await page.locator('#chkInstallments').inputValue(), installments);
    assert.equal(await page.locator('#chkCardHolder').count(), 0, 'Asaas collects the card details');
    assert.match(await page.locator('#chkProgressPct').innerText(), /4\D+4/, 'progress describes the payment step');
    assert.ok(await page.locator('#chkStepPane4 img[alt="Asaas"]').isVisible());
    if (plan !== 'mensal') {
      for (const count of [installments]) {
        await page.locator('#chkInstallments').selectOption(count);
        const summary = await page.locator('#chkPlanCompactPrice').innerText();
        const total = count === '1' ? amount : plan === 'anual' ? '1.164' : '381';
        assert.match(summary, new RegExp(total.replace('.', '\\.')), 'summary matches the actual total for this installment count');
        const option = await page.locator('#chkInstallments option:checked').innerText();
        assert.ok((await page.locator('#chkBtnText').innerText()).includes(option.match(/R\$ ([\d,.]+)/)[1].replace(',00', '')), 'button agrees with selected installment price');
      }
    }
    if (plan !== 'mensal') {
      await page.locator('#chkTabPix').click();
      assert.match(await page.locator('#chkPixView').innerText(), new RegExp(amount), 'Pix total is visible before creating a charge');
      assert.match(await page.locator('#chkPlanCompactPrice').innerText(), new RegExp(amount + '.*Pix'));
      assert.ok(await page.locator('#chkPlanCompactPrice').evaluate(node => node.scrollWidth <= node.clientWidth));
      if (artifacts) await page.screenshot({ path: path.join(artifacts, `390-${plan}-pix.png`) });
      await page.locator('#chkTabCard').click();
    } else {
      assert.ok(await page.locator('#chkTabPix').isVisible());
      assert.equal(await page.locator('#chkInstallmentsWrap').isVisible(), false);
      assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /147.*recorrente/);
      await page.locator('#chkTabPix').click();
      assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /147\/mês.*Pix Automático/);
      assert.match(await page.locator('#chkPixTotal').innerText(), /autorize no banco.*147\/mês/);
      if (artifacts) await page.screenshot({ path: path.join(artifacts, '390-mensal-pix-automatico.png') });
      await page.locator('#chkTabCard').click();
    }
    assert.ok(!(await page.locator('#chkPlanCompactPrice').innerText()).includes('Pix'));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'checkoutBtn', 'focus returns to the purchase CTA');
    await page.reload({ waitUntil: 'load' });
    await page.locator('#checkoutBtn').click();
    if (await page.locator('#chkStepPane3').isVisible()) {
      assert.equal(await page.locator('#chkEmail').inputValue(), 'auditoria@example.invalid');
      await page.locator('#chkStep3Btn').click();
    }
    assert.ok(await page.locator('#chkStepPane4').isVisible(), 'draft can resume payment');
    assert.equal(await page.locator('#chkInstallments').inputValue(), installments, 'reload preserves selected plan');
  });
});

for (const width of [390, 1440]) test(`monthly Pix Automatic is explicit and creates one recoverable consent at ${width}px`, async t => {
  const page = await visit(t, width);
  await page.locator('#planRowMensal').click();
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill('Auditoria Imobiturbo');
  await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11963824751');
  await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('auditoria@example.invalid');
  await page.locator('#chkStep3Btn').click();
  await page.locator('#chkTabPix').click();
  const compact = await page.locator('.chk-modal-box').evaluate(node => ({ height: node.clientHeight, scrollHeight: node.scrollHeight }));
  assert.ok(compact.scrollHeight <= compact.height + 1, 'payment choice fits without an inner scrollbar');
  assert.ok(await page.locator('#chkGeneratePixBtn').evaluate(node => { const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }), 'monthly CTA is in view');
  if (artifacts) await page.screenshot({ path: path.join(artifacts, `${width}-monthly-pix-choice.png`) });
  const response = { success: true, managedCommunity: true, pixAutomatic: true, orderStatus: 'created',
    paymentId: 'auto_33333333-3333-4333-8333-333333333333', method: 'PIX', plan: 'mensal',
    productId: 'comunidade-imobiturbo', amount: 147, installmentCount: 1,
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), paid: false,
    pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=' } };
  const posts = [];
  await page.route('**/api/checkout', route => {
    posts.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.route('**/api/checkout/status?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) }));
  await page.locator('#chkPixCpf').fill('52998224725');
  await page.locator('#chkGeneratePixBtn').click();
  await page.waitForFunction(() => !document.getElementById('chkPendingNotice').hidden);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].pixAutomatic, true);
  assert.equal(posts[0].paymentMethod, 'PIX');
  assert.equal(posts[0].plan, 'mensal');
  assert.ok(await page.locator('#chkExternalLink').isHidden());
  assert.match(await page.locator('#chkPendingNotice').innerText(), /autorize o Pix Automático/);
  assert.equal(await page.locator('#chkPixCopiaCola').inputValue(), 'SYNTHETIC-NOT-PAYABLE');
  assert.equal(await page.locator('#chkPixQrImg').getAttribute('src'), response.pix.qrCodeBase64);
  assert.equal(await page.locator('#chkPixQrImg').getAttribute('data-lazy-src'), null);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('chkPixCopiaCola').value === 'SYNTHETIC-NOT-PAYABLE');
  assert.equal(posts.length, 1, 'reload never POSTs a second consent');
  assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /Pix Automático/);
  assert.equal(await page.locator('#chkPixQrImg').getAttribute('src'), response.pix.qrCodeBase64);
});

test('recovered automatic Pix retains the sold amount instead of the new price', async t => {
  const page = await visit(t);
  const record = { version: 2, paymentId: 'auto_33333333-3333-4333-8333-333333333333',
    gateway: 'asaas', method: 'PIX', plan: 'mensal', productId: 'comunidade-imobiturbo',
    pixAutomatic: true, managedCommunity: true, amount: 127, installmentCount: 1,
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), paid: false,
    pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: '' } };
  await page.route('**/api/checkout/status?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...record, success: true, status: 'PENDING' }) }));
  await page.evaluate(value => localStorage.setItem('imobiturbo:checkout:community:v2', JSON.stringify(value)), record);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !document.getElementById('chkPendingNotice').hidden);
  assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /127,00\/mês.*Pix Automático/);
  assert.match(await page.locator('#chkPaymentTerms').innerText(), /127,00 por mês/);
});

test('desktop stays readable and legal links resolve to documents', async t => {
  const page = await visit(t, 1440);
  await revealVisibleImages(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (artifacts) await page.screenshot({ path: path.join(artifacts, '1440-full.png'), fullPage: true });
  for (const href of ['/termos-de-servico/', '/politica-de-privacidade/']) {
    const link = page.locator(`footer a[href="${href}"]`);
    assert.equal(await link.count(), 1, 'footer exposes the real document route');
    await link.click();
    assert.ok((await page.locator('main').innerText()).length > 500, 'document has substantive visible content');
    await page.goBack({ waitUntil: 'load' });
  }
});

test('pending payment reload preserves its actual method, installments and price', async t => {
  for (const [plan, pixAmount, count] of [['anual', '997', 1], ['trimestral', '357', 2], ['mensal', '147', 1]]) {
    for (const method of ['PIX', 'CREDIT_CARD']) await t.test(`${plan} ${method}`, async t => {
      const page = await visit(t);
      const record = {
        version: 2, paymentId: 'pay_synthetic_not_payable', gateway: 'asaas', method, plan,
        productId: 'comunidade-imobiturbo', installmentCount: method === 'PIX' ? 1 : count,
        amount: method === 'CREDIT_CARD' && plan === 'trimestral' ? 381 : Number(pixAmount), installmentValue: method === 'CREDIT_CARD' && plan === 'trimestral' ? 190.50 : 0, paid: false, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=' }
      };
      await page.route('**/api/checkout/status?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...record, success: true, status: 'PENDING' }) }));
      await page.evaluate(value => localStorage.setItem('imobiturbo:checkout:community:v2', JSON.stringify(value)), record);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => document.getElementById('checkoutModalOverlay').open && !document.getElementById('chkPendingNotice').hidden);
      const summary = await page.locator('#chkPlanCompactPrice').innerText();
      if (method === 'PIX') {
        assert.match(summary, new RegExp(pixAmount + '.*Pix'));
        assert.ok(!summary.includes('recorrente'));
        assert.ok(await page.locator('#chkPixView').isVisible());
        assert.equal(await page.locator('#chkPixCopiaCola').inputValue(), 'SYNTHETIC-NOT-PAYABLE');
      } else {
        assert.ok(!summary.includes('Pix'));
        assert.equal(await page.locator('#chkInstallments').inputValue(), String(count));
        if (plan === 'anual') assert.match(summary, /997.*à vista/);
        if (plan === 'trimestral') assert.match(summary, /2x.*190,50.*381/);
        if (plan === 'mensal') assert.match(summary, /147\/mês.*recorrente/);
      }
      assert.ok(await page.locator('#chkGeneratePixBtn').isDisabled(), 'pending charge cannot generate another payment');
    });
  }
});


test('expired Pix restores the card total before the visitor restarts checkout', async t => {
  const page = await visit(t);
  const record = {
    version: 2, paymentId: 'pay_synthetic_expiration', gateway: 'asaas', method: 'PIX', plan: 'anual',
    productId: 'comunidade-imobiturbo', installmentCount: 1, amount: 997, paid: false,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    pix: { copyPaste: 'SYNTHETIC-NOT-PAYABLE', qrCodeBase64: '' }
  };
  let expired = false;
  await page.route('**/api/checkout/status?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...record, success: true, status: expired ? 'CANCELED' : 'PENDING' }) }));
  await page.evaluate(value => localStorage.setItem('imobiturbo:checkout:community:v2', JSON.stringify(value)), record);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('checkoutModalOverlay').open && !document.getElementById('chkPendingNotice').hidden);
  assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /997.*Pix/);
  expired = true;
  await page.waitForFunction(() => document.getElementById('chkStepPane1').offsetHeight > 0 && document.getElementById('chkPendingNotice').hidden);
  assert.equal(await page.locator('#chkTabCard').getAttribute('aria-selected'), 'true');
  assert.match(await page.locator('#chkPlanCompactPrice').innerText(), /12x.*97.*1.164/);
  assert.ok(!(await page.locator('#chkPlanCompactPrice').innerText()).includes('Pix'));
  assert.equal(await page.locator('#chkName').inputValue(), '');
  await page.locator('#chkName').fill('Auditoria Imobiturbo');
  await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11963824751');
  await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('auditoria@example.invalid');
  await page.locator('#chkStep3Btn').click();
  assert.ok(await page.locator('#chkCardView').isVisible());
  assert.match(await page.locator('#chkBtnText').innerText(), /12x.*97/);
});
