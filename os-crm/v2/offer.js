(function (root, factory) {
  const offer = factory();
  if (typeof module === 'object' && module.exports) module.exports = offer;
  else root.OSOffer = offer;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Same commercial terms as the existing public /os-crm/ page on 2026-10-06.
  const plans = {
    start: { name: 'Start', audience: 'Para o corretor que quer vender mais.', monthly: 97, installment: 67, annual: 670,
      features: ['1 conexão de WhatsApp', '1 usuário corretor', 'IA atendendo 24h por dia', 'CRM Kanban completo', 'Leads e contatos ilimitados', 'Importação de contatos por CSV'] },
    growth: { name: 'Growth', audience: 'Para a imobiliária que quer acelerar.', monthly: 247, installment: 177, annual: 1770,
      features: ['2 conexões de WhatsApp', 'Até 5 usuários corretores', 'Tudo do Start', 'Roleta de leads e transbordo', 'Múltiplos funis e métricas da equipe', 'Meta Lead Ads e integrações', 'Suporte prioritário no WhatsApp'] },
    scale: { name: 'Scale', audience: 'Para equipes que querem dominar.', monthly: 397, installment: 297, annual: 2970,
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
      ? { headline: `12x ${money(p.installment)}`, detail: `${money(p.annual)} por ano à vista · ou ${money(p.installment * 12)} em 12 parcelas`, period: '/ano parcelado' }
      : { headline: money(p.monthly), detail: 'Assinatura mensal. Cancele quando quiser.', period: '/mês' };
  }
  const checkoutURL = (plan, cycle) => `/os-crm/v2/assinatura/?plan=${plan}&cycle=${cycle}`;
  // Existing /checkout redirects to another offer (implementation assistance).
  // Students should enter the OS directly rather than inherit that legacy route.
  const existingAccessURL = () => 'https://os.imobiturbo.com.br/login';
  function activationURL(plan, cycle) {
    const p = plans[plan];
    const text = `Olá! Quero ativar o Imobiturbo OS no plano ${p.name}, ciclo ${cycle === 'annual' ? 'anual' : 'mensal'}. ${price(plan, cycle).headline}. Podem me orientar sobre contratação e acesso?`;
    return `https://wa.me/5521969516183?text=${encodeURIComponent(text)}`;
  }
  return { plans, money, selection, price, checkoutURL, existingAccessURL, activationURL };
});
