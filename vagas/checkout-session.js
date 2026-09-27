(function (root) {
  'use strict';
  const TTL = 30 * 60 * 1000;
  const COMMUNITY_KEY = 'imobiturbo:checkout:community:v2';
  const CONSULTING_KEY = 'imobiturbo:checkout:consulting:v2';
  const DRAFT_KEYS = ['imobiturbo:vagas:checkout:v1', 'imobiturbo:vagas-v2:checkout:v1'];

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
      inFlight = (async () => {
        const controller = new AbortController();
        const timeout = root.setTimeout(() => controller.abort(), 10000);
        try {
          const query = new URLSearchParams({ gateway: record.gateway, paymentId: record.paymentId });
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
            const approved = { ...record, ...data };
            save(approved, { method: record.method, expiresAt: record.expiresAt });
            stop();
            options.onPaid?.(approved);
            return approved;
          }
          const terminal = data.deleted || ['REFUNDED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DELETED', 'CANCELED', 'CANCELLED', 'REJECTED', 'INACTIVE'].includes(data.status);
          const providerDeadline = Date.parse(data.expiresAt);
          const expiresAt = new Date(Math.min(Date.parse(record.expiresAt), Number.isFinite(providerDeadline) ? providerDeadline : Infinity)).toISOString();
          if (terminal || now() >= Date.parse(expiresAt)) {
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
      options.onPending?.(record);
      polling = root.setInterval(check, 3000);
      return check();
    }

    return { read, save, clear, check, start, stop };
  }

  function clearDraft() {
    for (const key of DRAFT_KEYS) {
      try { root.localStorage.removeItem(key); } catch (_) {}
    }
  }

  function bindLanding(api) {
    const get = id => root.document.getElementById(id);
    const pane = get('chkStepPane4');
    const notice = root.document.createElement('p');
    notice.id = 'chkPendingNotice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'font-size:14px;line-height:1.5;color:#d4ff53;margin:12px 0';
    notice.hidden = true;
    pane.prepend(notice);
    let timer = null;

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
      onPending: render,
      onExpired: () => {
        if (timer) root.clearInterval(timer);
        clearDraft();
        api.form?.reset();
        for (const id of ['chkName', 'chkPhone', 'chkEmail', 'chkCardNumber', 'chkCardHolder', 'chkCardExpiry', 'chkCardCvv', 'chkCardCpf', 'chkPixCpf']) {
          if (get(id)) get(id).value = '';
        }
        notice.hidden = true;
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
        api.goToCheckoutStep(1);
        api.updateCheckoutPersonalization();
        api.showCheckoutError('Este checkout expirou ou foi encerrado. Preencha seus dados para iniciar novamente.');
      },
      onError: () => api.showCheckoutError('Não foi possível consultar o pagamento agora. Ele foi mantido; tentaremos novamente automaticamente.'),
      onPaid: result => {
        if (timer) root.clearInterval(timer);
        api.trackHubPurchase(result);
        root.location.replace('/vagas-obrigado');
      },
    });
    return {
      ...session,
      capture(result, extra) { session.save(result, extra); return session.start(); },
      stop() { session.stop(); if (timer) root.clearInterval(timer); },
    };
  }

  root.ImobiturboCheckoutSession = { create, bindLanding, clearDraft, TTL, COMMUNITY_KEY, CONSULTING_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ImobiturboCheckoutSession;
})(typeof window !== 'undefined' ? window : globalThis);
