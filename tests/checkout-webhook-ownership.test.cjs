const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const load = file => import(pathToFileURL(path.join(root, 'functions/api/checkout', file)));
const AUTH = '44444444-4444-4444-8444-444444444444';
const ORDER = '11111111-1111-4111-8111-111111111111';
const env = {
  ASAAS_API_KEY: 'synthetic-sandbox-key',
  ASAAS_API_URL: 'https://api-sandbox.asaas.com/v3',
  ASAAS_ENVIRONMENT: 'sandbox',
  ASAAS_WEBHOOK_TOKEN: 'synthetic-hook',
  SUPABASE_URL: 'https://db.example.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-db-key',
  CAL_ASAAS_INTEGRATION_TOKEN: 'synthetic-cal-token',
};

function request(payload, token = env.ASAAS_WEBHOOK_TOKEN) {
  return new Request('https://site.example.invalid/api/checkout/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'asaas-access-token': token } : {}) },
    body: JSON.stringify(payload),
  });
}

function authorizationPayload() {
  return { event: 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED', authorization: { id: AUTH, contractId: 'untrusted' } };
}

function managedOrder() {
  return {
    id: ORDER, provider: 'asaas', environment: 'sandbox',
    organization_id: '18b103e6-a006-45ac-84d5-62312f45ba77',
    external_reference: `community:${ORDER}`, buyer_email: 'buyer@example.invalid',
    status: 'created', provider_pix_authorization_id: AUTH,
    sold_snapshot: { contract_version: 1, products: ['os', 'club'], duration_months: 1,
      currency: 'BRL', contract_total_cents: 14700, installment_count: 1, price_mode: 'recurring_pix_auto' },
  };
}

function mockAuthorization(t, { contractId = 'TEST-PIX-AUTO-FOREIGN', bound = null, providerStatus = 200, dbStatus = 200 } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, method: init.method || 'GET' });
    assert.equal(init.method || 'GET', 'GET', 'ignoring an unrelated event must have no side effects');
    if (url.hostname === 'api-sandbox.asaas.com') {
      assert.equal(url.pathname, `/v3/pix/automatic/authorizations/${AUTH}`);
      return Response.json({ id: AUTH, contractId, value: 10, status: 'REFUSED' }, { status: providerStatus });
    }
    assert.equal(url.hostname, 'db.example.invalid');
    assert.equal(url.pathname, '/rest/v1/cobranca_pedidos');
    return Response.json(bound ? [bound] : [], { status: dbStatus });
  });
  return calls;
}

test('verified foreign Pix authorization is acknowledged on every retry without recording payment', async t => {
  const calls = mockAuthorization(t);
  const route = await load('webhook.js');
  for (let retry = 0; retry < 2; retry++) {
    const response = await route.onRequestPost({ env, request: request(authorizationPayload()) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ignored_product');
  }
  assert.equal(calls.length, 4);
  assert.equal(calls.filter(c => c.url.hostname === 'db.example.invalid').every(c =>
    c.url.searchParams.get('provider_pix_authorization_id') === `eq.${AUTH}`), true);
});

test('foreign authorization requires webhook authentication before any gateway or database read', async t => {
  const calls = mockAuthorization(t);
  const route = await load('webhook.js');
  const response = await route.onRequestPost({ env, request: request(authorizationPayload(), null) });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test('a foreign-looking contract on an already bound Community authorization still fails validation', async t => {
  mockAuthorization(t, { bound: managedOrder() });
  const response = await (await load('webhook.js')).onRequestPost({ env, request: request(authorizationPayload()) });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'community_pix_automatic_binding_conflict');
});

test('an unresolved canonical Community contract is not silently discarded based on the webhook payload', async t => {
  mockAuthorization(t, { contractId: ORDER.replaceAll('-', '') });
  const response = await (await load('webhook.js')).onRequestPost({ env, request: request(authorizationPayload()) });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'community_order_missing');
});

for (const outage of [{ providerStatus: 503 }, { dbStatus: 503 }]) {
  test(`ownership cannot be ignored during ${outage.providerStatus ? 'gateway' : 'database'} outage`, async t => {
    mockAuthorization(t, outage);
    const response = await (await load('webhook.js')).onRequestPost({ env, request: request(authorizationPayload()) });
    assert.equal(response.status, 503);
  });
}

function deletedPayment(overrides = {}) {
  return { id: 'pay_deleted_synthetic', externalReference: `cal-asaas:${ORDER}`,
    customer: 'cus_synthetic', value: 497, billingType: 'PIX', status: 'PENDING', deleted: true, ...overrides };
}

function mockDeletedPayment(t, { payment = deletedPayment(), orderStatus = 404 } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, method: init.method || 'GET' });
    assert.equal(init.method || 'GET', 'GET', 'deleted unpaid orders must not create sales or access');
    if (url.hostname === 'api-sandbox.asaas.com') return Response.json(payment);
    if (url.hostname === 'db.example.invalid') return Response.json([]);
    assert.equal(url.hostname, 'agenda.imobiturbo.com.br');
    assert.equal(url.pathname, '/api/integrations/asaas/order');
    assert.equal(url.searchParams.get('uid'), ORDER);
    return Response.json({ error: 'order_not_found' }, { status: orderStatus });
  });
  return { calls, payload: { event: 'PAYMENT_DELETED', payment: { id: payment.id, deleted: true } } };
}

