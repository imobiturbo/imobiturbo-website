// Run on VPS3. Reuse its installed Playwright via PLAYWRIGHT_MODULE; no new
// product dependency. External tracking and payment requests are blocked.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(process.env.VAGAS_ROOT || path.join(__dirname, '..'));
const artifacts = process.env.VAGAS_ARTIFACTS;
const measurements = [];
let browser, server, baseURL;

before(async () => {
  if (artifacts) fs.mkdirSync(artifacts, { recursive: true });
  if (process.env.VAGAS_URL) {
    baseURL = process.env.VAGAS_URL;
  } else {
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
    server = http.createServer((request, response) => {
      let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}${process.env.VAGAS_PATH || '/vagas/'}`;
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});

after(async () => {
  if (artifacts) fs.writeFileSync(path.join(artifacts, 'measurements.json'), JSON.stringify(measurements, null, 2));
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function visit(t, width = 390, reducedMotion = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin || route.request().method() !== 'GET') return route.abort();
    // The public tracking script is not needed to validate layout or keyboard.
    if (url.pathname.endsWith('/site-tracking.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('main img')].map(image => {
      image.loading = 'eager';
      return image.decode().catch(() => {});
    }));
  });
  return page;
}

test('responsive layout keeps founder content together and every plan readable', async t => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await t.test(`${width}px`, async t => {
      const page = await visit(t, width);
      const geometry = await page.evaluate(() => {
        const bounds = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {
          width: innerWidth, pageWidth: document.documentElement.scrollWidth,
          heading: bounds('.authority-heading'), portrait: bounds('.portrait-frame'), copy: bounds('.authority-copy'),
          kanban: {
            frame: bounds('.kanban-concept'),
            columns: [...document.querySelectorAll('.kanban-col')].map(column => column.getBoundingClientRect().width)
          },
          plans: [...document.querySelectorAll('.psel-row')].map(row => ({
            row: row.getBoundingClientRect().toJSON(),
            left: row.querySelector('.psel-left').getBoundingClientRect().toJSON(),
            price: row.querySelector('.psel-prc').getBoundingClientRect().toJSON(),
            scrollWidth: row.scrollWidth, clientWidth: row.clientWidth
          })),
          imagesLoaded: [...document.querySelectorAll('main img')].every(image => image.naturalWidth > 0),
          fontLoaded: document.fonts.check('600 18px "Plus Jakarta Sans"'),
          brands: [...document.querySelectorAll('.brand')].map(brand => {
            const image = brand.querySelector('img');
            const frame = brand.getBoundingClientRect();
            const rendered = image.getBoundingClientRect();
            return {
              overflow: getComputedStyle(brand).overflow,
              transform: getComputedStyle(image).transform,
              frame: frame.toJSON(),
              rendered: rendered.toJSON()
            };
          }),
          proofs: [...document.querySelectorAll('.proof-card img')].map(image => {
            const rendered = image.getBoundingClientRect();
            return {
              nativeRatio: image.naturalWidth / image.naturalHeight,
              renderedRatio: rendered.width / rendered.height,
              width: rendered.width,
              height: rendered.height
            };
          }),
          footerLegal: document.querySelector('.footer-legal p')?.textContent.trim()
        };
      });
      measurements.push(geometry);
      if (artifacts && [1440, 768, 390, 320].includes(width)) {
        for (const [name, selector] of [['hero', '.hero'], ['process', '#como-funciona'], ['founder', '#natan'], ['offer', '#assinatura']]) {
          await page.locator(selector).screenshot({ path: path.join(artifacts, `${width}-${name}.png`) });
        }
        if ([1440, 390].includes(width)) {
          await page.screenshot({ path: path.join(artifacts, `${width}-full.png`), fullPage: true });
          await page.locator('#checkoutBtn').click();
          await page.screenshot({ path: path.join(artifacts, `${width}-checkout.png`) });
          await page.keyboard.press('Escape');
          await page.locator('.proof-card').first().click();
          await page.locator('#proofLightboxImg').evaluate(image => image.decode());
          await page.screenshot({ path: path.join(artifacts, `${width}-lightbox.png`) });
          await page.keyboard.press('Escape');
        }
      }
      assert.ok(geometry.pageWidth <= width, `horizontal overflow: ${geometry.pageWidth} > ${width}`);
      assert.ok(geometry.kanban.frame.left >= 0 && geometry.kanban.frame.right <= width, 'Kanban scroll stays inside its illustration');
      assert.ok(geometry.kanban.columns.every(column => column >= 108), 'Kanban columns keep readable widths');
      assert.ok(geometry.imagesLoaded && geometry.fontLoaded, 'local images and font load');
      assert.equal(geometry.footerLegal, 'CNPJ 47.746.249/0001-04', 'footer keeps only the requested legal identifier');
      assert.ok(geometry.brands.every(brand => brand.overflow !== 'hidden' && brand.transform === 'none'), 'logos are not cropped or translated inside their frames');
      assert.ok(geometry.brands.every(brand => brand.rendered.top >= brand.frame.top - 1 && brand.rendered.bottom <= brand.frame.bottom + 1), 'complete logo image stays inside its natural frame');
      assert.ok(geometry.proofs.every(proof => Math.abs(proof.nativeRatio - proof.renderedRatio) < .02), 'gallery images preserve their native proportions');
      assert.ok(new Set(geometry.proofs.slice(0, 5).map(proof => Math.round(proof.width))).size >= 3, 'gallery cards adapt to different screenshot widths');
      if (width > 760) {
        assert.ok(geometry.copy.top - geometry.heading.bottom < 40, 'founder heading and biography must not have an empty grid row between them');
      } else {
        assert.ok(geometry.portrait.top >= geometry.heading.bottom, 'mobile portrait follows heading');
        assert.ok(geometry.copy.top - geometry.portrait.bottom >= 20, 'mobile biography needs space after the photograph');
      }
      for (const plan of geometry.plans) {
        assert.ok(plan.scrollWidth <= plan.clientWidth + 1, 'plan content fits inside its card');
        assert.ok(plan.price.right <= plan.row.right && plan.price.left >= plan.row.left, 'price remains inside the plan');
        assert.ok(plan.price.left >= plan.left.right - 1 || plan.price.top >= plan.left.bottom - 1, 'price and plan description do not overlap');
      }
    });
  }
});

test('small green labels meet normal-text contrast', async t => {
  const page = await visit(t);
  const results = await page.evaluate(() => {
    const luminance = color => {
      const values = color.match(/[\d.]+/g).slice(0, 3).map(value => {
        const s = Number(value) / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      });
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    return ['.lesson-progress-label', '.psel-selo', '.psel-row:has(input:checked) .psel-prc b'].map(selector => {
      const element = document.querySelector(selector);
      let parent = element;
      while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
      const fg = luminance(getComputedStyle(element).color);
      const bg = luminance(parent ? getComputedStyle(parent).backgroundColor : 'rgb(255, 255, 255)');
      return { selector, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
    });
  });
  for (const result of results) assert.ok(result.ratio >= 4.5, `${result.selector}: ${result.ratio.toFixed(2)}:1`);
});

test('closed dialogs cannot receive focus', async t => {
  const page = await visit(t);
  for (const id of ['chkName', 'proofLightboxClose']) {
    const focused = await page.evaluate(id => { document.getElementById(id).focus(); return document.activeElement.id; }, id);
    assert.notEqual(focused, id, `${id} must stay outside keyboard navigation while its dialog is closed`);
  }
});

test('checkout traps focus and restores its trigger before unified payment', async t => {
  const page = await visit(t);
  for (const [plan, name] of [['anual', 'Plano Anual'], ['trimestral', 'Plano Trimestral'], ['mensal', 'Plano Mensal']]) {
    await page.locator(`input[name="plano"][value="${plan}"]`).check();
    await page.locator('#checkoutBtn').click();
    assert.equal(await page.locator('#chkModalPlanName').textContent(), name);
    assert.ok(await page.locator('#checkoutModalOverlay').evaluate(node => node.contains(document.activeElement)), 'opening moves focus into checkout');
    await page.locator('#checkoutModalClose').focus();
    await page.keyboard.press('Shift+Tab');
    const reverseFocus = await page.locator('#checkoutModalOverlay').evaluate(node => ({
      contained: node.contains(document.activeElement), open: node.open,
      tag: document.activeElement.tagName, id: document.activeElement.id,
      documentFocused: document.hasFocus(),
      available: [...node.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(element => element.tabIndex >= 0 && !element.disabled && element.getClientRects().length)
        .map(element => element.id || element.tagName)
    }));
    assert.ok(reverseFocus.contained, `reverse Tab stays in checkout: ${JSON.stringify(reverseFocus)}`);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'checkoutModalClose');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'checkoutBtn');
    assert.equal(await page.locator('main').evaluate(node => node.inert), false, 'background restored');
  }
});

test('gallery opens with keyboard and returns focus after Escape', async t => {
  const page = await visit(t);
  const card = page.locator('.proof-card').first();
  await card.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#proofLightbox').getAttribute('aria-hidden'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'proofLightboxClose');
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'proofLightboxClose', `${key} stays in gallery`);
  }
  await page.keyboard.press('Escape');
  assert.ok(await card.evaluate(node => document.activeElement === node));
});

test('reduced motion stops gallery drift and keeps manual navigation', async t => {
  const page = await visit(t);
  const track = page.locator('#proofSliderTrack');
  const position = () => track.evaluate(node => `${node.scrollLeft}|${getComputedStyle(node).transform}`);
  const start = await position();
  await page.waitForTimeout(250);
  assert.equal(await position(), start, 'gallery must not move automatically with reduced motion');
  const offsets = await track.evaluate(node => [...node.querySelectorAll('.proof-card')].map(card => card.offsetLeft - node.offsetLeft));
  await page.locator('#proofNextBtn').click();
  await page.waitForTimeout(100);
  assert.notEqual(await position(), start, 'next button still works');
  assert.ok(Math.abs((await track.evaluate(node => node.scrollLeft)) - offsets[1]) < 2, 'first next lands on the second variable-width card');
  await page.locator('#proofNextBtn').click();
  await page.waitForTimeout(100);
  assert.ok(Math.abs((await track.evaluate(node => node.scrollLeft)) - offsets[2]) < 2, 'second next lands on the third variable-width card');
});
