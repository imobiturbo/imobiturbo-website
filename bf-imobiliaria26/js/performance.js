(function () {
  'use strict';
  // Native lazy loading can fetch the entire horizontal gallery before first paint.
  // Observe actual viewport proximity, including images cloned by the carousel.
  function hydrate(image) {
    if (!image.dataset.lazySrc) return;
    image.src = image.dataset.lazySrc;
    delete image.dataset.lazySrc;
  }
  var images = document.querySelectorAll('img[data-lazy-src]');
  if (!('IntersectionObserver' in window)) images.forEach(hydrate);
  else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        hydrate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '200px 320px' });
    function observeTree(node) {
      if (node.nodeType !== 1) return;
      if (node.matches('img[data-lazy-src]')) observer.observe(node);
      node.querySelectorAll('img[data-lazy-src]').forEach(function (image) { observer.observe(image); });
    }
    images.forEach(function (image) { observer.observe(image); });
    if ('MutationObserver' in window) new MutationObserver(function (records) {
      records.forEach(function (record) { record.addedNodes.forEach(observeTree); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // This font is used only in prices far below the fold.
  var plans = document.getElementById('planos');
  if (plans) {
    function enablePriceFont() { plans.classList.add('price-font-ready'); }
    if (!('IntersectionObserver' in window)) enablePriceFont();
    else {
      var prices = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        enablePriceFont(); prices.disconnect();
      }, { rootMargin: '800px' });
      prices.observe(plans);
    }
  }

  var lcp = null, cls = 0, sent = false;
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) { lcp = entry.startTime; });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) { if (!entry.hadRecentInput) cls += entry.value; });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
  function report(reason) {
    var tracker = window.HubTracker;
    if (sent || !tracker || !tracker.config().enabled) return;
    var nav = performance.getEntriesByType('navigation')[0];
    var fcp = performance.getEntriesByName('first-contentful-paint')[0];
    var params = new URL(location.href).searchParams;
    var audit = params.has('imt_audit') || params.get('utm_source') === 'audit' || navigator.webdriver === true;
    sent = !!tracker.track('LandingPerformance', {
      measurementVersion: 'connect-v1', reportReason: reason, elapsedMs: Math.round(performance.now()),
      ttfbMs: nav ? Math.round(nav.responseStart) : null,
      fcpMs: fcp ? Math.round(fcp.startTime) : null, lcpMs: lcp == null ? null : Math.round(lcp), cls: Math.round(cls * 1000) / 1000,
      viewportWidth: innerWidth, inAppBrowser: /Instagram|FBAN|FBAV/.test(navigator.userAgent),
      traffic_classification: audit ? 'confirmed_bot' : 'unclassified'
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') report('hidden'); });
  window.addEventListener('pagehide', function () { report('pagehide'); });
  window.setTimeout(function () { report('20s-snapshot'); }, 20000);
})();
