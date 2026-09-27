const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const load = name => import(pathToFileURL(path.resolve(__dirname, '../functions/api/checkout', name)));
const uid = '550e8400-e29b-41d4-a716-446655440000';
// Cal booking UIDs are short IDs, distinct from the UUID payment/order UID.
const bookingUid = 'a1B2c3D4e5F6g7H8i9J0kL';
const customerId = 'cus_cal_synthetic';
const installmentId = 'ins_cal_synthetic';
const externalReference = 'cal-asaas:' + uid;
const integrationUrl = 'https://agenda.imobiturbo.com.br/api/integrations/asaas/order?uid=' + uid;
const cashflowUrl = 'https://hub.imobiturbo.com.br/api/cashflow/webhooks/asaas/550e8400-e29b-41d4-a716-446655440001';
const env = {
  ASAAS_API_KEY: 'synthetic-asaas-key',
  ASAAS_WEBHOOK_TOKEN: 'synthetic-webhook-token',
  CAL_ASAAS_INTEGRATION_TOKEN: 'synthetic-cal-integration-token',
  HUB_CASHFLOW_WEBHOOK_URL: cashflowUrl,
  HUB_CASHFLOW_WEBHOOK_TOKEN: 'synthetic-hub-cashflow-token',
};

function consultingOrder(overrides = {}) {
  return {
    uid, bookingUid, paymentId: 'pay_cal_synthetic', productId: 'consultoria-individual-natan',
    eventTypeId: 7, totalAmount: 58800, installmentCount: 12, billingType: 'CREDIT_CARD',
    customerId, installmentId, baseAmount: 49700, status: 'PENDING',
    ...overrides,
  };
}

function installmentPayment(overrides = {}) {
  return {
    id: 'pay_cal_synthetic', value: 49, status: 'RECEIVED', billingType: 'CREDIT_CARD',
    customer: customerId, installment: installmentId, installmentNumber: 1,
    externalReference, description: 'Consultoria Individual de 1h com Natan Pimentel',
    ...overrides,
  };
}

function asaasInstallment(overrides = {}) {
  return {
    id: installmentId, customer: customerId, billingType: 'CREDIT_CARD',
    installmentCount: 12, totalValue: 588,
    ...overrides,
  };
}

function requestFor(payment) {
  return new Request('https://www.imobiturbo.com.br/api/checkout/webhook', {
    method: 'POST',
    headers: { 'asaas-access-token': env.ASAAS_WEBHOOK_TOKEN },
    body: JSON.stringify({ event: 'PAYMENT_RECEIVED', payment: { id: payment.id } }),
  });
}

function mockRoutes(t, { payment, order, installment = asaasInstallment(), orderStatus = 200, apiKey = true }) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    if (url.includes('/v3/payments/')) return Response.json(payment);
    if (url.startsWith('https://agenda.imobiturbo.com.br/api/integrations/asaas/order')) {
      assert.equal(options.headers.Authorization, 'Bearer ' + env.CAL_ASAAS_INTEGRATION_TOKEN);
      return orderStatus === 200 ? Response.json(order) : new Response('', { status: orderStatus });
    }
    if (url.includes('/v3/installments/')) {
      assert.equal(options.headers.access_token, env.ASAAS_API_KEY);
      return Response.json(installment);
    }
    if (url.startsWith('https://track.nmidigital.tech/')) return Response.json({ ok: true });
    if (url === cashflowUrl) return Response.json({ ok: true });
    throw new Error('unexpected network call: ' + url);
  });
  return calls;
}

async function callWebhook(payment, environment = env) {
  return (await load('webhook.js')).onRequestPost({
    request: requestFor(payment),
    env: environment,
  });
}

test('Cal references are recognized before the community fallback, including malformed UUIDs', async () => {
  const { parseCalAsaasReference } = await load('_cal-asaas.js');
  assert.deepEqual(parseCalAsaasReference(externalReference), { uid, valid: true });
  assert.deepEqual(parseCalAsaasReference('cal-asaas:not-a-uuid'), { uid: 'not-a-uuid', valid: false });
  assert.equal(parseCalAsaasReference('legacy-community-ref'), null);
});

test('a Cal payment for an unrelated product returns ignored without community provisioning', async t => {
  const payment = installmentPayment();
  const calls = mockRoutes(t, {
    payment,
    order: consultingOrder({ productId: null }),
  });
  const response = await callWebhook(payment);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ignored_product');
  assert.equal(calls.length, 2);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
});

