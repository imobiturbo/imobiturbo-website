(function () {
  'use strict';
  if (location.hostname !== 'pay.wiapy.com' || window.__imobiturboSkillsCheckout) return;
  var plans = { '/f5uAVWx6kAkY': { price: 27.90, plan: 'essencial' }, '/ZjGp49XpjjpL': { price: 37.90, plan: 'completo' } };
  var plan = plans[location.pathname.replace(/\/$/, '')];
  if (!plan) return;
  window.__imobiturboSkillsCheckout = true;
  var pixel = '1025303472485246';
  var query = new URLSearchParams(location.search);
  var idPattern = /^[a-zA-Z0-9_-]{8,128}$/;
  function cookie(name, value) { document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=7776000; SameSite=Lax; Secure'; }
  var visitor = query.get('rt_vid');
  if (visitor && idPattern.test(visitor)) {
    try { localStorage.setItem('_rt_vid', visitor); } catch (_) {}
    cookie('_rt_vid', visitor);
  }
  ['fbp', 'fbc'].forEach(function (name) {
    var value = query.get('rt_' + name);
    if (value && /^fb\.\d\.\d{10,13}\.[a-zA-Z0-9_.-]+$/.test(value) && value.length < 512) cookie('_' + name, value);
  });
  function eventId() { return crypto.randomUUID ? crypto.randomUUID() : 'skills-' + Date.now() + '-' + Math.random().toString(36).slice(2); }
  function details() { return { content_ids: ['skills-ia-corretor:' + plan.plan], content_type: 'product', product_id: 'skills-ia-corretor', offer_code: plan.plan, value: plan.price, currency: 'BRL' }; }
  var tracker = document.createElement('script');
  tracker.src = 'https://track.nmidigital.tech/t.js?operation=00000000-0000-0000-0000-000000000001';
  tracker.dataset.operationId = '00000000-0000-0000-0000-000000000001';
  tracker.dataset.endpoint = 'https://track.nmidigital.tech';
  tracker.dataset.offerId = '6f804e4c-5ab5-4d1a-b655-2fad8fc103d4';
  tracker.dataset.productId = 'skills-ia-corretor';
  document.head.appendChild(tracker);
  var ready = false, attempts = 0;
  var timer = setInterval(function () {
    if (++attempts > 80) { clearInterval(timer); return; }
    if (!window.HubTracker || !window.HubTracker.config().enabled) return;
    clearInterval(timer);
    if (!window.fbq) {
      var queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
      queue.queue = []; queue.push = queue; queue.loaded = true; queue.version = '2.0';
      window.fbq = queue; window._fbq = queue;
      var script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    window.fbq('init', pixel);
    window.fbq('trackSingle', pixel, 'PageView');
    var checkoutEvent = query.get('rt_checkout_event_id');
    window.fbq('trackSingle', pixel, 'InitiateCheckout', details(), { eventID: checkoutEvent && idPattern.test(checkoutEvent) ? checkoutEvent : eventId() });
    ready = true;
  }, 250);
  // Apenas observa uma resposta aprovada pela API. Não altera dados nem o fluxo de pagamento.
  var originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    var response = await originalFetch.apply(this, arguments);
    try {
      var url = new URL(typeof input === 'string' ? input : input.url, location.origin);
      if (!ready || !response.ok || url.origin !== 'https://api.wiapy.com' || url.pathname !== '/checkout/payment' || !init || typeof init.body !== 'string') return response;
      var request = JSON.parse(init.body);
      var result = await response.clone().json();
      var payment = result && (result.body || result);
      if (!payment || !payment.id || !['paid', 'pending', 'unpaid', 'waiting_payment', 'processing'].includes(payment.status)) return response;
      var id = 'payment-info-' + payment.id;
      var names = String(request.name || '').trim().split(/\s+/);
      var data = Object.assign(details(), { email: request.email || undefined, phone: request.phone || undefined, firstName: names[0] || undefined, lastName: names.slice(1).join(' ') || undefined });
      window.HubTracker.track('AddPaymentInfo', data, id);
      window.fbq('trackSingle', pixel, 'AddPaymentInfo', details(), { eventID: id });
    } catch (_) {}
    return response;
  };
})();
