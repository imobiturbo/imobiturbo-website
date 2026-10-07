// VPS3 browser/HTTP receiver test. Synthetic contacts; external traffic blocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.env.VAGAS_ROOT || path.join(__dirname, '..'));
for (const width of [1440, 390]) test(`LP ${width}px sends a distinct checkout milestone after contact capture`, async t => {
  const received = [];
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/api/lead') {
      let body = ''; for await (const chunk of req) body += chunk;
      received.push(JSON.parse(body));
      res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ ok: true, lead_id: 'synthetic-local-only' }));
    }
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const origin = `http://127.0.0.1:${server.address().port}`, errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(() => { window.HubTracker = Object.fromEntries(['track','lead','initiateCheckout','purchase'].map(k => [k, () => {}])); });
  await page.goto(origin + '/vagas/');
  await page.locator('#checkoutBtn').click();
  await page.locator('#chkName').fill('Teste Recuperacao'); await page.locator('#chkStep1Btn').click();
  await page.locator('#chkPhone').fill('11963824751'); await page.locator('#chkStep2Btn').click();
  await page.locator('#chkEmail').fill('recovery@example.invalid');
  // Allow the contact receipt to arrive before opening the payment step.
  for (let i=0; i<25 && !received.length; i++) await page.waitForTimeout(100);
  assert.ok(received.some(p => !p.checkout_stage), 'contact is persisted before payment step');
  await page.locator('#chkStep3Btn').click();
  for (let i=0; i<25 && !received.some(p => p.checkout_stage); i++) await page.waitForTimeout(100);
  assert.ok(await page.locator('#chkStepPane4').isVisible());
  assert.equal(received.filter(p => p.checkout_stage === 'CREDIT_CARD').length, 1);
  assert.match(received.find(p => p.checkout_stage).checkout_id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(errors, []);
});
