(function () {
  'use strict';
  var productId = 'skills-ia-corretor';
  var config = null;
  var production = location.hostname === 'www.imobiturbo.com.br';
  var pixelId = '1025303472485246';
  var pending = [];

  function hub(name, properties) {
    var tracker = window.HubTracker;
    if (tracker && tracker.track(name, properties)) return true;
    return false;
  }
  function track(name, properties) {
    if (!production) return;
    var data = Object.assign({ product_id: productId, page_path: location.pathname }, properties);
    if (!hub(name, data) && pending.length < 20) pending.push([name, data]);
  }
  function eventId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'skills-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }
  function loadPixel() {
    if (!production || window.__skillsPixelLoaded) return;
    window.__skillsPixelLoaded = true;
    if (!window.fbq) {
      var queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
      queue.push = queue; queue.loaded = true; queue.version = '2.0'; queue.queue = [];
      window.fbq = queue; window._fbq = queue;
      var script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
    }
    window.fbq('init', pixelId);
    window.fbq('trackSingle', pixelId, 'PageView', {}, { eventID: eventId() });
    window.fbq('trackSingle', pixelId, 'ViewContent', {
      content_ids: [productId], content_name: '54 skills de IA para corretores', content_type: 'product', currency: 'BRL', value: 27.90
    }, { eventID: eventId() });
  }
  // Allow the canonical Hub PageView to finish first; fbq is observed by the Hub.
  // This prevents an extra PageView while keeping the pixel independent of a slow collector.
  var ticks = 0;
  var trackingTimer = window.setInterval(function () {
    ticks += 1;
    var ready = window.HubTracker && window.HubTracker.config().enabled;
    if (ready || ticks >= 20) loadPixel();
    pending = pending.filter(function (item) { return !hub(item[0], item[1]); });
    if ((ready && pending.length === 0) || ticks >= 40) clearInterval(trackingTimer);
  }, 250);

  function setAvailability(message) {
    var status = document.getElementById('availability');
    if (status) status.textContent = message;
  }
  function validOffer(offer) {
    if (!offer || !Number.isInteger(offer.priceCents)) return false;
    try { var url = new URL(offer.checkoutUrl); return url.protocol === 'https:' && url.hostname === 'pay.wiapy.com' && url.pathname.length > 1; } catch (_) { return false; }
  }
  function checkoutUrl(offer, plan) {
    var target = new URL(offer.checkoutUrl);
    var source = new URL(location.href);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'fbclid', 'gclid', 'ttclid', 'src', 'sck'].forEach(function (key) {
      if (source.searchParams.has(key)) target.searchParams.set(key, source.searchParams.get(key));
    });
    target.searchParams.set('product_id', productId);
    target.searchParams.set('offer_code', plan);
    target.searchParams.set('plan', 'avulso');
    return window.HubTracker ? window.HubTracker.decorate(target.href) : target.href;
  }
  document.querySelectorAll('[data-plan]').forEach(function (button) {
    button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', function () {
      var plan = button.dataset.plan;
      var offer = config && config.offers && config.offers[plan];
      if (!config || !config.salesEnabled || config.fulfillmentStatus !== 'ready' || !validOffer(offer)) {
        setAvailability('As vendas ainda não estão abertas. Você está vendo a prévia da oferta.');
        document.getElementById('availability').scrollIntoView({ behavior: 'smooth', block: 'center' });
        track('offer_preview_click', { offer_code: plan });
        return;
      }
      button.disabled = true;
      button.textContent = 'Abrindo pagamento…';
      track('offer_selected', { offer_code: plan, value: offer.priceCents / 100, currency: 'BRL' });
      // Buttons avoid the Hub automatic anchor click handler. The fbq observer sends
      // exactly one InitiateCheckout to the Hub with the same eventID and amount.
      if (production && window.fbq) window.fbq('trackSingle', pixelId, 'InitiateCheckout', {
        content_ids: [productId + ':' + plan], content_name: 'Skills IA — ' + offer.name,
        content_type: 'product', currency: 'BRL', value: offer.priceCents / 100, num_items: 1
      }, { eventID: eventId() });
      else track('InitiateCheckout', { offer_code: plan, value: offer.priceCents / 100, currency: 'BRL' });
      window.location.assign(checkoutUrl(offer, plan));
    });
  });
  fetch('./offer.json', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) throw new Error('offer_unavailable'); return response.json();
  }).then(function (value) {
    config = value;
    var ready = value.salesEnabled === true && value.fulfillmentStatus === 'ready';
    if (!ready) return;
    document.querySelectorAll('[data-plan]').forEach(function (button) {
      if (validOffer(value.offers[button.dataset.plan])) button.removeAttribute('aria-disabled');
    });
    setAvailability('Pagamento único e seguro pela Wiapy. Escolha o seu kit.');
  }).catch(function () { setAvailability('As vendas ainda não estão abertas.'); });

  // In-page navigation is a scroll, not a new tracked page occurrence.
  // Keep native anchors for no-JS access without triggering the tracker/hash observer.
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      event.preventDefault();
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-placement]').forEach(function (link) {
    link.addEventListener('click', function () { track('cta_click', { placement: link.dataset.placement, cta_type: 'view_offers' }); });
  });
  document.querySelectorAll('.catalog details, .faq details').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) track('content_expanded', { content_category: item.closest('.faq') ? 'faq' : 'catalog', content_name: item.querySelector('summary').textContent.trim() });
    });
  });
  if ('IntersectionObserver' in window) {
    var sticky = document.querySelector('.mobile-offer');
    var planSection = document.getElementById('planos');
    var seenOffers = false;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (sticky) sticky.hidden = entry.isIntersecting;
        if (entry.isIntersecting && !seenOffers) { seenOffers = true; track('offers_viewed', { content_ids: ['essencial', 'completo'] }); }
      });
    }, { threshold: 0 }).observe(planSection);
  }
})();
