const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderSkillsUpsell, buildSkillsUpsell } = require('../scripts/build-skills-upsell.cjs');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'skills-ia-obrigado/index.html'), 'utf8');

test('release emits the Wiapy destination with the current community checkout and independent kit access', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-upsell-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  buildSkillsUpsell(root, output);
  const html = fs.readFileSync(path.join(output, 'skills-ia-obrigado/index.html'), 'utf8');
  assert.match(html, /<title>54 Skills de IA \| Próximo passo e acesso<\/title>/);
  assert.match(html, /canonical" href="https:\/\/www.imobiturbo.com.br\/skills-ia-obrigado\/"/);
  assert.match(html, /content="noindex, nofollow"/);
  assert.match(html, /id="skillsAccessLink"[^>]*href="https:\/\/club.imobiturbo.com.br\/login"/);
  assert.match(html, /assinatura é opcional/i);
  assert.match(html, /ImobiturboCheckoutSession.bindLanding/);
  assert.match(html, /gateway: 'asaas'/);
  assert.match(html, /fetch\('\/api\/checkout'/);
  assert.doesNotMatch(html, /ImobiturboHubla|hubla-checkout|intent:\/\//);
  assert.doesNotMatch(html, /(?:src|href|data-[\w-]+)=["'](?:\.\/)?assets\//);
  assert.match(html, /href="\/vagas\/vagas.css\?/);
  assert.match(html, /tagIcon: '\/vagas\/assets\/thesvg\/instagram.svg'/);
  assert.match(fs.readFileSync(path.join(root, 'build-pages.js'), 'utf8'), /buildSkillsUpsell\(root, output\)/);
});

test('the dedicated journey and original presentation remain, with both purchase paths on native checkout', () => {
  const html = renderSkillsUpsell(source);
  assert.match(html, /class="wrap journey-steps"/);
  assert.match(html, /Como qualificar compradores no WhatsApp com IA 24h/);
  assert.match(html, /id="vslFacade"/);
  assert.match(html, /window\.openSkillsCommunityCheckout\(\{ name: fullname, email, phone \}, currentSelectedPlan\)/);
  assert.match(html, /Total R\$ 1\.164/);
});

test('a removed checkout or incompatible layout blocks publication instead of falling back to the home', () => {
  assert.throws(() => renderSkillsUpsell(source.replace('ImobiturboCheckoutSession.bindLanding', '')), /missing page marker/);
  assert.throws(() => renderSkillsUpsell('<html>Home</html>'), /missing page marker/);
});
