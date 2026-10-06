(function (root) {
  'use strict';
  const TTL = 30 * 60 * 1000;
  const COMMUNITY_KEY = 'imobiturbo:checkout:community:v2';
  const CONSULTING_KEY = 'imobiturbo:checkout:consulting:v2';
  const UPSELL_BUYER_KEY = 'imobiturbo:checkout:upsell-buyer:v1';
  const UPSELL_BUYER_TTL = 2 * 60 * 60 * 1000;
  const DRAFT_KEYS = ['imobiturbo:vagas:checkout:v1', 'imobiturbo:vagas-v2:checkout:v1'];
  const COMMUNITY_INTENT_KEY = 'imobiturbo:checkout:community-intent:v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isAsaasInvoiceUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' &&
      ['www.asaas.com', 'asaas.com', 'sandbox.asaas.com'].includes(url.hostname) &&
      !url.username && !url.password && /^\/i\/[a-zA-Z0-9_-]+$/.test(url.pathname); }
    catch (_) { return false; }
  }

  // Financial intent exists before the POST response/payment ID. It has no TTL:
  // losing a response must not erase the only key that can recover that charge.
  function createCommunityIntent(options = {}) {
    let storage;
    try { storage = options.storage || root.localStorage; } catch (_) {}
    const fetcher = options.fetch || root.fetch.bind(root);
    const uuid = options.uuid || (() => root.crypto.randomUUID());
    let busy = null;
    function read() {
      if (!storage) return null;
      const raw = storage.getItem(COMMUNITY_INTENT_KEY);
      if (!raw) return null;
      let value;
      try { value = JSON.parse(raw); } catch (_) { throw new Error('Não foi possível recuperar a compra anterior.'); }
      if (value?.version !== 1 || !UUID.test(value.idempotencyKey || '') || !/^[0-9a-f]{64}$/.test(value.fingerprint || '') ||
          !['prepared', 'submitting', 'uncertain', 'created', 'failed'].includes(value.state)) throw new Error('Não foi possível recuperar a compra anterior.');
      return value;
    }
    function write(value) {
      if (!storage) throw new Error('Ative o armazenamento do navegador para recuperar esta compra com segurança.');
      storage.setItem(COMMUNITY_INTENT_KEY, JSON.stringify(value));
      if (storage.getItem(COMMUNITY_INTENT_KEY) !== JSON.stringify(value)) throw new Error('Não foi possível salvar esta compra com segurança.');
      return value;
    }
    async function fingerprint(payload) {
      const safe = { plan: payload.plan, paymentMethod: payload.paymentMethod, installments: Number(payload.installments || 1),
        name: String(payload.name || '').trim(), email: String(payload.email || '').trim().toLowerCase(), phone: String(payload.phone || '').replace(/\D/g, '') };
      const digest = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(safe)));
      return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    }
    async function recover() {
      const intent = read(); if (!intent) return null;
      const response = await fetcher('/api/checkout/status?' + new URLSearchParams({ gateway: 'asaas', idempotencyKey: intent.idempotencyKey, eventId: intent.eventId }), { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Estamos conferindo a compra anterior. Tente novamente em instantes.');
      // A financial key never becomes the attribution eid on recovery.
      result.eventId = intent.eventId;
      write({ ...intent, state: result.orderStatus === 'created' ? 'created' : result.retryCreationAllowed ? 'failed' : 'uncertain',
        checkoutOrderId: result.checkoutOrderId || intent.checkoutOrderId || null });
      return result;
    }
    function begin(payload) {
      if (busy) return busy;
      const operation = async () => {
        const hash = await fingerprint(payload);
        let intent = read();
        if (intent) {
          const result = await recover();
          if (!result.retryCreationAllowed) return { result };
          if (intent.fingerprint !== hash) {
            // MISSING permits retrying the same immutable intention. An older
            // POST may still be in flight, so it never authorizes a fresh key.
            if (result.orderStatus !== 'failed') return { result };
            intent = null;
          }
        }
        if (!intent) {
          const key = uuid();
          const eid = payload.eventId || uuid();
          if (key === eid) throw new Error('Identificador da compra inválido.');
          intent = write({ version: 1, idempotencyKey: key, fingerprint: hash, eventId: eid,
            checkoutMode: payload.checkoutMode === 'hosted' ? 'hosted' : 'transparent', plan: payload.plan, method: payload.paymentMethod, installmentCount: Number(payload.installments || 1), state: 'prepared', checkoutOrderId: null });
        }
        write({ ...intent, state: 'submitting' });
        return { payload: { ...payload, idempotencyKey: intent.idempotencyKey, eventId: intent.eventId } };
      };
      busy = (root.navigator?.locks ? root.navigator.locks.request(COMMUNITY_INTENT_KEY, operation) : operation()).finally(() => { busy = null; });
      return busy;
    }
    function uncertain() { const intent = read(); if (intent) write({ ...intent, state: 'uncertain' }); }
    function received(result) {
      const intent = read(); if (!intent) return;
      write({ ...intent, state: result.orderStatus === 'created' ? 'created' : result.retryCreationAllowed ? 'failed' : 'uncertain',
        checkoutOrderId: result.checkoutOrderId || intent.checkoutOrderId || null });
    }
    function complete() { storage?.removeItem(COMMUNITY_INTENT_KEY); }
    return { read, begin, recover, received, uncertain, complete };
  }

  function create(options) {
    const now = options.now || Date.now;
    const fetcher = options.fetch || root.fetch.bind(root);
    let storage;
    try { storage = options.storage || root.localStorage; } catch (_) {}
    let storageAvailable = Boolean(storage);
    let memory = null;
    let polling = null;
    let inFlight = null;

    function normalize(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          !/^[a-zA-Z0-9_-]{1,160}$/.test(value.paymentId || '') ||
          value.gateway !== 'asaas' || !options.plans.includes(value.plan) ||
          value.productId !== options.productId ||
          !Number.isFinite(Date.parse(value.expiresAt))) return null;
      const pix = value.pix || {};
      const installmentCount = Number(value.installmentCount);
      const offerCodes = ['consultoria-a-vista', 'consultoria-12x49', ...Array.from({ length: 11 }, (_, index) => `consultoria-${index + 2}x`)];
      return {
        checkoutMode: value.checkoutMode === 'hosted' ? 'hosted' : 'transparent',
        invoiceUrl: isAsaasInvoiceUrl(value.invoiceUrl) ? value.invoiceUrl : null,
        version: 2, paymentId: value.paymentId, gateway: 'asaas',
        plan: value.plan, productId: options.productId,
        eventId: typeof value.eventId === 'string' ? value.eventId.slice(0, 250) : '',
        amount: Number(value.amount) || 0,
        chargeAmount: Number(value.chargeAmount) || 0,
        installmentCount: Number.isInteger(installmentCount) && installmentCount >= 1 && installmentCount <= 12 ? installmentCount : 1,
        installmentValue: Number(value.installmentValue) || 0,
        offerCode: offerCodes.includes(value.offerCode) ? value.offerCode : '',
        orderId: typeof value.orderId === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value.orderId) ? value.orderId : '',
        method: value.method === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
        expiresAt: value.expiresAt,
        paid: value.paid === true,
        managedCommunity: value.managedCommunity === true,
        checkoutOrderId: UUID.test(value.checkoutOrderId || '') ? value.checkoutOrderId : null,
        pix: {
          copyPaste: typeof pix.copyPaste === 'string' ? pix.copyPaste.slice(0, 4096) : '',
          qrCodeBase64: typeof pix.qrCodeBase64 === 'string' && pix.qrCodeBase64.length < 512000 &&
            /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(pix.qrCodeBase64) ? pix.qrCodeBase64 : '',
        },
      };
    }

    function read() {
      if (!storageAvailable) return memory;
      try {
        const raw = storage.getItem(options.key);
        memory = raw ? normalize(JSON.parse(raw)) : null;
        if (raw && !memory) storage.removeItem(options.key);
      } catch (_) {
        memory = null;
        try { storage.removeItem(options.key); } catch (_) { storageAvailable = false; }
      }
      return memory;
    }

    // Whitelist persisted fields: never persist CPF, card number, CVV or address.
    function save(data, extra = {}) {
      const record = normalize({
        ...data, ...extra,
        productId: data.productId || options.productId,
        expiresAt: data.pix?.expiresAt || data.expiresAt || new Date(now() + TTL).toISOString(),
      });
      if (!record) throw new Error('Não foi possível recuperar os dados deste pagamento.');
      memory = record;
      if (storageAvailable) {
        try { storage.setItem(options.key, JSON.stringify(record)); }
        catch (_) { storageAvailable = false; }
      }
      return record;
    }

    function stop() {
      if (polling) root.clearInterval(polling);
      polling = null;
    }

    function clear() {
      stop();
      memory = null;
      try { storage?.removeItem(options.key); } catch (_) {}
    }

    function check() {
      if (inFlight) return inFlight;
      const record = read();
      if (!record) return Promise.resolve(null);
      if (record.paid === true) {
        stop();
        options.onPaid?.(record);
        return Promise.resolve(record);
      }
      inFlight = (async () => {
        const controller = new AbortController();
        const timeout = root.setTimeout(() => controller.abort(), 10000);
        try {
          const query = new URLSearchParams({ gateway: record.gateway, paymentId: record.paymentId });
          if (record.managedCommunity && record.eventId) query.set('eventId', record.eventId);
          if (record.method === 'PIX' && (!record.pix.copyPaste || !record.pix.qrCodeBase64)) query.set('includePix', '1');
          const response = await fetcher('/api/checkout/status?' + query, {
            cache: 'no-store', signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error('Não foi possível consultar o pagamento. Vamos tentar novamente.');
          if (read()?.paymentId !== record.paymentId) return null;
          if (data.productId !== options.productId || data.plan !== record.plan) {
            throw new Error('Não foi possível confirmar os dados deste pagamento.');
          }
          // Payment approval wins over the checkout deadline, including on return.
          if (data.paid === true) {
            const approved = { ...record, ...data, paid: true };
            if (record.managedCommunity) approved.eventId = record.eventId;
            save(approved, { method: record.method, expiresAt: record.expiresAt, paid: true });
            stop();
            options.onPaid?.(approved);
            return approved;
          }
          const terminal = data.deleted || ['REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DELETED', 'CANCELED', 'CANCELLED', 'REJECTED', 'INACTIVE'].includes(data.status);
          const providerDeadline = Date.parse(data.expiresAt);
          const expiresAt = new Date(Math.min(Date.parse(record.expiresAt), Number.isFinite(providerDeadline) ? providerDeadline : Infinity)).toISOString();
          if (terminal || (!record.managedCommunity && now() >= Date.parse(expiresAt))) {
            clear();
            options.onExpired?.(record);
            return { expired: true };
          }
          const updated = save({ ...record, ...data, pix: { ...(data.pix || record.pix), expiresAt },
            // Polling cannot extend a deadline stored when the charge was created.
            expiresAt }, { method: record.method });
          options.onPending?.(updated);
          return updated;
        } catch (error) {
          // Keep the record on outage; throwing it away could create a second charge.
          options.onError?.(error);
          return { error: true };
        } finally {
          root.clearTimeout(timeout);
        }
      })().finally(() => { inFlight = null; });
      return inFlight;
    }

    function start() {
      stop();
      const record = read();
      if (!record) return Promise.resolve(null);
      if (record.paid === true) {
        options.onPaid?.(record);
        return Promise.resolve(record);
      }
      options.onPending?.(record);
      polling = root.setInterval(check, record.managedCommunity ? 15000 : 3000);
      return check();
    }

    return { read, save, clear, check, start, stop };
  }

  function clearDraft() {
    for (const key of DRAFT_KEYS) {
      try { root.localStorage.removeItem(key); } catch (_) {}
    }
  }

  function createUpsellBuyerProfile(options = {}) {
    const now = options.now || Date.now;
    let storage;
    try { storage = options.storage || root.sessionStorage; } catch (_) {}

    function clear() {
      try { storage?.removeItem(UPSELL_BUYER_KEY); } catch (_) {}
    }

    function normalize(value, expiresAt) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const cleanText = (input, limit) => typeof input === 'string'
        ? input.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : '';
      const profile = {
        version: 1,
        expiresAt: new Date(expiresAt).toISOString(),
        name: cleanText(value.name, 120),
        email: cleanText(value.email, 180),
        phone: cleanText(value.phone, 20),
        cpfCnpj: typeof value.cpfCnpj === 'string' ? value.cpfCnpj.replace(/\D/g, '').slice(0, 14) : '',
        cardHolderName: cleanText(value.cardHolderName, 120),
      };
      return profile.name && profile.email && profile.phone && profile.cpfCnpj.length === 11 ? profile : null;
    }

    function save(value) {
      if (!storage) return false;
      const profile = normalize(value, now() + UPSELL_BUYER_TTL);
      if (!profile) return false;
      try {
        storage.setItem(UPSELL_BUYER_KEY, JSON.stringify(profile));
        return true;
      } catch (_) { return false; }
    }

    function read() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(UPSELL_BUYER_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        const expiresAt = Date.parse(saved?.expiresAt);
        if (saved?.version !== 1 || !Number.isFinite(expiresAt) || expiresAt <= now()) {
          clear();
          return null;
        }
        const profile = normalize(saved, expiresAt);
        if (!profile) clear();
        return profile;
      } catch (_) {
        clear();
        return null;
      }
    }

    return { save, read, clear };
  }

  const upsellBuyerProfile = createUpsellBuyerProfile();

  function bindLanding(api) {
    const get = id => root.document.getElementById(id);
    const pane = get('chkStepPane4');
    const notice = root.document.createElement('p');
    notice.id = 'chkPendingNotice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'font-size:14px;line-height:1.5;color:#d4ff53;margin:12px 0';
    notice.hidden = true;
    pane.prepend(notice);
    const externalLink = root.document.createElement('a');
    externalLink.id = 'chkExternalLink'; externalLink.className = 'chk-btn-submit'; externalLink.hidden = true; externalLink.style.setProperty('display', 'none', 'important');
    externalLink.textContent = 'Continuar pagamento no Asaas'; externalLink.rel = 'noopener';
    pane.prepend(externalLink);
    let timer = null;
    let recoveryTimer = null;
    let recovering = false;
    const intent = createCommunityIntent();

    function locked(value) {
      pane.querySelectorAll('input, select, button').forEach(control => {
        if (control.id !== 'chkCopyPixBtn') control.disabled = value;
      });
      if (get('chkBackToStep3Btn')) get('chkBackToStep3Btn').disabled = value;
    }

    function render(record) {
      api.selectPlan(record.plan);
      api.goToCheckoutStep(4);
      locked(true);
      notice.hidden = false;
      externalLink.hidden = !(record.checkoutMode === 'hosted' && isAsaasInvoiceUrl(record.invoiceUrl));
      externalLink.style.setProperty('display', externalLink.hidden ? 'none' : 'flex', 'important');
      if (!externalLink.hidden) {
        externalLink.href = record.invoiceUrl;
        notice.textContent = 'Sua compra está aberta. Conclua na página segura do Asaas.';
        get('chkCardView').style.display = 'none'; get('chkPixView').style.display = 'none';
        return;
      }
      const isPix = record.method === 'PIX';
      notice.textContent = isPix ? record.pix.copyPaste ?
        'Seu Pix está aberto. Use o mesmo código para concluir.' :
        'A cobrança foi criada. Recuperando o QR Code, sem gerar outro Pix…' :
        'Seu cartão está em análise. Aguardando a confirmação do pagamento.';
      get('chkCardView').style.display = 'none';
      get('chkPixView').style.display = isPix ? 'block' : 'none';
      for (const [id, active] of [['chkTabPix', isPix], ['chkTabCard', !isPix]]) {
        get(id).classList.toggle('active', active);
        get(id).setAttribute('aria-selected', String(active));
      }
      get('chkPixFormBlock').style.display = 'none';
      get('chkPixResultBlock').style.display = 'block';
      const qr = get('chkPixQrImg');
      if (record.pix.qrCodeBase64) qr.src = record.pix.qrCodeBase64;
      const tick = () => {
        const left = Math.max(0, Math.ceil((Date.parse(record.expiresAt) - Date.now()) / 1000));
        get('chkPixTimer').textContent = left ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` : 'Verificando pagamento…';
        qr.hidden = !left || !record.pix.qrCodeBase64;
        get('chkPixCopiaCola').value = left ? record.pix.copyPaste : '';
        get('chkCopyPixBtn').disabled = !left || !record.pix.copyPaste;
        if (!left) notice.textContent = 'Conferindo o pagamento antes de encerrar este checkout…';
      };
      if (timer) root.clearInterval(timer);
      timer = root.setInterval(tick, 1000);
      tick();
    }

    const session = create({
      key: COMMUNITY_KEY, productId: 'comunidade-imobiturbo',
      plans: ['anual', 'semestral', 'trimestral', 'mensal'],
      onPending: record => {
        if (record.method === 'PIX' && record.paymentId && record.pix?.copyPaste && record.pix?.qrCodeBase64) api.trackCheckoutStage?.('PIX', record);
        render(record);
      },
      onExpired: () => {
        if (timer) root.clearInterval(timer);
        api.resetTrackingCheckout?.();
        upsellBuyerProfile.clear();
        clearDraft();
        api.form?.reset();
        for (const id of ['chkName', 'chkPhone', 'chkEmail', 'chkCardNumber', 'chkCardHolder', 'chkCardExpiry', 'chkCardCvv', 'chkCardCpf', 'chkPixCpf']) {
          if (get(id)) get(id).value = '';
        }
        notice.hidden = true; externalLink.hidden = true; externalLink.style.setProperty('display', 'none', 'important');
        locked(false);
        get('chkPixFormBlock').style.display = 'block';
        get('chkPixResultBlock').style.display = 'none';
        get('chkPixCopiaCola').value = '';
        get('chkPixQrImg').removeAttribute('src');
        get('chkCardView').style.display = 'block';
        get('chkPixView').style.display = 'none';
        get('chkTabCard').classList.add('active');
        get('chkTabCard').setAttribute('aria-selected', 'true');
        get('chkTabPix').classList.remove('active');
        get('chkTabPix').setAttribute('aria-selected', 'false');
        api.updatePaymentSummary?.();
        api.goToCheckoutStep(1);
        api.updateCheckoutPersonalization();
        api.showCheckoutError('Este checkout expirou ou foi encerrado. Preencha seus dados para iniciar novamente.');
      },
      onError: () => api.showCheckoutError('Não foi possível consultar o pagamento agora. Ele foi mantido; tentaremos novamente automaticamente.'),
      onPaid: result => {
        intent.complete();
        if (recoveryTimer) root.clearInterval(recoveryTimer);
        if (timer) root.clearInterval(timer);
        api.trackHubPurchase(result);
        root.location.replace('/vagas-obrigado');
      },
    });
    async function recoverIntent() {
      if (recovering) return;
      recovering = true;
      try {
        const result = await intent.recover();
        if (!result) return;
        if (result.paymentId) {
          if (recoveryTimer) root.clearInterval(recoveryTimer);
          recoveryTimer = null;
          session.save(result, { method: intent.read()?.method || 'PIX', checkoutMode: intent.read()?.checkoutMode });
          return session.start();
        }
        if (result.retryCreationAllowed) {
          if (recoveryTimer) root.clearInterval(recoveryTimer);
          recoveryTimer = null; locked(false); notice.hidden = true;
          api.showCheckoutError('A cobrança não foi criada. Você pode tentar novamente com os dados do pagamento.');
        }
      } catch (_) { notice.textContent = 'Estamos conferindo sua compra. Ela foi mantida; tentaremos novamente.'; }
      finally { recovering = false; }
    }
    function keepIntent() {
      const saved = intent.read(); if (!saved) return;
      api.selectPlan(saved.plan); api.goToCheckoutStep(4); locked(true);
      notice.hidden = false; notice.textContent = 'Estamos conferindo sua compra, sem criar outra cobrança.';
      if (!recoveryTimer) recoveryTimer = root.setInterval(recoverIntent, 15000);
      return recoverIntent();
    }
    return {
      ...session,
      intent,
      pendingIntent: () => { const value = intent.read(); return value && value.state !== 'failed' ? value : null; },
      keepIntent,
      start() {
        if (session.read()) return session.start();
        if (intent.read()) return keepIntent();
        return session.start();
      },
      capture(result, extra = {}) {
        const { upsellBuyer, ...sessionExtra } = extra || {};
        if (upsellBuyer) upsellBuyerProfile.save(upsellBuyer);
        session.save(result, sessionExtra);
        return session.start();
      },
      stop() { session.stop(); if (timer) root.clearInterval(timer); if (recoveryTimer) root.clearInterval(recoveryTimer); },
    };
  }

  root.ImobiturboCheckoutSession = {
    isAsaasInvoiceUrl, create, bindLanding, clearDraft, TTL, COMMUNITY_KEY, CONSULTING_KEY,
    createUpsellBuyerProfile, UPSELL_BUYER_KEY, UPSELL_BUYER_TTL,
    createCommunityIntent, COMMUNITY_INTENT_KEY,
    saveUpsellBuyer: upsellBuyerProfile.save,
    getUpsellBuyer: upsellBuyerProfile.read,
    clearUpsellBuyer: upsellBuyerProfile.clear,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ImobiturboCheckoutSession;
})(typeof window !== 'undefined' ? window : globalThis);
