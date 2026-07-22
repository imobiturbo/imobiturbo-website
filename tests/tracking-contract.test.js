const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const htmlFiles = [
  'index.html',
  'corretor-autonomo/index.html',
  'imobiliarias/index.html',
  'construtoras-incorporadoras/index.html',
  'depoimentos/index.html',
];

test('todas as páginas instalam o Turbo Tracking sem interface de consentimento', () => {
  for (const relativePath of htmlFiles) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(html, /https:\/\/tracking\.imobiturbo\.com\.br\/tracker\/v1\.js/);
    assert.match(html, /data-site-key="imobiturbo-public-v1"/);
    assert.match(html, /data-default-consent="granted"/);
    assert.match(html, /site-tracking\.js/);
    assert.doesNotMatch(html, /tracking-consent\.js/);
  }
});

test('páginas React preservam a atribuição nos links internos', () => {
  for (const relativePath of htmlFiles.slice(0, 4)) {
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
  assert.match(source, /window\.imtTrack/);
});

test('deploy publica tracker e assets sem senha fixa no código', () => {
  const source = fs.readFileSync(path.join(root, 'deploy.js'), 'utf8');
  assert.match(source, /process\.env\.IMOBITURBO_DEPLOY_PASSWORD/);
  assert.match(source, /site-tracking\.js/);
  assert.match(source, /home\.css/);
  assert.match(source, /assets\/testimonials\/resultados-03\.webp/);
  assert.doesNotMatch(source, /const password = ['"][^'"]+['"]/);
});
