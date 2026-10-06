(() => {
  'use strict';
  const offer = window.OSOffer;
  let cycle = 'annual';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.nav');
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  document.querySelector('[data-top]').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' }));

  if (!reducedMotion && 'IntersectionObserver' in window) {
    // Content remains visible if JavaScript is unavailable or setup fails.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('pending');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('pending');
      observer.observe(element);
    });
    document.body.classList.add('motion-ready');
  }

  document.querySelectorAll('[data-cycle]').forEach(button => button.addEventListener('click', () => {
    cycle = button.dataset.cycle;
    document.querySelectorAll('[data-cycle]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cycle === cycle)));
    document.querySelectorAll('[data-plan]').forEach(card => {
      const key = card.dataset.plan;
      const price = offer.price(key, cycle);
      card.querySelector('[data-plan-price]').textContent = price.headline;
      card.querySelector('[data-plan-period]').textContent = price.period;
      card.querySelector('[data-plan-detail]').textContent = price.detail;
      card.querySelector('a').href = offer.checkoutURL(key, cycle);
    });
  }));

  const videos = {
    crm: { name: 'os-macbook-real', tab: 'tab-crm' },
    whatsapp: { name: 'wa-agenda-real', tab: 'tab-whatsapp' },
  };
  const video = document.querySelector('#os-demo');
  const tabs = [...document.querySelectorAll('[data-demo]')];
  function selectDemo(button) {
    const demo = videos[button.dataset.demo];
    const wasPlaying = !video.paused;
    video.pause();
    video.poster = `/os-crm/v2/assets/${demo.name}-poster.webp`;
    const sources = [...video.querySelectorAll('source')];
    sources[0].src = `/os-crm/v2/assets/${demo.name}.webm`;
    sources[1].src = `/os-crm/v2/assets/${demo.name}.mp4`;
    video.load();
    if (wasPlaying) video.play().catch(() => {});
    tabs.forEach(tab => { tab.setAttribute('aria-selected', String(tab === button)); tab.tabIndex = tab === button ? 0 : -1; });
    document.querySelector('#demo-panel').setAttribute('aria-labelledby', demo.tab);
  }
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => selectDemo(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectDemo(tabs[next]); tabs[next].focus();
    });
  });
  const videoObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) video.pause();
  }, { threshold: 0.1 }) : null;
  videoObserver?.observe(video);

  const dialog = document.querySelector('#proof-dialog');
  const player = document.querySelector('#proof-player');
  document.querySelectorAll('[data-proof]').forEach(link => link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    video.pause();
    document.querySelector('#proof-title').textContent = `Relato de ${link.dataset.proofName} · Imobiturbo`;
    const proofVideo = document.createElement('video');
    proofVideo.src = `/os-crm/v2/assets/${link.dataset.proof}`;
    proofVideo.poster = link.querySelector('img').src;
    proofVideo.controls = true;
    proofVideo.playsInline = true;
    proofVideo.setAttribute('aria-label', `Depoimento de ${link.dataset.proofName}`);
    player.replaceChildren(proofVideo);
    dialog.showModal();
    proofVideo.play().catch(() => {});
  }));
  document.querySelector('[data-close-proof]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    player.querySelector('video')?.pause();
    player.replaceChildren();
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  function updateBoard(filter = document.querySelector('[data-board-filter][aria-pressed="true"]').dataset.boardFilter) {
    document.querySelectorAll('[data-demo-lead]').forEach(lead => { lead.hidden = filter !== 'all' && lead.dataset.owner !== filter; });
    document.querySelectorAll('.board-col').forEach(col => {
      col.querySelector('[data-stage-count]').textContent = col.querySelectorAll('[data-demo-lead]:not([hidden])').length;
    });
  }
  document.querySelectorAll('[data-board-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-board-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    updateBoard(button.dataset.boardFilter);
  }));
  document.querySelector('[data-move-lead]').addEventListener('click', event => {
    const button = event.currentTarget;
    document.querySelector('[data-visit-column]').append(button.closest('[data-demo-lead]'));
    button.textContent = '✓ Visita agendada'; button.disabled = true;
    document.querySelector('#board-feedback').textContent = 'Camila avançou para Visita agendada. O responsável e o histórico continuam no card. Demonstração com dados ilustrativos.';
    updateBoard();
  });
})();
