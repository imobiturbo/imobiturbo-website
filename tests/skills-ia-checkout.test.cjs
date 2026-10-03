const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../skills-ia/low-ticket.js'), 'utf8');
const configured = JSON.parse(fs.readFileSync(path.join(__dirname, '../skills-ia/offer.json'), 'utf8'));

async function browser(offerConfig, { rejectConfig = false, hubReady = true, hostname = 'www.imobiturbo.com.br', trackingContext = false } = {}) {
  const navigation = [], meta = [], hub = [], timers = [];
  const status = { textContent: '', scrollIntoView() {} };
  const windowListeners = {}, docListeners = {};
  const buttons = ['essencial', 'completo'].map(plan => ({
    dataset: { plan }, attributes: {}, listeners: {}, disabled: false,
    innerHTML: 'Quero o plano', textContent: 'Quero o plano',
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
  }));
  const document = {
    cookie: trackingContext ? '_fbp=fb.1.123.browser; _fbc=fb.1.123.real-click; _rt_vid=visitor-original; _rt_sid=session-original' : '',
    querySelectorAll(selector) { return selector === '[data-plan]' ? buttons : []; },
    getElementById() { return status; },
    createElement() { return {}; }, head: { appendChild() {} },
    addEventListener(name, callback) { docListeners[name] = callback; },
    visibilityState: 'visible',
  };
  const location = {
    hostname, pathname: '/skills-ia/',
    href: 'https://www.imobiturbo.com.br/skills-ia/?utm_source=instagram&utm_campaign=skills%20teste&email=private%40example.test',
    assign(url) { navigation.push(url); },
  };
  const window = {
    localStorage: { getItem: key => trackingContext && key === '_rt_attr' ? JSON.stringify({ utms: { utm_content: 'Ad|123|', utm_id: '456' } }) : null },
    location, crypto: { randomUUID: () => 'test-event-id' },
    setInterval(callback) { timers.push(callback); return timers.length; },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    addEventListener(name, callback) { windowListeners[name] = callback; },
    fbq(...args) { meta.push(args); },
    HubTracker: {
      track(...args) { hub.push(args); return true; }, config() { return { enabled: hubReady }; },
      decorate(url) { const target = new URL(url); target.searchParams.set('rt_vid', 'visitor-test'); return target.href; },
    },
  };
  vm.runInNewContext(source, {
    document, window, location, crypto: window.crypto, URL,
    clearInterval() {},
    fetch: async () => { if (rejectConfig) throw new Error('offline'); return { ok: true, json: async () => offerConfig }; },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { buttons, navigation, meta, hub, status, timers, ready: () => { hubReady = true; }, windowListeners, docListeners };
}

const live = () => ({ ...configured, salesEnabled: true, fulfillmentStatus: 'ready', offers: {
  essencial: { name: 'Essencial', priceCents: 2790, checkoutUrl: 'https://pay.wiapy.com/test-essential' },
  completo: { name: 'Completo', priceCents: 3790, checkoutUrl: 'https://pay.wiapy.com/test-complete' },
} });

test('preview and disabled sales never navigate or report a started payment', async () => {
  for (const config of [{ ...live(), salesEnabled: false }]) {
    const page = await browser(config);
    page.buttons.forEach(button => button.listeners.click());
    assert.equal(page.navigation.length, 0);
    assert.equal(page.meta.length, 0);
    assert.ok(page.buttons.every(button => button.attributes['aria-disabled'] === 'true'));
  }
});

test('a failed configuration request keeps both prices unpayable', async () => {
  const page = await browser(null, { rejectConfig: true });
  page.buttons[1].listeners.click();
  assert.equal(page.navigation.length, 0);
  assert.equal(page.meta.length, 0);
});

test('each ready offer keeps the correct amount, destination and attribution without buyer data', async () => {
  for (const [index, plan, amount, destination] of [[0, 'essencial', 27.9, '/test-essential'], [1, 'completo', 37.9, '/test-complete']]) {
    const page = await browser(live());
    page.buttons[index].listeners.click();
    assert.equal(page.navigation.length, 1);
    const url = new URL(page.navigation[0]);
    assert.equal(url.hostname, 'pay.wiapy.com'); assert.equal(url.pathname, destination);
    assert.equal(url.searchParams.get('offer_code'), plan);
    assert.equal(url.searchParams.get('product_id'), 'skills-ia-corretor');
    assert.equal(url.searchParams.get('plan'), 'avulso');
    assert.equal(url.searchParams.get('utm_campaign'), 'skills teste');
    assert.equal(url.searchParams.get('rt_vid'), 'visitor-test');
    assert.equal(url.searchParams.has('email'), false);
    assert.equal(page.meta.length, 1);
    assert.equal(page.meta[0][2], 'InitiateCheckout'); assert.equal(page.meta[0][3].value, amount);
    assert.equal(page.meta[0][4].eventID, 'test-event-id');
    assert.equal(page.hub.filter(event => event[0] === 'InitiateCheckout').length, 0);
    assert.equal(page.meta.some(event => event[2] === 'Purchase'), false);
  }
});

test('an invalid or lookalike checkout host fails closed', async () => {
  for (const checkoutUrl of ['javascript:alert(1)', 'https://pay.wiapy.com.attacker.test/pay', 'http://pay.wiapy.com/pay', null]) {
    const config = live(); config.offers.completo.checkoutUrl = checkoutUrl;
    const page = await browser(config); page.buttons[1].listeners.click();
    assert.equal(page.navigation.length, 0); assert.equal(page.meta.length, 0);
  }
});

test('Hub owns initialization and PageView; product ViewContent is sent once', async () => {
  const page = await browser(configured);
  page.timers[0](); page.timers[0]();
  assert.equal(page.meta.filter(event => event[0] === 'init').length, 0);
  assert.deepEqual(page.meta.filter(event => event[0] === 'trackSingle').map(event => event[2]), ['ViewContent']);
});


test('a slow Hub never triggers a fallback PageView and recovers with one ViewContent', async () => {
  const page = await browser(configured, { hubReady: false });
  for (let i = 0; i < 25; i++) page.timers[0]();
  assert.equal(page.meta.length, 0);
  page.ready(); page.timers[0](); page.timers[0]();
  assert.deepEqual(page.meta.map(event => event[2]), ['ViewContent']);
});

test('the apex production host also sends product events through the configured Hub pixel', async () => {
  const page = await browser(configured, { hostname: 'imobiturbo.com.br' });
  page.timers[0]();
  assert.deepEqual(page.meta.map(event => event[2]), ['ViewContent']);
  assert.equal(page.meta[0][1], '1025303472485246');
});


test('clicking checkout disables button, but pageshow or timeout restores it so user can click again after returning', async () => {
  const page = await browser(live());
  const btn = page.buttons[0];
  const initialHtml = btn.innerHTML;

  // First click: triggers navigation, disables button, shows loading state
  btn.listeners.click();
  assert.equal(page.navigation.length, 1);
  assert.equal(btn.disabled, true);
  assert.equal(btn.textContent, 'Abrindo pagamento…');

  // User returns to the page (pageshow event fires via browser back or bfcache)
  assert.ok(typeof page.windowListeners.pageshow === 'function', 'pageshow listener must be attached');
  page.windowListeners.pageshow();

  // Button is restored and enabled again
  assert.equal(btn.disabled, false);
  assert.equal(btn.innerHTML, initialHtml);

  // User clicks again: checkout works again!
  btn.listeners.click();
  assert.equal(page.navigation.length, 2);
  assert.equal(btn.disabled, true);
  assert.equal(btn.textContent, 'Abrindo pagamento…');

  // Also test visibilitychange restoration
  assert.ok(typeof page.docListeners.visibilitychange === 'function', 'visibilitychange listener must be attached');
  page.docListeners.visibilitychange();
  assert.equal(btn.disabled, false);
  assert.equal(btn.innerHTML, initialHtml);
});

test('Wiapy navigation preserves real Facebook cookies and original identity without contact PII', async () => {
  const page = await browser(live(), { trackingContext: true });
  page.buttons[0].listeners.click();
  const url = new URL(page.navigation[0]);
  assert.equal(url.searchParams.get('fbc'), 'fb.1.123.real-click');
  assert.equal(url.searchParams.get('fbp'), 'fb.1.123.browser');
  assert.equal(url.searchParams.get('visitorId'), 'visitor-original');
  assert.equal(url.searchParams.get('sessionId'), 'session-original');
  assert.equal(url.searchParams.get('utm_content'), 'Ad|123|');
  assert.equal(url.searchParams.get('utm_campaign'), 'skills teste');
  assert.equal(url.searchParams.has('email'), false);
  assert.equal(page.hub.some(([name]) => name.toLowerCase() === 'lead'), false);
});
