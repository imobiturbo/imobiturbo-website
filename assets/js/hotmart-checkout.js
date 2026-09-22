(function (root, factory) {
  const checkout = factory();
  if (typeof module === 'object' && module.exports) module.exports = checkout;
  else root.ImobiturboHotmart = checkout;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const plans = Object.freeze({
    anual: { offer: 'vgygksgc', installments: 12, terms: 'R$ 1.164 por ano, em até 12x de R$ 97 sem juros. Renovação anual automática.' },
    trimestral: { offer: 'k3sq4mg8', installments: 3, terms: 'R$ 381 por trimestre, em até 3x de R$ 127 sem juros. Renovação automática a cada 3 meses.' },
    mensal: { offer: '4zruzp5h', installments: 1, terms: 'R$ 147 por mês. Renovação mensal automática.' },
  });
  function buildUrl(plan, buyer = {}, tracking = {}) {
    if (!Object.hasOwn(plans, plan)) throw new Error('Plano inválido');
    const config = plans[plan];
    const url = new URL('https://pay.hotmart.com/J107689854N');
    const params = url.searchParams;
    params.set('off', config.offer);
    params.set('checkoutMode', '2');
    params.set('split', String(config.installments));
    for (const key of ['hidePix', 'hideBillet', 'hideTransf', 'hidePayPal', 'hidewallet', 'hideTrial']) params.set(key, '1');
    if (buyer.name) params.set('name', buyer.name);
    if (buyer.email) params.set('email', buyer.email);
    const phone = String(buyer.phone || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (/^\d{10,11}$/.test(phone)) {
      params.set('phoneac', phone.slice(0, 2));
      params.set('phonenumber', phone.slice(2));
    }
    if (tracking.visitorId) params.set('xcod', tracking.visitorId);
    const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    if (utms.some(key => tracking[key])) {
      params.set('sck', utms.map(key => encodeURIComponent(tracking[key] || '')).join('|'));
      for (const key of utms) if (tracking[key]) params.set(key, tracking[key]);
    }
    return url.href;
  }
  return Object.freeze({ plans, buildUrl });
});