test('gateway-verified deleted unpaid Cal payment tolerates an order removed with 404, including retries', async t => {
  const { calls, payload } = mockDeletedPayment(t);
  const route = await load('webhook.js');
  for (let retry = 0; retry < 2; retry++) {
    const response = await route.onRequestPost({ env, request: request(payload) });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, 'ignored_deleted_unpaid_order');
    assert.equal(result.paid, false);
    assert.equal(result.communityMembershipChanged, false);
  }
  assert.equal(calls.every(c => c.method === 'GET'), true);
});

const cleanupReceipt = { uid: ORDER, paymentId: 'pay_deleted_synthetic', environment: 'sandbox',
  billingType: 'PIX', amountCents: 49700 };
test('an exact cleanup receipt acknowledges a verified unpaid deletion without calling unavailable Agenda', async t => {
  const { calls, payload } = mockDeletedPayment(t, { orderStatus: 503 });
  const response = await (await load('webhook.js')).onRequestPost({
    env: { ...env, CAL_ASAAS_REMOVED_UNPAID_ORDERS: JSON.stringify([cleanupReceipt]) }, request: request(payload),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ignored_deleted_unpaid_order');
  assert.equal(calls.some(c => c.url.hostname === 'agenda.imobiturbo.com.br'), false);
});

for (const receipt of [{ ...cleanupReceipt, environment: 'production' }, { ...cleanupReceipt, amountCents: 1000 },
  { ...cleanupReceipt, paymentId: 'pay_other' }, { ...cleanupReceipt, uid: AUTH }]) {
  test(`cleanup receipts do not match a different financial binding: ${JSON.stringify(receipt)}`, async t => {
    const { payload } = mockDeletedPayment(t, { orderStatus: 503 });
    const response = await (await load('webhook.js')).onRequestPost({
      env: { ...env, CAL_ASAAS_REMOVED_UNPAID_ORDERS: JSON.stringify([receipt]) }, request: request(payload),
    });
    assert.equal(response.status, 503);
  });
}

test('a cleanup receipt never hides a paid or previously confirmed payment', async t => {
  const { payload } = mockDeletedPayment(t, { payment: deletedPayment({ confirmedDate: '2026-10-07' }), orderStatus: 503 });
  const response = await (await load('webhook.js')).onRequestPost({
    env: { ...env, CAL_ASAAS_REMOVED_UNPAID_ORDERS: JSON.stringify([cleanupReceipt]) }, request: request(payload),
  });
  assert.equal(response.status, 503);
});

for (const overrides of [{ deleted: false }, { status: 'RECEIVED', confirmedDate: '2026-10-07' },
  { confirmedDate: '2026-10-07' }, { pixTransaction: AUTH }, { refunds: [{ status: 'DONE', value: 10 }] }]) {
  test(`a missing Cal order is still retryable when financial state is not an unpaid deletion: ${JSON.stringify(overrides)}`, async t => {
    const { payload } = mockDeletedPayment(t, { payment: deletedPayment(overrides) });
    const response = await (await load('webhook.js')).onRequestPost({ env, request: request(payload) });
    assert.equal(response.status, 503);
  });
}

for (const orderStatus of [401, 403, 500, 503]) {
  test(`an unpaid deletion does not conceal an unavailable Cal integration (${orderStatus})`, async t => {
    const { payload } = mockDeletedPayment(t, { orderStatus });
    const response = await (await load('webhook.js')).onRequestPost({ env, request: request(payload) });
    assert.equal(response.status, 503);
  });
}
