(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const sessions = window.ImobiturboCheckoutSession;
  const form = get('consultingForm');
  let method = 'PIX';
  let submitting = false;
  let timer = null;
  let approved = false;

  function feedback(message, error = false) {
    const node = get('paymentFeedback');
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle('is-error', error);
  }
  function showCheckout(scroll = true) {
    if (approved) { get('consultingApproved').scrollIntoView({ behavior: 'smooth' }); return; }
    get('contratar').hidden = false;
    get('finalInvite').hidden = true;
    if (scroll) { get('contratar').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function showPending(record) {
    showCheckout(false);
    form.hidden = true;
    get('pendingPayment').hidden = false;
    const pix = record.method === 'PIX';
    get('pixDetails').hidden = !pix;
    get('pendingTitle').textContent = pix ? record.pix.copyPaste ? 'Seu Pix está pronto.' : 'Recuperando seu Pix…' : 'Aguardando a confirmação do cartão.';
    get('pendingDescription').textContent = pix ? 'Use o mesmo código para pagar pelo aplicativo do seu banco. A confirmação aparece aqui.' : 'O pagamento está sendo consultado. Não é necessário enviar os dados novamente.';
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
  function setMethod(value) {
    method = value;
    const card = value === 'CREDIT_CARD';
    get('cardFields').hidden = !card;
    get('cardFields').querySelectorAll('input').forEach(input => { input.disabled = !card; input.required = card; });
    get('payWithPix').setAttribute('aria-pressed', String(!card));
    get('payWithCard').setAttribute('aria-pressed', String(card));
    get('submitPayment').textContent = card ? 'Pagar R$497 no cartão' : 'Gerar Pix de R$497';
  }
  const consulting = sessions.create({
    key: sessions.CONSULTING_KEY, productId: 'consultoria-individual-natan', plans: ['consultoria'],
    onPending: showPending,
    onError: () => feedback('Não conseguimos consultar o pagamento agora. Ele foi mantido e será consultado novamente automaticamente.', true),
    onExpired: () => {
      if (timer) clearInterval(timer);
      form.reset(); sessions.clearDraft(); setMethod('PIX');
      get('submitPayment').disabled = false;
      form.hidden = false; get('pendingPayment').hidden = true;
      get('pixCode').value = ''; get('pixQr').removeAttribute('src');
      feedback('Este checkout expirou ou foi encerrado. Preencha seus dados para começar novamente.');
      get('buyerName').focus({ preventScroll: true });
    },
    onPaid: record => {
      if (timer) clearInterval(timer);
      approved = true;
      form.reset();
      get('offerContent').hidden = true;
      get('consultingApproved').hidden = false;
      const message = `Olá! O pagamento da minha consultoria individual de 1h com Natan foi aprovado. Pedido ${record.paymentId}. Gostaria de combinar meu horário.`;
      get('scheduleLink').href = 'https://wa.me/5521969516183?text=' + encodeURIComponent(message);
      get('consultingApproved').focus({ preventScroll: true });
    },
  });
  const community = sessions.create({
    key: sessions.COMMUNITY_KEY, productId: 'comunidade-imobiturbo', plans: ['anual', 'semestral', 'trimestral', 'mensal'],
    onPaid: () => { get('communityStatus').textContent = 'Compra da comunidade aprovada. Bem-vindo à Imobiturbo!'; get('communityStatus').classList.add('is-approved'); },
    onPending: () => { get('communityStatus').textContent = 'Estamos consultando o pagamento da comunidade.'; },
    onExpired: () => { get('communityStatus').textContent = 'O checkout da comunidade foi encerrado. Consulte seus acessos abaixo.'; sessions.clearDraft(); },
    onError: () => { get('communityStatus').textContent = 'Não foi possível consultar a compra da comunidade agora.'; },
  });

  function validCpf(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    for (let size = 9; size <= 10; size++) {
      let sum = 0;
      for (let i = 0; i < size; i++) sum += Number(cpf[i]) * (size + 1 - i);
      const digit = (sum * 10) % 11;
      if ((digit === 10 ? 0 : digit) !== Number(cpf[size])) return false;
    }
    return true;
  }
  async function submit() {
    if (submitting || approved) return;
    if (consulting.read()) { await consulting.start(); return; }
    if (!form.reportValidity()) return;
    const cpf = get('buyerCpf').value.replace(/\D/g, '');
    const phone = get('buyerPhone').value.replace(/\D/g, '');
    if (!validCpf(cpf)) { feedback('Confira o CPF informado.', true); get('buyerCpf').focus(); return; }
    if (phone.length < 10 || phone.length > 13) { feedback('Informe seu WhatsApp com DDD.', true); return; }
    if (get('buyerName').value.trim().split(/\s+/).length < 2) { feedback('Informe seu nome completo.', true); return; }
    let creditCard = null;
    if (method === 'CREDIT_CARD') {
      const expiry = get('cardExpiry').value.match(/^(\d{2})\/(\d{2})$/);
      const number = get('cardNumber').value.replace(/\D/g, '');
      if (!expiry || Number(expiry[1]) < 1 || Number(expiry[1]) > 12 || number.length < 13 || number.length > 19 || !/^\d{3,4}$/.test(get('cardCvv').value) || !/^\d{8}$/.test(get('cardPostalCode').value.replace(/\D/g, ''))) {
        feedback('Confira o número, a validade MM/AA, o código de segurança e o CEP do cartão.', true); return;
      }
      creditCard = { holderName: get('cardHolder').value.trim(), number, expiryMonth: expiry[1], expiryYear: '20' + expiry[2], ccv: get('cardCvv').value, postalCode: get('cardPostalCode').value.replace(/\D/g, ''), addressNumber: get('cardAddressNumber').value.trim() };
    }
    submitting = true;
    get('submitPayment').disabled = true;
    get('submitPayment').textContent = 'Processando pagamento…';
    feedback('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        gateway: 'asaas', plan: 'consultoria', paymentMethod: method, installments: 1,
        name: get('buyerName').value.trim(), email: get('buyerEmail').value.trim(), phone, cpfCnpj: cpf,
        creditCard, eventId: 'consultoria_' + crypto.randomUUID(),
      }) });
      const result = await response.json();
      if (!response.ok || !result.success || !result.paymentId) throw new Error(result.error || 'Não foi possível concluir. Confira os dados e tente novamente.');
      consulting.save(result, { method, plan: 'consultoria' });
      get('cardFields').querySelectorAll('input').forEach(input => { input.value = ''; });
      get('buyerCpf').value = '';
      await consulting.start();
    } catch (error) {
      feedback(error instanceof SyntaxError || error instanceof TypeError ? 'A conexão foi interrompida. Confira se houve cobrança antes de tentar novamente.' : error.message, true);
    } finally {
      submitting = false;
      get('submitPayment').disabled = Boolean(consulting.read());
      setMethod(method);
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (navigator.locks) navigator.locks.request(sessions.CONSULTING_KEY + ':create', submit);
    else submit();
  });
  get('payWithPix').addEventListener('click', () => { if (!submitting && !consulting.read()) setMethod('PIX'); });
  get('payWithCard').addEventListener('click', () => { if (!submitting && !consulting.read()) setMethod('CREDIT_CARD'); });
  get('cardExpiry').addEventListener('input', event => { const digits = event.target.value.replace(/\D/g, '').slice(0, 4); event.target.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits; });
  get('copyPix').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(get('pixCode').value); feedback('Código copiado. Abra seu banco e escolha Pix copia e cola.'); }
    catch (_) { get('pixCode').focus(); get('pixCode').select(); feedback('Selecione e copie o código acima para colar no seu banco.'); }
  });
  document.querySelectorAll('[data-open-checkout]').forEach(button => button.addEventListener('click', () => { showCheckout(); if (consulting.read()) consulting.start(); }));
  // Reuse only an unexpired identification draft. CPF and card fields stay empty.
  try {
    for (const key of ['imobiturbo:vagas:checkout:v1', 'imobiturbo:vagas-v2:checkout:v1']) {
      const draft = JSON.parse(localStorage.getItem(key));
      if (draft && Number.isFinite(draft.expiresAt) && draft.expiresAt > Date.now()) {
        for (const [id, field] of [['buyerName', 'name'], ['buyerEmail', 'email'], ['buyerPhone', 'phone']]) if (typeof draft[field] === 'string') get(id).value = draft[field];
        break;
      }
    }
  } catch (_) {}
  function resume() { if (consulting.read()) consulting.start(); if (community.read()) community.start(); }
  window.addEventListener('pageshow', event => { if (event.persisted) resume(); });
  window.addEventListener('storage', event => { if ([sessions.COMMUNITY_KEY, sessions.CONSULTING_KEY].includes(event.key)) resume(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume(); });
  resume();
})();
