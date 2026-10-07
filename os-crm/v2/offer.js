(function (root, factory) {
  const offer = factory();
  if (typeof module === 'object' && module.exports) module.exports = offer;
  else root.OSOffer = offer;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Mesma entrega da Comunidade: OS ilimitado + Club. Só muda o período contratado.
  const checkouts = { monthly: 'cdpxiid', quarterly: 'yr8snnq', annual: 'db3o676' };
  const plans = {
    monthly: { name: 'Mensal', audience: 'Para começar e renovar mês a mês.', amount: 147, months: 1, offerKey: 'comunidade-mensal' },
    quarterly: { name: 'Trimestral', audience: 'Três meses para organizar sua operação.', amount: 357, months: 3, offerKey: 'comunidade-trimestral' },
    annual: { name: 'Anual', audience: 'Um ano completo com a melhor condição.', amount: 997, months: 12, offerKey: 'comunidade-anual' },
  };
  const features = ['CRM Kanban, Inbox e follow-up', 'IA no WhatsApp 24h por dia', 'Usuários e WhatsApps ilimitados', 'Leads e contatos ilimitados', 'Gestão e distribuição de leads', 'Imobiturbo Club e trilhas práticas', 'Mentor IA, scripts e materiais', 'Gravações de mentorias e comunidade'];
  const money = (value, fractionDigits = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
  const aliases = { mensal: 'monthly', trimestral: 'quarterly', anual: 'annual' };
  function selection(search) {
    const query = new URLSearchParams(search);
    const key = query.get('plan') || query.get('plano');
    // URLs da LP anterior continuam abrindo a duração escolhida, sem herdar limites fictícios.
    const preferred = Object.hasOwn(plans, key) ? key : Object.hasOwn(aliases, key) ? aliases[key] : query.get('cycle');
    const plan = Object.hasOwn(plans, preferred) ? preferred : 'annual';
    return { plan, cycle: plan };
  }
  function price(plan, cycle) {
    const selected = selection(new URLSearchParams({ plan, ...(cycle ? { cycle } : {}) }).toString()).plan;
    const p = plans[selected];
    return {
      headline: money(p.amount / p.months, p.months === 12 ? 2 : 0),
      period: p.months === 1 ? 'por mês' : 'equivalente por mês',
      detail: p.months === 1 ? `Cobrança mensal de ${money(p.amount)}. Renovação automática mensal.` : `Cobrança ${p.months === 3 ? 'trimestral' : 'anual'} de ${money(p.amount)}. Renovação automática a cada ${p.months} meses.`,
    };
  }
  const attributionKeys = ['src', 'sck', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'imt_adset_name', 'imt_adset_id', 'imt_ad_id', 'imt_placement', 'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'rt_vid', 'rt_fbp', 'rt_fbc', 'xcod', 'imt_audit'];
  function checkoutURL(plan, cycle, search = typeof window === 'undefined' ? '' : window.location.search) {
    const selected = selection(new URLSearchParams({plan, ...(cycle ? {cycle} : {})}).toString());
    const target = new URL(`https://pay.cakto.com.br/${checkouts[selected.plan]}`);
    const incoming = new URLSearchParams(search);
    for (const key of attributionKeys) {
      const value = incoming.get(key);
      if (value && value.length <= 2000) target.searchParams.set(key, value);
    }
    return target.toString();
  }
  function checkoutSelection(value) {
    const url = new URL(value, 'https://os.imobiturbo.com.br');
    if (url.origin !== 'https://pay.cakto.com.br') return null;
    for (const [plan, code] of Object.entries(checkouts)) {
      if (url.pathname === `/${code}`) return {plan, cycle:plan};
    }
    return null;
  }
  const existingAccessURL = () => 'https://os.imobiturbo.com.br/login';
  function activationURL(plan, cycle) {
    const selected = selection(new URLSearchParams({plan, ...(cycle ? {cycle} : {})}).toString()).plan;
    const p = plans[selected];
    const text = `Olá! Quero o Imobiturbo OS ilimitado com Club e bônus, no plano ${p.name}, por ${money(p.amount)} a cada ${p.months} meses. Podem me orientar sobre contratação e acesso?`;
    return `https://wa.me/5521969516183?text=${encodeURIComponent(text)}`;
  }
  return { plans, features, checkouts, money, selection, price, checkoutURL, checkoutSelection, existingAccessURL, activationURL };
});
