const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, load, env, buyer, orderFixture, paymentFixture, REQUEST_KEY, ORDER_ID } = require('./checkout-community-routes.test.cjs');

test('double click/concurrent same intent creates at most one gateway charge', async t => {
  const h = harness(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => h.checkout()));
  assert.ok(results.every(r => r.response.status === 200));
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
  assert.equal(h.state.order.status, 'created');
});
test('reusing a financial key with a different buyer or offer conflicts before another POST', async t => {
  const h = harness(t); await h.checkout();
  assert.equal((await h.checkout({ email: 'different@example.invalid' })).response.status, 409);
  assert.equal((await h.checkout({ plan: 'anual' })).response.status, 409);
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
});
for (const postMode of ['timeout', 'rejected']) test(`${postMode}: uncertain, exhaustive reconciliation and no blind retry`, async t => {
  const h = harness(t, { postMode });
  const first = await h.checkout(); assert.equal(first.data.paid, false); assert.equal(first.data.orderStatus, 'uncertain');
  await h.checkout(); await h.status();
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
  assert.equal(h.state.order.status, 'uncertain');
  assert.ok(h.state.calls.some(c => c.method === 'GET' && new URL(c.url).searchParams.get('externalReference') === `community:${ORDER_ID}`));
  assert.equal(h.state.order.result.failure_proof, undefined);
});
test('lost finish response recovers the existing order without creating a second charge', async t => {
  const h = harness(t, { loseFinish: true }); await h.checkout();
  const recovered = await h.status(); assert.equal(recovered.data.paymentId, 'pay_synthetic');
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
});
test('expired claim reconciles a provider-owned charge before closing created', async t => {
  const order = orderFixture({ status: 'creating', lease_until: new Date(Date.now() - 1).toISOString(), provider_payment_id: null });
  const h = harness(t, { order, payment: paymentFixture(order, { id: 'pay_synthetic' }) });
  const result = await h.status(); assert.equal(result.data.paymentId, 'pay_synthetic'); assert.equal(h.state.order.status, 'created');
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 0);
  assert.ok(h.state.order.result.reconciliation_evidence_ref);
});
test('invalid transient payment credentials finish failed with pre-effect evidence', async t => {
  const h = harness(t); const result = await h.checkout({ cpfCnpj: '' });
  assert.equal(result.data.orderStatus, 'failed'); assert.equal(result.data.retryCreationAllowed, true);
  assert.equal(h.state.order.result.failure_proof.kind, 'pre_effect_definitive');
  assert.ok(h.state.calls.every(c => c.host !== 'api.asaas.com'));
  const retry = await h.checkout(); assert.equal(retry.data.orderStatus, 'created');
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 1);
});
test('storage claim outage never reaches the gateway', async t => {
  const h = harness(t, { claimFailure: true }); assert.equal((await h.checkout()).response.status, 503);
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com').length, 0);
});
test('inactive offers, semestral new sale and arbitrary installment count cannot be purchased', async t => {
  const h = harness(t, { inactive: true });
  assert.equal((await h.checkout()).response.status, 409);
  assert.equal((await h.checkout({ plan: 'semestral' })).response.status, 400);
  assert.equal((await h.checkout({ plan: 'trimestral', paymentMethod: 'CREDIT_CARD', installments: 2 })).response.status, 400);
  assert.ok(h.state.calls.every(c => c.host !== 'api.asaas.com'));
});
test('server namespace/key and strict request intent exclude CPF/card/tracking metadata', async () => {
  const { communityConfig, communityIntent } = await load('_community-orders.js');
  assert.throws(() => communityConfig({ ...env, ASAAS_ENVIRONMENT: 'sandbox' }), /environment_conflict/);
  assert.throws(() => communityConfig({ ASAAS_API_KEY: 'synthetic' }), /configuration_unavailable/);
  const config = communityConfig(env), intent = await communityIntent(config, buyer);
  assert.equal(intent.request_key, REQUEST_KEY);
  assert.match(intent.request_hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(intent).includes(buyer.cpfCnpj));
  assert.ok(!JSON.stringify(intent).includes(buyer.creditCard.number));
  assert.ok(!JSON.stringify(intent).includes(buyer.eventId));
  await assert.rejects(communityIntent(config, { ...buyer, idempotencyKey: buyer.eventId }), /idempotency_key_required/);
});

test('uncertain recovery cannot bind an unrecorded provider customer belonging to another buyer', async t => {
  const order = orderFixture({ status: 'uncertain', provider_customer_id: null, provider_payment_id: null });
  const h = harness(t, { order, payment: paymentFixture(order), customerEmail: 'other@example.invalid' });
  assert.equal((await h.status()).response.status, 422);
  assert.equal(h.state.records.length, 0); assert.equal(h.state.order.status, 'uncertain');
  assert.equal(h.state.calls.filter(c => c.host === 'api.asaas.com' && c.method === 'POST').length, 0);
});
for (const change of [{ environment: 'sandbox' }, { organization_id: '99999999-9999-4999-8999-999999999999' }, { provider: 'another' }]) {
  test(`wrong durable namespace ${JSON.stringify(change)} never becomes paid`, async t => {
    const h = harness(t, { order: orderFixture(change) });
    assert.equal((await h.webhook()).response.status, 422); assert.equal(h.state.records.length, 0);
  });
}
