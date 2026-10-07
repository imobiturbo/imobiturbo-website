(() => {
  'use strict';
  const base = '/os-crm/clone/assinatura/';
  const plans = {
    gold: { name: 'GOLD', price: '97,00', limits: '1.500 vendas · 3 contas · 3 pixels', extra: '0,10' },
    diamond: { name: 'DIAMOND', price: '197,00', limits: '3.000 vendas · 10 contas · 10 pixels', extra: '0,08' },
    ruby: { name: 'RUBY', price: '297,00', limits: '5.000 vendas · contas ilimitadas · pixels ilimitados', extra: '0,05' },
    master: { name: 'MASTER', price: '497,00', limits: '8.000 vendas · contas ilimitadas · pixels ilimitados', extra: '0,03' },
  };
  const templates = new Map();
  let selected = new URLSearchParams(location.search).get('plano')?.toLowerCase();
  if (!plans[selected]) selected = 'gold';

  function explainPreview() {
    window.alert('Esta é uma prévia visual. Nenhum cadastro ou pagamento será realizado.');
  }

  function updateSummary() {
    const plan = plans[selected];
    const main = document.querySelector('main');
    if (!main.querySelector('#numero-do-cartao')) return;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      node.textContent = node.textContent
        .replaceAll('Plano GOLD', `Plano ${plan.name}`)
        .replaceAll('1.500 vendas · 3 contas · 3 pixels', plan.limits)
        .replaceAll('97,00', plan.price)
        .replaceAll('0,10 por venda adicional', `${plan.extra} por venda adicional`);
    }
    main.querySelector('button[aria-label^="Ativar assinatura"]').setAttribute(
      'aria-label', `Ativar assinatura por R$ ${plan.price} por mês`
    );
  }

  async function showStep(step, plan) {
    if (plan) selected = plan;
    if (!templates.has(step)) {
      const response = await fetch(`${base}${step}-template.html`);
      if (!response.ok) throw new Error('Não foi possível carregar esta etapa.');
      templates.set(step, await response.text());
    }
    document.querySelector('main').outerHTML = templates.get(step);
    history.replaceState(null, '', `${base}?plano=${selected}`);
    updateSummary();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.addEventListener('click', (event) => {
    const control = event.target.closest('button,a');
    if (!control) return;
    if (control.matches('[data-preview-login]')) {
      event.preventDefault();
      explainPreview();
    } else if (control.getAttribute('aria-label') === 'Trocar de plano') {
      showStep('plans').catch(() => window.alert('Não foi possível carregar os planos.'));
    } else if (control.getAttribute('aria-label')?.startsWith('Escolher Plano ')) {
      const plan = control.getAttribute('aria-label').replace('Escolher Plano ', '').toLowerCase();
      if (plans[plan]) showStep('payment', plan).catch(() => window.alert('Não foi possível carregar o pagamento.'));
    } else if (control.getAttribute('aria-label')?.startsWith('Mostrar') || control.hasAttribute('data-password-toggle')) {
      const input = control.parentElement.querySelector('input');
      const showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';
      control.dataset.passwordToggle = '';
      control.setAttribute('aria-pressed', String(showing));
      control.setAttribute('aria-label', `${showing ? 'Ocultar' : 'Mostrar'} ${input.id.includes('confirmar') ? 'confirmação' : 'senha'}`);
    } else if (control.textContent.trim() === 'Ativar assinatura' || control.textContent.trim() === 'Aplicar') {
      event.preventDefault();
      explainPreview();
    }
  });

  const digits = (value, max) => value.replace(/\D/g, '').slice(0, max);
  const masks = {
    'numero-do-cartao': value => digits(value, 19).replace(/(.{4})/g, '$1 ').trim(),
    'validade-do-cartao': value => digits(value, 4).replace(/^(\d{2})(\d)/, '$1/$2'),
    'cvv-do-cartao': value => digits(value, 4),
    'cpf-do-titular': value => digits(value, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2'),
    'celular-de-cobranca': value => digits(value, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2'),
    'cep-de-cobranca': value => digits(value, 8).replace(/^(\d{5})(\d)/, '$1-$2'),
  };
  document.addEventListener('input', ({ target }) => {
    if (masks[target.id]) target.value = masks[target.id](target.value);
    if (target.id === 'cupom') target.parentElement.querySelector('button').disabled = !target.value.trim();
  });
  document.addEventListener('submit', event => { event.preventDefault(); explainPreview(); });
  updateSummary();
})();
