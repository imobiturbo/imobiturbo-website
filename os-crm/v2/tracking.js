(function () {
  'use strict';
  const queue = [];
  let retry = null;
  let attempts = 0;
  function flush() {
    const tracker = window.HubTracker;
    while (queue.length && tracker && typeof tracker.track === 'function') {
      const event = queue[0];
      if (!tracker.track(event.name, { productId: event.productId })) break;
      queue.shift();
    }
    if (queue.length && !retry && attempts < 120) {
      attempts++;
      retry = window.setTimeout(() => { retry = null; flush(); }, 250);
    }
  }
  function track(name, plan, cycle) {
    if (queue.length >= 32) return;
    queue.push({ name, productId: ['imobiturbo-os', plan, cycle].filter(Boolean).join(':') });
    flush();
  }
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href, location.href);
    const selected = window.OSOffer.checkoutSelection(url.href) ||
      (url.origin === location.origin && url.pathname === '/os-crm/v2/assinatura/' ? window.OSOffer.selection(url.search) : null);
    if (selected) {
      link.href = window.OSOffer.checkoutURL(selected.plan, selected.cycle);
    }
  });
  document.addEventListener('click', event => {
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;
    const cycleButton = target.closest('[data-cycle]');
    if (cycleButton) {
      const selected = window.OSOffer.selection(location.search);
      track('select_cycle', location.pathname.includes('/assinatura/') ? selected.plan : null, cycleButton.dataset.cycle);
      return;
    }
    const link = target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    const selected = window.OSOffer.checkoutSelection(url.href) ||
      (url.origin === location.origin && url.pathname === '/os-crm/v2/assinatura/' ? window.OSOffer.selection(url.search) : null);
    if (selected) {
      track('select_plan', selected.plan, selected.cycle);
    } else if (url.hostname === 'wa.me') {
      const selected = window.OSOffer.selection(location.search);
      track('cta_click', selected.plan, selected.cycle);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('input[name="plan"]')) {
      const selected = window.OSOffer.selection(location.search);
      track('select_plan', selected.plan, selected.cycle);
    }
  });
  if (location.pathname.includes('/assinatura/')) {
    const selected = window.OSOffer.selection(location.search);
    track('subscription_view', selected.plan, selected.cycle);
  }
  document.querySelector('#hub-tracker').addEventListener('load', flush);
})();
