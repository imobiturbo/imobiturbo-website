const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const handler = import(pathToFileURL(path.join(root, 'functions/api/checkout/index.js')));
const buyer = { gateway: 'asaas', plan: 'mensal', paymentMethod: 'PIX', name: 'Teste Checkout', email: 'checkout@example.invalid', phone: '11987654320', cpfCnpj: '52998224725', eventId: 'synthetic-pix-test' };

async function invoke(t, overrides = {}, mode = 'normal', envOverrides = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const address = new URL(url);
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path: address.pathname, host: address.hostname, method: options.method || 'GET', body, token: options.headers?.['asaas-access-token'] });
    if (address.hostname === 'track.nmidigital.tech') return Response.json({ ok: true });
    if (address.hostname === 'hub.imobiturbo.com.br') return Response.json({ ok: true });
    assert.equal(address.origin, 'https://api.asaas.com', 'never change provider after a payment attempt');
    if (address.pathname === '/v3/customers' && !body) return Response.json({ data: [{ id: 'cus_synthetic' }] });
    if (address.pathname === '/v3/payments' && body) {
      if (mode === 'timeout') throw new DOMException('synthetic timeout', 'TimeoutError');
      if (mode === 'rejected') return Response.json({ errors: [{ description: 'Cobrança recusada no teste' }] }, { status: 400 });
      // Model the provider's inherited account settings, not the implementation.
      const fine = body.fine?.value ?? 147;
      if (fine >= body.value) return Response.json({ errors: [{ description: 'O valor da multa (R$147,00) deve ser menor que o valor da cobrança (R$147,00).' }] }, { status: 400 });
      const firstInstallment = body.totalValue != null && body.installmentCount > 1
        ? Math.floor(Math.round(body.totalValue * 100) / body.installmentCount) / 100 : undefined;
      return Response.json({ id: 'pay_synthetic', value: body.value ?? body.installmentValue ?? firstInstallment ?? body.totalValue, status: 'PENDING', billingType: body.billingType, externalReference: body.externalReference });
    }
    if (address.pathname.endsWith('/pixQrCode')) {
      if (mode === 'qr-failure') return Response.json({ errors: [{ description: 'QR temporariamente indisponível' }] }, { status: 503 });
      return Response.json({ payload: 'synthetic-copy-paste', encodedImage: 'dGVzdA==', expirationDate: '2029-01-01 23:59:59' });
    }
    throw new Error('Unexpected endpoint: ' + address.pathname);
  });
  const before = Date.now();
  const response = await (await handler).onRequestPost({ request: new Request('https://imobiturbo.com.br/api/checkout', { method: 'POST', body: JSON.stringify({ ...buyer, ...overrides }) }), env: { ASAAS_API_KEY: 'test-only', ...envOverrides } });
  return { response, data: await response.json(), calls, before };
}

for (const [plan, value] of Object.entries({ mensal: 147, trimestral: 357, semestral: 747, anual: 997 })) {
  test(`Asaas Pix ${plan}: no inherited fine/interest; canonical server price and 30-minute checkout`, async t => {
    const { response, data, calls, before } = await invoke(t, { plan, amount: 1, fine: { value: 147 }, interest: { value: 10 } });
    assert.equal(response.status, 200);
    const payment = calls.find(call => call.method === 'POST').body;
    assert.equal(payment.value, value);
    assert.deepEqual(payment.fine, { value: 0, type: 'FIXED' });
    assert.deepEqual(payment.interest, { value: 0 });
    assert.ok(payment.externalReference.length <= 100, `externalReference length (${payment.externalReference.length}) exceeds Asaas 100-char limit`);
    assert.equal(data.pix.copyPaste, 'synthetic-copy-paste');
    const expiration = Date.parse(data.pix.expiresAt);
    assert.ok(expiration >= before + 1799000 && expiration <= Date.now() + 1800000);
    assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  });
}

test('consultoria is a separate, fixed R$497 product', async t => {
  const { response, data, calls } = await invoke(t, { plan: 'consultoria', amount: 1 });
  assert.equal(response.status, 200);
  const payment = calls.find(call => call.method === 'POST').body;
  assert.equal(payment.value, 497);
  assert.ok(payment.externalReference.length <= 100, `consultoria externalReference length (${payment.externalReference.length}) exceeds Asaas 100-char limit`);
  assert.equal(JSON.parse(payment.externalReference).product_id, 'consultoria-individual-natan');
  assert.match(payment.description, /Consultoria Individual.*1h.*Natan Pimentel/);
  assert.equal(data.plan, 'consultoria');
});

