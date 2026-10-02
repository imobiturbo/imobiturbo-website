// Execute only on VPS3. No checkout interaction or synthetic media.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.VAGAS_ROOT || path.join(__dirname, '..'));
const artifacts = path.resolve(process.env.VAGAS_ARTIFACTS || '/tmp/vagas-vsl-evidence');
const evidence = [];
let browser, server, baseURL;

before(async () => {
  assert.equal(os.hostname().split('.')[0], 'vmi3482766', 'browser validation runs exclusively on VPS3');
  fs.mkdirSync(artifacts, { recursive: true });
  if (process.env.VAGAS_URL) baseURL = process.env.VAGAS_URL;
  else {
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webm': 'video/webm', '.mp4': 'video/mp4' };
    server = http.createServer((request, response) => {
      if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
      let pathname;
      try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
      catch { return response.writeHead(400).end(); }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
      const size = fs.statSync(file).size;
      const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      let start = 0, end = size - 1;
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      response.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        start = Number(range[1]);
        end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start > end || start >= size) return response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
        response.statusCode = 206;
        response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      }
      response.setHeader('Content-Length', end - start + 1);
      if (request.method === 'HEAD') return response.end();
      const stream = fs.createReadStream(file, { start, end });
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}/vagas/`;
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
});

after(async () => {
  if (fs.existsSync(artifacts)) fs.writeFileSync(path.join(artifacts, 'vsl-measurements.json'), JSON.stringify(evidence, null, 2));
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function record(page, width, state) {
  const media = await page.locator('#vslVideo, #vslRetentionVideo').evaluateAll(nodes => nodes.map(node => ({
    id: node.id, currentSrc: node.currentSrc, videoWidth: node.videoWidth, videoHeight: node.videoHeight,
    currentTime: node.currentTime, duration: node.duration, muted: node.muted, loop: node.loop, paused: node.paused,
    readyState: node.readyState, decodedFrames: node.getVideoPlaybackQuality().totalVideoFrames,
  })));
  const images = await page.locator('#vslFacade img').evaluateAll(nodes => nodes.map(node => ({
    src: node.currentSrc, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
  })));
  evidence.push({ width, state, media, images });
  await page.locator('#vslFacade').screenshot({ path: path.join(artifacts, `${width}-vsl-${state}.png`) });
}

for (const width of [390, 1440]) test(`original VSL preview, pause artwork and controls at ${width}px`, { timeout: 120000 }, async t => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  t.after(() => context.close());
  const mediaRequests = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    // Block SDKs, tracking and APIs even when hosted on the page's own origin.
    if (/\/api\/|site-tracking|tracker|tracking|(?:^|[\/.-])sdk(?:[\/.-]|$)/i.test(url.pathname)) return route.abort();
    const original = url.origin === 'https://vsl.imobiturbo.com.br' && /^\/imobiturbo-vagas-(vertical|horizontal)-reels-sound-v5\.mp4$/.test(url.pathname);
    if (original) mediaRequests.push({ url: request.url(), range: request.headers().range || null });
    if (original || url.origin === new URL(baseURL).origin) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const video = document.getElementById('vslVideo');
    return video && !video.paused && video.currentTime > 2 && video.videoWidth > 0 && video.getVideoPlaybackQuality().totalVideoFrames > 0;
  }, null, { timeout: 60000 });
  const preview = await page.locator('#vslVideo').evaluate(node => ({ src: node.currentSrc, muted: node.muted, loop: node.loop, width: node.videoWidth, height: node.videoHeight }));
  assert.equal(preview.src, `https://vsl.imobiturbo.com.br/imobiturbo-vagas-${width === 390 ? 'vertical' : 'horizontal'}-reels-sound-v5.mp4`);
  assert.equal(preview.muted, true);
  assert.equal(preview.loop, true);
  assert.ok(width === 390 ? preview.height > preview.width : preview.width > preview.height);
  assert.equal(await page.locator('#vslOverlay').isVisible(), false);
  await page.evaluate(async () => { await document.fonts.ready; scrollTo(0, 0); });
  await page.screenshot({ path: path.join(artifacts, `${width}-hero.png`) });
  await record(page, width, 'preview');
  await page.locator('#vslInitialOverlay').click();
  await page.waitForFunction(() => {
    const video = document.getElementById('vslVideo');
    return !video.paused && !video.muted && !video.loop && video.currentTime < 2;
  });
  assert.equal(await page.locator('#vslInitialOverlay').isVisible(), false);
  await record(page, width, 'started');
  // The facade is the real pause/resume control, including its keyboard handler.
  await page.locator('#vslFacade').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.getElementById('vslVideo').paused && !document.getElementById('vslOverlay').classList.contains('vsl-hidden'));
  await page.waitForFunction(() => {
    const video = document.getElementById('vslRetentionVideo');
    return !video.paused && video.videoWidth > 0 && video.getVideoPlaybackQuality().totalVideoFrames > 0;
  });
  assert.equal(await page.locator('#vslOverlay').isVisible(), true);
  assert.match(await page.locator('#vslRetentionVideo').evaluate(node => node.currentSrc), new RegExp(`vsl-thumbsniper-${width === 390 ? 'mobile' : 'desktop'}-ai-v2\\.webm$`));
  await record(page, width, 'paused');
  const pausedAt = await page.locator('#vslVideo').evaluate(node => node.currentTime);
  await page.locator('#vslOverlay').click();
  await page.waitForFunction(() => !document.getElementById('vslVideo').paused && document.getElementById('vslOverlay').classList.contains('vsl-hidden'));
  assert.ok(await page.locator('#vslVideo').evaluate((node, time) => node.currentTime >= time, pausedAt), 'resume preserves watch position');
  assert.equal(await page.locator('#vslRetentionVideo').evaluate(node => node.paused), true);
  await page.locator('#vslSoundBtn').click();
  const slider = page.locator('#vslVolumeSlider');
  await slider.focus();
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.getElementById('vslVideo').muted && document.getElementById('vslVideo').volume === 0);
  await page.keyboard.press('End');
  await page.waitForFunction(() => !document.getElementById('vslVideo').muted && document.getElementById('vslVideo').volume === 1);
  await page.locator('#vslSoundBtn').click();
  await page.waitForFunction(() => document.getElementById('vslVideo').muted);
  await page.locator('#vslSoundBtn').click();
  await page.waitForFunction(() => !document.getElementById('vslVideo').muted);
  await record(page, width, 'resumed');
  evidence.push({ width, mediaRequests });
});
