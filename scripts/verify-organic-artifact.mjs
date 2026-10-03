import { readFile, stat } from 'node:fs/promises';
import { hostname } from 'node:os';
import assert from 'node:assert/strict';
if (hostname() !== 'vmi3482766' || !process.cwd().startsWith('/opt/builds/')) throw new Error('Valide na VPS3, em /opt/builds/.');
for (const page of ['index.html', 'corretor-autonomo/index.html', 'imobiliarias/index.html', 'construtoras-incorporadoras/index.html']) {
  const html = await readFile(`.cloudflare-pages/${page}`, 'utf8');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, page);
  assert.ok(html.includes('<!--prerender:start-->'), page);
  assert.ok(html.includes('/servicos/'), page);
  assert.ok(html.includes('hydrateRoot'), page);
  assert.ok(!html.includes('<noscript>'), page);
}
for (const asset of ['_worker.js', 'organic.js', 'organic.css', 'sitemap.xml', 'sitemaps/institucional.xml']) await stat(`.cloudflare-pages/${asset}`);
console.log('HTML inicial, navegação, hidratação e artefato orgânico validados.');
