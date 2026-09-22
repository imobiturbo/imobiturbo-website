const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = process.env.CHECKOUT_TEST_ROOT || path.resolve(__dirname, '..');
const stripe = () => import(pathToFileURL(path.join(root, 'functions/api/checkout/_stripe.js')));

test('Stripe writes carry idempotency keys and never include card fields', async t => {
  const { stripeRequest } = await stripe();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    calls.push({ url, opts });
    return Response.json({ id: 'cus_test' });
  });
  const result = await stripeRequest({ STRIPE_SECRET_KEY: 'test-secret' }, '/customers', { email: 'buyer@example.invalid' }, 'checkout-1-customer');
  assert.equal(result.id, 'cus_test');
  assert.equal(calls[0].url, 'https://api.stripe.com/v1/customers');
  assert.equal(calls[0].opts.headers['Idempotency-Key'], 'checkout-1-customer');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer test-secret');
  assert.equal(calls[0].opts.body, 'email=buyer%40example.invalid');
  await assert.rejects(() => stripeRequest({ STRIPE_SECRET_KEY: 'test-secret' }, '/customers', { email: 'buyer@example.invalid' }), /identificador/i);
  await assert.rejects(() => stripeRequest({ STRIPE_SECRET_KEY: 'test-secret' }, '/payment_intents', { 'card[number]': '4242424242424242' }, 'invalid-attempt'), /formulário seguro/i);
  assert.equal(calls.length, 1);
});

test('Stripe credentials and upstream details are never reflected in errors', async t => {
  const { stripeRequest } = await stripe();
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { message: 'private-provider-value' } }, { status: 401 }));
  await assert.rejects(() => stripeRequest({ STRIPE_SECRET_KEY: 'test-secret' }, '/prices/price_test'), error => {
    assert.equal(error.status, 502);
    assert.ok(!error.message.includes('private-provider-value'));
    assert.ok(!error.message.includes('test-secret'));
    return true;
  });
});

test('Stripe missing credentials fail closed without outbound calls', async t => {
  const { stripeRequest } = await stripe();
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('must not call'); });
  await assert.rejects(() => stripeRequest({}, '/prices/price_test'), error => error.status === 503);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('webhook verification rejects forged, changed, expired and future events', async () => {
  const { verifyStripeSignature } = await stripe();
  const now = 1800000000;
  const body = JSON.stringify({ type: 'invoice.paid', data: { object: { id: 'in_test' } } });
  const secret = 'whsec_test_only';
  const signature = t => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  assert.equal(await verifyStripeSignature(body, signature(now), secret, now), true);
  assert.equal(await verifyStripeSignature(body + ' ', signature(now), secret, now), false);
  assert.equal(await verifyStripeSignature(body, signature(now), 'wrong-secret', now), false);
  assert.equal(await verifyStripeSignature(body, signature(now - 301), secret, now), false);
  assert.equal(await verifyStripeSignature(body, signature(now + 301), secret, now), false);
  assert.equal(await verifyStripeSignature(body, '', secret, now), false);
  assert.equal(await verifyStripeSignature(body, signature(now), '', now), false);
  assert.equal(await verifyStripeSignature(body, signature(now) + ',v1=invalid', secret, now), true);
});
