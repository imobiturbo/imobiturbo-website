(() => {
  const dialog = document.querySelector('#media-dialog');
  const content = document.querySelector('#media-content');
  let trigger;
  let activeCard = null;

  document.addEventListener('click', e => {
    const videoLink = e.target.closest('[data-video]');
    if (videoLink) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();

      if (videoLink.querySelector('iframe')) return;

      if (activeCard && activeCard !== videoLink) {
        const oldIframe = activeCard.querySelector('iframe');
        if (oldIframe) oldIframe.remove();
        activeCard.classList.remove('is-playing');
      }

      const iframe = document.createElement('iframe');
      let src = videoLink.dataset.video || videoLink.href;
      if (!src.includes('autoplay=true')) {
        src += (src.includes('?') ? '&' : '?') + 'autoplay=true';
      }
      iframe.src = src;
      iframe.title = videoLink.getAttribute('aria-label') || 'Depoimento em vídeo';
      iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.className = 'video-embed-iframe';

      videoLink.classList.add('is-playing');
      videoLink.appendChild(iframe);
      activeCard = videoLink;
      return;
    }

    const printLink = e.target.closest('[data-print]');
    if (printLink && dialog?.showModal) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      trigger = printLink;
      const img = document.createElement('img');
      img.src = printLink.href;
      img.alt = printLink.querySelector('img')?.alt || 'Conversa com cliente';
      content.replaceChildren(img);
      dialog.classList.remove('portrait');
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    }
  });

  if (dialog?.showModal) {
    dialog.querySelector('.close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      content.replaceChildren();
      document.body.style.overflow = '';
      trigger?.focus();
    });
  }
})();

