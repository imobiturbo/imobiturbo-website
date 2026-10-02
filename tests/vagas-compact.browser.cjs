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
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
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
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});

after(async () => {
  if (artifacts) fs.writeFileSync(path.join(artifacts, 'measurements.json'), JSON.stringify(evidence, null, 2));
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(t, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(baseURL).origin || request.method() !== 'GET') return route.abort();
    if (/\.(mp4|webm|m3u8)$/.test(url.pathname)) return route.abort();
    if (url.pathname.endsWith('/site-tracking.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'page has no uncaught JavaScript error'));
  await page.goto(baseURL, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('video').forEach(video => video.pause());
  });
  return page;
}

test('mobile offers an immediate CTA, an early price and optional depth', async t => {
  for (const width of [390, 320]) await t.test(`${width}px`, async t => {
    const page = await visit(t, width);
    // Scroll the actual page so its own lazy loader reveals the closed-page media.
    for (const image of await page.locator('main img:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(node => node.naturalWidth > 0, await image.elementHandle());
    }
    await page.evaluate(() => scrollTo(0, 0));
    const geometry = await page.evaluate(() => {
      const first = document.querySelector('main a.btn[href^="#"]');
      return {
        width: innerWidth, pageWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
        firstCTA: first && { href: first.getAttribute('href'), ...first.getBoundingClientRect().toJSON() },
        planTop: document.getElementById('planos').getBoundingClientRect().top + scrollY,
        catalogClosed: !document.querySelector('details.compact-catalog')?.open,
        brokenImages: [...document.querySelectorAll('main img')].filter(image => image.checkVisibility() && !image.naturalWidth).map(image => image.getAttribute('src')),
      };
    });
    evidence.push(geometry);
    assert.ok(geometry.pageWidth <= width, 'no horizontal overflow');
    assert.equal(geometry.firstCTA.href, '#planos', 'initial action reaches the plan selector');
    if (width === 390) {
      assert.ok(geometry.firstCTA.bottom <= 844, 'primary CTA fits in the first mobile viewport');
      assert.ok(geometry.height <= 16 * 844, 'closed page stays within the compact height budget');
    }
    assert.ok(geometry.firstCTA.height >= 48, 'CTA has a usable touch target');
    assert.ok(geometry.planTop <= 6 * 844, 'plans appear by the sixth mobile viewport');
    assert.ok(geometry.catalogClosed, 'curriculum is available without mandatory scrolling');
    assert.deepEqual(geometry.brokenImages, [], 'all real images load');
    if (artifacts) {
      await page.screenshot({ path: path.join(artifacts, `${width}-hero.png`) });
      await page.screenshot({ path: path.join(artifacts, `${width}-full.png`), fullPage: true });
    }
    await page.locator('details.compact-catalog > summary').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('details.compact-catalog').evaluate(node => node.open), true);
    const lastTrack = page.locator('.compact-catalog .cio-course-card').last();
    for (let i = 0; i < 30; i++) {
      const box = await lastTrack.boundingBox();
      if (box.y + box.height < 844) break;
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(60);
    }
    assert.ok((await lastTrack.boundingBox()).y < 844, 'keyboard reaches the last curriculum track');
    await page.waitForFunction(() => [...document.querySelectorAll('.compact-catalog img')].every(image => image.naturalWidth > 0));
    await page.locator('details.compact-catalog > summary').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('details.compact-catalog').evaluate(node => node.open), false, 'keyboard can collapse the catalog');
    await page.locator('main a.btn[href="#planos"]').first().click();
    await page.waitForFunction(() => document.getElementById('planos').getBoundingClientRect().top < 200);
    const bounds = await page.locator('#planos').boundingBox();
    assert.ok(bounds.y >= -1 && bounds.y < 200, 'CTA lands at the selector instead of another pitch');
    const gallery = page.locator('details').filter({ has: page.locator('#proofSliderTrack') });
    await gallery.locator('summary').click();
    for (const image of await gallery.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(node => node.naturalWidth > 0, await image.elementHandle());
      await image.evaluate(node => node.decode());
    }
    assert.ok(await gallery.locator('img').last().evaluate(node => node.naturalWidth > 0), 'last print is hydrated by the real loader');
  });
});

test('three plans preserve the native Asaas journey and show the Pix total before QR', async t => {
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
    assert.equal(await page.locator('#chkCardHolder').inputValue(), 'Auditoria Imobiturbo', 'identity is reused for payment');
    assert.match(await page.locator('#chkProgressPct').innerText(), /4\D+4/, 'progress describes the payment step');
    assert.ok(await page.locator('#chkStepPane4 img[alt="Asaas"]').isVisible());
    if (plan !== 'mensal') {
      for (const count of ['1', '2', installments]) {
        await page.locator('#chkInstallments').selectOption(count);
        const summary = await page.locator('#chkPlanCompactPrice').innerText();
        const total = count === '1' ? amount : plan === 'anual' ? '1.164' : '381';
        assert.match(summary, new RegExp(total.replace('.', '\\.')), 'summary matches the actual total for this installment count');
        const option = await page.locator('#chkInstallments option:checked').innerText();
        assert.ok((await page.locator('#chkBtnText').innerText()).includes(option.match(/R\$ ([\d,.]+)/)[1].replace(',00', '')), 'button agrees with selected installment price');
      }
    }
    await page.locator('#chkTabPix').click();
    assert.match(await page.locator('#chkPixView').innerText(), new RegExp(amount), 'Pix total is visible before generating a charge');
    assert.match(await page.locator('#chkPlanCompactPrice').innerText(), new RegExp(amount + '.*Pix'), 'summary uses the Pix total');
    if (artifacts) await page.screenshot({ path: path.join(artifacts, `390-${plan}-pix.png`) });
    await page.locator('#chkTabCard').click();
    assert.ok(!(await page.locator('#chkPlanCompactPrice').innerText()).includes('Pix'), 'card summary returns with its selected installments');
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

test('desktop stays readable and legal links resolve to documents', async t => {
  const page = await visit(t, 1440);
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