test('missing Cal integration token fails closed before any community side effect', async t => {
  const payment = installmentPayment();
  const calls = mockRoutes(t, { payment, order: consultingOrder() });
  const response = await callWebhook(payment, { ...env, CAL_ASAAS_INTEGRATION_TOKEN: '' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'cal_asaas_order_lookup_unavailable');
  assert.equal(calls.length, 1);
});

test('Cal order lookup failures return 503 and never fall through to community', async t => {
  const payment = installmentPayment();
  const calls = mockRoutes(t, { payment, order: consultingOrder(), orderStatus: 401 });
  const response = await callWebhook(payment);
  assert.equal(response.status, 503);
  assert.equal(calls.length, 2);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
});

test('verified Cal installment keeps the real reference, reports one aggregate sale and one installment to Cashflow', async t => {
  const payment = installmentPayment();
  const calls = mockRoutes(t, { payment, order: consultingOrder() });
  const response = await callWebhook(payment);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.paid, true);
  assert.equal(result.productId, 'consultoria-individual-natan');
  assert.equal(result.amount, 588);
  assert.equal(result.communityMembershipChanged, false);

  const funnel = calls.find(call => call.url.startsWith('https://track.nmidigital.tech/'));
  const cashflow = calls.find(call => call.url === cashflowUrl);
  assert.equal(funnel.body.type, 'Purchase');
  assert.equal(funnel.body.eventId, uid);
  assert.equal(funnel.body.orderId, uid);
  assert.equal(funnel.body.valueCents, 58800);
  assert.equal(funnel.body.productId, 'consultoria-individual-natan');
  assert.equal(funnel.body.offerId, '12e90537-263d-4150-9757-52193187ffbd');
  assert.equal(cashflow.body.payment.value, 49);
  assert.equal(cashflow.body.payment.externalReference, externalReference);
  assert.equal(cashflow.body.event, 'PAYMENT_RECEIVED');
});

test('wrong installment amount is rejected before any Hub or membership dispatch', async t => {
  const payment = installmentPayment({ value: 48 });
  const calls = mockRoutes(t, { payment, order: consultingOrder() });
  const response = await callWebhook(payment);
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'cal_asaas_payment_mismatch');
  assert.equal(calls.some(call => call.url.includes('/v3/installments/')), false);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
});

test('Cal installment group must match trusted customer, count and total', async t => {
  const payment = installmentPayment();
  const calls = mockRoutes(t, {
    payment,
    order: consultingOrder(),
    installment: asaasInstallment({ installmentCount: 11 }),
  });
  const response = await callWebhook(payment);
  assert.equal(response.status, 422);
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
});

test('single Pix order must match its exact Asaas payment and R$497 total', async t => {
  const payment = {
    id: 'pay_cal_pix_synthetic', value: 497, status: 'CONFIRMED',
    billingType: 'PIX', customer: customerId, externalReference,
  };
  const order = consultingOrder({
    paymentId: payment.id, installmentId: undefined,
    totalAmount: 49700, installmentCount: 1, billingType: 'PIX',
  });
  const calls = mockRoutes(t, { payment, order });
  const response = await callWebhook(payment);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).paid, true);
  const funnel = calls.find(call => call.url.startsWith('https://track.nmidigital.tech/'));
  assert.equal(funnel.body.valueCents, 49700);
  assert.equal(funnel.body.eventId, uid);
});

test('Cal order lookup is server-only and validates the stable UID', async t => {
  const calls = mockRoutes(t, { payment: installmentPayment(), order: consultingOrder() });
  const { fetchCalAsaasOrder } = await load('_cal-asaas.js');
  const order = await fetchCalAsaasOrder({ env, uid });
  assert.equal(order.uid, uid);
  const call = calls.find(item => item.url.startsWith('https://agenda.imobiturbo.com.br/'));
  assert.equal(call.options.method, undefined);
  assert.equal(call.url, integrationUrl);
});

test('Cal order lookup accepts native short booking UIDs and rejects malformed values', async t => {
  let orderResponse = consultingOrder();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async input => {
    calls.push(String(input));
    return Response.json(orderResponse);
  });
  const { fetchCalAsaasOrder } = await load('_cal-asaas.js');
  const order = await fetchCalAsaasOrder({ env, uid });
  assert.equal(order.bookingUid, bookingUid);
  orderResponse = consultingOrder({ bookingUid: 'short' });
  await assert.rejects(fetchCalAsaasOrder({ env, uid }), /cal_asaas_order_lookup_unavailable/);
  assert.deepEqual(calls, [integrationUrl, integrationUrl]);
});
