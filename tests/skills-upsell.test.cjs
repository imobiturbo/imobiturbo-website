const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderSkillsUpsell, buildSkillsUpsell } = require('../scripts/build-skills-upsell.cjs');
const root = path.join(__dirname, '..');
const community = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
const journey = fs.readFileSync(path.join(root, 'skills-ia-obrigado/journey.html'), 'utf8');

test('release emits the Wiapy destination with the current community checkout and independent kit access', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-upsell-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  buildSkillsUpsell(root, output);
  const html = fs.readFileSync(path.join(output, 'skills-ia-obrigado/index.html'), 'utf8');
  assert.match(html, /<title>54 Skills de IA \| Próximo passo e acesso<\/title>/);
  assert.match(html, /canonical" href="https:\/\/www.imobiturbo.com.br\/skills-ia-obrigado\/"/);
  assert.match(html, /content="noindex, follow"/);
  assert.match(html, /id="skillsAccessLink"[^>]*href="https:\/\/club.imobiturbo.com.br\/login"/);
  assert.match(html, /assinatura é opcional/);
  assert.match(html, /ImobiturboCheckoutSession.bindLanding/);
  assert.match(html, /gateway: 'asaas'/);
  assert.match(html, /fetch\('\/api\/checkout'/);
  assert.doesNotMatch(html, /pay\.hubla|pay\.wiapy|Compra.*aprovada|"Purchase"/);
  assert.doesNotMatch(html, /(?:src|href|data-[\w-]+)=["'](?:\.\/)?assets\//);
  assert.match(html, /href="\/vagas\/vagas.css\?/);
  assert.match(html, /tagIcon: '\/vagas\/assets\/thesvg\/instagram.svg'/);
  assert.match(fs.readFileSync(path.join(root, 'build-pages.js'), 'utf8'), /buildSkillsUpsell\(root, output\)/);
});

test('future offer and checkout changes flow into the upsell without a stale duplicate', () => {
  const updated = community.replace('gateway: \'asaas\'', 'gateway: \'asaas\', regressionMarker: true');
  assert.match(renderSkillsUpsell(updated, journey), /regressionMarker: true/);
});

test('a removed checkout or incompatible layout blocks publication instead of falling back to the home', () => {
  assert.throws(() => renderSkillsUpsell(community.replace('ImobiturboCheckoutSession.bindLanding', ''), journey), /missing community marker/);
  assert.throws(() => renderSkillsUpsell('<html>Home</html>', journey), /missing community marker/);
});
