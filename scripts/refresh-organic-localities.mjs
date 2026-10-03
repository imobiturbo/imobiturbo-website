import { mkdir, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';

// Public, dated first-party inputs. Refresh is deliberate, never a request-time API call.
if (hostname() !== 'vmi3482766' || !process.cwd().startsWith('/opt/builds/')) {
  throw new Error('Execute na VPS3, em um checkout de /opt/builds/.');
}
const endpoints = {
  localities: 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',
  census: 'https://apisidra.ibge.gov.br/values/t/4714/n6/all/v/93,6318,614/p/2022',
};
async function fetchData(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length < 5000) throw new Error('Resposta IBGE incompleta');
      return data;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}
const [localities, census] = await Promise.all(Object.values(endpoints).map(fetchData));
const figures = new Map();
for (const row of census.slice(1)) {
  const value = /^\d+(?:\.\d+)?$/.test(row.V) ? Number(row.V) : null;
  const record = figures.get(Number(row.D1C)) || {};
  record[{ 93: 'p', 6318: 'a', 614: 'd' }[row.D2C]] = value;
  figures.set(Number(row.D1C), record);
}
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const states = new Map();
const cities = localities.map(row => {
  const immediate = row['regiao-imediata'];
  const state = immediate?.['regiao-intermediaria']?.UF || row.microrregiao?.mesorregiao?.UF;
  if (!state || !immediate) throw new Error(`Geografia incompleta: ${row.id}`);
  states.set(state.sigla.toLowerCase(), { slug: state.sigla.toLowerCase(), name: state.nome, region: state.regiao.nome });
  return { i: row.id, n: row.nome, u: state.sigla.toLowerCase(), s: slugify(row.nome),
    r: immediate.nome, ri: immediate.id, ...(figures.get(row.id) || { p: null, a: null, d: null }) };
}).sort((a, b) => a.u.localeCompare(b.u) || a.n.localeCompare(b.n, 'pt-BR'));
if (states.size !== 27 || cities.length < 5570 || new Set(cities.map(c => `${c.u}/${c.s}`)).size !== cities.length) {
  throw new Error('Cobertura ou identidade municipal inválida');
}
const data = { version: 1, retrievedAt: new Date().toISOString(), referenceYear: 2022, sources: endpoints,
  states: [...states.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), cities };
const target = new URL('../seo/localities.mjs', import.meta.url);
await mkdir(new URL('../seo/', import.meta.url), { recursive: true });
await writeFile(target, `// IBGE Localidades + Censo 2022, tabela 4714. Gerado por scripts/refresh-organic-localities.mjs.\nexport default ${JSON.stringify(data)};\n`);
console.log(JSON.stringify({ file: fileURLToPath(target), cities: cities.length, states: states.size,
  missingCensus: cities.filter(c => c.p == null).map(c => ({ id: c.i, name: c.n, uf: c.u })), bytes: JSON.stringify(data).length }));
