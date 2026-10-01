const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const htmlSource = fs.readFileSync(path.join(__dirname, '../skills-ia/index.html'), 'utf8');
const jsSource = fs.readFileSync(path.join(__dirname, '../skills-ia/low-ticket.js'), 'utf8');

test('HTML contract: mobile-offer starts with hidden attribute so it never flashes in the hero', () => {
  const match = htmlSource.match(/<aside class="mobile-offer"[^>]*>/);
  assert.ok(match, 'mobile-offer element must exist');
  assert.match(match[0], /\bhidden\b/, 'mobile-offer element must have the hidden attribute in static HTML');
});

test('IntersectionObserver visibility: sticky footer is hidden on hero, visible after hero, hidden on plans, and hidden again if scrolling back to hero', () => {
  const stickyElement = { hidden: true };
  const heroElement = { className: 'hero' };
  const plansElement = { id: 'planos' };

  let heroCallback = null;
  let plansCallback = null;
  const observedTargets = [];

  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      observedTargets.push(target);
      if (target === heroElement) heroCallback = this.callback;
      if (target === plansElement) plansCallback = this.callback;
    }
  }

  const document = {
    querySelector: (selector) => {
      if (selector === '.mobile-offer') return stickyElement;
      if (selector === '.hero') return heroElement;
      return null;
    },
    querySelectorAll: () => [],
    getElementById: (id) => (id === 'planos' ? plansElement : null),
  };

  const window = {
    location: { hostname: 'www.imobiturbo.com.br', pathname: '/skills-ia/', href: 'https://www.imobiturbo.com.br/skills-ia/' },
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: MockIntersectionObserver,
    addEventListener: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
  };

  vm.runInNewContext(jsSource, {
    document,
    window,
    location: window.location,
    crypto: { randomUUID: () => 'uuid' },
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
  });

  assert.ok(heroCallback, 'hero section must be observed');
  assert.ok(plansCallback, 'plans section must be observed');

  // Step 1: Initial load on hero (hero is intersecting, plans is not)
  heroCallback([{ target: heroElement, isIntersecting: true }]);
  plansCallback([{ target: plansElement, isIntersecting: false }]);
  assert.equal(stickyElement.hidden, true, 'footer MUST be hidden when hero is in view');

  // Step 2: User scrolls down past hero into showcase/gallery
  heroCallback([{ target: heroElement, isIntersecting: false }]);
  assert.equal(stickyElement.hidden, false, 'footer MUST appear only after hero is scrolled past');

  // Step 3: User scrolls down to the plans/kits section
  plansCallback([{ target: plansElement, isIntersecting: true }]);
  assert.equal(stickyElement.hidden, true, 'footer MUST hide when viewing plans section');

  // Step 4: User scrolls past plans section into FAQ or closing
  plansCallback([{ target: plansElement, isIntersecting: false }]);
  assert.equal(stickyElement.hidden, false, 'footer MUST reappear when scrolling past plans');

  // Step 5: User scrolls all the way back up into the hero
  heroCallback([{ target: heroElement, isIntersecting: true }]);
  assert.equal(stickyElement.hidden, true, 'footer MUST hide again when hero re-enters the viewport');
});

test('Fallback scroll visibility: without IntersectionObserver, scroll handler accurately toggles sticky footer', () => {
  const stickyElement = { hidden: true };
  let heroBottom = 500;
  let heroTop = 0;
  let plansTop = 3000;
  let plansBottom = 3800;

  const heroElement = {
    getBoundingClientRect: () => ({ top: heroTop, bottom: heroBottom }),
  };
  const plansElement = {
    getBoundingClientRect: () => ({ top: plansTop, bottom: plansBottom }),
  };

  const windowListeners = {};
  const document = {
    querySelector: (selector) => {
      if (selector === '.mobile-offer') return stickyElement;
      if (selector === '.hero') return heroElement;
      return null;
    },
    querySelectorAll: () => [],
    getElementById: (id) => (id === 'planos' ? plansElement : null),
  };

  const window = {
    innerHeight: 800,
    location: { hostname: 'www.imobiturbo.com.br', pathname: '/skills-ia/', href: 'https://www.imobiturbo.com.br/skills-ia/' },
    matchMedia: () => ({ matches: false }),
    addEventListener: (event, handler) => { windowListeners[event] = handler; },
    setInterval: () => 1,
    clearInterval: () => {},
  };

  vm.runInNewContext(jsSource, {
    document,
    window,
    location: window.location,
    crypto: { randomUUID: () => 'uuid' },
    setInterval: () => 1,
    clearInterval: () => {},
    fetch: async () => ({ ok: true, json: async () => ({}) }),
  });

  assert.ok(windowListeners.scroll, 'scroll listener must be attached as fallback');

  // Initial at hero: hero is in view
  assert.equal(stickyElement.hidden, true, 'fallback: hidden on hero initially');

  // Scroll past hero: hero is above viewport (bottom <= 0), plans still below (top >= 800)
  heroTop = -1000;
  heroBottom = -100;
  plansTop = 2000;
  plansBottom = 2800;
  windowListeners.scroll();
  assert.equal(stickyElement.hidden, false, 'fallback: visible after hero is scrolled past');

  // Scroll to plans: plans in view
  plansTop = 200;
  plansBottom = 1000;
  windowListeners.scroll();
  assert.equal(stickyElement.hidden, true, 'fallback: hidden on plans');

  // Scroll back to hero
  heroTop = 0;
  heroBottom = 600;
  plansTop = 3000;
  plansBottom = 3800;
  windowListeners.scroll();
  assert.equal(stickyElement.hidden, true, 'fallback: hidden when back to hero');
});
