const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../skills-ia/low-ticket.js'), 'utf8');
const configured = JSON.parse(fs.readFileSync(path.join(__dirname, '../skills-ia/offer.json'), 'utf8'));

async function browser(offerConfig, { rejectConfig = false } = {}) {
  const navigation = [], meta = [], hub = [], timers = [];
  const status = { textContent: '', scrollIntoView() {} };
  const buttons = ['essencial', 'completo'].map(plan => ({
    dataset: { plan }, attributes: {}, listeners: {}, disabled: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
  }));
  const document = {
    querySelectorAll(selector) { return selector === '[data-plan]' ? buttons : []; },
    getElementById() { return status; },
    createElement() { return {}; }, head: { appendChild() {} },
  };
  const location = {
    hostname: 'www.imobiturbo.com.br', pathname: '/skills-ia/',
    href: 'https://www.imobiturbo.com.br/skills-ia/?utm_source=instagram&utm_campaign=skills%20teste&email=private%40example.test',
    assign(url) { navigation.push(url); },
  };
  const window = {
    location, crypto: { randomUUID: () => 'test-event-id' },
    setInterval(callback) { timers.push(callback); return timers.length; },
    fbq(...args) { meta.push(args); },
    HubTracker: {
      track(...args) { hub.push(args); return true; }, config() { return { enabled: true }; },
      decorate(url) { const target = new URL(url); target.searchParams.set('rt_vid', 'visitor-test'); return target.href; },
    },
  };
  vm.runInNewContext(source, {
    document, window, location, crypto: window.crypto, URL,
    clearInterval() {},
    fetch: async () => { if (rejectConfig) throw new Error('offline'); return { ok: true, json: async () => offerConfig }; },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { buttons, navigation, meta, hub, status, timers };
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

test('pixel initializes once and carries the product, never a simulated purchase', async () => {
  const page = await browser(configured);
  page.timers[0](); page.timers[0]();
  assert.equal(page.meta.filter(event => event[0] === 'init').length, 1);
  assert.deepEqual(page.meta.filter(event => event[0] === 'trackSingle').map(event => event[2]), ['PageView', 'ViewContent']);
});
