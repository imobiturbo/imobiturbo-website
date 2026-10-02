(function () {
  'use strict';

  var dateTarget = document.querySelector('[data-offer-date]') || document.getElementById('offer-date');
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

  function initializeTapeGallery(gallery) {
    var viewport = gallery.querySelector('.tape-viewport');
    var track = gallery.querySelector('.tape-track');
    var original = gallery.querySelector('[data-tape-group]');
    if (!viewport || !track || !original) return;

    var clone = original.cloneNode(true);
    clone.removeAttribute('data-tape-group');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');
    track.appendChild(clone);

    var visible = !('IntersectionObserver' in window);
    var previous = 0;
    var position = 0;
    var cycleWidth = original.getBoundingClientRect().width;
    var drag = null;
    var frame = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function updateAnimation() {
      if (visible && !document.hidden && !reducedMotion) {
        if (!frame) { previous = 0; frame = window.requestAnimationFrame(animate); }
      } else if (frame) {
        window.cancelAnimationFrame(frame); frame = 0; previous = 0;
      }
    }
    document.addEventListener('visibilitychange', updateAnimation);

    viewport.addEventListener('pointerdown', function (event) {
      position = viewport.scrollLeft;
      if (event.pointerType === 'mouse' && event.button === 0) {
        drag = { x: event.clientX, scroll: viewport.scrollLeft };
        viewport.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    });
    viewport.addEventListener('pointermove', function (event) {
      if (drag) viewport.scrollLeft = drag.scroll - (event.clientX - drag.x);
    });
    viewport.addEventListener('pointerup', function () { drag = null; position = viewport.scrollLeft; });
    viewport.addEventListener('pointercancel', function () { drag = null; position = viewport.scrollLeft; });
    viewport.addEventListener('dragstart', function (event) { event.preventDefault(); });
    viewport.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      viewport.scrollBy({ left: event.key === 'ArrowRight' ? 264 : -264, behavior: 'auto' });
      position = viewport.scrollLeft;
    });
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      cycleWidth = original.getBoundingClientRect().width;
      position = cycleWidth ? viewport.scrollLeft % cycleWidth : 0;
    }).observe(original);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      updateAnimation();
    }, { rootMargin: '80px' }).observe(viewport);

    function animate(time) {
      frame = 0;
      if (!visible || document.hidden || reducedMotion) { previous = 0; return; }
      var elapsed = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      if (!drag && visible && !document.hidden && cycleWidth > 0) {
        position = (position + elapsed * 0.038) % cycleWidth;
        viewport.scrollLeft = position;
      } else {
        position = viewport.scrollLeft;
      }
      frame = window.requestAnimationFrame(animate);
    }
    updateAnimation();
  }

  document.querySelectorAll('[data-tape-gallery]').forEach(function (gallery) {
    if (!('IntersectionObserver' in window)) {
      initializeTapeGallery(gallery);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      initializeTapeGallery(gallery);
    }, { rootMargin: '400px' });
    observer.observe(gallery);
  });

  var activeInfoButton = null;
  var infoBubble = document.createElement('div');
  infoBubble.className = 'skill-info-bubble';
  infoBubble.id = 'skill-info-popover';
  infoBubble.setAttribute('role', 'tooltip');
  infoBubble.hidden = true;
  document.body.appendChild(infoBubble);

  function closeInfoBubble() {
    if (activeInfoButton) {
      activeInfoButton.setAttribute('aria-expanded', 'false');
      activeInfoButton.removeAttribute('aria-describedby');
      activeInfoButton = null;
    }
    infoBubble.hidden = true;
  }

  function openInfoBubble(button) {
    if (activeInfoButton === button) {
      closeInfoBubble();
      return;
    }
    closeInfoBubble();
    activeInfoButton = button;
    infoBubble.textContent = button.getAttribute('data-tooltip') || '';
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-describedby', infoBubble.id);
    infoBubble.hidden = false;
    var rect = button.getBoundingClientRect();
    var bubbleRect = infoBubble.getBoundingClientRect();
    var left = Math.max(12, Math.min(rect.left, window.innerWidth - bubbleRect.width - 12));
    var top = rect.bottom + 8;
    if (top + bubbleRect.height > window.innerHeight - 12) top = rect.top - bubbleRect.height - 8;
    infoBubble.style.left = left + 'px';
    infoBubble.style.top = Math.max(12, top) + 'px';
  }

  document.querySelectorAll('[data-skill-info]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      openInfoBubble(button);
    });
  });
  document.addEventListener('pointerdown', function (event) {
    if (activeInfoButton && event.target !== activeInfoButton && !infoBubble.contains(event.target)) closeInfoBubble();
  });
  window.addEventListener('scroll', closeInfoBubble, true);
  window.addEventListener('resize', closeInfoBubble);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeInfoBubble();
  });
})();
