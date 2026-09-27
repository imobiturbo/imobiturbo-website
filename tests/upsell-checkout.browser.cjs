const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(process.env.UPSELL_ROOT || path.join(__dirname, '..'));
const artifacts = process.env.UPSELL_ARTIFACTS;
let server;
let browser;
let baseURL;

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
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    args: ['--no-sandbox'],
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== new URL(baseURL).origin) return route.abort();
    return route.continue();
  });
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.locator('[data-open-checkout]').first().click();
  await page.locator('#consultingCheckoutModal').waitFor({ state: 'visible' });
  return { context, page, pageErrors };
}

test('upsell checkout matches the landing modal and keeps all 1x-12x choices usable', async () => {
  for (const width of [1440, 390, 320]) {
    const { context, page, pageErrors } = await visit(width);
    try {
      const geometry = await page.evaluate(() => {
        const box = document.querySelector('.chk-modal-box').getBoundingClientRect();
        return {
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          modalWidth: box.width,
          modalLeft: box.left,
          modalRight: box.right,
          backdropBlur: getComputedStyle(document.querySelector('#consultingCheckoutModal'), '::backdrop').backdropFilter,
        };
      });
      assert.ok(geometry.document <= width, `${width}px viewport has horizontal overflow`);
      assert.ok(geometry.modalLeft >= 0 && geometry.modalRight <= width, `${width}px modal stays inside the viewport`);
      assert.ok(geometry.modalWidth <= 490, 'modal uses the same 490px maximum width as /vagas/');
      assert.match(geometry.backdropBlur, /blur\(12px\)/, 'modal uses the landing checkout backdrop');

      await page.locator('#payWithCard').click();
      assert.equal(await page.locator('#payWithCard').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#cardFields').isVisible(), true);

      const options = await page.locator('#cardInstallments option').evaluateAll(nodes => nodes.map(option => option.value));
      assert.deepEqual(options, Array.from({ length: 12 }, (_, index) => String(index + 1)));
      for (let count = 1; count <= 12; count++) {
        await page.locator('#cardInstallments').selectOption(String(count));
        if (count === 1) {
          assert.equal((await page.locator('#checkoutPrice').textContent()).trim(), 'R$497');
          assert.match(await page.locator('#submitPayment').textContent(), /Pagar R\$497 no cartão/);
        } else {
          assert.ok((await page.locator('#checkoutPrice').textContent()).trim().startsWith(`${count}× R$`));
          assert.match((await page.locator('#checkoutPriceNote').textContent()).trim(), /Total de R\$588/);
          assert.ok((await page.locator('#submitPayment').textContent()).includes(`${count}× de R$`));
        }
      }
     await page.locator('#payWithPix').click();
     assert.equal(await page.locator('#payWithPix').getAttribute('aria-selected'), 'true');
     assert.equal(await page.locator('#cardFields').isVisible(), false);
     assert.equal((await page.locator('#checkoutPrice').textContent()).trim(), 'R$497');
      await page.locator('#payWithCard').click();
      await page.locator('#cardInstallments').selectOption('12');
      await page.locator('#submitPayment').scrollIntoViewIfNeeded();
      const submitGeometry = await page.evaluate(() => {
        const modal = document.querySelector('.chk-modal-box').getBoundingClientRect();
        const button = document.querySelector('#submitPayment').getBoundingClientRect();
        return { modalTop: modal.top, modalBottom: modal.bottom, buttonTop: button.top, buttonBottom: button.bottom };
      });
      assert.ok(submitGeometry.buttonTop >= submitGeometry.modalTop && submitGeometry.buttonBottom <= submitGeometry.modalBottom, width + 'px checkout button is reachable inside the modal');
      if (artifacts && [1440, 390].includes(width)) {
        await page.screenshot({ path: path.join(artifacts, width + '-checkout-card-12x-cta.png'), fullPage: false });
      }
     assert.deepEqual(pageErrors, [], 'no browser runtime errors');

      if (artifacts && [1440, 390].includes(width)) {
        await page.locator('#payWithCard').click();
        await page.locator('#cardInstallments').selectOption('12');
        await page.screenshot({ path: path.join(artifacts, `${width}-checkout-card-12x.png`), fullPage: false });
      }
    } finally {
      await context.close();
    }
  }
});
