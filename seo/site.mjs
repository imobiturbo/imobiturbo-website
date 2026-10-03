import localities from './localities.mjs';
import { SERVICES, AUDIENCES } from './services.mjs';

export const ORIGIN = 'https://www.imobiturbo.com.br';
export const VERSION = '20261003';
export const UPDATED = '2026-10-03';
export const PAGE_SIZE = 120;
export { SERVICES, AUDIENCES, localities };
const serviceMap = new Map(SERVICES.map(s => [s.slug, s]));
const audienceMap = new Map(AUDIENCES.map(a => [a.slug, a]));
const stateMap = new Map(localities.states.map(s => [s.slug, s]));
const cityMap = new Map(localities.cities.map(c => [`${c.u}/${c.s}`, c]));
const stateCities = new Map(localities.states.map(s => [s.slug, localities.cities.filter(c => c.u === s.slug)]));
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = (value, digits = 0) => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const servicePath = service => `/servicos/${service.slug}/`;
export const cityPath = (service, city) => `${servicePath(service)}${city.u}/${city.s}/`;
export const profilePath = (service, audience) => `${servicePath(service)}para/${audience.slug}/`;
export const statePath = (state, page = 1) => `/servicos/cidades/${state.slug}/${page > 1 ? `pagina/${page}/` : ''}`;

// One canonical intent per path. Invalid municipalities and profile/geo cross products are 404s.
export function resolveRoute(pathname) {
  const path = pathname.split('/').filter(Boolean);
  if (path[0] !== 'servicos') return null;
  if (path.length === 1) return { kind: 'hub', path: '/servicos/' };
  if (path[1] === 'cidades') {
    if (path.length === 2) return { kind: 'directory', path: '/servicos/cidades/' };
    const state = stateMap.get(path[2]);
    if (!state) return null;
    const page = path.length === 3 ? 1 : path.length === 5 && path[3] === 'pagina' && /^[1-9]\d*$/.test(path[4]) ? Number(path[4]) : 0;
    const cities = stateCities.get(state.slug);
    if (!page || page > Math.ceil(cities.length / PAGE_SIZE)) return null;
    return { kind: 'state', state, page, cities: cities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: cities.length, pages: Math.ceil(cities.length / PAGE_SIZE), path: statePath(state, page) };
  }
  const service = serviceMap.get(path[1]);
  if (!service) return null;
  if (path.length === 2) return { kind: 'service', service, path: servicePath(service) };
  if (path.length !== 4) return null;
  if (path[2] === 'para') {
    const audience = audienceMap.get(path[3]);
    return audience ? { kind: 'profile', service, audience, path: profilePath(service, audience) } : null;
  }
  const city = cityMap.get(`${path[2]}/${path[3]}`);
  return city ? { kind: 'city', service, city, state: stateMap.get(city.u), path: cityPath(service, city) } : null;
}

