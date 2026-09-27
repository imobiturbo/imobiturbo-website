(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const sessions = window.ImobiturboCheckoutSession;
  const form = get('consultingForm');
  const modal = get('consultingCheckoutModal');
  const CARD_TOTAL_CENTS = 58800;
  const CARD_SINGLE_CENTS = 49700;
  let method = 'PIX';
  let submitting = false;
  let timer = null;
  let approved = false;
  let lastTrigger = null;
  let userClosedPending = false;

  function formatCurrency(cents) {
    return `R$${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)}`;
  }
  function installmentTotalCents(count) {
    return count >= 4 ? CARD_TOTAL_CENTS : CARD_SINGLE_CENTS;
  }
  function firstInstallmentCents(count) {
    return Math.floor(installmentTotalCents(count) / count);
  }
  function formatCpf(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  function applySavedBuyer() {
    const buyer = sessions.getUpsellBuyer?.();
    if (!buyer) return;
    get('buyerName').value = buyer.name;
    get('buyerEmail').value = buyer.email;
    get('buyerPhone').value = buyer.phone;
    get('buyerCpf').value = formatCpf(buyer.cpfCnpj);
    if (buyer.cardHolderName) get('cardHolder').value = buyer.cardHolderName;
  }

  function feedback(message, error = false) {
    const node = get('paymentFeedback');
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle('is-error', error);
  }
  function showCheckout(trigger = null) {
    if (approved) { get('consultingApproved').scrollIntoView({ behavior: 'smooth' }); return; }
    if (trigger) lastTrigger = trigger;
    userClosedPending = false;
    get('finalInvite').hidden = true;
    if (!modal.open) modal.showModal();
  }
  function showPending(record) {
    if (!userClosedPending) showCheckout();
    form.hidden = true;
    get('pendingPayment').hidden = false;
    const pix = record.method === 'PIX';
    const installmentCents = Math.round(Number(record.installmentValue) * 100) || firstInstallmentCents(record.installmentCount);
    const totalCents = Math.round(Number(record.amount) * 100) || installmentTotalCents(record.installmentCount);
    get('pixDetails').hidden = !pix;
    get('pendingTitle').textContent = pix ? record.pix.copyPaste ? 'Seu Pix está pronto.' : 'Recuperando seu Pix…' : 'Aguardando a confirmação do cartão.';
    get('pendingDescription').textContent = pix ? 'Use o mesmo código para pagar pelo aplicativo do seu banco. A confirmação aparece aqui.' :
      record.installmentCount > 1 ? `Cartão em análise: ${record.installmentCount} parcelas de ${formatCurrency(installmentCents)} · total de ${formatCurrency(totalCents)} ${totalCents > CARD_SINGLE_CENTS ? 'com juros' : 'sem juros'}, com possível ajuste de centavos na última. A confirmação aparece aqui.` :
        'Cartão em análise: pagamento único de R$497. A confirmação aparece aqui.';
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
    const installments = Number(get('cardInstallments').value) || 1;
    get('cardPaymentPanel').hidden = !card;
    get('pixPaymentPanel').hidden = card;
    get('cardFields').hidden = !card;
    get('cardInstallmentChoice').hidden = !card;
    get('cardFields').querySelectorAll('input').forEach(input => { input.disabled = !card; input.required = card; });
    get('payWithPix').setAttribute('aria-pressed', String(!card));
    get('payWithCard').setAttribute('aria-pressed', String(card));
    get('payWithPix').setAttribute('aria-selected', String(!card));
    get('payWithCard').setAttribute('aria-selected', String(card));
    get('payWithPix').classList.toggle('active', !card);
    get('payWithCard').classList.toggle('active', card);
    const totalCents = installmentTotalCents(installments);
    const firstCents = installments === 1 ? CARD_SINGLE_CENTS : firstInstallmentCents(installments);
    get('checkoutPrice').textContent = card && installments > 1 ? `${installments}× ${formatCurrency(firstCents)}` : 'R$497';
    get('checkoutPriceNote').textContent = !card ? 'À vista via Pix' : installments > 1
      ? `${totalCents > CARD_SINGLE_CENTS ? 'Com juros · +R$91,00' : 'Sem juros'} · total de ${formatCurrency(totalCents)} em ${installments} parcelas`
      : 'Pagamento único no cartão';
    const lastCents = totalCents - firstCents * Math.max(0, installments - 1);
    get('installmentNote').textContent = installments === 1
      ? 'Pagamento único no cartão: R$497.'
      : `${totalCents > CARD_SINGLE_CENTS ? 'Parcelamento com juros de R$91,00' : 'Parcelamento sem juros'}: total ${formatCurrency(totalCents)}.${lastCents !== firstCents ? ` A última parcela fica ${formatCurrency(lastCents)} para ajustar os centavos.` : ''}`;
    get('submitPayment').textContent = card
      ? installments > 1 ? `Pagar ${installments}× de ${formatCurrency(firstCents)} no cartão` : 'Pagar R$497 no cartão'
      : 'Gerar Pix de R$497';
  }
  const consulting = sessions.create({
    key: sessions.CONSULTING_KEY, productId: 'consultoria-individual-natan', plans: ['consultoria'],
    onPending: showPending,
    onError: () => feedback('Não conseguimos consultar o pagamento agora. Ele foi mantido e será consultado novamente automaticamente.', true),
    onExpired: () => {
      if (timer) clearInterval(timer);
      form.reset(); sessions.clearDraft(); setMethod('PIX');
      applySavedBuyer();
      get('submitPayment').disabled = false;
      form.hidden = false; get('pendingPayment').hidden = true;
      get('pixCode').value = ''; get('pixQr').removeAttribute('src');
      feedback('Este checkout expirou ou foi encerrado. Preencha seus dados para começar novamente.');
      get('buyerName').focus({ preventScroll: true });
    },
    onPaid: record => {
      if (timer) clearInterval(timer);
      approved = true;
      sessions.clearUpsellBuyer?.();
      if (modal.open) modal.close();
      form.reset();
      get('offerContent').hidden = true;
      get('consultingApproved').hidden = false;
      const totalCents = Math.round(Number(record.amount) * 100) || installmentTotalCents(record.installmentCount);
      get('confirmedAmount').textContent = record.installmentCount > 1
        ? `${record.installmentCount} parcelas no cartão · total de ${formatCurrency(totalCents)} ${totalCents > CARD_SINGLE_CENTS ? 'com juros' : 'sem juros'}`
        : record.method === 'CREDIT_CARD' ? 'R$497 no cartão, em parcela única' : 'R$497 à vista via Pix';
      get('scheduleLink').href = 'https://agenda.imobiturbo.com.br/natanpimentel/1-1-consultoria-individual-com-natan-pimentel';
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
    sessions.saveUpsellBuyer?.({
      name: get('buyerName').value.trim(),
      email: get('buyerEmail').value.trim(),
      phone: get('buyerPhone').value.trim(),
      cpfCnpj: cpf,
      cardHolderName: method === 'CREDIT_CARD' ? get('cardHolder').value.trim() : '',
    });
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
        gateway: 'asaas', plan: 'consultoria', paymentMethod: method,
        installments: method === 'CREDIT_CARD' ? Number(get('cardInstallments').value) : 1,
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
  get('cardInstallments').addEventListener('change', () => setMethod(method));
  get('cardExpiry').addEventListener('input', event => { const digits = event.target.value.replace(/\D/g, '').slice(0, 4); event.target.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits; });
  get('copyPix').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(get('pixCode').value); feedback('Código copiado. Abra seu banco e escolha Pix copia e cola.'); }
    catch (_) { get('pixCode').focus(); get('pixCode').select(); feedback('Selecione e copie o código acima para colar no seu banco.'); }
  });
  document.querySelectorAll('[data-open-checkout]').forEach(button => button.addEventListener('click', () => { showCheckout(button); if (consulting.read()) consulting.start(); }));
  get('consultingModalClose').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    if (!approved) {
      userClosedPending = Boolean(consulting.read());
      get('finalInvite').hidden = false;
      if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  });
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
  applySavedBuyer();
  document.querySelectorAll('a[href="#acessos"]').forEach(link => {
    link.addEventListener('click', () => sessions.clearUpsellBuyer?.());
  });
  function resume() { if (consulting.read()) consulting.start(); if (community.read()) community.start(); }
  window.addEventListener('pageshow', event => { if (event.persisted) resume(); });
  window.addEventListener('storage', event => { if ([sessions.COMMUNITY_KEY, sessions.CONSULTING_KEY].includes(event.key)) resume(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume(); });
  resume();
})();
