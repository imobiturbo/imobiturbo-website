(function () {
  'use strict';

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
  let timer = null;
  let paid = false;
  let lastTrigger = null;
  let userClosedPending = false;
  let calFrame = null;
  let embedStarted = false;
  let restorePaymentUid = readSavedCalPayment()?.uid || '';

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
    if (trigger) lastTrigger = trigger;
    userClosedPending = false;
    get('finalInvite').hidden = true;
    if (!modal.open) modal.showModal();
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
    }
  });

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
    if (!paid) {
      userClosedPending = Boolean(consulting.read());
      get('finalInvite').hidden = false;
      if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  });

  // Keep the existing community-access identity hint; it is never added to a URL.
  try {
    for (const key of ['imobiturbo:vagas:checkout:v1', 'imobiturbo:vagas-v2:checkout:v1']) {
      const draft = JSON.parse(localStorage.getItem(key));
      if (draft && Number.isFinite(draft.expiresAt) && draft.expiresAt > Date.now()) {
        if (typeof draft.email === 'string' && !sessions.getUpsellBuyer?.()?.email) {
          get('accessEmail').textContent = draft.email;
          get('accessEmailPanel').hidden = false;
          get('accessEmailFallback').hidden = true;
        }
        break;
      }
    }
  } catch (_) {}
  const buyer = sessions.getUpsellBuyer?.();
  if (buyer?.email) {
    get('accessEmail').textContent = buyer.email;
    get('accessEmailPanel').hidden = false;
    get('accessEmailFallback').hidden = true;
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
