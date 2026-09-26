const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');

test('Hubla checkout URLs preserve the chosen plan, installments, buyer prefill and tracking', () => {
  const { buildUrl, offerId, plans } = require(path.join(root, 'assets/js/hubla-checkout.js'));
  assert.equal(offerId, 'EKQIIAiTsXkEUez8uQaM');

  // 1. Anual
  const anualUrl = new URL(buildUrl('anual', {
    name: 'Carlos Silva',
    email: 'carlos@imobiturbo.com.br',
    phone: '(21) 99999-8888'
  }, {
    visitorId: 'visitor-123',
    utm_source: 'meta',
    utm_campaign: 'turbo-vagas',
    src: 'hub_test_src',
    sck: 'hub_test_sck',
    fbp: 'fb.1.123456789.987654321',
    fbc: 'fb.1.123456789.abcdef'
  }));
  assert.equal(anualUrl.origin, 'https://pay.hub.la');
  assert.equal(anualUrl.pathname, '/EKQIIAiTsXkEUez8uQaM');
  assert.equal(anualUrl.searchParams.get('plan'), 'annually');
  assert.equal(anualUrl.searchParams.get('installments'), '12');
  assert.equal(anualUrl.searchParams.get('name'), 'Carlos Silva');
  assert.equal(anualUrl.searchParams.get('email'), 'carlos@imobiturbo.com.br');
  assert.equal(anualUrl.searchParams.get('phone'), '+5521999998888');
  assert.equal(anualUrl.searchParams.get('visitorId'), 'visitor-123');
  assert.equal(anualUrl.searchParams.get('rt_vid'), 'visitor-123');
  assert.equal(anualUrl.searchParams.get('utm_source'), 'meta');
  assert.equal(anualUrl.searchParams.get('utm_campaign'), 'turbo-vagas');
  assert.equal(anualUrl.searchParams.get('src'), 'hub_test_src');
  assert.equal(anualUrl.searchParams.get('sck'), 'hub_test_sck');
  assert.equal(anualUrl.searchParams.get('fbp'), 'fb.1.123456789.987654321');
  assert.equal(anualUrl.searchParams.get('fbc'), 'fb.1.123456789.abcdef');

  // 2. Trimestral
  const triUrl = new URL(buildUrl('trimestral', {
    name: 'Dra. Maria',
    email: 'maria@imobiturbo.com.br',
    phone: '+5511988887777'
  }));
  assert.equal(triUrl.searchParams.get('plan'), 'quarterly');
  assert.equal(triUrl.searchParams.has('installments'), false);
  assert.equal(triUrl.searchParams.get('name'), 'Dra. Maria');
  assert.equal(triUrl.searchParams.get('email'), 'maria@imobiturbo.com.br');
  assert.equal(triUrl.searchParams.get('phone'), '+5511988887777');

  // 3. Mensal
  const mesUrl = new URL(buildUrl('mensal', {
    name: 'João Pedro',
    email: 'joao@imobiturbo.com.br',
    phone: '31977776666'
  }));
  assert.equal(mesUrl.searchParams.get('plan'), 'monthly');
  assert.equal(mesUrl.searchParams.has('installments'), false);
  assert.equal(mesUrl.searchParams.get('phone'), '+5531977776666');

  // 4. Invalid plan
  assert.throws(() => buildUrl('invalid'), /Plano inválido/);
});
