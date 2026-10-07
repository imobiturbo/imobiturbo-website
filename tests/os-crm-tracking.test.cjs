const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const offer = require('../os-crm/v2/offer.js');
const source = fs.readFileSync(path.join(__dirname, '../os-crm/v2/tracking.js'), 'utf8');

function browser(checkout = false) {
  const origin = 'https://os-crm-imobiturbo.imobiturbo-website.pages.dev';
  const location = new URL(origin + '/os-crm/v2/' + (checkout ? 'assinatura/?plan=scale&cycle=monthly&imt_audit=1' : '?utm_source=meta&imt_audit=1'));
  const handlers = {};
  const timers = [];
  const received = [];
  let enabled = false;
  const link = { href: origin + '/os-crm/v2/assinatura/?plan=annual&cycle=annual' };
  const window = { OSOffer: {...offer, checkoutURL: (plan, cycle) => offer.checkoutURL(plan, cycle, location.search)},
    setTimeout: fn => {timers.push(fn);return timers.length;},
    HubTracker: {track: (name, properties) => {if (!enabled) return false;received.push({name, properties});return true;}} };
  const document = {
    querySelectorAll: () => [link],
    querySelector: () => ({addEventListener: (name, fn) => {handlers['tracker-' + name] = fn;}}),
    addEventListener: (name, fn) => {handlers[name] = fn;},
  };
  vm.runInNewContext(source, {window, document, location, URL});
  return {link, handlers, received, enable: () => {enabled = true;}, flush: () => {const timer=timers.shift();if(timer)timer();},
    click: (target) => handlers.click({target}), change: () => handlers.change({target:{matches: () => true}})};
}

test('links estáticos de plano preservam UTMs e a flag de auditoria', () => {
  const b = browser();
  const url = new URL(b.link.href, 'https://example.com');
  assert.deepEqual(offer.checkoutSelection(url.href), {plan:'annual',cycle:'annual'});
  assert.equal(url.searchParams.get('utm_source'), 'meta');
  assert.equal(url.searchParams.get('imt_audit'), '1');
});

test('visita à assinatura aguarda o tracker e não duplica o evento após carregar', () => {
  const b = browser(true);
  assert.equal(b.received.length, 0);
  b.enable();b.flush();b.handlers['tracker-load']();
  assert.deepEqual(b.received.map(e => [e.name, e.properties.productId]), [['subscription_view','imobiturbo-os:ilimitado:monthly']]);
});

test('seleção e WhatsApp são eventos de intenção, sem conversão financeira', () => {
  const b = browser(true);b.enable();b.flush();b.change();
  const anchor = {href:'https://wa.me/5521969516183?text=Teste'};
  b.click({closest: selector => selector === 'a[href]' ? anchor : null});
  b.click({closest: selector => selector === '[data-cycle]' ? {dataset:{cycle:'annual'}} : null});
  assert.deepEqual(b.received.map(e => e.name), ['subscription_view','select_plan','cta_click','select_cycle']);
  assert.equal(b.received.at(-1).properties.productId, 'imobiturbo-os:ilimitado:annual');
  assert.equal(b.received.some(e => /purchase|lead|initiatecheckout/i.test(e.name)), false);
});

test('um clique de plano antes da configuração é enviado uma única vez ao tracker pronto', () => {
  const b = browser();
  const anchor = {href:b.link.href};
  b.click({closest: selector => selector === 'a[href]' ? anchor : null});
  assert.equal(b.received.length, 0);b.enable();b.flush();b.handlers['tracker-load']();
  assert.deepEqual(b.received.map(e => [e.name, e.properties.productId]), [['select_plan','imobiturbo-os:ilimitado:annual']]);
});
