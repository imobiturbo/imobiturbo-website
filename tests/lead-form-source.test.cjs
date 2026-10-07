const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const handler = import(require('node:url').pathToFileURL(path.join(__dirname, '../functions/api/lead.js')));

async function submit(t, payload) {
  const previous = global.fetch;
  const calls = [];
  t.after(() => { global.fetch = previous; });
  global.fetch = async (url) => {
    calls.push(String(url));
    return Response.json({ data: { lead_id: 'cadastro-descartavel' } });
  };
  const response = await (await handler).onRequestPost({ request: new Request('https://www.imobiturbo.com.br/api/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }) });
  assert.equal(response.status, 200);
  return { calls, data: await response.json() };
}

test('diagnóstico da página inicial com faturamento continua na fonte oficial', async t => {
  const result = await submit(t, { nome: 'Proprietário', email: 'proprietario@example.invalid',
    telefone: '21999999999', perfil: 'Corretor autônomo', faturamento: 'Até R$ 10 mil/mês' });
  assert.match(result.calls[0], /form-sources\/imt_lp_oficial_/);
  assert.equal(result.calls.length, 1);
  assert.equal(result.data.waha_dispatched, false);
});

test('projeto Imobicreator explícito conserva sua fonte e atendimento', async t => {
  const result = await submit(t, { project: 'imobicreator', nome: 'Proprietário',
    email: 'proprietario@example.invalid', telefone: '21999999999', cargo: 'Diretor', faturamento: 'Até R$ 10 mil/mês' });
  assert.match(result.calls[0], /form-sources\/imt_imobicreator_aicreators_lead$/);
  assert.equal(result.calls.length, 2);
  assert.equal(result.data.waha_dispatched, true);
});

test('cadastro legado do Imobicreator com cargo continua reconhecido', async t => {
  const result = await submit(t, { nome: 'Proprietário', email: 'proprietario@example.invalid', cargo: 'Diretor' });
  assert.match(result.calls[0], /form-sources\/imt_imobicreator_aicreators_lead$/);
});

test('diagnóstico orgânico confirmado conserva cidade na fonte oficial e não envia WAHA', async t => {
  const result = await submit(t, { project: 'organic_diagnostic', nome: 'Proprietário', email: 'proprietario@example.invalid',
    telefone: '21999999999', perfil: 'Empreiteira', gargalo: 'Atrair leads qualificados', consentimento_contato: 'sim', seo_cidade: 'São Paulo' });
  assert.match(result.calls[0], /form-sources\/imt_lp_oficial_/);
  assert.equal(result.calls.length, 1);
  assert.equal(result.data.lead_id, 'cadastro-descartavel');
});

test('OS indisponível ou sem recibo não gera sucesso nem mensagem', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous; });
  for (const response of [Response.json({ error: 'falha' }, { status: 503 }), Response.json({ data: {} }), Response.json({ ok: false, data: { lead_id: 'rejeitado' } })]) {
    let calls = 0;
    global.fetch = async () => { calls++; return response; };
    const res = await (await handler).onRequestPost({ request: new Request('https://www.imobiturbo.com.br/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: 'imobicreator', nome: 'Proprietário', telefone: '21999999999', cargo: 'Diretor' }),
    }) });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
    assert.equal(calls, 1);
  }
});

test('diagnóstico sem JavaScript normaliza perfil e confirma em HTML após o recibo real', async t => {
  const previous = global.fetch;
  t.after(() => { global.fetch = previous; });
  let forwarded;
  global.fetch = async (url, options) => { forwarded = JSON.parse(options.body); return Response.json({ data: { lead_id: 'confirmado' } }); };
  const res = await (await handler).onRequestPost({ request: new Request('https://www.imobiturbo.com.br/api/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ project: 'organic_diagnostic', nome: 'Proprietário', email: 'proprietario@example.invalid', telefone: '21999999999', seo_publico: 'construtoras', gargalo: 'Atrair leads qualificados', consentimento_contato: 'sim', seo_cidade: 'São Paulo' }),
  }) });
  assert.equal(res.status, 200);
  assert.equal(forwarded.perfil, 'Construtora');
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /Diagnóstico registrado/);
});
