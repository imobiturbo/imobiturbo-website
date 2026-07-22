(function () {
  'use strict';

  function track(name, properties) {
    var tracker = window.__track;
    if (!tracker || typeof tracker.track !== 'function') return null;
    return tracker.track(name, properties || {});
  }

  function placementFor(link) {
    if (link.dataset.trackPlacement) return link.dataset.trackPlacement;
    if (link.closest('header')) return 'header';
    if (link.closest('footer')) return 'footer';
    if (link.closest('[class*="diagnostic"]')) return 'diagnostic';
    if (link.closest('[class*="hero"]')) return 'hero';
    return 'content';
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href*="wa.me"]') : null;
    if (!link) return;
    track('cta_click', {
      cta_type: 'whatsapp',
      placement: placementFor(link),
      page_path: window.location.pathname,
    });
  });

  window.imtTrack = track;
})();
