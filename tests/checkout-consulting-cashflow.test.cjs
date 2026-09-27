const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = name => import(pathToFileURL(path.resolve(__dirname, '../functions/api/checkout', name)));

const connectionId = '550e8400-e29b-41d4-a716-446655440000';
const env = {
  HUB_CASHFLOW_WEBHOOK_URL: `https://hub.imobiturbo.com.br/api/cashflow/webhooks/asaas/${connectionId}`,
  HUB_CASHFLOW_WEBHOOK_TOKEN: 'synthetic-hub-secret',
};
const payment = status => ({
  id: 'pay_consulting_installment', value: 49, billingType: 'CREDIT_CARD', status,
  dateCreated: '2026-09-26', description: 'Consultoria Individual de 1h com Natan Pimentel',
  installment: 'installment-group-synthetic', installmentNumber: 1,
  externalReference: JSON.stringify({ product_id: 'consultoria-individual-natan', offer_code: 'consultoria-12x49', eid: 'abc123def45' }),
});

for (const [status, event] of [['PENDING', 'PAYMENT_CREATED'], ['RECEIVED', 'PAYMENT_RECEIVED']]) {
  test(`Asaas ${status} is delivered to the dedicated Hub ledger with mapped offer and installment value`, async t => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
      calls.push({ url: String(url), options, body: JSON.parse(options.body) });
      return Response.json({ ok: true });
    });
    const sent = await (await load('_cashflow.js')).dispatchConsultingCashflowToHub({ env, payment: payment(status) });
    assert.equal(sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, env.HUB_CASHFLOW_WEBHOOK_URL);
    assert.equal(calls[0].options.headers['asaas-access-token'], env.HUB_CASHFLOW_WEBHOOK_TOKEN);
    assert.equal(calls[0].body.event, event);
    assert.equal(calls[0].body.payment.id, payment(status).id);
    assert.equal(calls[0].body.payment.value, 49);
    assert.equal(JSON.parse(calls[0].body.payment.externalReference).offer_code, 'consultoria-12x49');
    assert.equal(calls[0].body.id, `consultoria-${payment(status).id}-${event}`);
  });
}

for (let count = 2; count <= 11; count++) {
  test(`cashflow accepts the first charge of the ${count}x consulting offer`, async t => {
    const calls = [];
    const totalCents = count <= 3 ? 49700 : 58800;
    const firstInstallment = Math.floor(totalCents / count) / 100;
    const selectedPayment = {
      ...payment('PENDING'),
      id: `pay_consulting_${count}x`,
      value: firstInstallment,
      externalReference: JSON.stringify({
        product_id: 'consultoria-individual-natan', offer_code: `consultoria-${count}x`, eid: `order-${count}`,
      }),
    };
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
      calls.push({ url: String(url), body: JSON.parse(options.body) });
      return Response.json({ ok: true });
    });
    const sent = await (await load('_cashflow.js')).dispatchConsultingCashflowToHub({ env, payment: selectedPayment });
    assert.equal(sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.payment.value, firstInstallment);
    assert.equal(JSON.parse(calls[0].body.payment.externalReference).offer_code, `consultoria-${count}x`);
  });
}

test('cashflow still accepts temporary 2x and 3x R$588 payments created before the price correction', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return Response.json({ ok: true });
  });
  const dispatch = (await load('_cashflow.js')).dispatchConsultingCashflowToHub;
  for (const count of [2, 3]) {
    const selectedPayment = {
      ...payment('PENDING'),
      value: Math.floor(58800 / count) / 100,
      externalReference: JSON.stringify({
        product_id: 'consultoria-individual-natan', offer_code: `consultoria-${count}x`, eid: `legacy-${count}`,
      }),
    };
    assert.equal(await dispatch({ env, payment: selectedPayment }), true);
  }
  assert.equal(calls.length, 2);
});

test('cashflow delivery refuses amount mismatches and untrusted endpoints without sending the Hub token', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', () => { calls++; throw new Error('unexpected network'); });
  const dispatch = (await load('_cashflow.js')).dispatchConsultingCashflowToHub;
  assert.equal(await dispatch({ env, payment: { ...payment('RECEIVED'), value: 1 } }), false);
  assert.equal(await dispatch({ env: { ...env, HUB_CASHFLOW_WEBHOOK_URL: 'https://attacker.invalid/collect' }, payment: payment('RECEIVED') }), false);
  assert.equal(calls, 0);
});

test('verified 12x purchase reaches the funnel tracker as one R$588 order and the ledger as its R$49 installment', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const requestUrl = new URL(url);
    const body = JSON.parse(options.body);
    calls.push({ requestUrl, options, body });
    return Response.json({ ok: true });
  });
  const handler = (await load('_consulting.js')).handleConsultingWebhook;
  const response = await handler({
    request: new Request('https://www.imobiturbo.com.br/api/checkout/webhook'),
    env: { ASAAS_API_KEY: 'synthetic-asaas-key', ...env },
    paymentId: payment('RECEIVED').id,
    verifiedPayment: payment('RECEIVED'),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).amount, 588);
  const ledger = calls.find(call => call.requestUrl.hostname === 'hub.imobiturbo.com.br');
  const funnel = calls.find(call => call.requestUrl.hostname === 'track.nmidigital.tech');
  assert.equal(ledger.body.payment.value, 49);
  assert.equal(ledger.body.event, 'PAYMENT_RECEIVED');
  assert.equal(funnel.body.type, 'Purchase');
  assert.equal(funnel.body.valueCents, 58800);
  assert.equal(funnel.body.orderId, 'consultoria-abc123def45');
  assert.equal(funnel.body.offerId, '12e90537-263d-4150-9757-52193187ffbd');
});
