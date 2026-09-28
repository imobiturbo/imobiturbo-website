(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const get = id => document.getElementById(id);
  const sessions = window.ImobiturboCheckoutSession;
  const CAL_ORIGIN = 'https://agenda.imobiturbo.com.br';
  const CAL_LINK = 'natanpimentel/1-1-consultoria-individual-com-natan-pimentel';
  const CAL_NAMESPACE = 'imobiturboConsultoria';
  const CAL_PAYMENT_KEY = 'imobiturbo:cal-consultoria:payment:v1';
  const CAL_PAYMENT_TTL = 30 * 60 * 1000;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const CAL_BOOKING_UID = /^[A-Za-z0-9_-]{8,128}$/;
  const modal = get('consultingCheckoutModal');
  const widget = get('calBookingWidget');
  const hubTrackerQueue = [];
  let timer = null;
  let paid = false;
  let lastTrigger = null;
  let lastPreviewTrigger = null;
  let userClosedPending = false;
  let calFrame = null;
  let embedStarted = false;
  let refreshStickyCta = () => {};
  let restorePaymentUid = readSavedCalPayment()?.uid || '';

  function hubTrackerReady() {
    const tracker = window.HubTracker;
    if (!tracker || typeof tracker.track !== 'function') return false;
    try {
      return typeof tracker.config !== 'function' || tracker.config().enabled === true;
    } catch (_) {
      return false;
    }
  }

  function dispatchHubTrackerEvent(queued) {
    const tracker = window.HubTracker;
    const method = tracker && tracker[queued.method];
    if (typeof method !== 'function') return false;
    method.apply(tracker, queued.args);
    return true;
  }

  function flushHubTrackerEvents() {
    try {
      if (!hubTrackerReady()) return;
      while (hubTrackerQueue.length) {
        const queued = hubTrackerQueue.shift();
        if (!dispatchHubTrackerEvent(queued)) {
          hubTrackerQueue.unshift(queued);
          return;
        }
      }
    } catch (_) {}
  }

  function queueHubTrackerEvent(method, ...args) {
    try {
      if (hubTrackerReady()) {
        flushHubTrackerEvents();
        if (dispatchHubTrackerEvent({ method, args })) return;
      }
      hubTrackerQueue.push({ method, args });
    } catch (_) {}
  }

  function trackHubEvent(eventName, properties = {}) {
    queueHubTrackerEvent('track', eventName, {
      page: 'vagas-obrigado',
      product_id: 'consultoria-individual-natan',
      ...properties,
    });
  }

  (function bindHubTracker() {
    const trackerScript = get('hub-tracker');
    if (trackerScript) trackerScript.addEventListener('load', flushHubTrackerEvents);
    window.addEventListener('load', flushHubTrackerEvents);
    [0, 250, 1000, 3000].forEach(delay => window.setTimeout(flushHubTrackerEvents, delay));
  }());

  function readSavedCalPayment() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CAL_PAYMENT_KEY));
      if (!saved || !UUID.test(saved.uid || '') || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= Date.now()) {
        sessionStorage.removeItem(CAL_PAYMENT_KEY);
        return null;
      }
      return { uid: saved.uid, expiresAt: saved.expiresAt };
    } catch (_) {
      try { sessionStorage.removeItem(CAL_PAYMENT_KEY); } catch (_) {}
      return null;
    }
  }

  function saveCalPayment(uid) {
    const current = readSavedCalPayment();
    if (current?.uid === uid) return current;
    const record = { uid, expiresAt: Date.now() + CAL_PAYMENT_TTL };
    try { sessionStorage.setItem(CAL_PAYMENT_KEY, JSON.stringify(record)); } catch (_) {}
    return record;
  }

  function clearCalPayment() {
    try { sessionStorage.removeItem(CAL_PAYMENT_KEY); } catch (_) {}
    restorePaymentUid = '';
  }

  function feedback(message, error = false) {
    const node = get('calendarFeedback');
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle('is-error', error);
  }

  function showCheckout(trigger = null) {
    if (paid) {
      get('consultingBooked').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const source = trigger?.dataset.ctaLocation || (restorePaymentUid ? 'saved_payment' : consulting.read() ? 'pending_payment' : 'unknown');
    if (trigger) {
      lastTrigger = trigger;
      trackHubEvent('upsell_cta_clicked', { location: source });
    }
    userClosedPending = false;
    get('finalInvite').hidden = true;
    if (!modal.open) {
      modal.showModal();
      trackHubEvent('upsell_checkout_opened', { location: source });
    }
    document.body.classList.add('checkout-open');
    refreshStickyCta();
    if (!consulting.read()) initializeCalendar();
  }

  function showLegacyPending(record) {
    if (!userClosedPending && !modal.open) showCheckout();
    widget.hidden = true;
    get('retryCalendar').hidden = true;
    get('pendingPayment').hidden = false;
    const pix = record.method === 'PIX';
    get('pixDetails').hidden = !pix;
    get('pendingTitle').textContent = pix ? 'Seu Pix anterior está pronto.' : 'Aguardando confirmação do pagamento anterior.';
    get('pendingDescription').textContent = pix
      ? 'Use o mesmo código para concluir. A confirmação será consultada automaticamente; não gere outro pagamento.'
      : 'O pagamento anterior segue em análise e será consultado automaticamente.';
    const tick = () => {
      const left = Math.max(0, Math.ceil((Date.parse(record.expiresAt) - Date.now()) / 1000));
      get('pixTimer').textContent = left ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` : 'Verificando pagamento…';
      get('pixCode').value = left ? record.pix.copyPaste : '';
      get('copyPix').disabled = !left || !record.pix.copyPaste;
      get('pixQr').hidden = !left || !record.pix.qrCodeBase64;
      if (record.pix.qrCodeBase64) get('pixQr').src = record.pix.qrCodeBase64;
    };
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
    tick();
  }

  function showCalendar() {
    get('pendingPayment').hidden = true;
    widget.hidden = false;
  }

  function showLegacyPaid(record) {
    if (timer) clearInterval(timer);
    paid = true;
    sessions.clearUpsellBuyer?.();
    if (modal.open) modal.close();
    get('offerContent').hidden = true;
    get('finalInvite').hidden = true;
    get('consultingApproved').hidden = false;
    const count = Number(record.installmentCount) || 1;
    const total = Math.round(Number(record.amount) * 100) || (count >= 4 ? 58800 : 49700);
    get('confirmedAmount').textContent = count > 1
      ? `${count} parcelas no cartão · total de R$${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(total / 100)}`
      : record.method === 'CREDIT_CARD' ? 'R$497 no cartão, em parcela única' : 'R$497 à vista via Pix';
    get('consultingApproved').focus({ preventScroll: true });
    refreshStickyCta();
  }

  const consulting = sessions.create({
    key: sessions.CONSULTING_KEY,
    productId: 'consultoria-individual-natan',
    plans: ['consultoria'],
    onPending: showLegacyPending,
    onError: () => feedback('Não conseguimos consultar o pagamento anterior agora. Ele foi mantido e será consultado novamente automaticamente.', true),
    onExpired: () => {
      if (timer) clearInterval(timer);
      get('pendingPayment').hidden = true;
      showCalendar();
      initializeCalendar();
      feedback('O checkout anterior foi encerrado. Você pode escolher um novo horário e pagamento.', false);
    },
    onPaid: showLegacyPaid,
  });

  const community = sessions.create({
    key: sessions.COMMUNITY_KEY,
    productId: 'comunidade-imobiturbo',
    plans: ['anual', 'semestral', 'trimestral', 'mensal'],
    onPaid: () => { get('communityStatus').textContent = 'Compra da comunidade aprovada. Bem-vindo à Imobiturbo!'; get('communityStatus').classList.add('is-approved'); },
    onPending: () => { get('communityStatus').textContent = 'Estamos consultando o pagamento da comunidade.'; },
    onExpired: () => { get('communityStatus').textContent = 'O checkout da comunidade foi encerrado. Consulte seus acessos abaixo.'; sessions.clearDraft(); },
    onError: () => { get('communityStatus').textContent = 'Não foi possível consultar a compra da comunidade agora.'; },
  });

  function buyerForCal() {
    const buyer = sessions.getUpsellBuyer?.();
    if (!buyer) return {};
    return {
      name: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
    };
  }

  function installCalSnippet() {
    (function (C, A, L) {
      const p = function (a, ar) { a.q.push(ar); };
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const script = d.createElement('script');
          script.onerror = calendarError;
          script.src = A;
          d.head.appendChild(script);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, `${CAL_ORIGIN}/embed/embed.js`, 'init');
    return window.Cal;
  }

  function setFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement) || frame.src === 'about:blank') return;
    try {
      const frameUrl = new URL(frame.src, CAL_ORIGIN);
      if (frameUrl.origin !== CAL_ORIGIN || frameUrl.searchParams.get('embed') !== CAL_NAMESPACE) return;
    } catch (_) { return; }
    if (calFrame === frame) return;
    calFrame = frame;
    frame.title = 'Agenda e pagamento da consultoria individual';
    frame.setAttribute('allow', 'payment');
    frame.setAttribute('loading', 'eager');
    if (restorePaymentUid) navigateToSavedPayment();
  }

  function navigateToSavedPayment() {
    const saved = readSavedCalPayment();
    if (!saved || !calFrame) return;
    restorePaymentUid = saved.uid;
    const target = `${CAL_ORIGIN}/payment/${encodeURIComponent(saved.uid)}?embed=${encodeURIComponent(CAL_NAMESPACE)}`;
    if (calFrame.src !== target) calFrame.src = target;
  }

  function watchCalendarFrame() {
    const observer = new MutationObserver(() => {
      widget.querySelectorAll('iframe').forEach(setFrame);
    });
    observer.observe(widget, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    widget.querySelectorAll('iframe').forEach(setFrame);
  }

  function initializeCalendar() {
    if (embedStarted) return;
    embedStarted = true;
    watchCalendarFrame();
    get('retryCalendar').hidden = true;
    feedback('Carregando a agenda…');

    const start = () => {
      const Cal = installCalSnippet();
      if (typeof Cal !== 'function') throw new Error('Cal embed unavailable');
      Cal('init', CAL_NAMESPACE, { origin: CAL_ORIGIN });
      const namespace = Cal.ns?.[CAL_NAMESPACE];
      if (typeof namespace !== 'function') throw new Error('Cal embed namespace unavailable');
      const config = buyerForCal();
      namespace('inline', {
        elementOrSelector: '#calBookingWidget',
        calLink: CAL_LINK,
        config: {
          ...config,
          whatsapp: config.phone,
          attendeePhoneNumber: config.phone,
          theme: 'dark',
          layout: 'month_view',
        },
      });
      namespace('ui', {
        theme: 'dark',
        styles: { branding: { brandColor: '#c5ff5e' } },
      });
      feedback('Escolha um horário de 60 minutos. O pagamento e a confirmação acontecem aqui.');
      if (restorePaymentUid) window.setTimeout(navigateToSavedPayment, 250);
    };

    try {
      start();
    } catch (_) { calendarError(); }
  }

  function calendarError() {
    embedStarted = false;
    if (window.Cal) window.Cal.loaded = false;
    feedback('A agenda não carregou. Tente novamente em alguns instantes.', true);
    get('retryCalendar').hidden = false;
  }

  function validBuyer(buyer) {
    if (!buyer || typeof buyer !== 'object' || Array.isArray(buyer)) return null;
    const clean = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180) : '';
    const name = clean(buyer.name);
    const email = clean(buyer.email);
    const phone = clean(buyer.phone).replace(/[^+\d]/g, '').slice(0, 20);
    const cpfCnpj = clean(buyer.cpfCnpj).replace(/\D/g, '').slice(0, 14);
    const cardHolderName = clean(buyer.cardHolderName).slice(0, 120);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) return null;
    return { name, email, phone, cpfCnpj, cardHolderName };
  }

  window.addEventListener('message', event => {
    if (event.origin !== CAL_ORIGIN || !calFrame || event.source !== calFrame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;

    if (data.type === 'imobiturbo:payment-ready') {
      if (typeof data.paymentUid !== 'string' || !UUID.test(data.paymentUid)) return;
      const saved = readSavedCalPayment();
      if (saved && saved.uid !== data.paymentUid) {
        restorePaymentUid = saved.uid;
        navigateToSavedPayment();
        return;
      }
      saveCalPayment(data.paymentUid);
      restorePaymentUid = data.paymentUid;
      const buyer = validBuyer(sessions.getUpsellBuyer?.());
      if (!buyer) return;
      calFrame.contentWindow.postMessage({ type: 'imobiturbo:buyer', buyer }, CAL_ORIGIN);
      return;
    }

    if (data.type === 'imobiturbo:payment-expired') {
      const saved = readSavedCalPayment();
      if (!saved || data.paymentUid !== saved.uid) return;
      clearCalPayment();
      feedback('A reserva de pagamento expirou. Escolha outro horário na agenda para iniciar um novo checkout.');
      return;
    }

    if (data.type === 'imobiturbo:booking-paid') {
      const saved = readSavedCalPayment();
      if (!saved || data.paymentUid !== saved.uid || typeof data.bookingUid !== 'string' || !CAL_BOOKING_UID.test(data.bookingUid)) return;
      clearCalPayment();
      if (timer) clearInterval(timer);
      paid = true;
      get('confirmedBookingLink').href = `${CAL_ORIGIN}/booking/${encodeURIComponent(data.bookingUid)}`;
      sessions.clearUpsellBuyer?.();
      consulting.stop();
      get('offerContent').hidden = true;
      get('finalInvite').hidden = true;
      get('consultingBooked').hidden = false;
      refreshStickyCta();
    }
  });

  function setupDemoTabs() {
    const tabs = Array.from(document.querySelectorAll('[data-demo-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-demo-panel]'));
    if (!tabs.length || !panels.length) return;

    const activate = (activeTab, { focus = false, track = false } = {}) => {
      const panelId = activeTab.getAttribute('aria-controls');
      tabs.forEach(tab => {
        const selected = tab === activeTab;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.id !== panelId; });
      if (focus) activeTab.focus();
      if (track) trackHubEvent('upsell_demo_selected', { demo: activeTab.dataset.demoTab || 'unknown' });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab, { track: true }));
      tab.addEventListener('keydown', event => {
        let nextIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activate(tabs[nextIndex], { focus: true, track: true });
      });
    });

    activate(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  }

  function setupProfileComparison() {
    const buttons = Array.from(document.querySelectorAll('[data-profile-toggle]'));
    const frames = Array.from(document.querySelectorAll('[data-profile-state]'));
    if (!buttons.length || !frames.length) return;

    const activate = (state, track = false) => {
      frames.forEach(frame => frame.classList.toggle('is-active', frame.dataset.profileState === state));
      buttons.forEach(button => {
        const selected = button.dataset.profileToggle === state;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      if (track) trackHubEvent('upsell_profile_comparison_selected', { state });
    };

    buttons.forEach(button => button.addEventListener('click', () => activate(button.dataset.profileToggle, true)));
    activate(buttons.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.profileToggle || 'before');
  }

  function setupPhotoComparison() {
    const comparison = get('photoComparison');
    const range = get('photoRange');
    const handle = get('photoComparisonHandle');
    const buttons = Array.from(document.querySelectorAll('[data-photo-position]'));
    if (!comparison || !range || !handle) return;

    const descriptionFor = value => {
      if (value <= 0) return 'Somente a imagem antes do tratamento está visível';
      if (value >= 100) return 'Somente a imagem depois do tratamento está visível';
      if (value === 50) return 'Metade da imagem tratada está visível';
      return `${value}% da imagem tratada está visível`;
    };
    const update = rawValue => {
      const value = Math.min(100, Math.max(0, Number(rawValue) || 0));
      comparison.style.setProperty('--comparison-position', `${value}%`);
      range.value = String(value);
      handle.setAttribute('aria-valuenow', String(value));
      range.setAttribute('aria-valuetext', descriptionFor(value));
      handle.setAttribute('aria-valuetext', descriptionFor(value));
      buttons.forEach(button => {
        const selected = Number(button.dataset.photoPosition) === value;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      return value;
    };

    range.addEventListener('input', () => update(range.value));
    range.addEventListener('change', () => trackHubEvent('upsell_photo_comparison_changed', { position: update(range.value) }));
    let dragging = false;
    let moved = false;
    let skipClick = false;
    let startX = 0;
    const updateFromPointer = event => {
      const bounds = comparison.getBoundingClientRect();
      update(((event.clientX - bounds.left) / bounds.width) * 100);
    };
    handle.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      handle.setPointerCapture(event.pointerId);
      updateFromPointer(event);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (dragging) {
        if (Math.abs(event.clientX - startX) > 4) moved = true;
        updateFromPointer(event);
      }
    });
    const finishDrag = event => {
      if (!dragging) return;
      dragging = false;
      skipClick = moved;
      trackHubEvent('upsell_photo_comparison_changed', { position: update(range.value), control: 'handle' });
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);
    handle.addEventListener('click', () => {
      if (skipClick) {
        skipClick = false;
        return;
      }
      const position = update(Number(range.value) <= 50 ? 75 : 25);
      trackHubEvent('upsell_photo_comparison_changed', { position, control: 'handle_click' });
    });
    handle.addEventListener('keydown', event => {
      let next = Number(range.value);
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= event.shiftKey ? 10 : 1;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += event.shiftKey ? 10 : 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = 100;
      else return;
      event.preventDefault();
      trackHubEvent('upsell_photo_comparison_changed', { position: update(next), control: 'handle' });
    });
    buttons.forEach(button => button.addEventListener('click', () => {
      const position = update(button.dataset.photoPosition);
      trackHubEvent('upsell_photo_comparison_changed', { position, control: 'button' });
      range.focus();
    }));
    update(range.value);
  }

  function setupMaterialPreviews() {
    const dialog = get('materialDialog');
    const body = get('materialDialogBody');
    const title = get('materialDialogTitle');
    const note = get('materialDialogNote');
    const close = get('materialDialogClose');
    if (!dialog || !body || !title || !note || !close) return;

    const removeDuplicateReferences = clone => {
      [clone, ...clone.querySelectorAll('[id]')].forEach(node => node.removeAttribute('id'));
      clone.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], label[for]').forEach(node => {
        node.removeAttribute('aria-labelledby');
        node.removeAttribute('aria-describedby');
        node.removeAttribute('aria-controls');
        node.removeAttribute('for');
      });
      return clone;
    };

    document.querySelectorAll('[data-preview-source]').forEach(button => button.addEventListener('click', () => {
      const sourceId = button.dataset.previewSource;
      const source = get(sourceId);
      if (!source) return;
      lastPreviewTrigger = button;
      title.textContent = button.dataset.previewTitle || 'Prévia do material';
      note.textContent = button.dataset.previewNote || 'Exemplo de material; o seu será adaptado ao que trabalharmos.';
      body.replaceChildren(removeDuplicateReferences(source.cloneNode(true)));
      if (!dialog.open) dialog.showModal();
      document.body.classList.add('preview-open');
      refreshStickyCta();
      close.focus({ preventScroll: true });
      trackHubEvent('upsell_material_opened', { material: sourceId });
    }));

    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('preview-open');
      refreshStickyCta();
      body.replaceChildren();
      if (lastPreviewTrigger?.isConnected) lastPreviewTrigger.focus({ preventScroll: true });
      lastPreviewTrigger = null;
    });
  }

  function setupFutureVideo() {
    const shell = document.querySelector('.hero-media-shell');
    const staticMedia = shell?.querySelector('[data-static-media]');
    const rawVideo = shell?.dataset.videoUrl?.trim();
    if (!shell || !staticMedia || !rawVideo) return;

    const validUrl = value => {
      if (!value) return '';
      try {
        const parsed = new URL(value, window.location.href);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
      } catch (_) {
        return '';
      }
    };
    const videoUrl = validUrl(rawVideo);
    if (!videoUrl) return;

    const video = document.createElement('video');
    video.className = 'hero-media-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.hidden = true;
    video.src = videoUrl;
    video.setAttribute('aria-label', 'Vídeo de apresentação da Implementação Expressa');
    const poster = validUrl(shell.dataset.videoPoster?.trim());
    if (poster) video.poster = poster;
    video.addEventListener('loadedmetadata', () => {
      staticMedia.hidden = true;
      video.hidden = false;
    }, { once: true });
    video.addEventListener('error', () => {
      video.remove();
      staticMedia.hidden = false;
    }, { once: true });
    shell.append(video);
  }

  function setupStickyCta() {
    const sticky = get('stickyCta');
    const hero = get('oferta');
    const access = get('acessos');
    const offer = get('offerContent');
    if (!sticky || !hero || !access || !offer) return;
    const stickyButton = sticky.querySelector('button');
    let animationFrame = 0;

    const update = () => {
      animationFrame = 0;
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      const heroPassed = hero.getBoundingClientRect().bottom <= 0;
      const accessReached = access.getBoundingClientRect().top <= window.innerHeight * .9;
      const dialogOpen = modal.open || Boolean(get('materialDialog')?.open);
      const visible = mobile && heroPassed && !accessReached && !offer.hidden && !paid && !dialogOpen;
      sticky.classList.toggle('is-visible', visible);
      sticky.toggleAttribute('inert', !visible);
      sticky.setAttribute('aria-hidden', String(!visible));
      if (stickyButton) stickyButton.tabIndex = visible ? 0 : -1;
    };
    refreshStickyCta = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', refreshStickyCta, { passive: true });
    window.addEventListener('resize', refreshStickyCta);
    window.addEventListener('pageshow', refreshStickyCta);
    refreshStickyCta();
  }

  function setupRevealEntries() {
    const nodes = Array.from(document.querySelectorAll('.section-heading, .materials-heading, .demo-panel, .recording-preview, .plan-panel, .mindmap-panel, .pdf-panel, .process-list > li, .closing-layout, .faq-list > details'));
    if (!nodes.length) return;
    nodes.forEach(node => node.classList.add('reveal-item'));
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(node => node.classList.add('has-entered'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('has-entered');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    nodes.forEach(node => observer.observe(node));
  }

  setupDemoTabs();
  setupProfileComparison();
  setupPhotoComparison();
  setupMaterialPreviews();
  setupFutureVideo();
  setupStickyCta();
  setupRevealEntries();

  get('retryCalendar').addEventListener('click', () => {
    widget.replaceChildren();
    calFrame = null;
    embedStarted = false;
    initializeCalendar();
  });
  get('copyPix').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(get('pixCode').value); feedback('Código copiado. Abra seu banco e escolha Pix copia e cola.'); }
    catch (_) { get('pixCode').focus(); get('pixCode').select(); feedback('Selecione e copie o código acima para colar no seu banco.'); }
  });

  document.querySelectorAll('[data-open-checkout]').forEach(button => button.addEventListener('click', () => {
    showCheckout(button);
    if (consulting.read()) consulting.start();
  }));
  get('consultingModalClose').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    const triggerToRestore = lastTrigger;
    lastTrigger = null;
    document.body.classList.remove('checkout-open');
    refreshStickyCta();
    if (!paid) {
      userClosedPending = Boolean(consulting.read());
      get('finalInvite').hidden = false;
      window.requestAnimationFrame(() => {
        if (triggerToRestore?.isConnected) triggerToRestore.focus({ preventScroll: true });
      });
    }
  });

  function formatPhoneDisplay(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const digits = raw.replace(/\D/g, '');
    const clean = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return raw;
  }

  function setAccessIdentity(email, phone) {
    const copy = get('accessIdentityCopy');
    if (!copy) return;
    const safeEmail = typeof email === 'string' ? email.trim() : '';
    const safePhone = typeof phone === 'string' ? formatPhoneDisplay(phone.trim()) : '';
    if (safeEmail) {
      get('accessIdentityEmail').textContent = safeEmail;
      get('accessIdentityEmailRepeat').textContent = safeEmail;
    }
    if (safePhone) get('accessIdentityPhone').textContent = safePhone;
    if (safeEmail || safePhone) {
      copy.hidden = false;
      get('accessEmailFallback').hidden = true;
    }
  }

  // Keep the existing community-access identity hint; it is never added to a URL.
  try {
    for (const key of ['imobiturbo:vagas:checkout:v1', 'imobiturbo:vagas-v2:checkout:v1']) {
      const draft = JSON.parse(localStorage.getItem(key));
      if (draft && Number.isFinite(draft.expiresAt) && draft.expiresAt > Date.now()) {
        if (typeof draft.email === 'string' && !sessions.getUpsellBuyer?.()?.email) {
          setAccessIdentity(draft.email, draft.phone);
        }
        break;
      }
    }
  } catch (_) {}
  const buyer = sessions.getUpsellBuyer?.();
  if (buyer?.email) {
    setAccessIdentity(buyer.email, buyer.phone);
  }
  document.querySelectorAll('a[href="#acessos"]').forEach(link => link.addEventListener('click', () => sessions.clearUpsellBuyer?.()));

  function resume() {
    if (consulting.read()) consulting.start();
    if (community.read()) community.start();
  }
  window.addEventListener('pageshow', event => { if (event.persisted) resume(); });
  window.addEventListener('storage', event => { if ([sessions.COMMUNITY_KEY, sessions.CONSULTING_KEY].includes(event.key)) resume(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume(); });
  if (consulting.read()) {
    showCheckout();
    consulting.start();
  } else if (restorePaymentUid) {
    showCheckout();
  }
  if (community.read()) community.start();
})();
