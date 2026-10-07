(() => {
  'use strict';
  const offer = window.OSOffer;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
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

  const videos = {
    crm: { name: 'os-macbook-real', tab: 'tab-crm', label: 'Demonstração do CRM Imobiturbo OS no computador', points: [
      ['Veja cada negociação por etapa', 'Novos, qualificados, visitas e propostas. Arraste o card e faça cada oportunidade avançar sem complicação.'],
      ['Saiba quando retomar cada contato', 'Histórico da conversa e próximos retornos no mesmo lugar. Nunca mais deixe um cliente qualificado esfriar por esquecimento.'],
      ['Chegue à negociação com contexto', 'Orçamento, interesse, urgência e notas antes do primeiro áudio. Você entra na conversa sabendo o que o cliente quer.'],
    ] },
    whatsapp: { name: 'wa-agenda-real', tab: 'tab-whatsapp', label: 'Demonstração de atendimento e agendamento com IA no WhatsApp', points: [
      ['Ganhe a primeira conversa', 'A IA recebe o comprador enquanto o interesse está quente. Seu atendimento continua mesmo quando você está em uma visita.'],
      ['Descubra quem está pronto para comprar', 'Interesse, orçamento e momento de compra. Você chega ao atendimento com o contexto que faz a negociação andar.'],
      ['Transforme interesse em próxima visita', 'A conversa ganha um próximo passo. O corretor acompanha o histórico e assume para apresentar o imóvel e negociar.'],
    ] },
  };
  const video = document.querySelector('#os-demo');
  const tabs = [...document.querySelectorAll('[data-demo]')];
  const loopVideos = [...document.querySelectorAll('[data-loop-video]')];
  const visibleVideos = new Set();
  let proofOpen = false;
  function syncVideo(element) {
    if (!document.hidden && !proofOpen && visibleVideos.has(element)) {
      let needsLoad = false;
      element.querySelectorAll('source[data-src]').forEach(source => {
        source.src = source.dataset.src;
        delete source.dataset.src;
        needsLoad = true;
      });
      if (needsLoad) element.load();
      element.muted = true;
      element.play().catch(() => {});
    } else element.pause();
  }
  function syncVideos() { loopVideos.forEach(syncVideo); }
  const videoObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleVideos.add(entry.target);
      else visibleVideos.delete(entry.target);
      syncVideo(entry.target);
    }
  }, { threshold: 0.15 }) : null;
  loopVideos.forEach(element => {
    if (videoObserver) videoObserver.observe(element);
    else { visibleVideos.add(element); syncVideo(element); }
  });
  document.addEventListener('visibilitychange', syncVideos);
  function selectDemo(button) {
    const demo = videos[button.dataset.demo];
    video.pause();
    video.poster = `/os-crm/v2/assets/${demo.name}-poster.webp`;
    video.setAttribute('aria-label', demo.label);
    const sources = [...video.querySelectorAll('source')];
    sources.forEach((source, index) => {
      source.removeAttribute('src');
      source.dataset.src = `/os-crm/v2/assets/${demo.name}.${index === 0 ? 'webm' : 'mp4'}`;
    });
    video.load();
    syncVideo(video);
    demo.points.forEach(([heading, copy], index) => {
      document.querySelector(`[data-demo-heading="${index}"]`).textContent = heading;
      document.querySelector(`[data-demo-copy="${index}"]`).textContent = copy;
    });
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
  const dialog = document.querySelector('#proof-dialog');
  const player = document.querySelector('#proof-player');
  const proofStage = dialog.querySelector('.proof-stage');
  let proofController = null;
  function clearProof() {
    proofController?.dispose();
    proofController = null;
    player.replaceChildren();
    proofOpen = false;
    syncVideos();
  }
  document.querySelectorAll('[data-proof]').forEach(link => link.addEventListener('click', event => {
    if (typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    clearProof();
    proofOpen = true;
    syncVideos();
    document.querySelector('#proof-title').textContent = `Relato de ${link.dataset.proofName}`;
    const proofVideo = document.createElement('video');
    proofVideo.poster = link.querySelector('img').src;
    proofVideo.playsInline = true;
    proofVideo.setAttribute('aria-label', `Depoimento de ${link.dataset.proofName}`);
    player.replaceChildren(proofVideo);
    proofController = window.OSProofPlayer.mount(proofVideo, proofStage, `/os-crm/v2/assets/${link.dataset.proof}`);
    dialog.showModal();
    proofController.play();
  }));
  async function closeProof() {
    if (document.fullscreenElement === proofStage) await document.exitFullscreen().catch(() => {});
    clearProof();
    dialog.close();
  }
  document.querySelector('[data-close-proof]').addEventListener('click', closeProof);
  dialog.addEventListener('close', () => {
    if (!dialog.open) clearProof();
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeProof(); });

  // Short, local demonstrations: no borrowed marketing scripts or timers offscreen.
  const motionDemos = [...document.querySelectorAll('[data-motion-demo]')];
  const visibleDemos = new Set();
  let motionTimer = null;
  const kanban = document.querySelector('[data-motion-demo="kanban"]');
  const motionLead = kanban.querySelector('.motion-lead');
  const motionColumns = [...kanban.querySelectorAll('[data-motion-stage]')];
  let stage = 0;
  const stages = [
    ['Novo lead', 'Interesse em compra à vista', 'IA iniciando atendimento'],
    ['Visita agendada', 'Comprador qualificado', 'Amanhã às 10h · confirmado'],
    ['Proposta enviada', 'Condições em negociação', 'Corretor conduzindo a proposta'],
  ];
  function advanceKanban() {
    const before = motionLead.getBoundingClientRect();
    stage = (stage + 1) % stages.length;
    motionColumns[stage].append(motionLead);
    motionColumns.forEach((column, index) => {
      column.classList.toggle('active', index === stage);
      column.querySelector('[data-motion-count]').textContent = index === stage ? '1' : '0';
      column.querySelector('.motion-slot').hidden = index === stage;
    });
    motionLead.querySelector('.motion-status').textContent = stages[stage][0];
    motionLead.querySelector('[data-motion-note]').textContent = stages[stage][1];
    motionLead.querySelector('.motion-detail').textContent = stages[stage][2];
    const after = motionLead.getBoundingClientRect();
    motionLead.animate([
      { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)`, opacity: 0.5 },
      { transform: 'translate(0,0)', opacity: 1 },
    ], { duration: reducedMotion ? 0 : 550, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  const chat = document.querySelector('[data-motion-demo="chat"]');
  const stream = chat.querySelector('.chat-stream');
  const messages = [
    ['buyer', 'Vi o anúncio da cobertura. Ainda está disponível?'],
    ['assistant', 'Sim! Você procura para morar ou investir? E qual orçamento tem em mente?'],
    ['buyer', 'Para morar. Até R$ 450 mil, com pagamento à vista.'],
    ['assistant', 'Ótimo! Vou encaminhar seu perfil ao corretor. Qual horário funciona para conhecer o imóvel?'],
    ['buyer', 'Amanhã às 10h. Pode confirmar com ele?'],
    ['assistant', 'Vou avisar o corretor para confirmar sua visita. Seu interesse já está registrado no CRM!'],
  ];
  let nextMessage = 2;
  let chatTransition = false;
  function advanceChat() {
    if (chatTransition) return;
    chatTransition = true;
    const [type, text] = messages[nextMessage];
    nextMessage = (nextMessage + 1) % messages.length;
    const bubble = chat.querySelector(`.motion-bubble.${type}`).cloneNode(true);
    bubble.querySelector('p').textContent = text;
    const first = stream.firstElementChild;
    const shift = first.getBoundingClientRect().height + 12;
    stream.append(bubble);
    const animation = stream.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${shift}px)` }], { duration: reducedMotion ? 0 : 550, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    animation.finished.catch(() => {}).then(() => {
      first.remove();
      animation.cancel();
      chatTransition = false;
    });
  }
  function syncMotion() {
    if (motionTimer) clearInterval(motionTimer);
    motionTimer = null;
    document.body.classList.toggle('motions-paused', document.hidden);
    if (!document.hidden && visibleDemos.size) {
      motionTimer = setInterval(() => {
        if (visibleDemos.has(kanban)) advanceKanban();
        if (visibleDemos.has(chat)) advanceChat();
      }, 3200);
    }
  }
  const motionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleDemos.add(entry.target);
      else visibleDemos.delete(entry.target);
    }
    syncMotion();
  }, { threshold: 0.2 }) : null;
  motionDemos.forEach(element => {
    if (motionObserver) motionObserver.observe(element);
    else visibleDemos.add(element);
  });
  document.addEventListener('visibilitychange', syncMotion);
  motionPreference.addEventListener('change', event => {
    reducedMotion = event.matches;
    syncMotion();
    syncVideos();
  });
  syncMotion();

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
