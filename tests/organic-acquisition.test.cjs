const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const site = import('../seo/site.mjs');
const client = import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../organic.js'))).toString('base64'));

test('cada município tem identidade geográfica e quatro rotas canônicas sem colisão', async () => {
  const { localities, SERVICES, municipalPaths, resolveRoute, nationalPaths } = await site;
  assert.equal(localities.states.length, 27);
  assert.ok(localities.cities.length >= 5570);
  const paths = localities.states.flatMap(s => [...municipalPaths(s.slug)]);
  assert.equal(paths.length, localities.cities.length * SERVICES.length);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of [...paths, ...nationalPaths()]) assert.equal(resolveRoute(p)?.path, p, p);
  const sp = resolveRoute('/servicos/trafego-pago-imobiliario/sp/sao-paulo/');
  assert.equal(sp.city.i, 3550308);
  assert.equal(sp.city.p, 11451999);
  assert.equal(resolveRoute('/servicos/social-media-imobiliario/mt/boa-esperanca-do-norte/').city.p, null);
});

test('municípios homônimos e páginas do diretório conservam títulos e descrições distintos', async () => {
  const { localities, municipalPaths, nationalPaths, resolveRoute, metadata } = await site;
  const paths = [...nationalPaths(), ...localities.states.flatMap(state => [...municipalPaths(state.slug)])];
  const titles = new Map(), descriptions = new Map();
  for (const routePath of paths) {
    const meta = metadata(resolveRoute(routePath));
    assert.ok(!titles.has(meta.title), `${routePath} duplicates title of ${titles.get(meta.title)}`);
    assert.ok(!descriptions.has(meta.description), `${routePath} duplicates description of ${descriptions.get(meta.description)}`);
    titles.set(meta.title, routePath); descriptions.set(meta.description, routePath);
  }
});

test('cidade inválida e combinações desconhecidas retornam 404, sem soft404 ou redirecionamento genérico', async () => {
  const { handlePage } = await site;
  for (const p of ['/servicos/inexistente/', '/servicos/trafego-pago-imobiliario/sp/rio-de-janeiro/', '/servicos/cidades/xx/', '/servicos/cidades/sp/pagina/999/', '/servicos/agencia-de-marketing-imobiliario/para/diretores/', '/servicos/trafego-pago-imobiliario/sp/sao-paulo/extra/']) {
    assert.equal(handlePage(new Request('https://www.imobiturbo.com.br' + p)).status, 404);
  }
  const res = handlePage(new Request('https://www.imobiturbo.com.br/servicos/landing-pages-imobiliarias?utm_source=teste'));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://www.imobiturbo.com.br/servicos/landing-pages-imobiliarias/?utm_source=teste');
});

test('HTML inicial tem conteúdo local, formulário, um H1 e metadados coerentes sem JavaScript', async () => {
  const { handlePage, SERVICES } = await site;
  for (const service of SERVICES) {
    const p = `/servicos/${service.slug}/sp/sao-paulo/`;
    const html = await handlePage(new Request('https://www.imobiturbo.com.br' + p)).text();
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes('11.451.999'));
    assert.ok(html.includes('3550308'));
    assert.match(html, /name="seo_cidade" value="São Paulo"/);
    assert.ok(html.includes('href="https://www.imobiturbo.com.br' + p + '"'));
    const structured = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(structured['@graph'].find(n => n['@type'] === 'Service').areaServed.name, 'São Paulo');
    assert.ok(!html.includes('"addressLocality":"São Paulo"'));
    assert.match(html, /<script type="module" src="\/organic\.js/);
    assert.ok(html.replace(/<[^>]+>/g, ' ').split(/\s+/).length > 700);
  }
});

test('sitemaps cobrem todas as rotas, com shards planos e só URLs válidas', async () => {
  const { localities, sitemapFor, municipalPaths, nationalPaths } = await site;
  const xml = fs.readFileSync(path.join(__dirname, '../sitemap.xml'), 'utf8');
  assert.match(xml, /<sitemapindex/);
  assert.equal((xml.match(/<sitemap>/g) || []).length, 29);
  assert.match(fs.readFileSync(path.join(__dirname, '../sitemaps/institucional.xml'), 'utf8'), /<urlset/);
  for (const state of localities.states) {
    const shard = sitemapFor(`cidades-${state.slug}.xml`);
    assert.equal((shard.match(/<url>/g) || []).length, [...municipalPaths(state.slug)].length);
    assert.ok(Buffer.byteLength(shard) < 50000000);
  }
  assert.equal((sitemapFor('servicos.xml').match(/<url>/g) || []).length, [...nationalPaths()].length);
  assert.equal(sitemapFor('cidades-xx.xml'), null);
});

test('cenário do simulador respeita zero, limites e premissas declaradas', async () => {
  const { calculatePlan } = await client;
  const result = calculatePlan({ budget: 1500, cpl: 30, qualified: 40, appointments: 25 });
  assert.equal(result.contacts, 50); assert.equal(result.qualifiedContacts, 20); assert.equal(result.bookedAppointments, 5);
  assert.equal(calculatePlan({ budget: 1500, cpl: 30, qualified: 0, appointments: 25 }).bookedAppointments, 0);
  assert.throws(() => calculatePlan({ budget: 1500, cpl: 0, qualified: 40, appointments: 25 }));
  assert.throws(() => calculatePlan({ budget: 1500, cpl: 30, qualified: 101, appointments: 25 }));
});

test('diagnóstico preserva atribuição e contexto sem disparar o fluxo Imobicreator', async () => {
  const { diagnosticPayload, submitDiagnostic } = await client;
  const payload = diagnosticPayload({ nome: 'Teste Autorizado', telefone: '(11) 99999-9999', email: 'OWNER@EXAMPLE.INVALID', seo_publico: 'empreiteiras', gargalo: 'Atrair leads qualificados', consentimento_contato: 'sim', seo_servico: 'trafego-pago-imobiliario', seo_cidade: 'São Paulo', seo_uf: 'sp', seo_ibge: '3550308' }, 'https://www.imobiturbo.com.br/servicos/trafego-pago-imobiliario/sp/sao-paulo/?utm_source=google&utm_medium=organic', 'https://www.google.com/');
  assert.equal(payload.project, 'organic_diagnostic');
  assert.equal(payload.perfil, 'Empreiteira');
  assert.equal(payload.utm_source, 'google');
  assert.equal(payload.custom_fields.seo_ibge, '3550308');
  assert.ok(!('cargo' in payload));
  const fetcher = async () => Response.json({ ok: true, lead_id: 'lead-confirmado' });
  assert.equal((await submitDiagnostic(payload, fetcher)).lead_id, 'lead-confirmado');
  await assert.rejects(submitDiagnostic(payload, async () => Response.json({ ok: true, lead_id: null })));
  await assert.rejects(submitDiagnostic(payload, async () => Response.json({ ok: false }, { status: 502 })));
});
