const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const neutralTrackingHtmlFiles = [
  'index.html',
  'vagas/index.html',
  'vagas-v2/index.html',
  'corretor-autonomo/index.html',
  'construtoras-incorporadoras/index.html',
  'imobiliarias/index.html',
  'depoimentos/index.html',
];

const reactHtmlFiles = [
  'index.html',
  'corretor-autonomo/index.html',
  'imobiliarias/index.html',
  'construtoras-incorporadoras/index.html',
  'depoimentos/index.html',
];

test('as superfícies públicas usam somente o Hub Tracker neutro e automático', () => {
  for (const relativePath of neutralTrackingHtmlFiles) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /https:\/\/track\.nmidigital\.tech\/t\.js\?operation=[0-9a-f-]{36}/i);
    assert.match(html, /data-operation-id="[0-9a-f-]{36}"/i);
    assert.match(html, /data-endpoint="https:\/\/track\.nmidigital\.tech"/);
    assert.match(html, /site-tracking\.js/);
    assert.equal(/tracking\.imobiturbo\.com\.br|\/api\/tracking\/tracker\.js|data-default-consent|tracking-consent\.js/i.test(html), false, `${relativePath} ainda instala um tracker legado`);
  }
});

test('páginas React preservam a atribuição nos links internos', () => {
  for (const relativePath of reactHtmlFiles.slice(0, 4)) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /id="root" data-imt-decorate/);
  }
});

test('home e páginas de público registram diagnósticos e geração de lead', () => {
  const home = fs.readFileSync(path.join(root, 'ui_kits/imobiturbo-app/HomePrototypes.jsx'), 'utf8');
  const audiences = fs.readFileSync(path.join(root, 'ui_kits/imobiturbo-app/AudiencePages.jsx'), 'utf8');
  for (const source of [home, audiences]) {
    assert.match(source, /quiz_start/);
    assert.match(source, /quiz_step_viewed/);
    assert.match(source, /generate_lead/);
  }
  assert.match(home, /view_content/);
});

test('integração global registra cliques de WhatsApp como CTA', () => {
  const source = fs.readFileSync(path.join(root, 'site-tracking.js'), 'utf8');
  assert.match(source, /cta_click/);
  assert.match(source, /wa\.me/);
  assert.match(source, /window\.HubTracker/);
  assert.equal(/window\.__track|getConsent|setConsent/.test(source), false, 'site-tracking.js não pode recorrer ao tracker legado');
  assert.match(source, /window\.imtTrack/);
  for (const relativePath of ['ui_kits/imobiturbo-app/HomePrototypes.jsx', 'ui_kits/imobiturbo-app/AudiencePages.jsx']) {
    const component = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.equal(/window\.__track/.test(component), false, `${relativePath} não pode recorrer ao tracker legado`);
  }
});

test('vagas usam somente o Hub atual para Lead e InitiateCheckout', () => {
  for (const relativePath of ['vagas/index.html', 'vagas-v2/index.html']) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /window\.HubTracker/);
    assert.match(html, /trackHubConversion\('lead'/);
    assert.match(html, /trackHubConversion\('initiateCheckout'/);
    assert.equal(/window\.__track|imtSendCapi|\bfbq\b|api\/tracking\/v1\/events|consent\s*:/.test(html), false, `${relativePath} ainda contém o pipeline legado`);
    assert.equal(/trackHubEvent\('purchase'/.test(html), false, `${relativePath} não pode registrar Purchase no navegador`);
  }
});

test('Purchase verificado usa segredos de ambiente e o gateway legado foi removido', () => {
  const status = fs.readFileSync(path.join(root, 'functions/api/checkout/status.js'), 'utf8');
  const webhook = fs.readFileSync(path.join(root, 'functions/api/checkout/webhook.js'), 'utf8');
  assert.equal(fs.existsSync(path.join(root, 'functions/tracker.js')), false, 'gateway /tracker legado não deve existir');
  for (const source of [status, webhook]) {
    assert.match(source, /env.*META_ACCESS_TOKEN/);
    assert.equal(/DEFAULT_CAPI_TOKEN/.test(source), false, 'token de CAPI não pode ficar versionado');
    assert.match(source, /dispatchVerifiedPurchaseToHub/);
  }
});

test('deploy publica tracker e assets sem senha fixa no código', () => {
  const source = fs.readFileSync(path.join(root, 'deploy.js'), 'utf8');
  assert.match(source, /process\.env\.IMOBITURBO_DEPLOY_PASSWORD/);
  assert.match(source, /site-tracking\.js/);
  assert.match(source, /home\.css/);
  assert.match(source, /assets\/testimonials\/resultados-03\.webp/);
  assert.match(source, /assets\/testimonials\/gallery/);
  assert.doesNotMatch(source, /const password = ['"][^'"]+['"]/);
});
