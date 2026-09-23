// Run only on VPS3. Synthetic identity; all trackers and external requests are intercepted.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const storageKey = 'imobiturbo:vagas-v2:checkout:v1';
const buyer = { name: 'Teste Persistência', phone: '(11) 99999-9999', email: 'persistencia@example.invalid' };
let browser, server, origin, pageUrl;

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  pageUrl = process.env.VAGAS_URL || `http://127.0.0.1:${server.address().port}/vagas-v2/`;
  origin = new URL(pageUrl).origin;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });

async function visit(t, width = 1440, initialStorage) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  t.after(() => context.close());
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET') return route.abort();
    if (url.href === 'https://static.hotmart.com/checkout/widget.min.js') {
      return route.fulfill({ contentType: 'text/javascript', body: `window.jQuery={fancybox:{}};document.getElementById('hotmartCheckoutLink').addEventListener('click',function(e){e.preventDefault();window.widgetTarget=this.href;});` });
    }
    if (url.origin !== origin || /\.(mp4|m3u8)$/.test(url.pathname)) return route.abort();
    if (/site-tracking|\/api\//.test(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  if (initialStorage !== undefined) await context.addInitScript(({ key, value }) => {
    if (value === 'blocked') {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    } else localStorage.setItem(key, value);
  }, { key: storageKey, value: initialStorage });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught errors'));
  await page.goto(pageUrl, { waitUntil: 'load' });
  return page;
}

async function complete(page) {
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill(buyer.name);
  await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11999999999');
  await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill(buyer.email);
  await page.locator('#chkStep3Btn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true);
}

async function assertBuyer(page) {
  assert.equal(await page.locator('#chkName').inputValue(), buyer.name);
  assert.equal(await page.locator('#chkPhone').inputValue(), buyer.phone);
  assert.equal(await page.locator('#chkEmail').inputValue(), buyer.email);
}

for (const width of [1440, 390]) test(`completed checkout reopens at payment and changes plans at ${width}px`, async t => {
  const page = await visit(t, width);
  await complete(page);
  for (const plan of ['anual', 'mensal', 'trimestral']) {
    await page.locator('#checkoutModalClose').click();
    await page.locator(`input[name="plano"][value="${plan}"]`).check({ force: true });
    await page.locator('#checkoutBtn').click();
    assert.equal(await page.locator('#chkStepPane4').isVisible(), true, 'reopen directly at final step');
    await assertBuyer(page);
    assert.match(await page.locator('#chkPlanCompactTitle').innerText(), new RegExp(plan, 'i'));
  }
  await page.locator('#chkPlanRetractableTrigger').click();
  await page.locator('#chkChangePlanTrigger').click();
  await page.locator('input[name="chkModalPlanRadio"][value="mensal"]').check({ force: true });
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true);
  assert.match(await page.locator('#chkPaymentTerms').innerText(), /147/);
  await page.keyboard.press('Escape');
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true);
});

test('reload and a new visit restore completion, chosen plan and the buyer sent to Hotmart', async t => {
  let page = await visit(t);
  await page.locator('input[name="plano"][value="trimestral"]').check({ force: true });
  await complete(page);
  await page.reload({ waitUntil: 'load' });
  assert.equal(await page.locator('#checkoutModalOverlay').getAttribute('open'), null);
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true, 'reload preserves final step');
  // New tab shares durable storage, but not the old page's in-memory state.
  page = await page.context().newPage();
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true, 'a new visit preserves final step');
  await assertBuyer(page);
  assert.equal(await page.locator('input[name="plano"]:checked').inputValue(), 'trimestral');
  await page.waitForFunction(() => Boolean(window.jQuery?.fancybox));
  await page.locator('#chkContinuePaymentBtn').click();
  const target = new URL(await page.evaluate(() => window.widgetTarget));
  assert.equal(target.searchParams.get('off'), '4ctjnptl');
  assert.equal(target.searchParams.get('split'), '3');
  assert.equal(target.searchParams.get('name'), buyer.name);
  assert.equal(target.searchParams.get('email'), buyer.email);
  assert.equal(target.searchParams.get('phoneac'), '11');
  assert.equal(target.searchParams.get('phonenumber'), '999999999');
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true, 'returning from payment keeps completion');
});

test('incomplete draft resumes its actual step with unsubmitted input after reload', async t => {
  const page = await visit(t);
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill(buyer.name);
  await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11999999999');
  await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('ainda-incompleto');
  await page.reload({ waitUntil: 'load' });
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane3').isVisible(), true);
  assert.equal(await page.locator('#chkEmail').inputValue(), 'ainda-incompleto');
  assert.equal(await page.locator('.chk-user-first-name').first().textContent(), 'Teste');
  assert.match(await page.locator('#chkGeoRegionText').innerText(), /São Paulo/);
  await page.locator('#chkStep3Btn').click();
  assert.equal(await page.locator('#chkStepPane3').isVisible(), true, 'validation remains active');
});

test('unavailable storage still preserves progress when reopening in the same page', async t => {
  const page = await visit(t, 390, 'blocked');
  await complete(page);
  await page.keyboard.press('Escape');
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane4').isVisible(), true);
  await assertBuyer(page);
});

test('malformed stored JSON does not prevent a fresh checkout', async t => {
  const page = await visit(t, 1440, '{broken');
  await complete(page);
});

test('stored completion cannot bypass missing buyer fields', async t => {
  const page = await visit(t, 1440, JSON.stringify({ step: 4, name: buyer.name, phone: '', email: buyer.email, plan: 'unknown' }));
  await page.locator('#checkoutBtn').click();
  assert.equal(await page.locator('#chkStepPane2').isVisible(), true);
  assert.equal(await page.locator('input[name="plano"]:checked').inputValue(), 'anual');
});
