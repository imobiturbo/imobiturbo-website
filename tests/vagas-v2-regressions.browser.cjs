// Execute on VPS3 with its existing Playwright installation. Never submits checkout.
// The candidate server must support HTTP byte ranges for real MP4 seeking.
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

async function visit(t, width = 1440, reducedMotion = 'reduce', options = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion, ...options });
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

test('preview notice stays at the top right until click and the cursor visibly enters and leaves', async t => {
  const page = await visit(t, 390, 'no-preference');
  const notice = page.locator('.vsl-autoplay-notice');
  assert.equal(await notice.innerText(), 'Seu vídeo começou\nClique para ouvir');
  const player = await page.locator('#vslFacade').boundingBox();
  const badge = await notice.boundingBox();
  assert.ok(badge.x > player.x + player.width / 2 && badge.x + badge.width < player.x + player.width);
  assert.ok(badge.y >= player.y && badge.y < player.y + 25);
  if (artifacts) await page.locator('#vslFacade').screenshot({ path: path.join(artifacts, 'player-preview-mobile.png'), animations: 'allow' });
  const frames = await page.locator('.vsl-mouse-anim').evaluate(node => {
    const animation = node.getAnimations()[0];
    animation.pause();
    return [0, 1000, 2799].map(time => {
      animation.currentTime = time;
      const style = getComputedStyle(node);
      return { x: new DOMMatrixReadOnly(style.transform).m41, opacity: +style.opacity };
    });
  });
  assert.ok(frames[0].x - frames[1].x >= 70, 'cursor has a visible outward/inward journey');
  assert.ok(frames[0].opacity < .1 && frames[1].opacity > .9 && frames[2].opacity < .1);
  await page.locator('#vslOverlay').click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.vsl-autoplay-notice')).visibility === 'hidden');
});

test('player preview keeps animating when reduced motion is requested', async t => {
  const page = await visit(t, 390, 'reduce');
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  const sample = () => page.evaluate(() =>
    ['.vsl-play-btn-circle', '.vsl-mouse-anim', '.vsl-ripple-ring', '.vsl-click-sparks'].map(selector => {
      const animation = document.querySelector(selector).getAnimations()[0];
      return { selector, state: animation?.playState, time: animation?.currentTime };
    })
  );
  const before = await sample();
  for (const animation of before) assert.equal(animation.state, 'running', `${animation.selector} stays animated`);
  await page.waitForTimeout(350);
  const after = await sample();
  for (let i = 0; i < after.length; i++) assert.ok(after[i].time > before[i].time + 100, `${after[i].selector} actually advances`);
  assert.equal(await page.locator('.hero-cta-below .btn').evaluate(node => getComputedStyle(node).animationName), 'none', 'the exception is limited to the player');
  await page.locator('#vslOverlay').click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#vslOverlay')).visibility === 'hidden');
});

test('desktop fullscreen keeps playback, separates sound controls, and restores the inline player on exit', async t => {
  const page = await visit(t);
  await page.locator('#vslOverlay').click();
  await page.waitForFunction(() => !document.querySelector('#vslVideo').paused);
  const sound = await page.locator('#vslVolumeWrap').boundingBox();
  const fullscreen = await page.locator('#vslFullscreenBtn').boundingBox();
  assert.ok(sound.x + sound.width < fullscreen.x, 'volume is left of fullscreen');
  assert.ok(fullscreen.width >= 44 && fullscreen.height >= 44);
  await page.locator('#vslFullscreenBtn').click();
  await page.waitForFunction(() => document.fullscreenElement?.id === 'vslFacade');
  assert.equal(await page.locator('#vslFullscreenBtn').getAttribute('aria-label'), 'Sair da tela cheia');
  assert.equal(await page.locator('#vslVideo').evaluate(video => video.paused), false);
  assert.equal(await page.locator('.vsl-stage').evaluate(node => getComputedStyle(node).transform), 'none');
  if (artifacts) await page.screenshot({ path: path.join(artifacts, 'player-fullscreen-desktop.png') });
  await page.waitForTimeout(2850);
  assert.equal(await page.locator('#vslFullscreenBtn').evaluate(node => getComputedStyle(node).opacity), '0');
  await page.mouse.move(300, 300);
  await page.locator('#vslFullscreenBtn').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.equal(await page.locator('#vslFullscreenBtn').getAttribute('aria-pressed'), 'false');
  assert.ok((await page.locator('#vslFacade').boundingBox()).width <= 740);
});

test('mobile fullscreen remains landscape when orientation lock is unavailable and rotated seeking works', async t => {
  const page = await visit(t, 390, 'reduce', { isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  await page.evaluate(() => {
    window.orientationRequests = [];
    Object.defineProperty(screen.orientation, 'lock', { configurable: true, value: async mode => {
      window.orientationRequests.push(mode);
      throw new DOMException('Lock unavailable in this browser', 'NotSupportedError');
    } });
  });
  await page.locator('#vslOverlay').tap();
  await page.waitForFunction(() => document.querySelector('#vslVideo').readyState >= 2);
  // Reveal controls again if media loading lasted longer than the reveal window.
  await page.locator('#vslVideo').tap();
  await page.locator('#vslFullscreenBtn').tap();
  await page.waitForFunction(() => document.fullscreenElement?.id === 'vslFacade');
  assert.deepEqual(await page.evaluate(() => window.orientationRequests), ['landscape']);
  const transform = await page.locator('.vsl-stage').evaluate(node => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return { a: matrix.a, b: matrix.b, width: node.clientWidth, height: node.clientHeight };
  });
  assert.equal(transform.a, 0);
  assert.equal(transform.b, 1, 'portrait device rotates the stage 90 degrees');
  assert.ok(transform.width > transform.height, 'video and controls use a landscape stage');
  await page.locator('#vslVideo').evaluate(video => video.pause());
  const progress = await page.locator('#vslSmartProgress').boundingBox();
  await page.touchscreen.tap(progress.x + progress.width / 2, progress.y + progress.height * .5);
  await page.waitForFunction(() => {
    const video = document.querySelector('#vslVideo');
    return Math.abs(video.currentTime / video.duration - Math.pow(.5, 1 / .42)) < .02;
  });
  const ratio = await page.locator('#vslVideo').evaluate(video => video.currentTime / video.duration);
  assert.ok(Math.abs(ratio - Math.pow(.5, 1 / .42)) < .02, 'rotated seek follows the visible bar');
  if (artifacts) await page.screenshot({ path: path.join(artifacts, 'player-fullscreen-mobile.png') });
  // A native exit, such as the browser back button, must restore the inline layout too.
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => !document.querySelector('#vslFacade').classList.contains('is-mobile-fullscreen'));
  assert.equal(await page.locator('.vsl-stage').evaluate(node => getComputedStyle(node).transform), 'none');
});

test('rejected fullscreen leaves the player usable without an unhandled rejection', async t => {
  const page = await visit(t);
  await page.evaluate(() => {
    document.querySelector('#vslFacade').requestFullscreen = () => Promise.reject(new TypeError('Fullscreen denied'));
  });
  await page.locator('#vslOverlay').click();
  await page.locator('#vslFullscreenBtn').click();
  await page.waitForFunction(() => document.querySelector('#vslFullscreenStatus').textContent.length > 0);
  assert.equal(await page.evaluate(() => document.fullscreenElement), null);
  assert.equal(await page.locator('#vslFullscreenBtn').getAttribute('aria-pressed'), 'false');
  await page.locator('#vslVideo').click();
  assert.equal(await page.locator('#vslVideo').evaluate(video => video.paused), true);
});