function breadcrumbs(route) {
  const items = [{ name: 'Início', path: '/' }, { name: 'Serviços', path: '/servicos/' }];
  if (route.service) items.push({ name: route.service.shortName, path: servicePath(route.service) });
  if (route.kind === 'profile') items.push({ name: route.audience.name, path: route.path });
  if (['directory', 'state'].includes(route.kind)) items.push({ name: 'Cidades', path: '/servicos/cidades/' });
  if (route.state) items.push({ name: route.state.name, path: statePath(route.state) });
  if (route.kind === 'state' && route.page > 1) items.push({ name: `Página ${route.page}`, path: route.path });
  if (route.city) items.push({ name: `${route.city.n} · ${route.city.u.toUpperCase()}`, path: route.path });
  return items;
}
export function metadata(route) {
  let heading, description;
  if (route.kind === 'hub') {
    heading = 'Marketing imobiliário que começa pela sua operação';
    description = 'Marketing imobiliário, landing pages, tráfego pago e social media para corretores e empresas. Faça o diagnóstico da sua operação com a Imobiturbo.';
  } else if (route.kind === 'directory') {
    heading = 'Marketing imobiliário por cidade';
    description = 'Encontre orientações de marketing imobiliário, landing pages, tráfego pago e social media para sua cidade. Consulte dados do IBGE e faça seu diagnóstico.';
  } else if (route.kind === 'state') {
    heading = `Marketing imobiliário em ${route.state.name}`;
    description = `Cidades de ${route.state.name}, página ${route.page} de ${route.pages}: orientações de marketing imobiliário. Encontre seu município e planeje captação e atendimento.`;
  } else if (route.kind === 'city') {
    heading = `${route.service.name} em ${route.city.n}, ${route.city.u.toUpperCase()}`;
    description = `${route.service.shortName} em ${route.city.n}, ${route.city.u.toUpperCase()}: contexto municipal, roteiro de captação e diagnóstico para corretores e empresas do mercado imobiliário.`;
  } else if (route.kind === 'profile') {
    const audienceName = route.audience.slug === 'corretores' ? 'corretores de imóveis' : route.audience.name.toLowerCase();
    const label = { 'agencia-de-marketing-imobiliario': 'Marketing imobiliário', 'landing-pages-imobiliarias': 'Landing page', 'trafego-pago-imobiliario': 'Tráfego pago', 'social-media-imobiliario': 'Social media' }[route.service.slug];
    heading = `${label} para ${audienceName}`;
    description = route.service.profiles[route.audience.slug].intro;
  } else {
    heading = route.service.name;
    description = route.service.intro;
  }
  // Keep the full geographic identity even when a long municipal name exceeds a SERP preview.
  const title = `${route.kind === 'hub' ? 'Marketing imobiliário e captação de leads' : heading}${route.kind === 'state' && route.page > 1 ? ` · Página ${route.page}` : ''} | Imobiturbo`;
  return { title, heading, description: description.length > 160 ? `${description.slice(0, 156).replace(/\s+\S*$/, '')}…` : description };
}
const list = items => `<ul>${items.map(text => `<li>${escape(text)}</li>`).join('')}</ul>`;
const section = (id, kicker, title, body, extra = '') => `<section id="${id}" class="seo-section ${extra}"><div class="seo-shell"><p class="seo-eyebrow">${escape(kicker)}</p><h2>${escape(title)}</h2>${body}</div></section>`;
function serviceCards() {
  return `<div class="seo-grid">${SERVICES.map(s => `<a class="seo-card" href="${servicePath(s)}"><span class="seo-card-kicker">${escape(s.eyebrow)}</span><h3>${escape(s.name)}</h3><p>${escape(s.intro)}</p><span class="seo-card-link">Ver o caminho →</span></a>`).join('')}</div>`;
}
function stateLinks() {
  return `<div class="seo-state-grid">${localities.states.map(s => `<a href="${statePath(s)}">${escape(s.name)} <span>${number(stateCities.get(s.slug).length)} cidades →</span></a>`).join('')}</div>`;
}
function diagnostic(route) {
  const selected = route.audience?.slug || '';
  return section('diagnostico', 'Seu próximo passo', 'Qual parte da sua operação precisa avançar?', `<div class="seo-form-layout"><div><p>Use o mesmo diagnóstico da Imobiturbo para conectar marketing, atendimento e vendas. A página de origem acompanha sua solicitação para que a conversa comece com contexto.</p><ol class="seo-checklist"><li>Conte seu perfil e o principal gargalo.</li><li>Deixe um contato para o retorno da equipe.</li><li>O diagnóstico orienta o próximo passo e o formato de acompanhamento adequado à sua operação.</li></ol><p class="seo-muted">Planejamento de marketing, implantação, mentoria e execução têm escopos diferentes. A disponibilidade e a proposta são definidas após entender sua necessidade.</p><a class="seo-text-link" href="/depoimentos/">Veja os relatos e registros de clientes →</a></div><form class="seo-form" id="seo-diagnostic" method="post" action="/api/lead"><label>Seu nome<input name="nome" autocomplete="name" required maxlength="100" placeholder="Como podemos chamar você?"></label><div class="seo-form-row"><label>WhatsApp com DDD<input name="telefone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20" placeholder="(11) 99999-9999"></label><label>E-mail profissional<input name="email" type="email" autocomplete="email" required maxlength="160" placeholder="voce@empresa.com.br"></label></div><label>Seu perfil<select name="seo_publico" required><option value="">Selecione</option>${AUDIENCES.map(a => `<option value="${a.slug}"${a.slug === selected ? ' selected' : ''}>${escape(a.name)}</option>`).join('')}</select></label><label>Principal gargalo<select name="gargalo" required><option value="">Selecione</option><option>Atrair leads qualificados</option><option>Melhorar minha página de captação</option><option>Atendimento sem padrão</option><option>Follow-up inconsistente</option><option>Organizar conteúdo e posicionamento</option><option>Estruturar vendas de um lançamento</option></select></label><label>Faixa de faturamento mensal (opcional)<select name="faturamento"><option value="">Prefiro conversar no diagnóstico</option><option>Até R$ 10 mil/mês</option><option>R$ 10 mil a R$ 30 mil/mês</option><option>R$ 30 mil a R$ 100 mil/mês</option><option>Acima de R$ 100 mil/mês</option></select></label><input type="hidden" name="project" value="organic_diagnostic"><input type="hidden" name="seo_servico" value="${escape(route.service?.slug || 'marketing-imobiliario')}"><input type="hidden" name="seo_cidade" value="${escape(route.city?.n || '')}"><input type="hidden" name="seo_uf" value="${escape(route.city?.u || '')}"><input type="hidden" name="seo_ibge" value="${escape(route.city?.i || '')}"><input type="hidden" name="origem_pagina" value="${ORIGIN}${route.path}"><input type="hidden" name="origem_cta" value="diagnostico_organico"><label class="seo-consent"><input type="checkbox" name="consentimento_contato" value="sim" required><span>Autorizo contato sobre meu diagnóstico e li a <a href="/politica-de-privacidade/">Política de Privacidade</a>.</span></label><button class="seo-button" type="submit">Solicitar meu diagnóstico <span>↗</span></button><p id="seo-form-status" class="seo-form-status" role="status" aria-live="polite"></p><noscript><p>O formulário funciona melhor com JavaScript. Você também pode <a href="/?origem=servicos#diagnostico">abrir o diagnóstico na página inicial</a>.</p></noscript></form></div>`, 'seo-diagnostic-section');
}
function planner(route) {
  const place = route.city ? `${route.city.n} (${route.city.u.toUpperCase()})` : 'sua região';
  return section('planejamento', 'Faça as contas com suas premissas', `Uma meta de captação viável para ${place}`, `<div class="seo-planner-layout"><div><p>A população municipal não representa demanda por imóveis. Uma campanha depende de estoque, oferta, orçamento e atendimento. Use o simulador para estimar a capacidade necessária a partir dos números da sua própria operação.</p><p>Informe a verba mensal e um custo por contato que você deseja testar. Depois, indique as taxas de qualificação e de agendamento. O resultado é uma hipótese de planejamento, não uma promessa de leads, visitas ou vendas.</p><p class="seo-muted">Custo por contato não equivale a custo por venda. Acompanhe também o comparecimento, a proposta, o fechamento e a margem da operação.</p></div><form id="seo-planner" class="seo-planner"><div class="seo-form-row"><label>Verba mensal de mídia (R$)<input name="budget" type="number" min="1" max="10000000" step="1" value="1500" required></label><label>Custo por contato hipotético (R$)<input name="cpl" type="number" min="0.01" max="100000" step="0.01" value="30" required></label></div><div class="seo-form-row"><label>Contatos qualificados (%)<input name="qualified" type="number" min="0" max="100" step="1" value="40" required></label><label>Qualificados que agendam (%)<input name="appointments" type="number" min="0" max="100" step="1" value="25" required></label></div><button type="submit" class="seo-button seo-button-secondary">Calcular cenário →</button><output id="seo-plan-result" aria-live="polite">Preencha suas premissas para calcular.</output><button type="button" id="seo-use-plan" class="seo-text-button" hidden>Levar estas premissas ao diagnóstico ↓</button></form></div>`);
}
function cityContext(route) {
  const { city, state, service } = route;
  const source = `https://www.ibge.gov.br/cidades-e-estados/${city.u}/${city.s}.html`;
  const density = city.d ?? 0;
  const compact = density >= 500;
  const small = city.p != null && city.p < 50000;
  const geography = compact
    ? 'O município apresenta concentração populacional elevada. No briefing, separe bairros, faixas de preço e tipos de imóvel antes de testar áreas de anúncio. Uma campanha única para toda a cidade pode misturar necessidades diferentes.'
    : 'A área municipal e a distribuição da população exigem cuidado com o raio de atendimento. Separe sede, distritos e áreas rurais no briefing e confirme onde seu estoque ou sua obra pode ser atendido, em vez de anunciar para todo o território por padrão.';
  const operation = small
    ? 'Em um município de menor população, registre também as cidades efetivamente atendidas e a procedência dos contatos. Indicação, carteira local e procura de municípios próximos devem ser avaliadas com dados da sua operação; o tamanho da cidade sozinho não revela a demanda.'
    : 'Neste município, delimite primeiro a carteira e o tipo de demanda: comprador, locatário, proprietário que deseja anunciar ou contratante de obra. Meça o avanço de cada grupo separadamente para não tratar todo contato como intenção de compra.';
  const neighboring = localities.cities.filter(c => c.ri === city.ri && c.i !== city.i).slice(0, 8);
  const facts = city.p == null ? `<p>Este município consta no cadastro atual de localidades do IBGE, mas não possui uma linha própria na tabela consultada do Censo 2022. Não atribuímos a ele os números de municípios de origem.</p>`
    : `<dl class="seo-facts"><div><dt>População residente · 2022</dt><dd>${number(city.p)}</dd></div><div><dt>Área municipal · 2022</dt><dd>${number(city.a, 3)} km²</dd></div><div><dt>Densidade · 2022</dt><dd>${number(city.d, 2)} hab./km²</dd></div></dl>`;
  const checklist = {
    'agencia-de-marketing-imobiliario': [`Quais bairros de ${city.n} concentram seu estoque e quais você atende de fato?`, 'Qual oferta precisa de prioridade: imóvel, lançamento, captação de proprietário ou contratação de obra?', 'Quem responde aos contatos e qual é o próximo passo de cada origem?'],
    'landing-pages-imobiliarias': [`A página representa um imóvel, um empreendimento ou um serviço em ${city.n}?`, 'O visitante encontra localização, características, situação do imóvel ou escopo da obra antes do formulário?', 'O contato chega ao responsável com a oferta, a campanha e a cidade preservadas?'],
    'trafego-pago-imobiliario': [`A segmentação corresponde à área atendida em ${city.n} ou inclui compradores de outras cidades?`, 'Seu objetivo é contato qualificado, visita, captação de imóvel ou reunião para orçamento de obra?', 'A verba e o atendimento comportam o volume que suas premissas indicam?'],
    'social-media-imobiliario': [`Quais dúvidas aparecem nas conversas com clientes de ${city.n}?`, 'Que visitas, obras e informações de bairro podem ser documentadas com autorização e contexto?', 'Cada conteúdo leva a uma conversa identificável ou só aumenta curtidas?'],
  }[service.slug];
  return section('contexto-local', 'Contexto local · fonte pública', `O que considerar em ${city.n}`, `<p>${escape(city.n)} fica em ${escape(state.name)}, na Região ${escape(state.region)}, e integra a região geográfica imediata de ${escape(city.r)}. O código municipal do IBGE é <strong>${city.i}</strong>.</p>${facts}<p class="seo-source">Fonte: <a href="https://sidra.ibge.gov.br/tabela/4714">IBGE, Censo 2022, tabela 4714</a> e <a href="${source}" rel="external">cadastro municipal</a>. Referência de população, área e densidade: 2022. Dados históricos de contexto, sem estimativa de demanda imobiliária.</p><div class="seo-grid seo-grid-two"><article class="seo-panel"><h3>Delimite a área de atuação</h3><p>${geography}</p></article><article class="seo-panel"><h3>Separe as necessidades de cada contato</h3><p>${operation}</p></article></div><h3>Briefing de ${escape(service.shortName.toLowerCase())} para ${escape(city.n)}</h3>${list(checklist)}<p>Use essas perguntas para registrar o contexto antes de contratar ferramentas ou investir em anúncios. Acrescente sua carteira, os bairros, a faixa de preço ou o escopo da obra. O diagnóstico da Imobiturbo conecta esse briefing à rotina comercial e ao acompanhamento adequado.</p>${neighboring.length ? `<h3>Outros municípios da mesma região imediata</h3><p>Se sua operação atende estas cidades, consulte também seus contextos. A proximidade regional não significa que todo município deva entrar na segmentação.</p><div class="seo-link-cloud">${neighboring.map(c => `<a href="${cityPath(service, c)}">${escape(c.n)} · ${c.u.toUpperCase()}</a>`).join('')}</div>` : ''}`);
}
function profileSections(service, selected) {
  const audiences = selected ? [selected] : AUDIENCES;
  return `<div class="seo-grid ${selected ? 'seo-grid-two' : ''}">${audiences.map(a => {
    const profile = service.profiles[a.slug];
    return `<article class="seo-panel"><h3>${escape(a.name)}</h3><p>${escape(profile.pain)}</p>${list(profile.focus)}${selected ? '' : `<a class="seo-text-link" href="${profilePath(service, a)}">${escape(profile.headline)} →</a>`}</article>`;
  }).join('')}</div>`;
}
function commercialBody(route) {
  const s = route.service;
  const profile = route.audience && s.profiles[route.audience.slug];
  return (route.city ? cityContext(route) : '')
    + section('estrategia', s.eyebrow, 'Do interesse ao próximo passo comercial', `<p class="seo-intro">${escape(profile?.intro || s.intro)}</p><p>${escape(s.problem)}</p><div class="seo-grid">${s.steps.map((step, i) => `<article class="seo-panel"><span class="seo-step">0${i + 1}</span><h3>${escape(step.title)}</h3><p>${escape(step.text)}</p></article>`).join('')}</div>`)
    + section('publicos', 'Cada operação pede um caminho', profile ? `Um plano para ${route.audience.name.toLowerCase()}` : 'Corretor, imobiliária, incorporadora, construtora ou empreiteira', profileSections(s, route.audience))
    + section('escopo', 'Antes de investir', 'O que precisa entrar no seu briefing', `${list(s.deliverables)}<p>O diagnóstico identifica as prioridades e orienta a escolha entre processos, tecnologia, mentoria e consultoria. Ele não substitui uma proposta com escopo, responsáveis, prazo e investimento definidos.</p><a class="seo-text-link" href="/depoimentos/">Consulte os depoimentos e registros da Imobiturbo →</a>`)
    + planner(route) + diagnostic(route);
}
function directoryBody(route) {
  if (route.kind !== 'state') return section('estados', 'Brasil · 27 unidades da federação', 'Encontre o contexto da sua cidade', `<p>As páginas municipais reúnem dados públicos do IBGE, perguntas de briefing e um simulador de capacidade de captação. O atendimento começa pelo diagnóstico atual da Imobiturbo.</p>${stateLinks()}`);
  return section('municipios', `${number(route.total)} municípios · página ${route.page} de ${route.pages}`, `Escolha sua cidade em ${route.state.name}`, `<p>Escolha o município e a necessidade da sua operação. As orientações de agência, landing page, tráfego pago e social media têm páginas próprias e levam ao mesmo diagnóstico.</p><form id="seo-city-search" class="seo-city-search"><label>Buscar cidade neste estado<input type="search" name="city" list="seo-city-options" placeholder="Digite o nome da cidade" autocomplete="off" required></label><button class="seo-button" type="submit">Abrir cidade →</button><datalist id="seo-city-options">${stateCities.get(route.state.slug).map(c => `<option value="${escape(c.n)}" data-slug="${c.s}"></option>`).join('')}</datalist><p class="seo-form-status" id="seo-city-status" role="status"></p></form><div class="seo-city-grid">${route.cities.map(c => `<article class="seo-panel"><h3>${escape(c.n)} <span>${c.u.toUpperCase()}</span></h3><ul>${SERVICES.map(s => `<li><a href="${cityPath(s, c)}">${escape(s.shortName)} →</a></li>`).join('')}</ul></article>`).join('')}</div><nav class="seo-pagination" aria-label="Páginas de municípios">${Array.from({ length: route.pages }, (_, i) => `<a href="${statePath(route.state, i + 1)}"${route.page === i + 1 ? ' aria-current="page"' : ''}>${i + 1}</a>`).join('')}</nav>`);
}
function faqItems(route) {
  if (!route.service) return [
    { question: 'Como escolher o serviço de marketing imobiliário?', answer: 'Comece pelo gargalo da sua operação: atrair a pessoa certa, apresentar a oferta, responder com contexto ou acompanhar até a decisão. O diagnóstico reúne essas informações antes de indicar um caminho.' },
    { question: 'A Imobiturbo atende somente uma cidade?', answer: 'As páginas usam contexto municipal para orientar o planejamento de operações no Brasil. Não representam escritórios em cada cidade. O formato de acompanhamento e a disponibilidade são definidos na conversa do diagnóstico.' },
  ];
  return [...route.service.faq, ...(route.audience ? [route.service.profiles[route.audience.slug].faq] : []), ...(route.city ? [
    { question: `Como planejar ${route.service.shortName.toLowerCase()} em ${route.city.n}?`, answer: `Delimite os bairros e municípios atendidos, o estoque ou o serviço de obra e o perfil dos contatos. Use o contexto de ${route.city.n} e as perguntas desta página no briefing, simule a capacidade com suas próprias premissas e solicite o diagnóstico para alinhar marketing e atendimento.` },
    { question: `Existe um escritório da Imobiturbo em ${route.city.n}?`, answer: 'Esta é uma página de orientação para a operação local, não a declaração de uma unidade física. O diagnóstico considera a região atendida e define o formato de acompanhamento disponível.' },
  ] : [])];
}
export function renderPage(route) {
  const meta = metadata(route);
  const crumbs = breadcrumbs(route);
  const faqs = faqItems(route);
  const intro = route.city ? `${route.service.intro} Para sua operação em ${route.city.n}, o ponto de partida é entender a oferta, a região atendida e a capacidade de resposta aos contatos.` : route.audience ? route.service.profiles[route.audience.slug].intro : route.service?.intro || meta.description;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${ORIGIN}${route.path}#page`, url: `${ORIGIN}${route.path}`, name: meta.heading, description: meta.description, inLanguage: 'pt-BR', isPartOf: { '@id': `${ORIGIN}/#website` }, ...(route.city ? { about: { '@type': 'City', name: route.city.n, identifier: String(route.city.i), containedInPlace: { '@type': 'State', name: route.state.name } } } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${ORIGIN}${c.path}` })) },
    { '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) },
    ...(route.service ? [{ '@type': 'Service', name: meta.heading, serviceType: route.service.name, provider: { '@type': 'Organization', name: 'Imobiturbo', url: `${ORIGIN}/`, '@id': `${ORIGIN}/#organization` }, areaServed: route.city ? { '@type': 'City', name: route.city.n, identifier: String(route.city.i) } : { '@type': 'Country', name: 'Brasil' }, url: `${ORIGIN}${route.path}` }] : []),
  ] };
  let body = ['service', 'profile', 'city'].includes(route.kind) ? commercialBody(route) : route.kind === 'hub'
    ? section('servicos', 'Marketing + operação comercial', 'Escolha a necessidade da sua operação', serviceCards()) + diagnostic(route) + directoryBody(route)
    : directoryBody(route) + section('servicos', 'Comece pelo objetivo', 'Quatro caminhos para organizar a captação', serviceCards());
  body += section('perguntas', 'Sem pular etapas', 'Perguntas frequentes', `<div class="seo-faq">${faqs.map(f => `<details><summary>${escape(f.question)}</summary><p>${escape(f.answer)}</p></details>`).join('')}</div>`);
  if (route.service) body += section('outros-caminhos', 'Continue seu planejamento', 'Outras necessidades de marketing imobiliário', `<div class="seo-link-cloud">${SERVICES.filter(s => s.slug !== route.service.slug).map(s => `<a href="${route.city ? cityPath(s, route.city) : servicePath(s)}">${escape(s.name)}${route.city ? ` em ${escape(route.city.n)}` : ''} →</a>`).join('')}<a href="${route.state ? statePath(route.state) : '/servicos/cidades/'}">${route.state ? `Mais cidades em ${escape(route.state.name)}` : 'Encontre sua cidade'} →</a></div>`);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${ORIGIN}${route.path}"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:url" content="${ORIGIN}${route.path}"><meta property="og:image" content="${ORIGIN}/assets/home-hero-operacao-imobiliaria.webp"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/colors_and_type.css?v=20260918-v5"><link rel="stylesheet" href="/organic.css?v=${VERSION}"><link rel="preload" href="/fonts/PlusJakartaSans-Bold.ttf" as="font" type="font/ttf" crossorigin><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script><script id="hub-tracker" defer src="https://track.nmidigital.tech/t.js?operation=00000000-0000-0000-0000-000000000001" data-id="00000000-0000-0000-0000-000000000001" data-operation-id="00000000-0000-0000-0000-000000000001" data-endpoint="https://track.nmidigital.tech"></script><script defer src="/site-tracking.js?v=20260722"></script><script type="module" src="/organic.js?v=${VERSION}"></script></head><body class="seo-page" data-seo-version="${VERSION}" data-state="${route.state?.slug || ''}"><a class="seo-skip" href="#conteudo">Pular para o conteúdo</a><header class="seo-header"><div class="seo-shell"><a href="/" aria-label="Imobiturbo, início"><img src="/assets/logo-imobiturbo-white.webp" alt="Imobiturbo" width="152" height="32"></a><nav aria-label="Menu principal"><a href="/servicos/">Serviços</a><a href="/servicos/cidades/">Cidades</a><a href="/depoimentos/">Depoimentos</a><a class="seo-header-cta" href="${route.kind === 'state' || route.kind === 'directory' ? '/#diagnostico' : '#diagnostico'}">Diagnóstico ↗</a></nav></div></header><main id="conteudo"><section class="seo-hero"><div class="seo-shell"><nav class="seo-breadcrumb" aria-label="Você está aqui">${crumbs.map(c => `<a href="${c.path}">${escape(c.name)}</a>`).join('<span aria-hidden="true">/</span>')}</nav><p class="seo-eyebrow">${escape(route.city ? `${route.state.name} · contexto municipal` : route.service?.eyebrow || 'Para o mercado imobiliário')}</p><h1>${escape(meta.heading)}</h1><p class="seo-hero-intro">${escape(intro)}</p><div class="seo-hero-actions"><a class="seo-button" href="${route.kind === 'state' || route.kind === 'directory' ? (route.kind === 'state' ? '#municipios' : '#estados') : '#diagnostico'}">${route.kind === 'state' ? 'Encontrar minha cidade' : route.kind === 'directory' ? 'Escolher meu estado' : 'Quero diagnosticar minha operação'} ↗</a><a class="seo-text-link" href="${route.service ? '#estrategia' : '#servicos'}">Entender os caminhos ↓</a></div><p class="seo-hero-note">Mentoria, consultoria e tecnologia para conectar captação, atendimento e vendas.</p></div></section>${body}</main><footer class="seo-footer"><div class="seo-shell"><a href="/"><img src="/assets/logo-imobiturbo-white.webp" alt="Imobiturbo" width="152" height="32" loading="lazy"></a><p>Marketing e operação comercial para o mercado imobiliário.</p><nav aria-label="Rodapé"><a href="/servicos/">Todos os serviços</a><a href="/servicos/cidades/">Todas as cidades</a><a href="/corretor-autonomo/">Corretor autônomo</a><a href="/imobiliarias/">Imobiliárias</a><a href="/construtoras-incorporadoras/">Construtoras e incorporadoras</a><a href="/depoimentos/">Depoimentos</a><a href="/politica-de-privacidade/">Privacidade</a><a href="/termos-de-servico/">Termos</a></nav><p class="seo-muted">Imobiturbo · CNPJ 47.746.249/0001-04</p></div></footer></body></html>`;
}

