export function calculatePlan({ budget, cpl, qualified, appointments }) {
  const values = [budget, cpl, qualified, appointments].map(Number);
  const [spend, cost, quality, booking] = values;
  if (!values.every(Number.isFinite) || spend <= 0 || spend > 10000000 || cost <= 0 || cost > 100000 || quality < 0 || quality > 100 || booking < 0 || booking > 100) throw new Error('Revise os valores e as taxas, de 0 a 100%.');
  const contacts = Math.floor(spend / cost);
  const qualifiedContacts = Math.floor(contacts * quality / 100);
  return { budget: spend, cpl: cost, qualified: quality, appointments: booking, contacts, qualifiedContacts,
    bookedAppointments: Math.floor(qualifiedContacts * booking / 100) };
}

export function diagnosticPayload(fields, pageUrl, referrer = '', plan = null) {
  const value = name => String(fields[name] || '').trim();
  const profileLabels = { corretores: 'Corretor autônomo', imobiliarias: 'Imobiliária', incorporadoras: 'Incorporadora', empreiteiras: 'Empreiteira', construtoras: 'Construtora' };
  const phone = value('telefone').replace(/\D/g, '');
  if (value('nome').length < 2 || !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(value('email')) || !(/^[1-9]\d{9,10}$/.test(phone) || /^55[1-9]\d{9,10}$/.test(phone))) throw new Error('Preencha nome, e-mail e WhatsApp com DDD válidos.');
  if (!profileLabels[value('seo_publico')] || !value('gargalo') || value('consentimento_contato') !== 'sim') throw new Error('Selecione seu perfil, o gargalo e a autorização de contato.');
  const url = new URL(pageUrl);
  const custom_fields = { seo_servico: value('seo_servico'), seo_publico: value('seo_publico'), seo_cidade: value('seo_cidade'), seo_uf: value('seo_uf'), seo_ibge: value('seo_ibge'),
    consentimento_contato: 'sim', consentimento_versao: 'diagnostico-20261003', ...(plan ? { premissas_planejamento: JSON.stringify(plan) } : {}) };
  const utms = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].filter(key => url.searchParams.has(key)).map(key => [key, url.searchParams.get(key)]));
  return { project: 'organic_diagnostic', nome: value('nome'), telefone: phone, email: value('email').toLowerCase(), perfil: profileLabels[value('seo_publico')], gargalo: value('gargalo'), faturamento: value('faturamento'),
    origem_cta: 'diagnostico_organico', origem_pagina: url.href, referrer, ...utms, ...custom_fields, custom_fields };
}

export async function submitDiagnostic(payload, fetcher = fetch) {
  const response = await fetcher('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || !result.lead_id) throw new Error('Não foi possível confirmar o cadastro. Tente novamente em alguns instantes.');
  return result;
}

if (typeof document !== 'undefined') {
  let plan = null;
  const track = (name, properties) => {
    try { window.imtTrack?.(name, { ...properties, acquisition: 'organic_services', service: document.querySelector('[name=seo_servico]')?.value, city: document.querySelector('[name=seo_cidade]')?.value }); } catch { /* Analytics cannot change lead delivery. */ }
  };
  const form = document.getElementById('seo-diagnostic');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('seo-form-status');
    const button = form.querySelector('button[type=submit]');
    if (button.disabled || !form.reportValidity()) return;
    status.className = 'seo-form-status';
    try {
      const payload = diagnosticPayload(Object.fromEntries(new FormData(form)), location.href, document.referrer, plan);
      button.disabled = true;
      button.textContent = 'Enviando diagnóstico…';
      const result = await submitDiagnostic(payload);
      status.classList.add('is-success');
      status.textContent = 'Diagnóstico registrado. A equipe entrará em contato pelos dados informados.';
      button.textContent = 'Diagnóstico registrado ✓';
      track('generate_lead', { method: 'form_os', form: 'organic_diagnostic', lead_id: result.lead_id });
      try { window.HubTracker?.identify?.({ email: payload.email, phone: payload.telefone, name: payload.nome }); } catch { /* Lead already confirmed. */ }
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error.name === 'TimeoutError' ? 'O envio demorou mais que o esperado. Tente novamente em alguns instantes.' : error.message;
      button.disabled = false;
      button.textContent = 'Solicitar meu diagnóstico ↗';
    }
  });
  const planner = document.getElementById('seo-planner');
  planner?.addEventListener('submit', event => {
    event.preventDefault();
    const output = document.getElementById('seo-plan-result');
    if (!planner.reportValidity()) return;
    try {
      plan = calculatePlan(Object.fromEntries(new FormData(planner)));
      const fmt = number => number.toLocaleString('pt-BR');
      output.replaceChildren();
      const strong = document.createElement('strong');
      strong.textContent = `${fmt(plan.contacts)} contatos no cenário`;
      output.append(strong, document.createTextNode(`${fmt(plan.qualifiedContacts)} qualificados e ${fmt(plan.bookedAppointments)} agendamentos, se suas premissas se confirmarem. Valores hipotéticos; não são previsão de resultado.`));
      document.getElementById('seo-use-plan').hidden = false;
      track('planning_calculated', { contacts: plan.contacts, qualified_contacts: plan.qualifiedContacts, appointments: plan.bookedAppointments });
    } catch (error) { output.textContent = error.message; }
  });
  document.getElementById('seo-use-plan')?.addEventListener('click', () => {
    document.getElementById('diagnostico').scrollIntoView({ behavior: 'smooth' });
    form?.querySelector('[name=nome]')?.focus({ preventScroll: true });
  });
  document.getElementById('seo-city-search')?.addEventListener('submit', event => {
    event.preventDefault();
    const input = event.target.querySelector('input');
    const normal = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const option = [...document.querySelectorAll('#seo-city-options option')].find(item => normal(item.value) === normal(input.value));
    if (!option) {
      document.getElementById('seo-city-status').textContent = 'Escolha uma cidade da lista deste estado.';
      return;
    }
    location.assign(`/servicos/agencia-de-marketing-imobiliario/${document.body.dataset.state}/${option.dataset.slug}/`);
  });
  document.querySelectorAll('a[href="#diagnostico"]').forEach(link => link.addEventListener('click', () => track('cta_click', { cta_type: 'diagnostic', placement: link.closest('header') ? 'header' : 'content' })));
}
