const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../skills-ia/presentation.js'), 'utf8');

function banner(instant) {
  let now = new Date(instant);
  const target = { hidden: true };
  const timers = [], listeners = {};
  const document = {
    hidden: false,
    querySelector: () => target,
    querySelectorAll: () => [],
    addEventListener: (name, fn) => { listeners[name] = fn; },
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  vm.runInNewContext(source, {
    document, Intl, Date: Clock,
    window: { setInterval: fn => timers.push(fn) },
  });
  return { target, timers, listeners, document, moveTo: value => { now = new Date(value); } };
}

test('the offer date follows Brasilia even when UTC is already the next day', () => {
  const page = banner('2026-09-30T02:59:59Z');
  assert.equal(page.target.textContent, '29/09/2026');
  assert.equal(page.target.dateTime, '2026-09-29');
  assert.equal(page.target.hidden, false);
});

test('the visible date rolls over at Brasilia midnight without a reload', () => {
  const page = banner('2026-09-30T02:59:59Z');
  page.moveTo('2026-09-30T03:00:00Z');
  page.timers[0]();
  assert.equal(page.target.textContent, '30/09/2026');
  assert.equal(page.target.dateTime, '2026-09-30');
});

test('a returning tab refreshes its date after sleeping across a month boundary', () => {
  const page = banner('2026-10-01T02:59:59Z');
  page.moveTo('2026-10-01T03:00:01Z');
  page.listeners.visibilitychange();
  assert.equal(page.target.textContent, '01/10/2026');
  assert.equal(page.target.dateTime, '2026-10-01');
});
