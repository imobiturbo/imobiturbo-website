const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const osCrmPath = path.join(__dirname, '..', 'os-crm', 'index.html');

test('os-crm page exists and has valid structure', () => {
  assert.ok(fs.existsSync(osCrmPath), 'os-crm/index.html must exist');
  const html = fs.readFileSync(osCrmPath, 'utf8');

  // Must have canonical meta
  assert.ok(html.includes('https://imobiturbo.com.br/os-crm/'), 'Must have canonical URL');
  assert.ok(html.includes('Imobiturbo OS'), 'Must reference Imobiturbo OS');
});

test('os-crm hero includes video showcase and interactive tabs', () => {
  const html = fs.readFileSync(osCrmPath, 'utf8');

  assert.ok(html.includes('hero-video-box'), 'Must contain hero video box');
  assert.ok(html.includes('id="heroVideo"'), 'Must contain hero video element');
  assert.ok(html.includes('switchHeroVideo'), 'Must include video switcher script');
  assert.ok(html.includes('/vagas/assets/os-macbook-real.mp4'), 'Must link to real CRM video mp4');
  assert.ok(html.includes('/vagas/assets/os-macbook-real.webm'), 'Must link to real CRM video webm');
  assert.ok(html.includes('/vagas/assets/wa-agenda-real.mp4'), 'Must link to real WhatsApp video mp4');
  assert.ok(html.includes('id="tabHeroCrm"'), 'Must have CRM tab button');
  assert.ok(html.includes('id="tabHeroWa"'), 'Must have WhatsApp tab button');
});

test('os-crm forbids internal model names and weird technical jargon', () => {
  const html = fs.readFileSync(osCrmPath, 'utf8');

  assert.equal(html.toLowerCase().includes('deepseek'), false, 'Must NOT mention DeepSeek anywhere');
  assert.equal(html.toLowerCase().includes('pacing humano'), false, 'Must NOT mention pacing humano');
  assert.equal(html.toLowerCase().includes('motor anti-ban'), false, 'Must NOT mention motor anti-ban');
  assert.equal(html.toLowerCase().includes('club'), false, 'Must NOT mention Club (pure OS sale)');
});

test('os-crm contains 3 plans and Asaas checkout links', () => {
  const html = fs.readFileSync(osCrmPath, 'utf8');

  assert.ok(html.includes('Plano Start'), 'Must have Plano Start');
  assert.ok(html.includes('Plano Growth'), 'Must have Plano Growth');
  assert.ok(html.includes('Plano Scale'), 'Must have Plano Scale');
  assert.ok(html.includes('os.imobiturbo.com.br/checkout'), 'Must link to OS checkout');
});

test('os-crm highlights WhatsApp and social media over portals and 15 min onboarding', () => {
  const html = fs.readFileSync(osCrmPath, 'utf8');

  // Differential section
  assert.ok(html.includes('id="diferencial"'), 'Must have diferencial section');
  assert.ok(html.includes('Qual a diferença do Imobiturbo OS para os outros CRMs?'), 'Must state CRM differential clearly');
  assert.ok(html.includes('Redes Sociais'), 'Must contrast with social media');
  assert.ok(html.includes('portais'), 'Must contrast with portals');

  // How it works 15 min section
  assert.ok(html.includes('id="como-funciona"'), 'Must have como-funciona section');
  assert.ok(html.includes('menos de 15 minutos'), 'Must state 15 minutes setup');
  assert.ok(html.includes('Onboarding Automático Inteligente'), 'Must detail step 1');
  assert.ok(html.includes('QR Code'), 'Must detail step 2 WhatsApp connection');
  assert.ok(html.includes('Campanhas & Redes Sociais'), 'Must detail step 3 ads integration');
  assert.ok(html.includes('IA Ativa 24/7 & Roleta de Corretores'), 'Must detail step 4 AI and round robin');

  // Simulator section
  assert.ok(html.includes('id="simulador"'), 'Must have live simulator section');
});