test('new consulting Pix reaches the dedicated Hub account as a pending ledger sale', async t => {
  const hubUrl = 'https://hub.imobiturbo.com.br/api/cashflow/webhooks/asaas/550e8400-e29b-41d4-a716-446655440000';
  const { response, calls } = await invoke(t, { plan: 'consultoria' }, 'normal', {
    HUB_CASHFLOW_WEBHOOK_URL: hubUrl, HUB_CASHFLOW_WEBHOOK_TOKEN: 'synthetic-hub-secret',
  });
  assert.equal(response.status, 200);
  const payment = calls.find(call => call.path === '/v3/payments' && call.method === 'POST').body;
  const delivery = calls.find(call => call.host === 'hub.imobiturbo.com.br');
  assert.equal(delivery.path, new URL(hubUrl).pathname);
  assert.equal(delivery.token, 'synthetic-hub-secret');
  assert.equal(delivery.body.event, 'PAYMENT_CREATED');
  assert.equal(delivery.body.payment.id, 'pay_synthetic');
  assert.equal(delivery.body.payment.value, 497);
  assert.equal(JSON.parse(payment.externalReference).offer_code, 'consultoria-a-vista');
});

const cardData = {
  paymentMethod: 'CREDIT_CARD',
  creditCard: { holderName: 'Teste Checkout', number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', ccv: '123', postalCode: '20050005', addressNumber: '1' },
};

test('consultoria card at sight sends only value=497', async t => {
  const { response, data, calls } = await invoke(t, { ...cardData, plan: 'consultoria', installments: 1 });
  assert.equal(response.status, 200);
  const payment = calls.find(call => call.path === '/v3/payments' && call.method === 'POST').body;
  assert.equal(payment.value, 497);
  assert.equal(payment.installmentCount, undefined);
  assert.equal(payment.installmentValue, undefined);
  assert.equal(payment.totalValue, undefined);
  assert.equal(JSON.parse(payment.externalReference).offer_code, 'consultoria-a-vista');
  assert.equal(data.amount, 497);
  assert.equal(data.installmentCount, 1);
});

test('consultoria 12x sends installmentValue=49 and tracks R$588 total', async t => {
  const { response, data, calls } = await invoke(t, { ...cardData, plan: 'consultoria', installments: 12 });
  assert.equal(response.status, 200);
  const payment = calls.find(call => call.path === '/v3/payments' && call.method === 'POST').body;
  assert.equal(payment.value, undefined);
  assert.equal(payment.totalValue, undefined);
  assert.equal(payment.installmentCount, 12);
  assert.equal(payment.installmentValue, 49);
  assert.ok(payment.externalReference.length <= 100);
  assert.equal(JSON.parse(payment.externalReference).offer_code, 'consultoria-12x49');
  assert.equal(data.amount, 588);
  assert.equal(data.chargeAmount, 49);
  assert.equal(data.installmentCount, 12);
  assert.equal(data.installmentValue, 49);
});

for (let count = 2; count <= 11; count++) {
  test(`consultoria ${count}x sends the correct total and reports the first Asaas installment`, async t => {
    const { response, data, calls } = await invoke(t, { ...cardData, plan: 'consultoria', installments: count });
    const payment = calls.find(call => call.path === '/v3/payments' && call.method === 'POST').body;
    const totalCents = count <= 3 ? 49700 : 58800;
    const firstInstallmentCents = Math.floor(totalCents / count);
    assert.equal(response.status, 200);
    assert.equal(payment.installmentCount, count);
    assert.equal(payment.totalValue, totalCents / 100);
    assert.equal(payment.installmentValue, undefined);
    assert.equal(JSON.parse(payment.externalReference).offer_code, `consultoria-${count}x`);
    assert.equal(data.amount, totalCents / 100);
    assert.equal(data.chargeAmount, firstInstallmentCents / 100);
    assert.equal(data.installmentCount, count);
    assert.equal(data.installmentValue, firstInstallmentCents / 100);
  });
}

for (const count of [0, 13, 2.5]) {
  test(`consultoria rejects invalid installment count ${count} before contacting Asaas`, async t => {
    const { response, calls } = await invoke(t, { ...cardData, plan: 'consultoria', installments: count });
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
}

test('Asaas Pix externalReference never exceeds 100 characters even with long production eventId', async t => {
  const prodEventId = 'vagas_evt_1790475130004_q3a9h1t';
  const { response, calls } = await invoke(t, { plan: 'anual', eventId: prodEventId });
  assert.equal(response.status, 200);
  const payment = calls.find(call => call.method === 'POST').body;
  assert.ok(payment.externalReference.length <= 100, `externalReference length ${payment.externalReference.length} exceeds 100`);
  const parsed = JSON.parse(payment.externalReference);
  assert.equal(parsed.plan, 'anual');
  assert.equal(parsed.eid, prodEventId);
});

for (const mode of ['rejected', 'timeout']) {
  test(`Asaas ${mode}: no duplicate charge or provider fallback`, async t => {
    const { response, calls } = await invoke(t, {}, mode);
    assert.ok(response.status >= 400);
    assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  });
}

test('QR outage retains the created payment for recovery, not a second charge', async t => {
  const { data, calls } = await invoke(t, {}, 'qr-failure');
  assert.equal(data.paymentId, 'pay_synthetic');
  assert.equal(data.pixPending, true);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  assert.ok(!JSON.stringify(data).includes('base64,undefined'));
});