export function* nationalPaths() {
  yield '/servicos/'; yield '/servicos/cidades/';
  for (const service of SERVICES) {
    yield servicePath(service);
    for (const audience of AUDIENCES) yield profilePath(service, audience);
  }
  for (const state of localities.states) {
    const pages = Math.ceil(stateCities.get(state.slug).length / PAGE_SIZE);
    for (let page = 1; page <= pages; page++) yield statePath(state, page);
  }
}
export function* municipalPaths(uf) {
  for (const city of stateCities.get(uf) || []) for (const service of SERVICES) yield cityPath(service, city);
}
export function sitemapFor(file) {
  const paths = file === 'servicos.xml' ? nationalPaths() : /^cidades-[a-z]{2}\.xml$/.test(file) && stateMap.has(file.slice(8, 10)) ? municipalPaths(file.slice(8, 10)) : null;
  if (!paths) return null;
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...paths].map(path => `<url><loc>${ORIGIN}${path}</loc><lastmod>${UPDATED}</lastmod></url>`).join('')}</urlset>`;
}
export function handlePage(request) {
  const url = new URL(request.url);
  const route = resolveRoute(url.pathname);
  if (!route) return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página não encontrada | Imobiturbo</title><h1>Página não encontrada</h1><p><a href="/servicos/">Veja os serviços de marketing imobiliário</a> ou <a href="/servicos/cidades/">encontre sua cidade</a>.</p></html>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
  if (url.pathname !== route.path) {
    url.pathname = route.path;
    return Response.redirect(url.href, 301);
  }
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  return new Response(request.method === 'HEAD' ? null : renderPage(route), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300', 'X-SEO-Version': VERSION } });
}
