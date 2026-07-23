const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});

const number = (body, key, fallback = 0) => Number.parseFloat(body[key] ?? fallback) || 0;
const conversions = (body) => [1, 2, 3, 4, 5].map((step) => number(body, `conv${step}`) / 100);

function funnel(leads, rates) {
  const op = leads * rates[0];
  const va = op * rates[1];
  const vr = va * rates[2];
  const pr = vr * rates[3];
  const ve = pr * rates[4];
  return { leads, op, va, vr, pr, ve };
}

function costs(custoLead, rates) {
  const values = [custoLead];
  for (const rate of rates) values.push(rate > 0 ? values.at(-1) / rate : 0);
  return values;
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ erro: 'Body inválido ou não é JSON' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ erro: 'Body inválido ou não é JSON' }, 400);
  if (!env.SIMULADOR_PASSWORD || String(body.senha ?? '').trim().toLowerCase() !== env.SIMULADOR_PASSWORD.toLowerCase()) {
    return json({ erro: 'Senha incorreta' }, 401);
  }

  const rates = conversions(body);
  const orcamento = number(body, 'orcamento');
  const custoLead = number(body, 'custoLead');
  const ticket = number(body, 'ticket');
  const taxaServico = number(body, 'taxaServico');

  if (body.tipo === 'autonomo') {
    const comissao = ticket * number(body, 'percComissao') / 100;
    const f = funnel(custoLead > 0 ? orcamento / custoLead : 0, rates);
    const vendas = Math.floor(f.ve);
    const receita = vendas * comissao;
    const totalInv = orcamento + taxaServico;
    return json({ funil: f, costs: costs(custoLead, rates), comissao, vendas, receita, totalInv, lucro: receita - totalInv, roas: totalInv > 0 ? receita / totalInv : 0, convGeral: f.leads > 0 ? f.ve / f.leads * 100 : 0, vgv: vendas * ticket });
  }

  if (body.tipo === 'imobiliaria') {
    const percCorretor = number(body, 'percCorretor');
    const percGestor = number(body, 'percGestor');
    const percImob = number(body, 'percImob');
    const totalPerc = percCorretor + percGestor + percImob;
    const valCorretor = ticket * percCorretor / 100;
    const valGestor = ticket * percGestor / 100;
    const valImob = ticket * percImob / 100;
    const f = funnel(custoLead > 0 ? orcamento / custoLead : 0, rates);
    const vendas = Math.floor(f.ve);
    const receitaTotal = vendas * ticket * totalPerc / 100;
    const receitaImob = vendas * valImob;
    const totalInv = orcamento + taxaServico;
    return json({ funil: f, costs: costs(custoLead, rates), totalPerc, valCorretor, valGestor, valImob, vendas, receitaTotal, receitaImob, totalInv, lucroImob: receitaImob - totalInv, roas: totalInv > 0 ? receitaTotal / totalInv : 0, convGeral: f.leads > 0 ? f.ve / f.leads * 100 : 0, vgv: vendas * ticket, totalCorretor: vendas * valCorretor, totalGestor: vendas * valGestor, totalImob: receitaImob });
  }

  if (body.tipo === 'gestor') {
    const nCorretores = Math.max(1, Number.parseInt(body.nCorretores ?? 1, 10) || 1);
    const percOverride = number(body, 'percOverride');
    const percVendaPropria = number(body, 'percVendaPropria');
    const vendasProprias = number(body, 'vendasProprias');
    const funilCorretor = funnel(custoLead > 0 ? (orcamento / nCorretores) / custoLead : 0, rates);
    const funilTime = Object.fromEntries(Object.entries(funilCorretor).map(([key, value]) => [key, value * nCorretores]));
    const vendasTime = Math.floor(funilTime.ve);
    const vgv = vendasTime * ticket;
    const ganhoOverride = vgv * percOverride / 100;
    const ganhoVPropria = vendasProprias * ticket * percVendaPropria / 100;
    const ganhoTotal = ganhoOverride + ganhoVPropria;
    const totalInv = orcamento + taxaServico;
    return json({ funilCorretor, funilTime, costs: costs(custoLead, rates), vendasTime, vgv, ganhoOverride, ganhoVPropria, ganhoTotal, totalInv, roas: totalInv > 0 ? ganhoTotal / totalInv : 0 });
  }

  return json({ erro: `Tipo inválido: '${body.tipo ?? ''}'. Use 'autonomo', 'imobiliaria' ou 'gestor'` }, 400);
}
