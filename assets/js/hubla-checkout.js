(function (root, factory) {
  const checkout = factory();
  if (typeof module === 'object' && module.exports) module.exports = checkout;
  else {
    root.ImobiturboHubla = checkout;
    root.ImobiturboHotmart = checkout;
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  const offerId = 'EKQIIAiTsXkEUez8uQaM';
  const plans = Object.freeze({
    anual: { plan: 'annually', installments: 12, terms: 'R$ 997 à vista ou em até 12x de R$ 97 no cartão (total R$ 1.164). Renovação anual automática.' },
    trimestral: { plan: 'quarterly', installments: 1, terms: 'R$ 357 por trimestre no Pix Automático ou cartão. Renovação trimestral automática.' },
    mensal: { plan: 'monthly', installments: 1, terms: 'R$ 147 por mês no Pix Automático ou cartão. Renovação mensal automática.' },
  });

  function buildUrl(plan, buyer = {}, tracking = {}) {
    if (!Object.hasOwn(plans, plan)) throw new Error('Plano inválido');
    const config = plans[plan];
    const url = new URL('https://pay.hub.la/' + offerId);
    const params = url.searchParams;

    params.set('plan', config.plan);
    if (config.installments > 1) {
      params.set('installments', String(config.installments));
    }

    if (buyer.name && buyer.name.trim()) params.set('name', buyer.name.trim());
    if (buyer.email && buyer.email.trim()) params.set('email', buyer.email.trim());

    const phone = String(buyer.phone || '').replace(/\D/g, '');
    if (phone.length >= 10) {
      const fullPhone = phone.startsWith('55') && phone.length >= 12 ? phone : '55' + phone;
      params.set('phone', '+' + fullPhone);
    }

    if (tracking.visitorId) {
      params.set('visitorId', tracking.visitorId);
      params.set('rt_vid', tracking.visitorId);
    }

    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'xcod'];
    for (const key of utms) {
      if (tracking[key]) params.set(key, tracking[key]);
    }
    for (const key of ['gbraid', 'ttclid', 'fbclid', 'gclid', 'fbp', 'fbc']) {
      if (tracking[key]) params.set(key, tracking[key]);
    }

    return url.href;
  }

  return Object.freeze({ offerId, plans, buildUrl });
});
