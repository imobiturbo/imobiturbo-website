const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../bf-imobiliaria26/js/low-ticket.js'), 'utf8');

async function browser(config, fail = false) {
  const meta = [], navigation = [], timers = [], listeners = {};
  const buttons = ['essencial', 'completo'].map(plan => ({
    dataset: { plan }, innerHTML: 'Comprar', disabled: false, handlers: {},
    setAttribute() {}, removeAttribute() {}, addEventListener(name, callback) { this.handlers[name] = callback; }
  }));
  const status = { textContent: '', scrollIntoView() {} };
  const document = {
    querySelectorAll: selector => selector === '[data-plan]' ? buttons : [],
    getElementById: () => status,
    addEventListener() {}, visibilityState: 'visible'
  };
  const location = {
    hostname: 'www.imobiturbo.com.br', pathname: '/bf-imobiliaria26/',
    href: 'https://www.imobiturbo.com.br/bf-imobiliaria26/?utm_source=instagram&email=private%40example.test',
    assign: url => navigation.push(url)
  };
  const window = {
    crypto: { randomUUID: () => 'event-id' }, location,
    fbq: (...args) => meta.push(args),
    setInterval: callback => timers.push(callback), setTimeout() {},
    addEventListener: (name, callback) => { listeners[name] = callback; },
    HubTracker: { config: () => ({ enabled: true }), track: () => true, decorate: url => url }
  };
  vm.runInNewContext(source, { window, document, location, crypto: window.crypto, URL, clearInterval() {},
    fetch: async () => { if (fail) throw Error('offline'); return { ok: true, json: async () => config }; }
  });
  timers[0]();
  assert.equal(meta.length, 0, 'no product event before its configuration arrives');
  await new Promise(resolve => setImmediate(resolve));
  return { meta, navigation, timers, buttons, listeners, status };
}

const offer = (productId, title, cents) => ({ productId, title, pixelId: '1025303472485246', salesEnabled: true,
  offers: { essencial: { name: 'Essencial', priceCents: cents[0], checkoutUrl: 'https://pay.wiapy.com/essential' },
    completo: { name: 'Completo', priceCents: cents[1], checkoutUrl: 'https://pay.wiapy.com/complete' } }
});

test('each product reports its own name, price and checkout while keeping buyer data out of attribution', async () => {
  for (const config of [offer('black-friday-imobiliaria-2026', 'Black Friday', [3790, 4790]), offer('maquina-de-prospeccao', 'Máquina de Prospecção', [2700, 3700])]) {
    const page = await browser(config);
    page.timers[0](); page.timers[0]();
    assert.equal(page.meta.length, 1);
    assert.equal(page.meta[0][3].content_name, config.title);
    assert.equal(page.meta[0][3].content_ids[0], config.productId);
    assert.equal(page.meta[0][3].value, config.offers.essencial.priceCents / 100);
    for (const [i, plan] of [[0, 'essencial'], [1, 'completo']]) {
      page.buttons[i].handlers.click();
      const event = page.meta.at(-1);
      assert.equal(event[2], 'InitiateCheckout');
      assert.equal(event[3].value, config.offers[plan].priceCents / 100);
      assert.equal(event[3].product_id, config.productId);
      const url = new URL(page.navigation.at(-1));
      assert.equal(url.searchParams.get('product_id'), config.productId);
      assert.equal(url.searchParams.get('offer_code'), plan);
      assert.equal(url.searchParams.get('utm_source'), 'instagram');
      assert.equal(url.searchParams.has('email'), false);
    }
    page.listeners.pageshow();
    assert.equal(page.buttons.some(button => button.disabled), false);
    assert.equal(page.meta.some(event => event[2] === 'Purchase'), false);
  }
});

test('failed or disabled configuration remains unavailable after returning to the page', async () => {
  for (const [config, fail] of [[null, true], [{ ...offer('bf', 'BF', [3790,4790]), salesEnabled: false }, false]]) {
    const page = await browser(config, fail);
    page.listeners.pageshow();
    page.buttons.forEach(button => button.handlers.click());
    assert.equal(page.navigation.length, 0);
    assert.equal(page.buttons.every(button => button.disabled), true);
    assert.equal(page.meta.length, 0);
  }
});

test('invalid prices, protocols and lookalike checkout hosts cannot receive a buyer', async () => {
  for (const [checkoutUrl, priceCents] of [['http://pay.wiapy.com/pay',3790],['https://pay.wiapy.com.attacker.test/pay',3790],['javascript:alert(1)',3790],['https://pay.wiapy.com/pay',0],['https://pay.wiapy.com/pay',37.9]]) {
    const config = offer('bf','BF',[3790,4790]);
    config.offers.essencial = { name:'Essencial',checkoutUrl,priceCents };
    const page = await browser(config);
    page.buttons[0].handlers.click();
    assert.equal(page.navigation.length, 0);
    assert.equal(page.buttons[0].disabled, true);
  }
});
