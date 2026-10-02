(function () {
  'use strict';

  var dateTarget = document.getElementById('offer-date');
  if (dateTarget) {
    var dateFormat = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    function showCurrentDate() {
      var values = {};
      dateFormat.formatToParts(new Date()).forEach(function (part) { values[part.type] = part.value; });
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

  var viewport = document.querySelector('.tape-viewport');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function advanceGallery(direction) {
    if (!viewport) return;
    var item = viewport.querySelector('.tape-item');
    var gap = parseFloat(getComputedStyle(viewport.querySelector('.tape-group')).gap) || 20;
    var step = item ? item.getBoundingClientRect().width + gap : viewport.clientWidth;
    var next = viewport.scrollLeft + direction * step;
    if (direction > 0 && viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 2) next = 0;
    viewport.scrollTo({ left: Math.max(0, next), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('[data-gallery-prev]').forEach(function (button) {
    button.addEventListener('click', function () { advanceGallery(-1); });
  });
  document.querySelectorAll('[data-gallery-next]').forEach(function (button) {
    button.addEventListener('click', function () { advanceGallery(1); });
  });
  if (viewport) {
    viewport.addEventListener('keydown', function (event) {
      if (event.target !== viewport || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      advanceGallery(event.key === 'ArrowRight' ? 1 : -1);
    });
  }

  var viewer = document.querySelector('.material-viewer');
  var viewerImage = viewer && viewer.querySelector('.material-viewer-image');
  var viewerTitle = document.getElementById('material-viewer-title');
  if (viewer && typeof viewer.showModal === 'function') {
    document.querySelectorAll('[data-material-preview]').forEach(function (button) {
      button.addEventListener('click', function () {
        var image = button.querySelector('img');
        if (!image) return;
        viewerImage.src = image.currentSrc || image.src;
        viewerImage.alt = image.alt;
        viewerTitle.textContent = image.alt;
        viewer.showModal();
      });
    });
    viewer.querySelector('.material-close').addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('click', function (event) {
      var rect = viewer.getBoundingClientRect();
      if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) viewer.close();
    });
    viewer.addEventListener('close', function () {
      viewerTitle.textContent = '';
    });
  }
})();
