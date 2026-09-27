// Run only on VPS3. Cal is replaced by a local cross-origin iframe fixture.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(process.env.UPSELL_ROOT || path.join(__dirname, '..'));
const artifacts = process.env.UPSELL_ARTIFACTS;
const CAL_ORIGIN = 'https://agenda.imobiturbo.com.br';
const PAYMENT_UID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_PAYMENT_UID = '2f1c5ec1-1b6a-44fa-a8b3-1c1234567890';
const BOOKING_UID = 'a1B2c3D4e5F6g7H8i9J0kL';
const PROFILE_KEY = 'imobiturbo:checkout:upsell-buyer:v1';
const CAL_PAYMENT_KEY = 'imobiturbo:cal-consultoria:payment:v1';
const buyer = {
  name: 'Mariana Compradora', email: 'mariana.prefill@example.invalid', phone: '21987654322',
  cpfCnpj: '52998224725', cardHolderName: 'Mariana Titular', version: 1,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
let server;
let browser;
let baseURL;

function sdkFixture() {
  return `(() => {
    const cal = window.Cal;
    const namespace = 'imobiturboConsultoria';
    const globalQueue = cal?.q?.map(args => Array.from(args)) || [];
    const api = cal?.ns?.[namespace];
    const namespaceQueue = api?.q?.map(args => Array.from(args)) || [];
    const inline = namespaceQueue.find(args => args[0] === 'inline')?.[1];
    const initialized = globalQueue.some(args => args[0] === 'initNamespace' && args[1] === namespace);
    if (typeof cal !== 'function' || !cal.loaded || !Array.isArray(cal.q) || !api || !Array.isArray(api.q) ||
        !initialized || !namespaceQueue.some(args => args[0] === 'init') || !inline ||
        !namespaceQueue.some(args => args[0] === 'ui')) throw new Error('Cal SDK did not receive the official snippet queues');
    window.__calSdkQueues = { global: globalQueue, namespace: namespaceQueue };
    window.__calConfig = inline;
    const frame = document.createElement('iframe');
    frame.name = 'cal-embed=' + namespace;
    const url = new URL('https://agenda.imobiturbo.com.br/' + inline.calLink);
    url.searchParams.set('embed', namespace);
    for (const key of ['name', 'email', 'phone']) if (inline.config[key]) url.searchParams.set(key, inline.config[key]);
    frame.src = url.href;
    document.querySelector(inline.elementOrSelector).append(frame);
  })();`;
}

function paymentFixture() {
  return `<!doctype html><html><body>
    <button id="emit-ready">Ready</button><button id="emit-paid">Paid</button><button id="emit-expired">Expired</button>
    <a id="new-slot" href="https://agenda.imobiturbo.com.br/natanpimentel/1-1-consultoria-individual-com-natan-pimentel?embed=imobiturboConsultoria">Escolher outro horário</a>
    <pre id="received"></pre>
    <script>
      const id = location.pathname.match(/^\\/payment\\/([0-9a-f-]+)$/i)?.[1] || '${PAYMENT_UID}';
      document.querySelector('#emit-ready').onclick = () => parent.postMessage({type:'imobiturbo:payment-ready', paymentUid:id}, '*');
      document.querySelector('#emit-paid').onclick = () => {
        parent.postMessage({type:'imobiturbo:booking-paid', paymentUid:id, bookingUid:'${BOOKING_UID}'}, '*');
        setTimeout(() => location.assign('https://agenda.imobiturbo.com.br/booking/${BOOKING_UID}'), 50);
      };
      document.querySelector('#emit-expired').onclick = () => parent.postMessage({type:'imobiturbo:payment-expired', paymentUid:id}, '*');
      addEventListener('message', event => {
        if (event.data?.type === 'imobiturbo:buyer') document.querySelector('#received').textContent = JSON.stringify({origin:event.origin, payload:event.data});
      });
    </script>
  </body></html>`;
}

function bookingFixture() {
  return '<!doctype html><html><body><h1 id="native-confirmation">Agendamento confirmado</h1></body></html>';
}

before(async () => {
  if (artifacts) fs.mkdirSync(artifacts, { recursive: true });
  const contentTypes = {
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.webp': 'image/webp',
  };
  server = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}/vagas-obrigado/`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openWidget(width, { savedPayment = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageErrors = [];
  const checkoutWrites = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === CAL_ORIGIN) {
      if (url.pathname === '/embed/embed.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: sdkFixture() });
      if (url.pathname.startsWith('/booking/')) return route.fulfill({ status: 200, contentType: 'text/html', body: bookingFixture() });
      return route.fulfill({ status: 200, contentType: 'text/html', body: paymentFixture() });
    }
    if (url.origin !== new URL(baseURL).origin) return route.abort();
    if (url.pathname === '/api/checkout') checkoutWrites.push({ method: route.request().method(), url: url.href });
    return route.continue();
  });
  await page.addInitScript(({ profileKey, profile }) => {
    if (!sessionStorage.getItem(profileKey)) sessionStorage.setItem(profileKey, JSON.stringify(profile));
  }, { profileKey: PROFILE_KEY, profile: buyer });
  await page.goto(baseURL, { waitUntil: 'load' });
  if (savedPayment) {
    await page.evaluate(({ key, uid }) => sessionStorage.setItem(key, JSON.stringify({ uid, expiresAt: Date.now() + 20 * 60 * 1000 })), { key: CAL_PAYMENT_KEY, uid: PAYMENT_UID });
    await page.reload({ waitUntil: 'load' });
  } else await page.locator('[data-open-checkout]').first().click();
  await page.locator('#consultingCheckoutModal').waitFor({ state: 'visible' });
  await page.locator('#calBookingWidget iframe').waitFor({ state: 'attached' });
  return { context, page, pageErrors, checkoutWrites };
}

async function waitForCalFrame(page, predicate) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const frame = page.frames().find(predicate);
    if (frame) return frame;
    await page.waitForTimeout(50);
  }
  return null;
}

async function clickFrameButton(frame, selector) {
  await frame.locator(selector).evaluate(button => button.click());
}

test('inline Cal is responsive and receives only supported buyer prefill fields', async () => {
  for (const width of [1440, 390, 320]) {
    const { context, page, pageErrors } = await openWidget(width);
    try {
      const geometry = await page.evaluate(() => {
        const modal = document.querySelector('.cal-checkout-box').getBoundingClientRect();
        const frame = document.querySelector('#calBookingWidget iframe').getBoundingClientRect();
        return { viewport: innerWidth, document: document.documentElement.scrollWidth, modalLeft: modal.left,
          modalRight: modal.right, modalWidth: modal.width, frameWidth: frame.width,
          config: window.__calConfig, frameUrl: document.querySelector('#calBookingWidget iframe').src };
      });
      assert.ok(geometry.document <= width, `${width}px viewport has no horizontal overflow`);
      assert.ok(geometry.modalLeft >= 0 && geometry.modalRight <= width, `${width}px modal fits the viewport`);
      assert.ok(geometry.modalWidth <= 1120, 'modal caps desktop width for the inline calendar');
      assert.ok(geometry.frameWidth > 0, 'Cal frame has visible width');
      assert.deepEqual(geometry.config.config, {
        name: buyer.name, email: buyer.email, phone: buyer.phone,
        whatsapp: buyer.phone, attendeePhoneNumber: buyer.phone,
        theme: 'dark', layout: 'month_view',
      });
      const sdkQueues = await page.evaluate(() => window.__calSdkQueues);
      assert.deepEqual(sdkQueues.global.map(args => args[0]), ['initNamespace']);
      assert.deepEqual(sdkQueues.namespace.map(args => args[0]), ['init', 'inline', 'ui']);
      const frameUrl = new URL(geometry.frameUrl);
      assert.equal(frameUrl.origin, CAL_ORIGIN);
      assert.equal(frameUrl.searchParams.get('embed'), 'imobiturboConsultoria');
      assert.equal(frameUrl.searchParams.get('name'), buyer.name);
      assert.equal(frameUrl.searchParams.get('email'), buyer.email);
      assert.equal(frameUrl.searchParams.get('phone'), buyer.phone);
      assert.equal(frameUrl.href.includes(buyer.cpfCnpj), false, 'CPF never appears in the iframe URL');
      assert.equal(frameUrl.href.includes(buyer.cardHolderName), false, 'cardholder name never appears in the iframe URL');
      if (artifacts && [1440, 390].includes(width)) await page.screenshot({ path: path.join(artifacts, `${width}-cal-inline.png`) });
      assert.deepEqual(pageErrors, []);
    } finally { await context.close(); }
  }
});

test('Cal payment resumes across reload, message validation is origin/source-bound and paid booking uses short UID', async () => {
  const { context, page, pageErrors, checkoutWrites } = await openWidget(390);
  try {
    const embed = await waitForCalFrame(page, candidate => candidate.url().startsWith(CAL_ORIGIN));
    assert.ok(embed, 'Cal iframe is present');

    // A same-origin message from another Cal frame is rejected by the source check.
    await page.evaluate(() => {
      const attacker = document.createElement('iframe');
      attacker.id = 'cal-attacker';
      attacker.src = 'https://agenda.imobiturbo.com.br/attacker?embed=imobiturboConsultoria';
      document.body.append(attacker);
    });
    await page.waitForFunction(() => document.querySelector('#cal-attacker')?.contentWindow);
    const attacker = await waitForCalFrame(page, candidate => candidate.url().includes('/attacker'));
    await clickFrameButton(attacker, '#emit-ready');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), CAL_PAYMENT_KEY), null);

    // A wrong-origin event from the parent is rejected even if it carries the right shape.
    await page.evaluate(uid => window.postMessage({ type: 'imobiturbo:payment-ready', paymentUid: uid }, '*'), PAYMENT_UID);
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), CAL_PAYMENT_KEY), null);

    await clickFrameButton(embed, '#emit-ready');
    await page.waitForFunction(key => Boolean(sessionStorage.getItem(key)), CAL_PAYMENT_KEY);
    const savedBeforeReload = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), CAL_PAYMENT_KEY);
    assert.deepEqual(Object.keys(savedBeforeReload).sort(), ['expiresAt', 'uid']);
    assert.equal(savedBeforeReload.uid, PAYMENT_UID);
    assert.ok(savedBeforeReload.expiresAt - Date.now() <= 30 * 60 * 1000);
    assert.ok(savedBeforeReload.expiresAt - Date.now() > 29 * 60 * 1000);

    const receivedBuyer = await embed.locator('#received').textContent();
    const message = JSON.parse(receivedBuyer);
    assert.equal(message.origin, new URL(baseURL).origin);
    assert.deepEqual(message.payload.buyer, {
      name: buyer.name, email: buyer.email, phone: buyer.phone,
      cpfCnpj: buyer.cpfCnpj, cardHolderName: buyer.cardHolderName,
    });

    await page.reload({ waitUntil: 'load' });
    await page.locator('#consultingCheckoutModal').waitFor({ state: 'visible' });
    await page.waitForFunction(uid => {
      const frame = document.querySelector('#calBookingWidget iframe');
      return frame && new URL(frame.src).pathname === `/payment/${uid}`;
    }, PAYMENT_UID);
    const savedAfterReload = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), CAL_PAYMENT_KEY);
    assert.equal(savedAfterReload.expiresAt, savedBeforeReload.expiresAt, 'reload does not extend the fixed resume deadline');
    assert.deepEqual(Object.keys(savedAfterReload).sort(), ['expiresAt', 'uid']);

    const restored = await waitForCalFrame(page, candidate => candidate.url().includes(`/payment/${PAYMENT_UID}`));
    await clickFrameButton(restored, '#emit-paid');
    await page.locator('#consultingBooked').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#consultingCheckoutModal').evaluate(dialog => dialog.open), true, 'Cal remains visible for its native confirmation screen');
    assert.equal(await page.locator('#confirmedBookingLink').getAttribute('href'), `${CAL_ORIGIN}/booking/${BOOKING_UID}`);
    await restored.waitForURL(`${CAL_ORIGIN}/booking/${BOOKING_UID}`);
    assert.equal(await restored.locator('#native-confirmation').textContent(), 'Agendamento confirmado');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), CAL_PAYMENT_KEY), null);
    assert.equal(await page.locator('#offerContent').isVisible(), false);
    assert.deepEqual(checkoutWrites, [], 'the Cal flow never creates a separate website checkout');
    assert.deepEqual(pageErrors, []);
  } finally { await context.close(); }
});

test('legacy already-paid checkout directs the buyer to support, never back to the paid Cal event', async t => {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  t.after(() => context.close());
  const page = await context.newPage();
  const payment = {
    version: 2, gateway: 'asaas', paymentId: 'pay_legacy_consulting', plan: 'consultoria',
    productId: 'consultoria-individual-natan', eventId: 'legacy-event', amount: 497,
    installmentCount: 1, method: 'PIX', expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), pix: {},
  };
  await context.addInitScript(record => localStorage.setItem('imobiturbo:checkout:consulting:v2', JSON.stringify(record)), payment);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL).origin && url.pathname === '/api/checkout/status') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        success: true, paid: true, status: 'RECEIVED', gateway: 'asaas', paymentId: payment.paymentId,
        productId: payment.productId, plan: payment.plan, amount: payment.amount, expiresAt: payment.expiresAt,
      }) });
    }
    if (url.origin === new URL(baseURL).origin) return route.continue();
    return route.abort();
  });
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.locator('#consultingApproved').waitFor({ state: 'visible' });
  assert.match(await page.locator('#scheduleLink').getAttribute('href'), /^https:\/\/wa\.me\//);
  assert.equal(await page.locator('#consultingApproved').locator('a[href*="agenda.imobiturbo.com.br"]').count(), 0);
});

test('verified Cal expiration clears only the matching payment UID so reload offers a fresh slot', async () => {
  const { context, page, pageErrors, checkoutWrites } = await openWidget(390, { savedPayment: true });
  try {
    const paymentFrame = await waitForCalFrame(page, frame => frame.url().includes(`/payment/${PAYMENT_UID}`));
    assert.ok(paymentFrame, 'stored payment resumes in its existing Cal iframe');
    await paymentFrame.evaluate(uid => parent.postMessage({ type: 'imobiturbo:payment-expired', paymentUid: uid }, '*'), OTHER_PAYMENT_UID);
    await page.waitForTimeout(50);
    assert.ok(await page.evaluate(key => sessionStorage.getItem(key), CAL_PAYMENT_KEY), 'a stale expiry message cannot clear a different payment UID');
    await clickFrameButton(paymentFrame, '#emit-expired');
    await page.waitForFunction(key => sessionStorage.getItem(key) === null, CAL_PAYMENT_KEY);
    assert.match(await page.locator('#calendarFeedback').textContent(), /Escolha outro horário/);
    assert.equal(await paymentFrame.locator('#new-slot').getAttribute('href'), `${CAL_ORIGIN}/natanpimentel/1-1-consultoria-individual-com-natan-pimentel?embed=imobiturboConsultoria`);
    assert.deepEqual(checkoutWrites, [], 'expiry does not create or charge a new checkout');

    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#consultingCheckoutModal').isVisible(), false, 'expired payment is not restored on reload');
    await page.locator('[data-open-checkout]').first().click();
    await page.locator('#calBookingWidget iframe').waitFor({ state: 'attached' });
    const freshFrame = page.locator('#calBookingWidget iframe');
    await page.waitForFunction(() => {
      const frame = document.querySelector('#calBookingWidget iframe');
      return frame && !new URL(frame.src).pathname.startsWith('/payment/');
    });
    assert.match(new URL(await freshFrame.getAttribute('src')).pathname, /1-1-consultoria-individual-com-natan-pimentel/);
    assert.deepEqual(checkoutWrites, []);
    assert.deepEqual(pageErrors, []);
  } finally { await context.close(); }
});
