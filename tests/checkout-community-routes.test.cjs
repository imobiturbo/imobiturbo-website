const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const load = file => import(pathToFileURL(path.join(root, 'functions/api/checkout', file)));
const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_KEY = '22222222-2222-4222-8222-222222222222';
const CLAIM = '33333333-3333-4333-8333-333333333333';
const ORG = '18b103e6-a006-45ac-84d5-62312f45ba77';
const buyer = { gateway: 'asaas', plan: 'mensal', paymentMethod: 'PIX', installments: 1,
  idempotencyKey: REQUEST_KEY, eventId: 'synthetic-attribution', name: 'Teste Checkout', email: 'checkout@example.invalid',
  phone: '11987654320', cpfCnpj: '52998224725', creditCard: { holderName: 'Teste Checkout', number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', ccv: '123' } };
const env = { ASAAS_API_KEY: 'synthetic-only', ASAAS_WEBHOOK_TOKEN: 'synthetic-hook',
  SUPABASE_URL: 'https://central.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', COMMUNITY_ORGANIZATION_ID: ORG };
function orderFixture(overrides = {}) {
  return { id: ORDER_ID, organization_id: ORG, provider: 'asaas', environment: 'production', request_key: REQUEST_KEY,
    request_hash: 'a'.repeat(64), buyer_email: buyer.email, buyer_name: buyer.name, buyer_phone: buyer.phone,
    external_reference: `community:${ORDER_ID}`, claim_token: CLAIM, status: 'created', attempts: 1,
    provider_customer_id: 'cus_synthetic', provider_payment_id: 'pay_synthetic', provider_subscription_id: null, provider_installment_id: null,
    created_at: new Date().toISOString(), lease_until: null, result: {},
    sold_snapshot: { contract_version: 1, offer_key: 'comunidade-mensal', offer_version: 1, duration_months: 1,
      products: ['os', 'club'], currency: 'BRL', price_mode: 'pix', contract_total_cents: 14700, installment_count: 1,
      resource_profile: { schema_version: 1, profile_key: 'community-beta', profile_version: 1, unlimited: true, features: {}, quotas: {} },
      catalog_scope: 'all_published', override_audit: null }, ...overrides };
}
function paymentFixture(order = orderFixture(), overrides = {}) {
  return { id: order.provider_payment_id || 'pay_synthetic', customer: order.provider_customer_id || 'cus_synthetic',
    billingType: order.sold_snapshot.price_mode === 'pix' ? 'PIX' : 'CREDIT_CARD', value: order.sold_snapshot.contract_total_cents / order.sold_snapshot.installment_count / 100,
    externalReference: order.external_reference, status: 'CONFIRMED', originalDueDate: '2026-10-03', confirmedDate: '2026-10-03',
    paymentDate: '2026-11-05', description: 'Arbitrary text is not product identity',
    ...(order.provider_subscription_id ? { subscription: order.provider_subscription_id } : {}),
    ...(order.provider_installment_id ? { installment: order.provider_installment_id, installmentNumber: 1 } : {}), ...overrides };
}
function harness(t, options = {}) {
  const state = { calls: [], order: options.order || null, payments: new Map(), records: [], prior: [], subscriptions: [], group: null, subscription: null };
  if (state.order) state.payments.set('pay_synthetic', options.payment || paymentFixture(state.order));
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : null, method = init.method || 'GET';
    state.calls.push({ url: String(url), host: u.hostname, path: u.pathname, method, body, token: init.headers?.['asaas-access-token'] });
    if (u.hostname === 'track.nmidigital.tech' || u.hostname === 'hub.imobiturbo.com.br') return Response.json({ ok: true });
    if (u.hostname === 'central.example.invalid') {
      if (u.pathname.endsWith('/rpc/claim_community_order')) {
        if (options.claimFailure) throw new DOMException('synthetic claim timeout', 'TimeoutError');
        if (options.inactive) return Response.json({ message: 'community_offer_inactive_or_missing' }, { status: 400 });
        const intent = body.p_order;
        if (state.order && state.order.request_hash !== intent.request_hash) return Response.json({ message: 'community_order_identity_conflict' }, { status: 409 });
        if (!state.order) {
          const months = { 'comunidade-mensal': 1, 'comunidade-trimestral': 3, 'comunidade-anual': 12 }[intent.offer_key];
          state.order = orderFixture({ ...intent, id: ORDER_ID, claim_token: CLAIM, status: 'creating', external_reference: `community:${ORDER_ID}`,
            provider_customer_id: null, provider_payment_id: null, provider_subscription_id: null, provider_installment_id: null,
            lease_until: new Date(Date.now() + 120000).toISOString(), sold_snapshot: { ...orderFixture().sold_snapshot,
              offer_key: intent.offer_key, duration_months: months, price_mode: intent.price_mode,
              contract_total_cents: intent.contract_total_cents, installment_count: intent.installment_count } });
          return Response.json({ claimed: true, order: state.order });
        }
        if (state.order.status === 'failed' && state.order.result.failure_proof) {
          state.order = { ...state.order, status: 'creating', claim_token: CLAIM, lease_until: new Date(Date.now() + 120000).toISOString(), result: {} };
          return Response.json({ claimed: true, order: state.order });
        }
        return Response.json({ claimed: false, order: state.order });
      }
      if (u.pathname.endsWith('/rpc/finish_community_order')) {
        assert.equal(body.p_claim_token, state.order.claim_token);
        const result = body.p_result;
        if (state.order.status === 'created' && result.status !== 'created') return Response.json({ message: 'community_order_identity_conflict' }, { status: 409 });
        if (result.status === 'created') {
          assert.equal(result.price_mode, state.order.sold_snapshot.price_mode);
          assert.equal(result.installment_count, state.order.sold_snapshot.installment_count);
          assert.ok(result.provider_customer_id);
        }
        state.order = { ...state.order, ...result, status: result.status === 'failed' && !result.failure_proof ? 'uncertain' : result.status, lease_until: null,
          result: { error_code: result.error_code, failure_proof: result.failure_proof, reconciliation_evidence_ref: result.reconciliation_evidence_ref } };
        if (options.loseFinish && result.status === 'created') throw new DOMException('synthetic lost finish', 'TimeoutError');
        return Response.json(state.order);
      }
      if (u.pathname.endsWith('/rpc/record_community_payment')) {
        state.records.push(body.p_payment);
        if (options.recordFailure) return Response.json({ message: 'synthetic unavailable' }, { status: 503 });
        return Response.json({ contract_version: 1, subscription_id: '44444444-4444-4444-8444-444444444444', payment_id: '77777777-7777-4777-8777-777777777777',
          activation_id: '55555555-5555-4555-8555-555555555555', products: state.order.sold_snapshot.products,
          period_start: body.p_payment.period_start, period_end: body.p_payment.period_end, duplicate_payment: state.records.length > 1, duplicate_activation: state.records.length > 1 });
      }
      if (u.pathname.endsWith('/cobranca_pedidos')) {
        if (!state.order) return Response.json([]);
        const match = ['id', 'request_key', 'provider_payment_id', 'provider_subscription_id', 'provider_installment_id'].every(key =>
          !u.searchParams.has(key) || u.searchParams.get(key) === `eq.${state.order[key]}`);
        return Response.json(match ? [state.order] : []);
      }
      if (u.pathname.endsWith('/cobranca_assinaturas')) return Response.json(state.subscriptions);
      if (u.pathname.endsWith('/cobranca_pagamentos')) return Response.json(state.prior);
      throw new Error('Unexpected central request: ' + u.pathname);
    }
    assert.equal(u.origin, 'https://api.asaas.com', 'fixture cannot send real provider traffic');
    if (u.pathname === '/v3/customers' && method === 'GET') return Response.json({ data: [{ id: 'cus_synthetic', cpfCnpj: buyer.cpfCnpj, email: buyer.email }], hasMore: false });
    if (u.pathname === '/v3/customers/cus_synthetic' && method === 'GET') return Response.json({ id: 'cus_synthetic', email: options.customerEmail || buyer.email });
    if (u.pathname === '/v3/payments' && method === 'POST') {
      if (options.postMode === 'timeout') throw new DOMException('synthetic timeout', 'TimeoutError');
      if (options.postMode === 'rejected') return Response.json({ errors: [{ description: 'synthetic rejected' }] }, { status: 400 });
      const installment = body.installmentCount > 1 ? 'ins_synthetic' : null;
      const payment = { ...paymentFixture(orderFixture()), ...body, id: 'pay_synthetic',
        value: body.value ?? Math.floor(body.totalValue * 100 / body.installmentCount) / 100,
        status: options.paidCreation ? 'CONFIRMED' : 'PENDING', ...(installment ? { installment, installmentNumber: 1 } : {}) };
      state.payments.set(payment.id, payment);
      if (installment) state.group = { id: installment, customer: body.customer, billingType: body.billingType,
        value: body.totalValue, installmentCount: body.installmentCount };
      return Response.json(payment);
    }
    if (u.pathname === '/v3/subscriptions' && method === 'POST') {
      state.subscription = { ...body, id: 'sub_synthetic', status: 'ACTIVE' };
      return Response.json(state.subscription);
    }
    if (u.pathname === '/v3/subscriptions/sub_synthetic') return Response.json(state.subscription || {
      id: 'sub_synthetic', customer: state.order.provider_customer_id, externalReference: state.order.external_reference,
      billingType: 'CREDIT_CARD', cycle: 'MONTHLY', value: 147, status: 'ACTIVE' });
    if (u.pathname === '/v3/subscriptions/sub_synthetic/payments') return Response.json({ data: Array.from(state.payments.values()), hasMore: false });
    if (u.pathname === '/v3/installments/ins_synthetic') return Response.json(state.group || {
      id: 'ins_synthetic', customer: state.order.provider_customer_id, billingType: 'CREDIT_CARD',
      value: state.order.sold_snapshot.contract_total_cents / 100, installmentCount: state.order.sold_snapshot.installment_count });
    if (u.pathname.endsWith('/pixQrCode')) return options.postMode === 'qr-failure' ? Response.json({}, { status: 503 }) : Response.json({ payload: 'synthetic-copy-paste', encodedImage: 'dGVzdA==' });
    if (u.pathname.startsWith('/v3/payments/')) {
      const payment = state.payments.get(u.pathname.split('/').pop());
      return payment ? Response.json(payment) : Response.json({}, { status: 404 });
    }
    if (u.pathname === '/v3/payments' && method === 'GET') return Response.json({ data: Array.from(state.payments.values()), hasMore: false });
    if (u.pathname === '/v3/subscriptions' && method === 'GET') return Response.json({ data: state.subscription ? [state.subscription] : [], hasMore: false });
    throw new Error('Unexpected synthetic endpoint: ' + u.pathname);
  });
  async function checkout(overrides = {}) {
    const response = await (await load('index.js')).onRequestPost({ request: new Request('https://example.invalid/api/checkout',
      { method: 'POST', body: JSON.stringify({ ...buyer, ...overrides }) }), env });
    return { response, data: await response.json(), calls: state.calls };
  }
  async function status(key = REQUEST_KEY) {
    const response = await (await load('status.js')).onRequestGet({ request: new Request(`https://example.invalid/api/checkout/status?gateway=asaas&idempotencyKey=${key}`), env });
    return { response, data: await response.json() };
  }
  async function webhook(overrides = {}, envOverrides = {}) {
    const response = await (await load('webhook.js')).onRequestPost({ request: new Request('https://example.invalid/api/checkout/webhook',
      { method: 'POST', headers: { 'asaas-access-token': 'synthetic-hook' }, body: JSON.stringify({ id: 'evt_synthetic', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_synthetic', status: 'RECEIVED', value: 1 }, ...overrides }) }), env: { ...env, ...envOverrides } });
    return { response, data: await response.json() };
  }
  return { state, checkout, status, webhook };
}
module.exports = { load, ORDER_ID, REQUEST_KEY, CLAIM, ORG, buyer, env, orderFixture, paymentFixture, harness };

if (require.main === module) {
  for (const [plan, method, installments, total] of [['mensal','PIX',1,147],['trimestral','PIX',1,357],['anual','PIX',1,997],['mensal','CREDIT_CARD',1,147],['trimestral','CREDIT_CARD',3,381],['anual','CREDIT_CARD',12,1164]]) {
    test(`${plan}/${method}: durable intent precedes provider POST; canonical total`, async t => {
      const h = harness(t), result = await h.checkout({ plan, paymentMethod: method, installments, amount: 1 });
      assert.equal(result.response.status, 200); assert.equal(result.data.amount, total); assert.equal(result.data.paid, false);
      assert.equal(result.data.checkoutOrderId, ORDER_ID);
      const claim = h.state.calls.findIndex(c => c.path.endsWith('/claim_community_order'));
      const creation = h.state.calls.findIndex(c => c.host === 'api.asaas.com' && c.method === 'POST');
      assert.ok(claim >= 0 && creation > claim);
      assert.equal(h.state.calls[creation].body.externalReference, `community:${ORDER_ID}`);
      const after = await h.status(); assert.equal(after.response.status, 200);
      assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
    });
  }
  test('authenticated webhook and polling record the same financial identity without notification effects', async t => {
    const h = harness(t, { order: orderFixture() });
    assert.equal((await h.webhook()).data.paid, true);
    assert.equal((await h.status()).data.paid, true);
    assert.equal(h.state.records.length, 2);
    assert.equal(h.state.records[0].competence_key, h.state.records[1].competence_key);
    assert.ok(h.state.calls.every(c => c.host === 'api.asaas.com' ? c.method === 'GET' : ['central.example.invalid', 'track.nmidigital.tech'].includes(c.host)));
    assert.ok(h.state.calls.filter(c => c.method === 'POST').every(c => c.path.endsWith('/record_community_payment') || c.body.type === 'Purchase'));
    assert.ok(h.state.calls.some(c => c.body?.type === 'Purchase'), 'existing tracking follows the durable financial record');
  });
  test('missing webhook token or financial persistence failure cannot ACK a managed paid order', async t => {
    const h = harness(t, { order: orderFixture(), recordFailure: true });
    assert.equal((await h.webhook({}, { ASAAS_WEBHOOK_TOKEN: '' })).response.status, 503);
    assert.equal((await h.webhook()).response.status, 503);
  });
  test('unknown description cannot grant Community; historical semestral metadata remains readable', async () => {
    const { checkoutDetails } = await load('_products.js');
    assert.equal(checkoutDetails({ description: 'Comunidade mensal', value: 147 }).productId, 'unknown');
    assert.equal(checkoutDetails({ externalReference: JSON.stringify({ plan: 'semestral', eid: 'legacy' }) }).plan, 'semestral');
  });
}
