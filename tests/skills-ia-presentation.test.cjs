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
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, classList: { add: () => {} } }),
    body: { appendChild: () => {} },
  };
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  vm.runInNewContext(source, {
    document, Intl, Date: Clock,
    window: { setInterval: fn => timers.push(fn), addEventListener: () => {} },
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

test('steps use numbered badges without absolute step-icons or dead rum scripts', () => {
  const html = fs.readFileSync(path.join(__dirname, '../skills-ia/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../skills-ia/low-ticket.css'), 'utf8');
  assert.equal(html.includes('class="step-icon"'), false, 'index.html must not use step-icon wrapper');
  assert.equal(html.includes('rum-v2.min.js'), false, 'index.html must not load blocked rum-v2 script');
  assert.match(html, /<ol class="steps"><li><span>1<\/span>/, 'steps must start with numbered badge 1');
  assert.match(html, /<li><span>4<\/span><h3>Revise e use<\/h3>/, 'step 4 must be numbered badge 4');
  assert.equal(css.includes('.steps>li>.step-icon'), false, 'low-ticket.css must not have absolute step-icon rule');
});

