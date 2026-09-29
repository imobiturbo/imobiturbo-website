(function () {
  'use strict';

  var dateTarget = document.querySelector('[data-offer-date]');
  if (dateTarget) {
    var dateFormat = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    function showCurrentDate() {
      var parts = dateFormat.formatToParts(new Date());
      var values = {};
      parts.forEach(function (part) { values[part.type] = part.value; });
      dateTarget.dateTime = values.year + '-' + values.month + '-' + values.day;
      dateTarget.textContent = values.day + '/' + values.month + '/' + values.year;
      dateTarget.hidden = false;
    }
    showCurrentDate();
    window.setInterval(showCurrentDate, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) showCurrentDate();
    });
  }

  document.querySelectorAll('[data-tape-gallery]').forEach(function (gallery) {
    var viewport = gallery.querySelector('.tape-viewport');
    var track = gallery.querySelector('.tape-track');
    var original = gallery.querySelector('[data-tape-group]');
    var toggle = gallery.querySelector('[data-gallery-toggle]');
    if (!viewport || !track || !original || !toggle) return;

    var clone = original.cloneNode(true);
    clone.removeAttribute('data-tape-group');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');
    track.appendChild(clone);

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var paused = reducedMotion.matches;
    var hovering = false;
    var visible = !('IntersectionObserver' in window);
    var previous = 0;
    var position = 0;
    var cycleWidth = original.getBoundingClientRect().width;
    var drag = null;

    function showState() {
      gallery.dataset.paused = String(paused);
      toggle.querySelector('[data-gallery-label]').textContent = paused ? 'Reproduzir movimento' : 'Pausar movimento';
      toggle.querySelector('[data-gallery-symbol]').textContent = paused ? '▷' : 'Ⅱ';
    }
    function pauseForInteraction() {
      paused = true;
      position = viewport.scrollLeft;
      showState();
    }
    toggle.hidden = false;
    showState();
    toggle.addEventListener('click', function () {
      paused = !paused;
      position = viewport.scrollLeft;
      showState();
    });
    viewport.addEventListener('pointerenter', function (event) { hovering = event.pointerType === 'mouse'; });
    viewport.addEventListener('pointerleave', function () { hovering = false; });
    viewport.addEventListener('pointerdown', function (event) {
      pauseForInteraction();
      if (event.pointerType === 'mouse' && event.button === 0) {
        drag = { x: event.clientX, scroll: viewport.scrollLeft };
        viewport.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    });
    viewport.addEventListener('pointermove', function (event) {
      if (drag) viewport.scrollLeft = drag.scroll - (event.clientX - drag.x);
    });
    viewport.addEventListener('pointerup', function () { drag = null; });
    viewport.addEventListener('pointercancel', function () { drag = null; });
    viewport.addEventListener('dragstart', function (event) { event.preventDefault(); });
    viewport.addEventListener('wheel', pauseForInteraction, { passive: true });
    viewport.addEventListener('focus', pauseForInteraction);
    viewport.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      pauseForInteraction();
      viewport.scrollBy({ left: event.key === 'ArrowRight' ? 264 : -264, behavior: 'auto' });
    });
    reducedMotion.addEventListener('change', function (event) {
      if (event.matches) pauseForInteraction();
    });
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      cycleWidth = original.getBoundingClientRect().width;
      position = cycleWidth ? viewport.scrollLeft % cycleWidth : 0;
    }).observe(original);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { rootMargin: '80px' }).observe(viewport);

    function animate(time) {
      var elapsed = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      if (!paused && !hovering && visible && !document.hidden && cycleWidth > 0) {
        position = (position + elapsed * 0.038) % cycleWidth;
        viewport.scrollLeft = position;
      } else {
        position = viewport.scrollLeft;
      }
      window.requestAnimationFrame(animate);
    }
    window.requestAnimationFrame(animate);
  });
})();
