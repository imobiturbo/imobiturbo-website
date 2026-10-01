(function () {
  'use strict';
  var productId = 'skills-ia-corretor';
  var config = null;
  var production = /^(www\.)?imobiturbo\.com\.br$/.test(location.hostname);
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
  // The Hub SDK owns initialization and the shared browser/CAPI PageView ID.
  // Only product events belong to this page; never send a second PageView.
  var contentViewed = false;
  function viewContent() {
    if (!production || contentViewed || typeof window.fbq !== 'function') return;
    contentViewed = true;
    window.fbq('trackSingle', pixelId, 'ViewContent', {
      content_ids: [productId], content_name: '54 skills de IA para corretores', content_type: 'product', currency: 'BRL', value: 27.90
    }, { eventID: eventId() });
  }
  var ticks = 0;
  var trackingTimer = window.setInterval(function () {
    ticks += 1;
    var ready = window.HubTracker && window.HubTracker.config().enabled;
    if (ready) viewContent();
    pending = pending.filter(function (item) { return !hub(item[0], item[1]); });
    if ((ready && contentViewed && pending.length === 0) || ticks >= 120) clearInterval(trackingTimer);
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
  function resetCheckoutButton(button) {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.defaultHtml) {
      button.innerHTML = button.dataset.defaultHtml;
    }
  }
  function resetAllCheckoutButtons() {
    document.querySelectorAll('[data-plan]').forEach(resetCheckoutButton);
  }

  document.querySelectorAll('[data-plan]').forEach(function (button) {
    button.dataset.defaultHtml = button.innerHTML || button.textContent;
    button.setAttribute('aria-disabled', 'true');
    button.addEventListener('click', function () {
      var plan = button.dataset.plan;
      var offer = config && config.offers && config.offers[plan];
      if (!config || !config.salesEnabled || !validOffer(offer)) {
        setAvailability('Não foi possível carregar os dados do checkout. Recarregue a página para tentar novamente.');
        var avail = document.getElementById('availability');
        if (avail && typeof avail.scrollIntoView === 'function') {
          avail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      button.disabled = true;
      button.textContent = 'Abrindo pagamento…';
      if (typeof window.setTimeout === 'function') {
        window.setTimeout(function () {
          resetCheckoutButton(button);
        }, 5000);
      }
      track('offer_selected', { offer_code: plan, value: offer.priceCents / 100, currency: 'BRL' });
      // Buttons avoid the Hub automatic anchor click handler. The fbq observer sends
      // exactly one InitiateCheckout to the Hub with the same eventID and amount.
      if (production && window.fbq) window.fbq('trackSingle', pixelId, 'InitiateCheckout', {
        content_ids: [productId + ':' + plan], content_name: 'Skills IA — ' + offer.name,
        content_type: 'product', product_id: productId, offer_code: plan, currency: 'BRL', value: offer.priceCents / 100, num_items: 1
      }, { eventID: eventId() });
      else track('InitiateCheckout', { offer_code: plan, value: offer.priceCents / 100, currency: 'BRL' });
      window.location.assign(checkoutUrl(offer, plan));
    });
  });
  fetch('./offer.json', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) throw new Error('offer_unavailable'); return response.json();
  }).then(function (value) {
    config = value;
    if (value.salesEnabled !== true) return;
    document.querySelectorAll('[data-plan]').forEach(function (button) {
      if (validOffer(value.offers[button.dataset.plan])) {
        button.removeAttribute('aria-disabled');
        button.disabled = false;
      }
    });
    setAvailability('Pagamento pela Wiapy. Escolha seu kit.');
  }).catch(function () { setAvailability('Não foi possível carregar os dados do checkout. Recarregue a página para tentar novamente.'); });

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('pageshow', function () {
      resetAllCheckoutButtons();
    });
  }
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        resetAllCheckoutButtons();
      }
    });
  }

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
  var sticky = typeof document.querySelector === 'function' ? document.querySelector('.mobile-offer') : null;
  var heroSection = typeof document.querySelector === 'function' ? document.querySelector('.hero') : null;
  var planSection = document.getElementById('planos');
  var seenOffers = false;

  if ('IntersectionObserver' in window && sticky) {
    var heroInView = true;
    var plansInView = false;

    function updateSticky() {
      var shouldShow = !heroInView && !plansInView;
      sticky.hidden = !shouldShow;
    }

    if (heroSection) {
      new window.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          heroInView = entry.isIntersecting;
          updateSticky();
        });
      }, { threshold: 0 }).observe(heroSection);
    } else {
      heroInView = false;
    }

    if (planSection) {
      new window.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          plansInView = entry.isIntersecting;
          if (entry.isIntersecting && !seenOffers) {
            seenOffers = true;
            track('offers_viewed', { content_ids: ['essencial', 'completo'] });
          }
          updateSticky();
        });
      }, { threshold: 0 }).observe(planSection);
    }

    updateSticky();
  } else if (sticky) {
    function checkScroll() {
      var heroRect = heroSection && typeof heroSection.getBoundingClientRect === 'function' ? heroSection.getBoundingClientRect() : null;
      var planRect = planSection && typeof planSection.getBoundingClientRect === 'function' ? planSection.getBoundingClientRect() : null;
      var heroInView = heroRect ? (heroRect.bottom > 0 && heroRect.top < window.innerHeight) : false;
      var plansInView = planRect ? (planRect.bottom > 0 && planRect.top < window.innerHeight) : false;
      if (plansInView && !seenOffers) {
        seenOffers = true;
        track('offers_viewed', { content_ids: ['essencial', 'completo'] });
      }
      sticky.hidden = heroInView || plansInView;
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  }
})();
