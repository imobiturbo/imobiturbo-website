const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, load, env, buyer } = require('./checkout-community-routes.test.cjs');

test('hosted monthly creates one subscription without card material, zero charges for lateness and no access before payment', async t => {
  const h = harness(t, { subscriptionPayment: true });
  const request = { checkoutMode: 'hosted', paymentMethod: 'CREDIT_CARD', creditCard: null };
  const first = await h.checkout(request);
  assert.equal(first.response.status, 200);
  assert.equal(first.data.invoiceUrl, 'https://www.asaas.com/i/synthetic');
  assert.equal(first.data.subscriptionId, 'sub_synthetic');
  assert.equal(first.data.paid, false);
  assert.equal(h.state.records.length, 0);
  const post = h.state.calls.find(c => c.path === '/v3/subscriptions' && c.method === 'POST');
  assert.equal(post.body.cycle, 'MONTHLY');
  assert.equal(post.body.value, 147);
  assert.deepEqual(post.body.fine, { value: 0, type: 'FIXED' });
  assert.deepEqual(post.body.interest, { value: 0 });
  assert.equal(post.body.creditCard, undefined);
  assert.equal(post.body.creditCardHolderInfo, undefined);
  assert.equal(post.body.endDate, undefined);
  // A redirect is rejected by Asaas when the merchant has no registered site.
  // Payment and access must still work without that optional account setting.
  assert.equal(post.body.callback, undefined);
  await h.checkout(request);
  assert.equal(h.state.calls.filter(c => c.path === '/v3/subscriptions' && c.method === 'POST').length, 1);
});

for (const [plan, method, installments, total] of [
  ['anual', 'CREDIT_CARD', 12, 1164], ['trimestral', 'CREDIT_CARD', 3, 381],
  ['anual', 'PIX', 1, 997], ['trimestral', 'PIX', 1, 357],
]) test(`hosted ${plan}/${method} preserves sold price and provider invoice`, async t => {
  const h = harness(t);
  const result = await h.checkout({ checkoutMode: 'hosted', plan, paymentMethod: method, installments, creditCard: null });
  assert.equal(result.data.invoiceUrl, 'https://www.asaas.com/i/synthetic');
  assert.equal(result.data.amount, total);
  assert.equal(result.data.paid, false);
  const post = h.state.calls.find(c => c.path === '/v3/payments' && c.method === 'POST');
  assert.equal(post.body.creditCard, undefined);
  assert.deepEqual(post.body.fine, { value: 0, type: 'FIXED' });
  assert.deepEqual(post.body.interest, { value: 0 });
  assert.equal(post.body.callback, undefined);
});

test('hosted redirect remains available when the merchant explicitly enables its registered site', async t => {
  const h = harness(t, { subscriptionPayment: true });
  const response = await (await load('index.js')).onRequestPost({
    request: new Request('https://example.invalid/api/checkout', { method: 'POST',
      body: JSON.stringify({ ...buyer, checkoutMode: 'hosted', paymentMethod: 'CREDIT_CARD', creditCard: null }) }),
    env: { ...env, ASAAS_CHECKOUT_CALLBACK_ENABLED: 'true' },
  });
  assert.equal(response.status, 200);
  const post = h.state.calls.find(c => c.path === '/v3/subscriptions' && c.method === 'POST');
  assert.deepEqual(post.body.callback, { successUrl: 'https://www.imobiturbo.com.br/vagas/?paymentReturn=1', autoRedirect: true });
});

test('hosted flow rejects accidental card material before gateway mutation', async t => {
  const h = harness(t);
  const result = await h.checkout({ checkoutMode: 'hosted', paymentMethod: 'CREDIT_CARD' });
  assert.equal(result.data.orderStatus, 'failed');
  assert.ok(h.state.calls.every(c => c.host !== 'api.asaas.com'));
});

test('invoice navigation accepts only Asaas invoice HTTPS links', () => {
  const { isAsaasInvoiceUrl } = require('../vagas/checkout-session.js');
  assert.equal(isAsaasInvoiceUrl('https://www.asaas.com/i/synthetic'), true);
  for (const url of ['javascript:alert(1)', 'https://asaas.com.attacker.example/i/foo',
    'http://www.asaas.com/i/foo', 'https://user:pass@www.asaas.com/i/foo', 'https://www.asaas.com/other']) {
    assert.equal(isAsaasInvoiceUrl(url), false);
  }
});
