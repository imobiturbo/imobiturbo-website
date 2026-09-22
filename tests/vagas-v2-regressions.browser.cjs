// Execute on VPS3 with its existing Playwright installation. Never submits checkout.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.VAGAS_URL;
const artifacts = process.env.VAGAS_ARTIFACTS;
let browser;
before(async () => {
  assert.ok(url, 'VAGAS_URL must point to the candidate or production page');
  if (artifacts) fs.mkdirSync(artifacts, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});
after(async () => browser?.close());

async function visit(t, width = 1440, reducedMotion = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught page errors'));
  await context.route('**/*', route => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin !== new URL(url).origin || request.method() !== 'GET') return route.abort();
    if (/site-tracking|\/api\//.test(target.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

test('CTA, social proof, bonuses and closing lists survive CSS parsing at all breakpoints', async t => {
  for (const width of [1440, 1024, 768, 390, 320]) await t.test(`${width}px`, async t => {
    const page = await visit(t, width);
    const result = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      const bounds = element => element.getBoundingClientRect().toJSON();
      return {
        width: innerWidth, pageWidth: document.documentElement.scrollWidth,
        ctas: [...document.querySelectorAll('main .btn, main .button')].map(element => ({
          text: element.textContent.trim(), color: getComputedStyle(element).color,
          background: getComputedStyle(element).backgroundColor, rect: bounds(element)
        })),
        missingCtas: [...document.querySelectorAll('main section[data-section]')]
          .filter(section => !section.querySelector('a.btn, a.button, #checkoutBtn')).map(section => section.id),
        avatars: [...document.querySelectorAll('.fava-imgs img')].map(bounds),
        proof: bounds(document.querySelector('.fava-pill')),
        bonusColumns: style('.offer-bonus-grid').gridTemplateColumns.split(' ').length,
        choiceColumns: style('.two-choices-grid').gridTemplateColumns.split(' ').length,
        summaryDisplay: style('.ps-summary-item').display,
        summaryList: style('.ps-summary-list').listStyleType,
        argumentDisplay: style('.if-all-list li').display,
        playColor: style('.vsl-play-icon').color,
        founderList: !!document.querySelector('.authority-copy ul'),
      };
    });
    if (artifacts) fs.writeFileSync(path.join(artifacts, `${width}-layout.json`), JSON.stringify(result, null, 2));
    for (const cta of result.ctas) {
      assert.equal(cta.background, 'rgb(212, 255, 83)', `${cta.text}: lime background`);
      assert.equal(cta.color, 'rgb(0, 0, 0)', `${cta.text}: black text`);
      assert.ok(cta.rect.height >= 48, `${cta.text}: usable button height`);
      assert.ok(cta.rect.left >= 0 && cta.rect.right <= width + 1, `${cta.text}: fits viewport`);
    }
    assert.ok(result.ctas.length >= 12, 'every content section has a CTA');
    assert.ok(result.pageWidth <= width, `horizontal overflow ${result.pageWidth} > ${width}`);
    assert.deepEqual(result.missingCtas, []);
    assert.ok(result.avatars.every(avatar => Math.abs(avatar.y - result.avatars[0].y) < 1), 'avatars form one horizontal row');
    assert.ok(result.proof.height < 100, 'social proof remains a compact badge');
    assert.equal(result.bonusColumns, width > 768 ? 2 : 1);
    assert.equal(result.choiceColumns, width > 768 ? 2 : 1);
    assert.equal(result.summaryDisplay, 'flex');
    assert.equal(result.summaryList, 'none');
    assert.equal(result.argumentDisplay, 'grid');
    assert.equal(result.playColor, 'rgb(255, 255, 255)');
    assert.ok(result.founderList, 'founder biography is scannable topics');
    if (artifacts && [1440, 390].includes(width)) {
      for (const selector of ['#inicio', '#como-funciona', '#imobiturbo-os', '#whatsapp', '#natan', '#assinatura', '.ps-closing-card']) {
        await page.locator(selector).screenshot({ path: path.join(artifacts, `${width}-${selector.replace(/[#.]/g, '')}.png`) });
      }
      await page.screenshot({ path: path.join(artifacts, `${width}-full.png`), fullPage: true });
    }
  });
});

test('player starts from zero, has smart progress, opens volume and hides controls after 2.5s', async t => {
  const page = await visit(t);
  await page.waitForFunction(() => document.querySelector('#vslVideo').readyState >= 2);
  await page.locator('#vslFacade').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#vslVolumeWrap').evaluate(node => getComputedStyle(node).opacity), '0');
  await page.locator('#vslOverlay').click();
  await page.waitForFunction(() => !document.querySelector('#vslVideo').paused);
  const start = await page.locator('#vslVideo').evaluate(video => ({ time: video.currentTime, muted: video.muted, loop: video.loop }));
  assert.ok(start.time < 2, 'click restarts at the beginning');
  assert.equal(start.muted, false);
  assert.equal(start.loop, false);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#vslSmartProgress')).opacity === '1');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#vslVolumeWrap')).opacity === '1');
  await page.locator('#vslVideo').evaluate(video => { video.currentTime = video.duration * .1; });
  await page.waitForFunction(() => parseFloat(document.querySelector('#vslProgressFill').style.width) > 30);
  const progress = await page.locator('#vslProgressFill').evaluate(node => parseFloat(node.style.width));
  assert.ok(progress < 55, `10% of duration has accelerated progress: ${progress}`);
  // Seeking/decoding may outlast the 2.5s reveal; another user click reveals it again.
  await page.locator('#vslVideo').click();
  await page.locator('#vslSoundBtn').click();
  assert.ok(await page.locator('#vslVolumeWrap').evaluate(node => node.classList.contains('is-open')));
  await page.waitForFunction(() => document.querySelector('#vslVolumeSlider').getBoundingClientRect().width >= 70);
  const slider = await page.locator('#vslVolumeSlider').boundingBox();
  await page.mouse.click(slider.x + 7 + (slider.width - 14) * .4, slider.y + slider.height / 2);
  assert.ok(Math.abs(await page.locator('#vslVideo').evaluate(video => video.volume) - .4) < .05);
  await page.waitForTimeout(2850);
  assert.equal(await page.locator('#vslVolumeWrap').evaluate(node => getComputedStyle(node).opacity), '0', 'hides even while mouse remains over the player');
  const wasPaused = await page.locator('#vslVideo').evaluate(video => video.paused);
  await page.locator('#vslVideo').click();
  assert.equal(await page.locator('#vslVideo').evaluate(video => video.paused), !wasPaused);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#vslVolumeWrap')).opacity === '1');
  await page.locator('#vslSmartProgress').click({ position: { x: 100, y: 3 } });
  assert.equal(await page.locator('#vslVideo').evaluate(video => video.paused), !wasPaused, 'seeking does not toggle playback');
});

test('CTA scroll targets and all plan checkout entries still work without sending customer data', async t => {
  const page = await visit(t, 390);
  await page.locator('#como-funciona .btn').click();
  await page.waitForFunction(() => location.hash === '#assinatura');
  for (const [plan, name] of [['anual', 'Plano Anual'], ['trimestral', 'Plano Trimestral'], ['mensal', 'Plano Mensal']]) {
    await page.locator(`label:has(input[name="plano"][value="${plan}"])`).click();
    assert.ok(await page.locator(`input[name="plano"][value="${plan}"]`).isChecked());
    await page.locator('#checkoutBtn').click();
    assert.equal(await page.locator('#chkModalPlanName').textContent(), name);
    assert.ok(await page.locator('#checkoutModalOverlay').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#checkoutModalOverlay').isVisible(), false);
  }
});

test('CTA pulse respects reduced motion', async t => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await visit(t, 1440, reducedMotion);
    const animation = await page.locator('.hero-cta-below .btn').evaluate(node => getComputedStyle(node).animationName);
    assert.equal(animation, reducedMotion === 'reduce' ? 'none' : 'ctaPulse');
  }
});
