// VPS3 only. Synthetic buyer; every payment POST and tracker is blocked.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let browser, server, origin;
const root = path.resolve(__dirname, '..');
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
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});
after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); });

for (const mode of ['widget', 'fallback', 'real-widget']) test(`unified checkout ${mode} preserves term and collects no payment data`, async t => {
  const context = await browser.newContext({ viewport: { width: mode !== 'fallback' ? 1440 : 390, height: 1000 } });
  t.after(() => context.close());
  let targetUrl, posts = 0;
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET') { posts++; return route.abort(); }
    if (/site-tracking|\/api\//.test(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '' });
    if (url.hostname === 'pay.hotmart.com' && mode !== 'real-widget') { targetUrl = url; return route.fulfill({ contentType: 'text/html', body: 'Checkout de teste interceptado' }); }
    if (url.href === 'https://static.hotmart.com/checkout/widget.min.js' && mode === 'widget') {
      return route.fulfill({ contentType: 'text/javascript', body: `window.jQuery={fancybox:{}};document.getElementById('hotmartCheckoutLink').addEventListener('click',function(e){e.preventDefault();window.widgetTarget=this.href;window.dialogStillOpen=document.getElementById('checkoutModalOverlay').open;});` });
    }
    if (mode === 'real-widget' && (url.hostname.endsWith('.hotmart.com') || url.hostname === 'hotmart.com' || url.hostname === 'code.jquery.com')) return route.continue();
    if (url.origin !== origin || /\.(mp4|m3u8)$/.test(url.pathname)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/vagas-v2/', { waitUntil: 'load' });
  await page.locator('input[name="plano"][value="trimestral"]').check({ force: true });
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill('Teste Checkout');
  await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11999999999');
  await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('checkout@example.invalid');
  await page.locator('#chkStep3Btn').click();
  assert.equal(await page.locator('#tabPix,#tabCard,#chkCpf,#chkPixView,#chkCardNumber,#chkCardCvv,#chkCardHolder').count(), 0);
  assert.match(await page.locator('#chkPaymentTerms').innerText(), /357.*3x de R\$ 127.*3 meses/);
  if (mode !== 'fallback') await page.waitForFunction(() => Boolean(window.jQuery?.fancybox));
  await page.locator('#chkContinuePaymentBtn').click();
  if (mode === 'widget') {
    await page.waitForFunction(() => Boolean(window.widgetTarget));
    targetUrl = new URL(await page.evaluate(() => window.widgetTarget));
    assert.equal(await page.evaluate(() => window.dialogStillOpen), false);
  } else if (mode === 'real-widget') {
    const iframe = page.locator('iframe.fancybox-iframe');
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    targetUrl = new URL(await iframe.getAttribute('src'));
    assert.equal(await page.locator('#checkoutModalOverlay').getAttribute('open'), null);
    const frame = await iframe.contentFrame();
    await frame.getByText('Comunidade Imobiturbo', { exact: true }).first().waitFor({ timeout: 30000 }).catch(async error => {
      console.error('Checkout frame diagnostic:', (await frame.locator('body').innerText()).slice(0,1800));
      throw error;
    });
    await frame.getByRole('radio', { name: 'Selecionar Pix Automático como método de pagamento', exact: true }).click().catch(async error => {
      console.error('Payment methods diagnostic:', (await frame.locator('body').innerText()).slice(0, 2400));
      throw error;
    });
    await frame.getByText('Autorize uma vez a cobrança no app do seu banco e as próximas a gente cuida para você.', { exact: true }).waitFor();
    assert.match(await frame.locator('body').innerText(), /357,00\s*\/ trimestre/);
  } else await page.waitForURL('https://pay.hotmart.com/**');
  assert.equal(targetUrl.searchParams.get('off'), '4ctjnptl');
  assert.equal(targetUrl.searchParams.get('split'), '3');
  assert.equal(targetUrl.searchParams.has('hidePix'), false);
  assert.equal(targetUrl.searchParams.get('email'), 'checkout@example.invalid');
  if (mode !== 'real-widget') assert.equal(posts, 0, 'no buyer or card data posted to legacy checkout');
  if (mode !== 'real-widget') assert.deepEqual(errors, []);
});
