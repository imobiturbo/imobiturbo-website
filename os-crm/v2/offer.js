(function (root, factory) {
  const offer = factory();
  if (typeof module === 'object' && module.exports) module.exports = offer;
  else root.OSOffer = offer;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Preços publicados; parcelamento e taxa de serviço são apresentados pela Cakto.
  const checkouts = {
    start: { monthly: '384adhh', annual: '3dbwybd' },
    growth: { monthly: 'unhsgfw', annual: 'bg68nnm' },
    scale: { monthly: '36jxmp7', annual: 'yp4735g' },
  };
  const plans = {
    start: { name: 'Start', audience: 'Para o corretor que quer vender mais.', monthly: 97, annual: 670,
      features: ['1 conexão de WhatsApp', '1 usuário corretor', 'IA atendendo 24h por dia', 'CRM Kanban completo', 'Leads e contatos ilimitados', 'Importação de contatos por CSV'] },
    growth: { name: 'Growth', audience: 'Para a imobiliária que quer acelerar.', monthly: 247, annual: 1770,
      features: ['2 conexões de WhatsApp', 'Até 5 usuários corretores', 'Tudo do Start', 'Roleta de leads e transbordo', 'Múltiplos funis e métricas da equipe', 'Meta Lead Ads e integrações', 'Suporte prioritário no WhatsApp'] },
    scale: { name: 'Scale', audience: 'Para equipes que querem dominar.', monthly: 397, annual: 2970,
      features: ['5 conexões de WhatsApp', 'Até 15 usuários corretores', 'Tudo do Growth', 'Distribuição para múltiplas equipes', 'API e webhooks', 'Painel executivo de desempenho', 'Onboarding assistido'] },
  };
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  function selection(search) {
    const query = new URLSearchParams(search);
    const key = query.get('plan') || query.get('plano');
    return { plan: Object.hasOwn(plans, key) ? key : 'growth', cycle: query.get('cycle') === 'monthly' ? 'monthly' : 'annual' };
  }
  function price(plan, cycle) {
    const p = plans[plan];
    return cycle === 'annual'
      ? { headline: money(p.annual), detail: 'Assinatura anual. Renovação automática a cada 12 meses.', period: '/ano' }
      : { headline: money(p.monthly), detail: 'Assinatura mensal. Cancele quando quiser.', period: '/mês' };
  }
  const attributionKeys = ['src', 'sck', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'imt_adset_name', 'imt_adset_id', 'imt_ad_id', 'imt_placement', 'fbclid', 'gclid', 'gbraid', 'wbraid', 'ttclid', 'msclkid', 'rt_vid', 'rt_fbp', 'rt_fbc', 'xcod', 'imt_audit'];
  function checkoutURL(plan, cycle, search = typeof window === 'undefined' ? '' : window.location.search) {
    const selected = selection(new URLSearchParams({plan, cycle}).toString());
    const target = new URL(`https://pay.cakto.com.br/${checkouts[selected.plan][selected.cycle]}`);
    const query = target.searchParams;
    const incoming = new URLSearchParams(search);
    for (const key of attributionKeys) {
      const value = incoming.get(key);
      if (value && value.length <= 2000) query.set(key, value);
    }
    return target.toString();
  }
  function checkoutSelection(value) {
    const url = new URL(value, 'https://os.imobiturbo.com.br');
    if (url.origin !== 'https://pay.cakto.com.br') return null;
    for (const [plan, cycles] of Object.entries(checkouts)) {
      for (const [cycle, code] of Object.entries(cycles)) {
        if (url.pathname === `/${code}`) return {plan, cycle};
      }
    }
    return null;
  }
  // Existing /checkout redirects to another offer (implementation assistance).
  // Students should enter the OS directly rather than inherit that legacy route.
  const existingAccessURL = () => 'https://os.imobiturbo.com.br/login';
  function activationURL(plan, cycle) {
    const p = plans[plan];
    const text = `Olá! Quero ativar o Imobiturbo OS no plano ${p.name}, ciclo ${cycle === 'annual' ? 'anual' : 'mensal'}. ${price(plan, cycle).headline}. Podem me orientar sobre contratação e acesso?`;
    return `https://wa.me/5521969516183?text=${encodeURIComponent(text)}`;
  }
  return { plans, checkouts, money, selection, price, checkoutURL, checkoutSelection, existingAccessURL, activationURL };
});
