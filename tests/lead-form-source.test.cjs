const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../functions/api/lead.js'), 'utf8');
const handler = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

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
